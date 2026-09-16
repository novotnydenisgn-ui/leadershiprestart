// JSON stav A/B testování pro centrální admin (admin.leadershiprestart.cz).
// GET /ab/api/status            – přehled všech testů (Basic auth jako /ab). Nic nemutuje.
// GET /ab/api/test/:id?days=30  – detail jednoho testu: karty, denní řada pro graf, rozpady, měřicí klíč.
import TESTS from '../tests.json';
import PLAN from '../plan.json';
import { getState, getQueue, getAnyTest } from './config.js';
import { testStats, timeseries, goalBreakdown, breakdown, pBest, sampleTier } from './stats.js';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

async function summarize(env, state, t, queueIds) {
  let status = 'queued';
  if (t.archived) status = 'archived';
  else if (state.locked?.[t.id]) status = 'locked';
  else if (t.id === state.active_test_id) status = state.status === 'paused' ? 'paused' : 'running';
  const isActive = !t.archived && t.id === state.active_test_id;
  let variants = [], tier = null, probs = null, goals = {};
  try {
    variants = await testStats(env, t);
    const gRows = await goalBreakdown(env, t.id);
    for (const g of gRows) (goals[g.variant_id] ||= {})[g.goal] = g.n;
    tier = sampleTier(t, variants, isActive ? state.started_at : null);
    probs = t.archived || tier.tier !== 'collecting' ? pBest(variants, 4000) : null;
  } catch (e) { variants = t.variants.map((v) => ({ id: v.id, token: v.token || null, note: v.note || '', weight: v.weight ?? 1, views: 0, clicks: 0, goals: 0, cr: 0 })); }
  return {
    id: t.id, label: t.label, slot: t.slot, page: t.page, type: t.type || 'inner_html', hypothesis: t.hypothesis || '', queue_order: t.queue_order ?? null,
    archived: !!t.archived, winner: t.winner || state.locked?.[t.id] || null, ran: t.ran || null, result: t.result || '',
    min_days: t.min_days ?? 7, min_n_big: t.min_n_big ?? 250, min_n_small: t.min_n_small ?? 900,
    status, in_queue: queueIds.includes(t.id),
    started_at: isActive ? state.started_at : null,
    tier, variants: variants.map((v) => ({ ...v, goals: goals[v.id] || {}, pbest: probs ? probs[v.id] : null })),
  };
}

export async function renderStatus(request, env) {
  const state = await getState(env, { fresh: true });
  const queueIds = getQueue().map((t) => t.id);
  const tests = [];
  for (const t of TESTS.tests) tests.push(await summarize(env, state, t, queueIds));
  return new Response(JSON.stringify({
    site: new URL(request.url).hostname, origin: new URL(request.url).origin, now: new Date().toISOString(),
    state: { active_test_id: state.active_test_id, status: state.status, started_at: state.started_at, locked: state.locked || {} },
    tests, ideas: PLAN.ideas || [],
  }), { headers: JSON_HEADERS });
}

export async function renderTestDetail(request, env, testId) {
  const url = new URL(request.url);
  const t = getAnyTest(testId);
  if (!t) return new Response(JSON.stringify({ error: `neznámý test "${testId}"` }), { status: 404, headers: JSON_HEADERS });
  const days = url.searchParams.get('days') === '7' ? 7 : 30;
  const state = await getState(env, { fresh: true });
  const queueIds = getQueue().map((x) => x.id);
  const [test, series, bd] = await Promise.all([
    summarize(env, state, t, queueIds),
    timeseries(env, t.id, days).catch(() => []),
    breakdown(env, t.id).catch(() => ({ pos: [], device: [] })),
  ]);
  return new Response(JSON.stringify({
    site: url.hostname, origin: url.origin, now: new Date().toISOString(), days,
    test, series, breakdown: bd,
    goal_key: env.GOAL_KEY || null,
  }), { headers: JSON_HEADERS });
}
