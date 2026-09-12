// JSON stav A/B testování pro centrální admin (admin.leadershiprestart.cz).
// GET /ab/api/status (Basic auth jako /ab). Nic nemutuje.
import TESTS from '../tests.json';
import PLAN from '../plan.json';
import { getState, getQueue } from './config.js';
import { testStats, goalBreakdown, pBest, sampleTier } from './stats.js';

export async function renderStatus(request, env) {
  const state = await getState(env, { fresh: true });
  const queueIds = getQueue().map((t) => t.id);
  const tests = [];
  for (const t of TESTS.tests) {
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
    tests.push({
      id: t.id, label: t.label, slot: t.slot, page: t.page, hypothesis: t.hypothesis || '', queue_order: t.queue_order ?? null,
      archived: !!t.archived, winner: t.winner || state.locked?.[t.id] || null, ran: t.ran || null, result: t.result || '',
      min_days: t.min_days ?? 7, status, in_queue: queueIds.includes(t.id),
      started_at: isActive ? state.started_at : null,
      tier, variants: variants.map((v) => ({ ...v, goals: goals[v.id] || {}, pbest: probs ? probs[v.id] : null })),
    });
  }
  return new Response(JSON.stringify({
    site: new URL(request.url).hostname, now: new Date().toISOString(),
    state: { active_test_id: state.active_test_id, status: state.status, started_at: state.started_at, locked: state.locked || {} },
    tests, ideas: PLAN.ideas || [],
  }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
