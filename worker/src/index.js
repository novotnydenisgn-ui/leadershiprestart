// Entry point: router + request flow A/B testování (testy a statistiky žijí ve Velínu, viz config.js).
import { getAb, testById } from './config.js';
import {
  parseCookies,
  cookie,
  resolveAssignment,
  resolveUtm,
  buildCtaQuery,
  buildRewriter,
  buildProxyRewriter,
  visitorHash,
  COOKIE_EXCLUDE,
} from './ab.js';
import { isBot, isExcluded, previewVariant } from './bots.js';
import { logView, logClick, logGoal, deviceFrom } from './log.js';
import { handleForms } from './forms.js';
import { bfStock } from './bf.js';

const APEX = 'leadershiprestart.cz';
const VELIN = 'https://admin.leadershiprestart.cz';
// stará adresa šablony → šablona ve Velínu (/admin/sablony/<soubor>); ostatní (rozcestník, děkujeme, vítej) → Velín
const SABLONY = {
  '/sablona-lp': 'sablona-funnel', '/sablona-funnel': 'sablona-funnel', '/sablona-zacni-tady': 'podklady',
  '/sablona-brand-manual': 'brand-manual', '/sablona-links': 'links', '/sablona-cenik': 'cenik', '/sablona-dashboard': 'dashboard',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // www -> apex (na CF custom doméně; lokální dev tudy neprojde)
    if (url.hostname === `www.${APEX}`) {
      url.hostname = APEX;
      return Response.redirect(url.toString(), 301);
    }
    // replika Netlify _redirects
    if (url.pathname === '/lp.html') {
      return Response.redirect(new URL('/', url).toString(), 301);
    }
    // Leadership Up-Grade: kanonická adresa /up-great; aliasy a jiná velikost
    // písmen (/Up-Great, /up-grade, /up-great.html…) -> 301 na /up-great
    {
      const lower = url.pathname.toLowerCase();
      const aliases = ['/up-great', '/up-great.html', '/up-grade', '/up-grade.html', '/up-great-lp', '/up-great-lp.html'];
      if (aliases.includes(lower) && url.pathname !== '/up-great') {
        return Response.redirect(new URL('/up-great', url).toString(), 301);
      }
    }
    // Šablony pro klienty jsou jen ve Velínu za přihlášením (položka Šablony) – staré adresy vedou tam
    {
      let p = url.pathname;
      try { p = decodeURIComponent(p); } catch {}
      p = p.toLowerCase().replace(/\.html$/, '').replace(/\/+$/, '');
      if (p === '/sablony' || p.startsWith('/sablona-') || p === '/p/sablony' || p.startsWith('/p/sablony-')) {
        const file = SABLONY[p.replace(/^\/p\/sablony/, '/sablona').replace(/^\/sablona$/, '/sablona-lp')];
        return new Response(null, {
          status: 302,
          headers: { Location: `${VELIN}/admin/${file ? `sablony/${file}` : ''}`, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
        });
      }
    }
    if (url.pathname.startsWith('/video/')) {
      return handleVideo(request, env);
    }
    if (url.pathname === '/api/click' && request.method === 'POST') {
      return handleClick(request, env, ctx);
    }
    if (url.pathname === '/api/bf/zbyva') {
      return bfStock(env, ctx);
    }
    if (url.pathname === '/api/goal') {
      return handleGoal(request, env, ctx, url);
    }
    if (url.pathname === '/ab' || url.pathname.startsWith('/ab/')) {
      // A/B se řídí ve Velínu; návštěva /ab/ zároveň vyřadí tento prohlížeč z měření (jako dřív)
      return new Response(null, {
        status: 302,
        headers: { Location: env.AB_ADMIN_URL || 'https://admin.leadershiprestart.cz/admin/#/ab', 'Set-Cookie': cookie(COOKIE_EXCLUDE, '1', 365 * 86400), 'Cache-Control': 'no-store' },
      });
    }
    // Dotazníky (aplikace Dotazníky): /up-great-dotaznik, /engine/*, /api/submit/* …
    const formsResp = await handleForms(request, env, url);
    if (formsResp) return formsResp;
    return handlePage(request, env, ctx, url);
  },
};

