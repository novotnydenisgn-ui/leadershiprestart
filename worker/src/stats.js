// Agregace z D1 + bayesovské vyhodnocení (Beta-Bernoulli, Monte Carlo).

export async function testStats(env, test) {
  const rows = (
    await env.DB.prepare(
      `SELECT variant_id,
              SUM(CASE WHEN type='view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN type='click' THEN 1 ELSE 0 END) AS clicks,
              SUM(CASE WHEN type='goal' THEN 1 ELSE 0 END) AS goals
       FROM events WHERE test_id = ?1 GROUP BY variant_id`
    )
      .bind(test.id)
      .all()
  ).results;

  const byId = Object.fromEntries(rows.map((r) => [r.variant_id, r]));
  return test.variants.map((v) => {
    const r = byId[v.id] || { views: 0, clicks: 0, goals: 0 };
    return {
      id: v.id,
      token: v.token || null,
      note: v.note || '',
      weight: v.weight ?? 1,
      views: r.views || 0,
      clicks: r.clicks || 0,
      goals: r.goals || 0,
      cr: r.views ? r.clicks / r.views : 0,
    };
  });
}

// Denní časová řada pro graf: [{day:'2026-08-24', variant_id, views, clicks}].
export async function timeseries(env, testId, days = 30) {
  return (
    await env.DB.prepare(
      `SELECT date(ts) AS day, variant_id,
              SUM(CASE WHEN type='view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN type='click' THEN 1 ELSE 0 END) AS clicks
       FROM events
       WHERE test_id = ?1 AND ts >= strftime('%Y-%m-%dT%H:%M:%SZ','now', ?2)
       GROUP BY day, variant_id ORDER BY day`
    )
      .bind(testId, `-${days} days`)
      .all()
  ).results;
}

// Rozpad goalů podle názvu kroku (form, call, …) — trychtýř může mít víc pater.
export async function goalBreakdown(env, testId) {
  return (
    await env.DB.prepare(
      `SELECT variant_id, COALESCE(cta_pos,'form') AS goal, COUNT(*) AS n
       FROM events WHERE test_id = ?1 AND type='goal'
       GROUP BY variant_id, goal ORDER BY goal, variant_id`
    )
      .bind(testId)
      .all()
  ).results;
}

export async function breakdown(env, testId) {
  const pos = (
    await env.DB.prepare(
      `SELECT variant_id, COALESCE(cta_pos,'?') AS cta_pos, COUNT(*) AS clicks
       FROM events WHERE test_id = ?1 AND type='click'
       GROUP BY variant_id, cta_pos ORDER BY cta_pos, variant_id`
    )
      .bind(testId)
      .all()
  ).results;
  const device = (
    await env.DB.prepare(
      `SELECT variant_id, COALESCE(device,'?') AS device,
              SUM(CASE WHEN type='view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN type='click' THEN 1 ELSE 0 END) AS clicks
       FROM events WHERE test_id = ?1 GROUP BY variant_id, device ORDER BY device, variant_id`
    )
      .bind(testId)
      .all()
  ).results;
  return { pos, device };
}

// --- Beta-Bernoulli P(best) ------------------------------------------------
// Posterior každé varianty: Beta(1 + kliky, 1 + zobrazení - kliky).
// P(best) = podíl Monte Carlo tahů, ve kterých má varianta nejvyšší CR.

function randNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Marsaglia–Tsang; pro alpha < 1 boost přes U^(1/alpha).
function randGamma(alpha) {
  if (alpha < 1) {
    return randGamma(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
  }
  const d = alpha - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x;
    let v;
    do {
      x = randNormal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function randBeta(a, b) {
  const x = randGamma(a);
  const y = randGamma(b);
  return x / (x + y);
}

export function pBest(variants, iterations = 10000) {
  const wins = Object.fromEntries(variants.map((v) => [v.id, 0]));
  for (let i = 0; i < iterations; i++) {
    let best = null;
    let bestVal = -1;
    for (const v of variants) {
      const s = randBeta(1 + v.clicks, 1 + Math.max(0, v.views - v.clicks));
      if (s > bestVal) {
        bestVal = s;
        best = v.id;
      }
    }
    wins[best]++;
  }
  return Object.fromEntries(variants.map((v) => [v.id, wins[v.id] / iterations]));
}

// Vzorkové guardy: pod minimem se vítěz NEhlásí.
// tier: 'collecting' | 'provisional' (jen velké rozdíly) | 'full'
export function sampleTier(test, variants, startedAt) {
  const minViews = variants.length ? Math.min(...variants.map((v) => v.views)) : 0;
  const days = startedAt ? (Date.now() - Date.parse(startedAt)) / 86400000 : 0;
  const minDays = test.min_days ?? 7;
  const nBig = test.min_n_big ?? 250;
  const nSmall = test.min_n_small ?? 900;

  let tier = 'full';
  if (minViews < nBig || days < minDays) tier = 'collecting';
  else if (minViews < nSmall) tier = 'provisional';

  return { tier, minViews, days: Math.floor(days), minDays, nBig, nSmall };
}
