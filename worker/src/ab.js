// Výběr varianty, cookies a HTMLRewriter pipeline.
import { resolveWeights } from './config.js';

export const QUALIF_URL = 'https://silabytsebou.cz/kvalifikace_do_vyzvy';
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

const COOKIE_ASSIGN = 'ab_v'; // "<test_id>:<variant_id>", sticky 90 dní
const COOKIE_UTM = 'ab_utm'; // zakódovaný query string s whitelistem UTM, 30 dní
export const COOKIE_EXCLUDE = 'ab_x'; // "1" => návštěvník se nikdy neloguje

export function parseCookies(request) {
  const out = {};
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq > 0) out[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return out;
}

export function cookie(name, value, maxAgeSec) {
  return `${name}=${value}; Max-Age=${maxAgeSec}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

export async function sha256Hex(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function visitorHash(ip, ua) {
  return (await sha256Hex(`${ip}|${ua}`)).slice(0, 16);
}

// Deterministické přiřazení: hash(ip|ua|test) -> vážený bucket. Náhodné napříč
// návštěvníky, ale stabilní pro téhož člověka i bez cookie (dokud drží IP).
export async function pickVariant(test, ip, ua) {
  const weights = resolveWeights(test);
  const total = weights.reduce((s, w) => s + w.weight, 0) || 1;
  const hex = await sha256Hex(`${ip}|${ua}|${test.id}`);
  const bucket = parseInt(hex.slice(0, 8), 16) % total;
  let acc = 0;
  for (const w of weights) {
    acc += w.weight;
    if (bucket < acc) return w.id;
  }
  return weights[0].id;
}

// Přiřazení pro aktivní test: cookie má přednost (sticky), jinak hash.
// Vrací { variantId, setCookie } — setCookie jen když cookie chybí/neplatí.
export async function resolveAssignment(test, cookies, ip, ua) {
  const raw = cookies[COOKIE_ASSIGN];
  if (raw) {
    const [tid, vid] = raw.split(':');
    if (tid === test.id && test.variants.some((v) => v.id === vid)) {
      return { variantId: vid, setCookie: null };
    }
  }
  const variantId = await pickVariant(test, ip, ua);
  return {
    variantId,
    setCookie: cookie(COOKIE_ASSIGN, `${test.id}:${variantId}`, 90 * 86400),
  };
}

// UTM z aktuální URL (whitelist); parametry v URL mají přednost, jinak cookie.
// Vrací { utm: URLSearchParams, setCookie }.
export function resolveUtm(url, cookies) {
  const fromUrl = new URLSearchParams();
  for (const k of UTM_KEYS) {
    const v = url.searchParams.get(k);
    if (v && v.length <= 200) fromUrl.set(k, v);
  }
  if ([...fromUrl].length) {
    return { utm: fromUrl, setCookie: cookie(COOKIE_UTM, encodeURIComponent(fromUrl.toString()), 30 * 86400) };
  }
  if (cookies[COOKIE_UTM]) {
    try {
      const stored = new URLSearchParams(decodeURIComponent(cookies[COOKIE_UTM]));
      const clean = new URLSearchParams();
      for (const k of UTM_KEYS) if (stored.get(k)) clean.set(k, stored.get(k));
      return { utm: clean, setCookie: null };
    } catch {
      /* poškozená cookie -> ignoruj */
    }
  }
  return { utm: new URLSearchParams(), setCookie: null };
}

// Veřejný kód varianty pro URL: nečitelný `token` z tests.json (návštěvník nesmí
// poznat, že jde o test). Fallback na <slot>_<id> jen kdyby token chyběl.
export function variantToken(test, variantId) {
  const v = test.variants.find((x) => x.id === variantId);
  return v?.token || `${test.slot}_${variantId}`;
}

// Query string pro CTA odkazy: v=<token> + UTM passthrough.
export function buildCtaQuery(activeTest, variantId, utm) {
  const q = new URLSearchParams();
  if (activeTest && variantId) q.set('v', variantToken(activeTest, variantId));
  for (const [k, v] of utm) q.set(k, v);
  return q;
}

function appendQuery(href, ctaQuery) {
  try {
    const u = new URL(href);
    for (const [k, v] of ctaQuery) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return href;
  }
}

function slotHandler(test, variant) {
  return {
    element(el) {
      if (test.type === 'attrs') {
        for (const [attr, val] of Object.entries(variant.attrs || {})) el.setAttribute(attr, val);
      } else {
        el.setInnerContent(variant.content ?? '', { html: true });
      }
    },
  };
}

// Rewriter pro test typu „celá stránka" — cizí web (Tilda) servírovaný na naší
// adrese. Přepíše CTA na dotazník (v= + UTM, upgrade http->https), doabsolutní
// případné relativní cesty na původní doménu, srovná canonical na náš web
// a vstříkne __AB + klik beacon (stránka nemá náš site.js).
export function buildProxyRewriter({ srcOrigin, ctaQuery, abGlobals }) {
  const absolutize = (val) =>
    val && val.startsWith('/') && !val.startsWith('//') ? srcOrigin + val : val;
  const fixAttr = (attr) => ({
    element(el) {
      const v = el.getAttribute(attr);
      if (v) el.setAttribute(attr, absolutize(v));
    },
  });

  let rw = new HTMLRewriter()
    .on('a[href]', {
      element(el) {
        let href = absolutize(el.getAttribute('href') || '');
        if (href.includes('kvalifikace_do_vyzvy')) {
          href = href.replace(/^http:\/\//, 'https://');
          href = appendQuery(href, ctaQuery);
        }
        el.setAttribute('href', href);
      },
    })
    .on('link[href]', fixAttr('href'))
    .on('script[src]', fixAttr('src'))
    .on('img[src]', fixAttr('src'))
    .on('source[src]', fixAttr('src'))
    .on('form[action]', fixAttr('action'))
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute('href', 'https://leadershiprestart.cz/');
      },
    });

  const json = JSON.stringify(abGlobals).replace(/</g, '\\u003c');
  const beacon =
    `<script>window.__AB=${json};(function(){var A=window.__AB;` +
    `if(!A.t||A.x===1||!navigator.sendBeacon)return;` +
    `document.addEventListener('click',function(e){` +
    `var a=e.target.closest&&e.target.closest('a[href*="kvalifikace_do_vyzvy"]');` +
    `if(!a)return;try{navigator.sendBeacon('/api/click',new Blob(` +
    `[JSON.stringify({pos:'tilda',page:location.pathname})],{type:'application/json'}))}catch(x){}});})();</script>`;
  rw = rw.on('head', {
    element(el) {
      el.append(beacon, { html: true });
    },
  });
  return rw;
}

// slotApplications: [{ test, variant }] — aktivní test s přiřazenou variantou
// + všechny zamčené testy s vítězem (dokud se vítěz nezapeče do HTML commitem).
// Kontrola (content === null a bez attrs) se neaplikuje — v HTML už je.
export function buildRewriter({ slotApplications, ctaQuery, abGlobals }) {
  let rw = new HTMLRewriter();

  for (const { test, variant } of slotApplications) {
    if (variant.content == null && !variant.attrs) continue;
    rw = rw.on(`[data-ab-slot="${test.slot}"]`, slotHandler(test, variant));
  }

  if ([...ctaQuery].length) {
    rw = rw.on(`a[href^="${QUALIF_URL}"]`, {
      element(el) {
        el.setAttribute('href', appendQuery(el.getAttribute('href'), ctaQuery));
      },
    });
  }

  // window.__AB pro site.js (nav CTA, klik beacon, pixel). < proti </script> injekci.
  const json = JSON.stringify(abGlobals).replace(/</g, '\\u003c');
  rw = rw.on('head', {
    element(el) {
      el.append(`<script>window.__AB=${json}</script>`, { html: true });
    },
  });

  return rw;
}
