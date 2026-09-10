// Admin přehled /ab/ — basic auth, dashboard s kartami variant, grafem a trychtýřem.
import { getState, putState, getTests, getTestById, getQueue, getAllTests, getAnyTest, getPlanIdeas } from './config.js';
import { cookie, COOKIE_EXCLUDE, parseCookies } from './ab.js';
import { testStats, timeseries, goalBreakdown, breakdown, pBest, sampleTier } from './stats.js';

// --- basic auth --------------------------------------------------------------

async function digest(s) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

async function authorized(request, env) {
  if (!env.ADMIN_USER || !env.ADMIN_PASS) return false;
  const h = request.headers.get('Authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  let creds;
  try {
    creds = atob(h.slice(6));
  } catch {
    return false;
  }
  const [got, want] = await Promise.all([digest(creds), digest(`${env.ADMIN_USER}:${env.ADMIN_PASS}`)]);
  // porovnání přes digest => konstantní čas, žádný únik délky
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

function unauthorized() {
  return new Response('Autorizace vyžadována', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="AB testy", charset="UTF-8"' },
  });
}

// --- router ------------------------------------------------------------------

export async function handleAdmin(request, env, ctx) {
  if (!(await authorized(request, env))) return unauthorized();

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/ab';

  if (request.method === 'POST' && path.startsWith('/ab/api/')) {
    // CSRF hygiena: browser s uloženým basic auth pošle Authorization sám,
    // ale cizí stránka nedokáže přidat vlastní hlavičku.
    if (request.headers.get('X-AB-Admin') !== '1') {
      return json({ error: 'missing X-AB-Admin header' }, 400);
    }
    return handleAction(path.slice('/ab/api/'.length), request, env);
  }
  if (request.method === 'GET' && (path === '/ab' || path === '/ab/index.html')) {
    return renderDashboard(request, env, url);
  }
  return new Response('Nenalezeno', { status: 404 });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// --- akce (mutují jen KV stav) -------------------------------------------------

async function handleAction(action, request, env) {
  const state = await getState(env, { fresh: true });
  let body = {};
  try {
    body = await request.json();
  } catch {
    /* akce bez těla */
  }

  switch (action) {
    case 'pause':
      state.status = 'paused';
      break;
    case 'resume':
      state.status = 'running';
      break;
    case 'lock': {
      const test = state.active_test_id && getTestById(state.active_test_id);
      if (!test) return json({ error: 'žádný aktivní test' }, 400);
      const variant = test.variants.find((v) => v.id === body.variant);
      if (!variant) return json({ error: `neznámá varianta "${body.variant}"` }, 400);
      state.locked = { ...state.locked, [test.id]: variant.id };
      break;
    }
    case 'next': {
      const next = getQueue().find((t) => t.id !== state.active_test_id && !state.locked?.[t.id]);
      if (!next) return json({ error: 'fronta je prázdná — přidej test do tests.json' }, 400);
      state.active_test_id = next.id;
      state.status = 'running';
      state.started_at = new Date().toISOString();
      break;
    }
    case 'activate': {
      const target = body.test && getTestById(body.test);
      if (!target) return json({ error: `neznámý test "${body.test}"` }, 400);
      if (state.locked?.[target.id]) return json({ error: 'test už má zamčeného vítěze' }, 400);
      state.active_test_id = target.id;
      state.status = 'running';
      state.started_at = new Date().toISOString();
      break;
    }
    default:
      return json({ error: `neznámá akce "${action}"` }, 404);
  }
  await putState(env, state);
  return json({ ok: true, state });
}

// --- pomůcky pro render ----------------------------------------------------------

const PALETTE = ['#8b93a7', '#6ea8fe', '#f7b955', '#5fd39a', '#e07be0'];
// Pořadí a české popisky pater trychtýře za klikem (název = param g v /api/goal).
const GOAL_ORDER = ['form', 'rezervace'];
const GOAL_LABELS = { form: 'Vyplněný formulář', rezervace: 'Rezervace schůzky' };
// Z čeho se počítá procento na kartě varianty (patro se vždy měří vůči předchozímu).
const GOAL_OF = { form: 'z kliků', rezervace: 'z formulářů' };
const sortGoals = (names) =>
  [...names].sort((a, b) => {
    const ia = GOAL_ORDER.indexOf(a);
    const ib = GOAL_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
const fmtPct = (x, d = 1) => `${(x * 100).toFixed(d)} %`;
const fmtN = (n) => new Intl.NumberFormat('cs-CZ').format(n || 0);
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Posledních N dní jako ISO data (včetně dneška), pro souvislou osu X.
function dayRange(days) {
  const out = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    out.push(new Date(now - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

// Graf: šedé sloupce = denní zobrazení celkem, barevné linky = CR po variantách.
function chartSvg(rows, variants, days) {
  const W = 880;
  const H = 240;
  const P = { l: 44, r: 52, t: 14, b: 26 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const daysArr = dayRange(days);
  const x = (i) => P.l + (iw * (i + 0.5)) / daysArr.length;
  const bw = Math.max(2, (iw / daysArr.length) * 0.55);

  const byDay = {};
  for (const r of rows) {
    (byDay[r.day] ||= {})[r.variant_id] = r;
  }
  const totalViews = daysArr.map((d) =>
    Object.values(byDay[d] || {}).reduce((s, r) => s + (r.views || 0), 0)
  );
  const maxViews = Math.max(1, ...totalViews);

  const crSeries = variants.map((v) =>
    daysArr.map((d) => {
      const r = byDay[d]?.[v.id];
      return r && r.views ? r.clicks / r.views : null;
    })
  );
  const maxCr = Math.max(0.05, ...crSeries.flat().filter((c) => c != null));
  const yV = (n) => P.t + ih * (1 - n / maxViews);
  const yC = (c) => P.t + ih * (1 - c / (maxCr * 1.15));

  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Denní zobrazení a CR">`;
  // mřížka + osy
  for (let g = 0; g <= 3; g++) {
    const y = P.t + (ih * g) / 3;
    s += `<line x1="${P.l}" y1="${y}" x2="${W - P.r}" y2="${y}" stroke="#2a2d33" stroke-width="1"/>`;
    s += `<text x="${P.l - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#8a8a88">${Math.round((maxViews * (3 - g)) / 3)}</text>`;
    s += `<text x="${W - P.r + 6}" y="${y + 4}" font-size="10" fill="#8a8a88">${((maxCr * 1.15 * (3 - g)) / 3 * 100).toFixed(0)} %</text>`;
  }
  // sloupce zobrazení
  totalViews.forEach((n, i) => {
    if (!n) return;
    s += `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${yV(n).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - P.b - yV(n)).toFixed(1)}" fill="#3a3f4a" rx="1"/>`;
  });
  // linky CR
  variants.forEach((v, vi) => {
    const pts = [];
    crSeries[vi].forEach((c, i) => {
      if (c != null) pts.push(`${x(i).toFixed(1)},${yC(c).toFixed(1)}`);
    });
    if (pts.length > 1) {
      s += `<polyline points="${pts.join(' ')}" fill="none" stroke="${PALETTE[vi % PALETTE.length]}" stroke-width="2" stroke-linejoin="round"/>`;
    }
    crSeries[vi].forEach((c, i) => {
      if (c != null)
        s += `<circle cx="${x(i).toFixed(1)}" cy="${yC(c).toFixed(1)}" r="2.5" fill="${PALETTE[vi % PALETTE.length]}"/>`;
    });
  });
  // popisky X (max ~7)
  const step = Math.max(1, Math.round(daysArr.length / 7));
  daysArr.forEach((d, i) => {
    if (i % step === 0 || i === daysArr.length - 1) {
      s += `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#8a8a88">${d.slice(8)}.${d.slice(5, 7)}.</text>`;
    }
  });
  s += `<text x="${P.l}" y="${P.t - 3}" font-size="10" fill="#8a8a88">▮ zobrazení / den · ― CR varianty</text>`;
  return s + '</svg>';
}

// --- dashboard -----------------------------------------------------------------

async function renderDashboard(request, env, url) {
  const state = await getState(env, { fresh: true });
  const shownId = url.searchParams.get('test') || state.active_test_id;
  const test = shownId ? getAnyTest(shownId) : null; // i archivované — historie
  const days = url.searchParams.get('days') === '7' ? 7 : 30;

  let body = '<p class="muted">Žádný test není definovaný v tests.json.</p>';

  if (test) {
    const [variants, series, goalsRows, bd] = await Promise.all([
      testStats(env, test),
      timeseries(env, test.id, days),
      goalBreakdown(env, test.id),
      breakdown(env, test.id),
    ]);
    const isActive = !test.archived && test.id === state.active_test_id;
    const lockedWinner = test.archived ? test.winner || null : state.locked?.[test.id] || null;
    const guard = sampleTier(test, variants, isActive ? state.started_at : null);
    const probs = test.archived || guard.tier !== 'collecting' ? pBest(variants) : null; // archiv: historie se čte i na malém vzorku
    const control = variants[0];
    const totalWeight = variants.reduce((s, v) => s + (v.weight || 1), 0) || 1;
    const goalNames = sortGoals(new Set([...GOAL_ORDER, ...goalsRows.map((g) => g.goal)]));
    const goalsBy = {};
    for (const g of goalsRows) (goalsBy[g.variant_id] ||= {})[g.goal] = g.n;

    // -- stavový řádek + guard --
    const statusLine = test.archived
      ? `📦 Archivovaný test (${esc(test.ran || 'termín neuveden')})${lockedWinner ? ` — vítěz <b>${esc(lockedWinner)}</b> je zapečený v HTML` : ''}. Jen historická data.`
      : lockedWinner
      ? `🔒 Zamčený vítěz: <b>${esc(lockedWinner)}</b> — servíruje se všem. Řekni Claudovi, ať ho zapeče do HTML a test archivuje.`
      : isActive
        ? state.status === 'paused'
          ? '⏸ Test je pozastavený — všichni vidí kontrolu, nic se neměří.'
          : `▶️ Test běží <b>${guard.days}. den</b>.`
        : 'ℹ️ Tento test není aktivní — jen náhled dat.';
    const guardLine = test.archived
      ? esc(test.result || '')
      : guard.tier === 'collecting'
        ? `⏳ <b>Sbírá se vzorek</b> — ${fmtN(guard.minViews)}/${fmtN(guard.nBig)} zobrazení na variantu, den ${guard.days}/${guard.minDays}. Vítěz se zatím nehlásí.`
        : guard.tier === 'provisional'
          ? `🌗 Vzorek ${fmtN(guard.minViews)}/${fmtN(guard.nSmall)} — průkazné jen pro velké rozdíly (≳10 pb).`
          : `✅ Vzorek dostatečný (${fmtN(guard.minViews)} na variantu, ${guard.days} dní).`;

    // -- karty variant --
    const cards = variants
      .map((v, i) => {
        const color = PALETTE[i % PALETTE.length];
        const isControl = i === 0;
        const isWinner = v.id === lockedWinner;
        const p = probs ? probs[v.id] : null;
        const diff =
          isControl || !control.views || !v.views
            ? null
            : (v.cr - control.cr) * 100;
        let prevStep = v.clicks;
        const goalCells = goalNames
          .map((g) => {
            const n = goalsBy[v.id]?.[g] || 0;
            const rel = prevStep
              ? ` <span class="muted">(${fmtPct(n / prevStep, 0)} ${esc(GOAL_OF[g] || 'z předchozího')})</span>`
              : '';
            prevStep = n;
            return `<div class="mrow"><span>${esc(GOAL_LABELS[g] || g)}</span><b>${fmtN(n)}</b>${rel}</div>`;
          })
          .join('');
        return `
        <div class="card${isWinner ? ' winner' : ''}" style="--vc:${color}">
          <div class="chead">
            <span class="dot"></span><b>${esc(v.id)}</b>
            ${isControl ? '<span class="tag">kontrola</span>' : ''}
            ${isWinner ? '<span class="tag win">🔒 vítěz</span>' : ''}
            <span class="w muted">${Math.round(((v.weight || 1) / totalWeight) * 100)} % trafficu</span>
          </div>
          <p class="note">${esc(v.note || '')}</p>
          <code class="url" title="Kód v adrese dotazníku — schválně nečitelný">v=${esc(v.token || `${test.slot}_${v.id}`)}</code>
          <div class="big">${v.views ? fmtPct(v.cr) : '—'}<span class="muted"> CR</span></div>
          <div class="mrow"><span>Zobrazení</span><b>${fmtN(v.views)}</b></div>
          <div class="mrow"><span>Kliky na dotazník</span><b>${fmtN(v.clicks)}</b></div>
          ${goalCells}
          ${diff != null ? `<div class="mrow"><span>vs. kontrola</span><b class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)} pb</b></div>` : ''}
          <div class="pbest">
            <div class="plabel"><span>P(nejlepší)</span><b>${p != null ? fmtPct(p, 0) : 'sbírá se vzorek'}</b></div>
            <div class="pbar"><i style="width:${p != null ? Math.round(p * 100) : 0}%"></i></div>
          </div>
          <div class="cbtns">
            ${test.archived ? '' : `<a class="btn" href="/?preview=${encodeURIComponent(v.id)}" target="_blank" rel="noopener">👁 Náhled webu</a>`}
            ${
              isActive && !lockedWinner
                ? `<button data-action="lock" data-variant="${esc(v.id)}">🔒 Zamknout</button>`
                : ''
            }
          </div>
        </div>`;
      })
      .join('');

    // -- trychtýř: 1. zobrazení -> 2. klik -> dynamická patra podle goalů,
    //    procento se vždy vztahuje k předchozímu patru --
    const goalCols = goalNames;
    const funnelHead = goalCols
      .map((g, i) => `<th>${i + 3}. ${esc(GOAL_LABELS[g] || g)}</th>`)
      .join('');
    const funnelRows = variants
      .map((v, i) => {
        let prev = v.clicks;
        const cells = goalCols
          .map((g) => {
            const n = goalsBy[v.id]?.[g] || 0;
            const pct = prev && n ? ` <span class="muted">${fmtPct(n / prev)}</span>` : '';
            prev = n;
            return `<td>${fmtN(n)}${pct}</td>`;
          })
          .join('');
        return `<tr>
          <td><span class="dot" style="--vc:${PALETTE[i % PALETTE.length]}"></span> ${esc(v.id)}</td>
          <td>${fmtN(v.views)}</td>
          <td>${fmtN(v.clicks)} <span class="muted">${v.views ? fmtPct(v.cr) : ''}</span></td>
          ${cells}
        </tr>`;
      })
      .join('');

    // -- rozpady --
    const posRows = bd.pos
      .map((r) => `<tr><td>${esc(r.cta_pos)}</td><td>${esc(r.variant_id)}</td><td>${r.clicks}</td></tr>`)
      .join('');
    const devRows = bd.device
      .map(
        (r) =>
          `<tr><td>${esc(r.device)}</td><td>${esc(r.variant_id)}</td><td>${r.views}</td><td>${r.clicks}</td><td>${
            r.views ? fmtPct(r.clicks / r.views) : '—'
          }</td></tr>`
      )
      .join('');

    // -- ovládání --
    let controls = '';
    if (isActive && !lockedWinner) {
      controls = `${
        state.status === 'running'
          ? '<button data-action="pause">⏸ Pozastavit</button>'
          : '<button data-action="resume">▶️ Obnovit</button>'
      } <button data-action="next">⏭ Spustit další test z fronty</button>`;
    } else if (isActive && lockedWinner) {
      controls = '<button data-action="next">⏭ Spustit další test z fronty</button>';
    }

    const legend = variants
      .map(
        (v, i) =>
          `<span class="leg"><span class="dot" style="--vc:${PALETTE[i % PALETTE.length]}"></span>${esc(v.id)}</span>`
      )
      .join(' ');

    const goalKey = env.GOAL_KEY || 'DOPLN-GOAL-KEY';
    const origin = url.origin;

    body = `
      <div class="head">
        <div>
          <h2>${esc(test.label || test.id)}</h2>
          <p class="muted">slot <code>${esc(test.slot)}</code> · stránka <code>${esc(test.page)}</code> · ${variants.length} varianty</p>
          ${test.hypothesis ? `<p class="hyp">🧪 ${esc(test.hypothesis)}</p>` : ''}
        </div>
        <div class="statusbox"><p>${statusLine}</p><p>${guardLine}</p></div>
      </div>
      <div class="cards">${cards}</div>
      ${controls ? `<div class="controls">${controls}<span class="muted"> Změny se na webu projeví do minuty.</span></div>` : ''}
      <section>
        <h3>Vývoj v čase <span class="switch">${
          days === 7
            ? `<b>7 dní</b> · <a href="?test=${encodeURIComponent(test.id)}&days=30">30 dní</a>`
            : `<a href="?test=${encodeURIComponent(test.id)}&days=7">7 dní</a> · <b>30 dní</b>`
        }</span></h3>
        <div class="chart">${chartSvg(series, variants, days)}</div>
        <p class="legend">${legend}</p>
      </section>
      <section>
        <h3>Trychtýř</h3>
        <table>
          <tr><th>Varianta</th><th>1. Zobrazení stránky</th><th>2. Klik na dotazník</th>${funnelHead}</tr>
          ${funnelRows}
        </table>
        ${goalNames.length === 0 ? '<p class="muted">Formuláře a rezervace se zatím neměří — vlož měřicí kódy na děkovnou a rezervační stránku (návod dole v nápovědě).</p>' : ''}
      </section>
      <details><summary>Rozpad podle pozice CTA a zařízení</summary>
        <div class="cols">
          <table><tr><th>Pozice CTA</th><th>Var.</th><th>Kliky</th></tr>${posRows || '<tr><td colspan="3" class="muted">zatím nic</td></tr>'}</table>
          <table><tr><th>Zařízení</th><th>Var.</th><th>Zobr.</th><th>Kliky</th><th>CR</th></tr>${devRows || '<tr><td colspan="5" class="muted">zatím nic</td></tr>'}</table>
        </div>
      </details>
      <details><summary>💡 Jak se s tím pracuje</summary>
        <div class="help">
          <p><b>Nová varianta / nový test:</b> napiš Claudovi do chatu, co chceš otestovat (titulek, video, text tlačítka, popisek…) a texty variant. Upraví <code>tests.json</code> a nasadí — do minuty běží. Žádné klikání tady.</p>
          <p><b>Kód v adrese:</b> návštěvník vidí v adrese dotazníku jen krátký nic neříkající kód (např. <code>v=r7k2</code>) — z něj nejde poznat, že běží test, ani co je za variantu. Kód si můžeš určit sám („pro tuhle variantu dej do URL xyz"), jinak ho Claude vygeneruje.</p>
          <p><b>Jeden odkaz do reklamy:</b> vždy jen <code>https://leadershiprestart.cz/</code> (+ tvoje UTM). Rozdělení návštěvníků řeší server sám; nová varianta ani nový test na reklamě nic nemění.</p>
          <p><b>Náhled:</b> tlačítko „👁 Náhled webu" u varianty otevře web s tou variantou. Nic z toho se nepočítá do statistik — ani zobrazení, ani proklik na dotazník.</p>
          <p><b>Měření kroků trychtýře</b> — tři HTML bloky (T123) na silabytsebou.cz.
          Kód varianty dorazí na stránku dotazníku, proto se musí hned uložit — jinak se
          při přesměrování ztratí a další kroky nemají co změřit.</p>
          <p>1) <b>Stránka dotazníku</b> (/kvalifikace_do_vyzvy) — jen si zapamatuje variantu, nic neměří:</p>
          <pre>&lt;script&gt;
(function(){var v=new URLSearchParams(location.search).get('v');if(!v)return;
try{localStorage.setItem('lr_v',JSON.stringify({v:v,t:Date.now()}))}catch(e){}})();
&lt;/script&gt;</pre>
          <p>2) <b>Stránka po odeslání dotazníku</b> (/rezervace_vyzva) — připíše „Vyplněný formulář":</p>
          <pre>&lt;script&gt;
(function(){var v=new URLSearchParams(location.search).get('v');
if(!v){try{var s=JSON.parse(localStorage.getItem('lr_v')||'null');
if(s&amp;&amp;Date.now()-s.t&lt;2592000000)v=s.v}catch(e){}}
if(!v)return;
new Image().src='${origin}/api/goal?v='+encodeURIComponent(v)+'&amp;g=form&amp;k=${esc(goalKey)}';})();
&lt;/script&gt;</pre>
          <p>3) <b>Potvrzení rezervace</b> (/hotovo) — připíše „Rezervace schůzky":</p>
          <pre>&lt;script&gt;
(function(){var v=new URLSearchParams(location.search).get('v');
if(!v){try{var s=JSON.parse(localStorage.getItem('lr_v')||'null');
if(s&amp;&amp;Date.now()-s.t&lt;2592000000)v=s.v}catch(e){}}
if(!v)return;
new Image().src='${origin}/api/goal?v='+encodeURIComponent(v)+'&amp;g=rezervace&amp;k=${esc(goalKey)}';})();
&lt;/script&gt;</pre>
          <p class="muted">Uloženo v localStorage s platností 30 dní — přežije i odskok na
          rezervační widget (api.swipescale.cz) a návrat zpět. Bez bloku č. 1 neměří nic.</p>
        </div>
      </details>`;
  }

  const queueHtml = getQueue()
    .map((t) => {
      const flag =
        t.id === state.active_test_id
          ? '▶️ aktivní'
          : state.locked?.[t.id]
            ? `🔒 vítěz ${esc(state.locked[t.id])}`
            : '⏳ ve frontě';
      const startBtn =
        t.id !== state.active_test_id && !state.locked?.[t.id]
          ? ` <button class="mini" data-action="activate" data-test="${esc(t.id)}">▶ Spustit tento test</button>`
          : '';
      return `<li><a href="/ab/?test=${encodeURIComponent(t.id)}">${esc(t.label || t.id)}</a> <span class="muted">(${esc(t.slot)} na ${esc(t.page)}, ${t.variants.length} var.)</span> — ${flag}${startBtn}</li>`;
    })
    .join('');

  // -- checklist: co už se testovalo (archiv + zamčené), co běží/čeká, co dál --
  const doneHtml = getAllTests()
    .filter((t) => t.archived || state.locked?.[t.id])
    .map((t) => {
      const winner = t.archived ? t.winner : state.locked[t.id];
      const badge = !t.archived
        ? '<span class="tag win">🔒 zamčeno, čeká na zapečení</span>'
        : winner
          ? `<span class="tag win">✅ vítěz ${esc(winner)}</span>`
          : '<span class="tag">— bez vítěze</span>';
      return `<li class="chk">
        <div><a href="/ab/?test=${encodeURIComponent(t.id)}">${esc(t.label || t.id)}</a>
        <span class="muted">(${esc(t.slot)}${t.ran ? ` · ${esc(t.ran)}` : ''})</span> ${badge}</div>
        ${t.result ? `<p class="res">${esc(t.result)}</p>` : ''}
      </li>`;
    })
    .join('');

  const PRIO = { 1: ['Příště', '#5fd39a'], 2: ['Brzy', '#f7b955'], 3: ['Někdy', '#8b93a7'] };
  const ideasHtml = getPlanIdeas()
    .map((i) => {
      const [pl, pc] = PRIO[i.priority] || ['—', '#8b93a7'];
      return `<li class="idea">
        <div class="ihead"><span class="prio" style="--pc:${pc}">${pl}</span>
          <span class="muted">${esc(i.area || '')}</span> · <b>${esc(i.title || '')}</b>
          <span class="tag">práce: ${esc(i.effort || '?')}</span></div>
        <p>${esc(i.hypothesis || '')}</p>
        <p class="muted">Metrika: ${esc(i.metric || '—')}${i.how ? ` · Jak: ${esc(i.how)}` : ''}</p>
      </li>`;
    })
    .join('');

  const checklistHtml = `
    <h3>📋 Checklist testování</h3>
    <details open><summary>✅ Otestováno (${getAllTests().filter((t) => t.archived || state.locked?.[t.id]).length})</summary>
      <ul class="chklist">${doneHtml || '<li class="muted">zatím nic</li>'}</ul>
    </details>
    <details open><summary>▶️ Běží / ⏳ ve frontě (${getQueue().filter((t) => !state.locked?.[t.id]).length})</summary>
      <ul>${queueHtml || '<li class="muted">prázdná — přidej test do tests.json'}</ul>
    </details>
    <details open><summary>💡 Návrhy, co testovat dál (${getPlanIdeas().length})</summary>
      <p class="muted">Backlog z <code>worker/plan.json</code>. Chceš některý spustit? Napiš Claudovi „udělej z návrhu X test“ — připraví varianty a nasadí.</p>
      <ul class="chklist">${ideasHtml || '<li class="muted">žádné nápady</li>'}</ul>
    </details>`;

  const html = `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>A/B testy — leadershiprestart.cz</title>
<style>
  :root{--bg:#0f1115;--panel:#161920;--line:#2a2d33;--fg:#e8e8e6;--mut:#8a8a88;--acc:#6ea8fe}
  *{box-sizing:border-box}
  body{font:15px/1.5 -apple-system,system-ui,sans-serif;background:var(--bg);color:var(--fg);max-width:960px;margin:0 auto;padding:24px}
  h1{font-size:21px;margin:0 0 18px} h2{font-size:18px;margin:0} h3{font-size:15px;margin:22px 0 8px}
  a{color:var(--acc)} .muted{color:var(--mut);font-size:13px} code{background:#1d2026;padding:1px 5px;border-radius:5px;font-size:12.5px}
  .head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start;margin-bottom:14px}
  .statusbox{font-size:13.5px;text-align:right} .statusbox p{margin:2px 0}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:7px}
  .card.winner{border-color:#3f8f5f;background:rgba(80,200,120,.05)}
  .chead{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  .dot{width:10px;height:10px;border-radius:50%;background:var(--vc,#888);display:inline-block;flex:none;vertical-align:-1px}
  .tag{font-size:11px;border:1px solid var(--line);border-radius:99px;padding:1px 8px;color:var(--mut)}
  .tag.win{color:#5fd39a;border-color:#3f8f5f}
  .w{margin-left:auto;font-size:12px}
  .note{margin:0;font-size:13px;color:#c5c5c2;min-height:2.6em}
  .url{align-self:flex-start}
  .big{font-size:26px;font-weight:700;margin-top:2px}
  .mrow{display:flex;justify-content:space-between;gap:8px;font-size:13.5px;border-top:1px solid var(--line);padding-top:6px}
  .up{color:#5fd39a}.down{color:#e0736e}
  .pbest{margin-top:2px}.plabel{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:3px}
  .pbar{height:6px;background:#22252b;border-radius:99px;overflow:hidden}
  .pbar i{display:block;height:100%;background:var(--vc,#6ea8fe);border-radius:99px}
  .cbtns{display:flex;gap:8px;margin-top:4px;flex-wrap:wrap}
  button,.btn{background:#1d2026;color:var(--fg);border:1px solid #3a3d43;border-radius:8px;padding:7px 11px;cursor:pointer;font-size:13px;text-decoration:none;display:inline-block}
  button:hover,.btn:hover{border-color:var(--acc)}
  button.mini{padding:2px 8px;font-size:12px;margin-left:6px}
  .controls{margin:16px 0;padding:12px 14px;border:1px solid var(--line);border-radius:10px}
  .chart{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px}
  .chart svg{width:100%;height:auto;display:block}
  .switch{font-weight:400;font-size:13px;color:var(--mut);margin-left:8px}
  .legend{font-size:13px}.leg{margin-right:14px}
  table{border-collapse:collapse;width:100%;margin:8px 0}
  th,td{padding:7px 10px;border-bottom:1px solid var(--line);text-align:left;font-size:13.5px} th{color:var(--mut);font-weight:600}
  .cols{display:flex;gap:24px;flex-wrap:wrap}.cols table{width:auto;min-width:240px}
  details{margin:16px 0}summary{cursor:pointer;color:var(--mut)}
  .help p{font-size:14px}.help pre{background:#1d2026;border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12px;overflow-x:auto}
  ul{padding-left:20px}li{margin:4px 0}
  .hyp{margin:6px 0 0;font-size:13px;color:#c5c5c2;max-width:560px}
  details[open]>summary{margin-bottom:6px}
  .chklist{list-style:none;padding:0}
  .chk,.idea{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:8px 0}
  .chk .res,.idea p{margin:5px 0 0;font-size:13px;color:#c5c5c2}
  .ihead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .prio{font-size:11px;font-weight:700;border-radius:99px;padding:1px 8px;color:#0f1115;background:var(--pc,#8b93a7)}
</style></head><body>
<h1>A/B testy — leadershiprestart.cz</h1>
${body}
${checklistHtml}
<p class="muted">Tvoje návštěvy se od otevření téhle stránky nepočítají do statistik (cookie ab_x).</p>
<script>
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  if (b.dataset.action === 'lock' && !confirm('Zamknout variantu "' + b.dataset.variant + '" jako vítěze? Bude se servírovat všem.')) return;
  if (b.dataset.action === 'activate' && !confirm('Spustit tento test? Ukončí se tím sběr dat běžícího testu.')) return;
  b.disabled = true;
  const payload = {};
  if (b.dataset.variant) payload.variant = b.dataset.variant;
  if (b.dataset.test) payload.test = b.dataset.test;
  const res = await fetch('/ab/api/' + b.dataset.action, {
    method: 'POST',
    headers: { 'X-AB-Admin': '1', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) alert('Chyba: ' + (await res.text()));
  location.reload();
});
</script></body></html>`;

  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  // Majitel se návštěvou adminu trvale vyloučí z měření.
  const cookies = parseCookies(request);
  if (cookies[COOKIE_EXCLUDE] !== '1') headers.append('Set-Cookie', cookie(COOKIE_EXCLUDE, '1', 365 * 86400));
  return new Response(html, { headers });
}