// Kanonický klíč stránky pro párování s `page` testu ve Velínu:
// /vyzva.html i /vyzva -> /vyzva, /index.html i / -> /
function normalizePath(pathname) {
  if (pathname === '/index.html' || pathname === '' || pathname === '/') return '/';
  return pathname.replace(/\.html$/, '');
}

// Netlify servíroval /vyzva i /vyzva.html přímo (200, bez redirectu). Workers
// Assets to s html_handling:"none" umí jen pro .html, takže bezpříponovou
// variantu doresolvujeme sami — ať se stávající odkazy a indexované URL nerozbijí.
async function fetchAsset(env, request, url) {
  const direct = await env.ASSETS.fetch(request);
  if (direct.status !== 404) return direct;

  const p = url.pathname;
  const last = p.split('/').pop() || '';
  // "/" a "/neco/" -> index.html; "/vyzva" -> vyzva.html; s příponou -> fakt 404
  const candidate = p.endsWith('/') ? `${p}index.html` : last.includes('.') ? null : `${p}.html`;
  if (!candidate) return direct;

  const alt = new URL(url);
  alt.pathname = candidate;
  const retry = await env.ASSETS.fetch(new Request(alt.toString(), request));
  return retry.status === 404 ? direct : retry;
}

// Videa (/video/*) jdou přes Worker kvůli Range: statické assets Cloudflaru na Range vrací
// celý soubor (200) a Safari / iOS pak MP4 nepřehraje. Soubory jsou malé (do ~10 MB),
// takže výřez stačí udělat v paměti.
async function handleVideo(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 });
  const resp = await env.ASSETS.fetch(new Request(request.url));
  if (!resp.ok) return resp;
  const headers = new Headers(resp.headers);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  const head = request.method === 'HEAD';
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range') || '');
  if (!m || (m[1] === '' && m[2] === '')) return new Response(head ? null : resp.body, { status: 200, headers });

  const buf = await resp.arrayBuffer();
  const size = buf.byteLength;
  // "bytes=-500" = posledních 500 bajtů; "bytes=100-" = od 100 do konce
  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(head ? null : buf.slice(start, end + 1), { status: 206, headers });
}

