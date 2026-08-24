// Katalog testů (git) + lifecycle stav (KV) — rekonciliace a cache.
// Zdroj pravdy: tests.json = CO testy jsou; KV `ab:state` = KTERÝ běží a v jakém stavu.
import TESTS from '../tests.json';

const STATE_KEY = 'ab:state';
const CACHE_TTL_MS = 30_000;

// In-memory cache per isolate — výběr varianty nesmí čekat na KV při každém requestu.
let cache = { state: null, at: 0 };

export function getTests() {
  return TESTS.tests.filter((t) => !t.archived);
}

export function getTestById(id) {
  return getTests().find((t) => t.id === id) || null;
}

export function getQueue() {
  return getTests()
    .slice()
    .sort((a, b) => (a.queue_order || 0) - (b.queue_order || 0));
}

function defaultState() {
  const first = getQueue().find((t) => t.autostart) || null;
  const now = new Date().toISOString();
  return {
    active_test_id: first ? first.id : null,
    status: 'running',
    started_at: now,
    locked: {},
    mode: 'fixed',
    updated_at: now,
  };
}

export async function getState(env, { fresh = false } = {}) {
  const now = Date.now();
  if (!fresh && cache.state && now - cache.at < CACHE_TTL_MS) return cache.state;

  let state = await env.AB_KV.get(STATE_KEY, 'json');
  let dirty = false;

  if (!state) {
    state = defaultState();
    dirty = true;
  }
  // Aktivní test smazaný/archivovaný v configu → posun na další nezamčený z fronty.
  if (state.active_test_id && !getTestById(state.active_test_id)) {
    const next = getQueue().find((t) => !state.locked[t.id]);
    state.active_test_id = next ? next.id : null;
    state.started_at = new Date().toISOString();
    dirty = true;
  }

  if (dirty) await putState(env, state);
  cache = { state, at: now };
  return state;
}

export async function putState(env, state) {
  state.updated_at = new Date().toISOString();
  await env.AB_KV.put(STATE_KEY, JSON.stringify(state));
  cache = { state, at: Date.now() };
  return state;
}

// Jediné místo, kde se určují váhy variant. Fáze 2 (Thompson sampling bandita)
// = nová větev podle state.mode — beze změn ve zbytku kódu.
export function resolveWeights(test /* , state, stats */) {
  return test.variants.map((v) => ({ id: v.id, weight: v.weight ?? 1 }));
}
