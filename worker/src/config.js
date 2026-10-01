// A/B testy se zakládají a řídí ve Velínu (admin.leadershiprestart.cz → A/B testování).
// Web si odtud jen stahuje, co má servírovat: GET <FORMS_ORIGIN>/api/public/ab/config?site=<VELIN_SITE>
// → { state: {active_test_id, status, started_at, locked:{testId: variantId}}, tests: [...] }.
// Na webu běží naráz jeden test; zamčení vítězové se ukazují všem. Když Velín neodpoví,
// použije se poslední známá konfigurace, jinak nic (web ukáže původní texty = kontrolu).

const FRESH_MS = 30_000; // po 30 s se konfigurace obnoví na pozadí
const STALE_MAX_MS = 15 * 60_000; // starší už se nepoužije
const EMPTY = { state: { active_test_id: null, status: null, started_at: null, locked: {} }, tests: [] };

// In-memory cache per isolate — výběr varianty nesmí čekat na Velín při každém requestu.
let cache = { cfg: null, at: 0, pending: null };

async function fetchConfig(env) {
  const url = `${env.FORMS_ORIGIN}/api/public/ab/config?site=${encodeURIComponent(env.VELIN_SITE)}`;
  const r = await fetch(url, { headers: { accept: 'application/json', 'x-forwarded-host': env.SITE_HOST || '' }, signal: AbortSignal.timeout(3000) });
  if (!r.ok) throw new Error(`Velín vrátil HTTP ${r.status}`);
  const d = await r.json();
  const cfg = {
    state: { ...EMPTY.state, ...(d.state || {}), locked: (d.state && d.state.locked) || {} },
    tests: Array.isArray(d.tests) ? d.tests.filter((t) => t && Array.isArray(t.variants) && t.variants.length) : [],
  };
  cache = { cfg, at: Date.now(), pending: null };
  return cfg;
}

export async function getAb(env, ctx) {
  if (!env.FORMS_ORIGIN || !env.VELIN_SITE) return EMPTY;
  const age = Date.now() - cache.at;
  if (cache.cfg && age < FRESH_MS) return cache.cfg;
  if (cache.cfg && age < STALE_MAX_MS) {
    // stale-while-revalidate: návštěvník nečeká, obnoví se na pozadí
    if (!cache.pending) {
      cache.pending = fetchConfig(env).catch((e) => { console.error('ab config', e); cache.pending = null; });
      if (ctx) ctx.waitUntil(cache.pending);
    }
    return cache.cfg;
  }
  try {
    return await fetchConfig(env);
  } catch (e) {
    console.error('ab config', e);
    return EMPTY;
  }
}

export function testById(cfg, id) {
  return (id && cfg.tests.find((t) => t.id === id)) || null;
}

// Jediné místo, kde se určují váhy variant.
export function resolveWeights(test /* , state, stats */) {
  return test.variants.map((v) => ({ id: v.id, weight: v.weight ?? 1 }));
}