async function handlePage(request, env, ctx, url) {
  const assetResp = await fetchAsset(env, request, url);

  // Redirecty a ne-HTML (obrázky, CSS…) pouštíme beze změny.
  const ctype = assetResp.headers.get('Content-Type') || '';
  if (assetResp.status >= 300 || !ctype.includes('text/html')) return assetResp;

  const page = normalizePath(url.pathname);
  const ua = request.headers.get('User-Agent') || '';
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const cookies = parseCookies(request);
  const setCookies = [];

  const ab = await getAb(env, ctx);
  const state = ab.state;
  const activeTest = testById(ab, state.active_test_id);
  const bot = isBot(ua);
  const excluded = isExcluded(cookies, url);
  const preview = previewVariant(url);

  // Zamčené testy: vítěz se servíruje všem (i botům) na stránce testu,
  // dokud není zapečen do HTML a test archivován.
  const slotApplications = [];
  for (const t of ab.tests) {
    const winnerId = state.locked?.[t.id];
    if (!winnerId || t.page !== page) continue;
    if (activeTest && t.id === activeTest.id) continue; // lock aktivního řeší větev níže
    const winner = t.variants.find((v) => v.id === winnerId);
    if (winner) slotApplications.push({ test: t, variant: winner });
  }

  // ?preview=<id|token> funguje pro KTERÝKOLIV test na této stránce (i ve
  // frontě) — na prohlídku variant před spuštěním. Nikdy se neloguje.
  if (preview) {
    for (const t of ab.tests) {
      if (t.page !== page || (activeTest && t.id === activeTest.id)) continue;
      const pv = t.variants.find((x) => x.id === preview || x.token === preview);
      if (pv) slotApplications.push({ test: t, variant: pv });
    }
  }

  // Aktivní test na této stránce: přiřazení varianty.
  let assignedVariantId = null;
  let logged = false;
  if (activeTest && activeTest.page === page) {
    const lockedWinner = state.locked?.[activeTest.id];
    if (lockedWinner) {
      assignedVariantId = lockedWinner; // zamčený vítěz pro všechny, bez logu
    } else if (bot || state.status === 'paused') {
      assignedVariantId = activeTest.variants[0].id; // kontrola, bez cookie a logu
    } else if (preview && activeTest.variants.some((v) => v.id === preview || v.token === preview)) {
      // ruční náhled (id nebo URL kód), bez cookie a logu
      assignedVariantId = activeTest.variants.find((v) => v.id === preview || v.token === preview).id;
    } else {
      const { variantId, setCookie } = await resolveAssignment(activeTest, cookies, ip, ua);
      assignedVariantId = variantId;
      if (setCookie) setCookies.push(setCookie);
      // preview jiného testu na téže stránce => taky nelogovat
      if (!excluded && !preview && state.status === 'running') {
        logged = true;
        const utmForLog = resolveUtm(url, cookies).utm;
        ctx.waitUntil(
          visitorHash(ip, ua).then((visitor) =>
            logView(env, {
              testId: activeTest.id,
              variantId,
              page,
              utm: utmForLog,
              device: deviceFrom(ua),
              visitor,
            })
          )
        );
      }
    }
    const variant = activeTest.variants.find((v) => v.id === assignedVariantId);
    if (variant) slotApplications.push({ test: activeTest, variant });
  }

  // ?exclude=1 -> trvalá výluka z měření (vlastní návštěvy)
  if (!bot && url.searchParams.get('exclude') === '1' && cookies[COOKIE_EXCLUDE] !== '1') {
    setCookies.push(cookie(COOKIE_EXCLUDE, '1', 365 * 86400));
  }

  // UTM passthrough (uložení do cookie, aby přežilo přechod na další stránku)
  const { utm, setCookie: utmCookie } = resolveUtm(url, cookies);
  if (!bot && utmCookie) setCookies.push(utmCookie);

  // v= jen když má návštěvník reálné přiřazení (ne bot/preview bez logu nevadí —
  // parametr popisuje, co člověk viděl, a to platí i pro preview).
  const ctaQuery = buildCtaQuery(
    activeTest && activeTest.page === page ? activeTest : ctaTestFromCookie(cookies, activeTest),
    assignedVariantId || variantFromCookie(cookies, activeTest),
    utm
  );

  const abGlobals = {
    t: activeTest ? activeTest.id : null,
    v: assignedVariantId || variantFromCookie(cookies, activeTest),
    q: ctaQuery.toString(),
    x: bot || excluded || !!preview ? 1 : 0, // 1 => klik beacon se neposílá
  };

  const headers = new Headers(assetResp.headers);
  headers.set('Cache-Control', 'no-store'); // HTML nikdy do cache — každý dostane svou variantu
  for (const c of setCookies) headers.append('Set-Cookie', c);

  // Test typu „celá stránka": varianta se `src` se místo našeho HTML proxuje
  // z cizí adresy (stará Tilda stránka) — stejná URL, žádný redirect.
  const proxied = slotApplications.find((a) => a.variant.src);
  if (proxied) {
    try {
      const originResp = await fetch(proxied.variant.src, {
        headers: { 'User-Agent': ua, 'Accept': 'text/html' },
        cf: { cacheTtl: 300, cacheEverything: true }, // Tilda HTML na edge max 5 min
      });
      if (originResp.ok) {
        const ph = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        for (const c of setCookies) ph.append('Set-Cookie', c);
        const srcOrigin = new URL(proxied.variant.src).origin;
        return buildProxyRewriter({ srcOrigin, ctaQuery, abGlobals }).transform(
          new Response(originResp.body, { status: 200, headers: ph })
        );
      }
      // Tilda nedostupná -> tichý fallback na náš web (kontrolu); view je už
      // zalogované, výpadek pozná admin z nižšího CR téhle varianty.
    } catch {
      /* fallback níže */
    }
  }

  const response = new Response(assetResp.body, { status: assetResp.status, headers });
  return buildRewriter({ slotApplications, ctaQuery, abGlobals }).transform(response);
}

