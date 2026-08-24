// Zápis událostí do D1. Volá se přes ctx.waitUntil — nesmí blokovat odpověď.

export function deviceFrom(ua) {
  return /Mobi|Android|iPhone|iPad/i.test(ua || '') ? 'mobile' : 'desktop';
}

export async function logView(env, { testId, variantId, page, utm, device, visitor }) {
  try {
    await env.DB.prepare(
      `INSERT INTO events (type, test_id, variant_id, page, utm_source, utm_medium, utm_campaign, device, visitor)
       VALUES ('view', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    )
      .bind(
        testId,
        variantId,
        page,
        utm.get('utm_source') || null,
        utm.get('utm_medium') || null,
        utm.get('utm_campaign') || null,
        device,
        visitor
      )
      .run();
  } catch (e) {
    console.error('logView failed', e);
  }
}

// Navazující krok trychtýře (vyplněný formulář na silabytsebou.cz…).
// Název kroku jde do cta_pos. Dedup 10 minut — thank-you page se dá refreshnout.
export async function logGoal(env, { testId, variantId, goal, device, visitor }) {
  try {
    const dup = await env.DB.prepare(
      `SELECT 1 FROM events
       WHERE type='goal' AND visitor = ?1 AND cta_pos = ?2 AND test_id = ?3
         AND ts > strftime('%Y-%m-%dT%H:%M:%SZ','now','-10 minutes')
       LIMIT 1`
    )
      .bind(visitor, goal, testId)
      .first();
    if (dup) return;

    await env.DB.prepare(
      `INSERT INTO events (type, test_id, variant_id, cta_pos, device, visitor)
       VALUES ('goal', ?1, ?2, ?3, ?4, ?5)`
    )
      .bind(testId, variantId, goal, device, visitor)
      .run();
  } catch (e) {
    console.error('logGoal failed', e);
  }
}

export async function logClick(env, { testId, variantId, page, ctaPos, device, visitor }) {
  try {
    // Dedup: stejný návštěvník + stejná pozice CTA < 30 s => duplicitní klik ignoruj.
    const dup = await env.DB.prepare(
      `SELECT 1 FROM events
       WHERE type='click' AND visitor = ?1 AND cta_pos = ?2 AND test_id = ?3
         AND ts > strftime('%Y-%m-%dT%H:%M:%SZ','now','-30 seconds')
       LIMIT 1`
    )
      .bind(visitor, ctaPos, testId)
      .first();
    if (dup) return;

    await env.DB.prepare(
      `INSERT INTO events (type, test_id, variant_id, page, cta_pos, device, visitor)
       VALUES ('click', ?1, ?2, ?3, ?4, ?5, ?6)`
    )
      .bind(testId, variantId, page, ctaPos, device, visitor)
      .run();
  } catch (e) {
    console.error('logClick failed', e);
  }
}