// Návštěvník s cookie z hlavní stránky si nese variantu i na cenik/vyzva,
// aby CTA všude odkazovaly se stejným v=.
function variantFromCookie(cookies, activeTest) {
  if (!activeTest || !cookies.ab_v) return null;
  const [tid, vid] = cookies.ab_v.split(':');
  return tid === activeTest.id && activeTest.variants.some((v) => v.id === vid) ? vid : null;
}
function ctaTestFromCookie(cookies, activeTest) {
  return variantFromCookie(cookies, activeTest) ? activeTest : null;
}

// 1x1 průhledný GIF — tracking pixel pro thank-you stránku na cizí doméně.
const PIXEL_GIF = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  (c) => c.charCodeAt(0)
);

function pixelResponse() {
  return new Response(PIXEL_GIF, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
  });
}

// GET/POST /api/goal?v=<kód varianty>&g=form   (starší kódy posílají i &k=…, to se už nekontroluje –
// klíč byl beztak vidět ve zdrojáku děkovné stránky; variantu ověří Velín podle kódu).
// Vkládá se jako <img> na thank-you page silabytsebou.cz — parametr v tam doteče
// v URL dotazníku (CTA rewrite). Vždy vrací pixel, i při nezápisu (žádné oracle).
async function handleGoal(request, env, ctx, url) {
  const v = (url.searchParams.get('v') || '').slice(0, 64);
  const goal = (url.searchParams.get('g') || 'form').slice(0, 32);
  const ua = request.headers.get('User-Agent') || '';
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';

  if (!v || isBot(ua)) return pixelResponse();

  ctx.waitUntil(
    visitorHash(ip, ua).then((visitor) => logGoal(env, { token: v, goal, device: deviceFrom(ua), visitor }))
  );
  return pixelResponse();
}

async function handleClick(request, env, ctx) {
  const ua = request.headers.get('User-Agent') || '';
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const cookies = parseCookies(request);

  if (isBot(ua) || cookies[COOKIE_EXCLUDE] === '1') {
    return new Response(null, { status: 204 });
  }
  let body = {};
  try {
    body = await request.json();
  } catch {
    /* sendBeacon bez JSON -> prázdné */
  }
  const ctaPos = typeof body.pos === 'string' ? body.pos.slice(0, 32) : 'other';
  let page = typeof body.page === 'string' ? body.page.slice(0, 128) : null;

  // Videa (pozice „video:…“ ze site.js: spuštění, dokoukání, odchod na YouTube) jdou do logů Workeru
  // vždy, i bez běžícího testu – výchozí čísla (Workers → leadershiprestart → Logs, filtr video_event).
  // Do Velínu se klíč videa připojí ke stránce (/#roman), ať jde rozpad podle videí.
  if (ctaPos.startsWith('video:')) {
    const ref = typeof body.ref === 'string' ? body.ref.replace(/[^\w-]/g, '').slice(0, 40) : '';
    console.log(JSON.stringify({ video_event: ctaPos.slice(6), ref, page, device: deviceFrom(ua), ab: cookies.ab_v || null }));
    if (ref && page) page = `${page}#${ref}`.slice(0, 128);
  }

  if (!cookies.ab_v) return new Response(null, { status: 204 });
  const [tid, vid] = (cookies.ab_v || '').split(':');
  const { state, ...ab } = await getAb(env, ctx);
  const test = testById(ab, tid);
  // Klik počítáme jen pro aktivní běžící test a platnou variantu z cookie.
  if (!test || state.active_test_id !== tid || state.status !== 'running' || state.locked?.[tid]) {
    return new Response(null, { status: 204 });
  }
  if (!test.variants.some((v) => v.id === vid)) return new Response(null, { status: 204 });

  ctx.waitUntil(
    visitorHash(ip, ua).then((visitor) =>
      logClick(env, {
        testId: tid,
        variantId: vid,
        page,
        ctaPos,
        device: deviceFrom(ua),
        visitor,
      })
    )
  );
  return new Response(null, { status: 204 });
}
