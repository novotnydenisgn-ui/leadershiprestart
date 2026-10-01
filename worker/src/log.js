// Měření A/B testů se posílá do Velínu (POST <FORMS_ORIGIN>/api/public/ab/event), statistiky jsou tam.
// Volá se přes ctx.waitUntil — nesmí blokovat odpověď. Deduplikaci kliků a kroků trychtýře dělá Velín.

export function deviceFrom(ua) {
  return /Mobi|Android|iPhone|iPad/i.test(ua || '') ? 'mobile' : 'desktop';
}

async function send(env, event) {
  if (!env.FORMS_ORIGIN || !env.VELIN_SITE) return;
  try {
    const r = await fetch(`${env.FORMS_ORIGIN}/api/public/ab/event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ site: env.VELIN_SITE, ...event }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) console.error('ab event', r.status);
  } catch (e) {
    console.error('ab event failed', e);
  }
}

export function logView(env, { testId, variantId, page, utm, device, visitor }) {
  return send(env, {
    type: 'view', test: testId, variant: variantId, page, device, visitor,
    utm: { source: utm.get('utm_source') || null, medium: utm.get('utm_medium') || null, campaign: utm.get('utm_campaign') || null },
  });
}

export function logClick(env, { testId, variantId, page, ctaPos, device, visitor }) {
  return send(env, { type: 'click', test: testId, variant: variantId, page, pos: ctaPos, device, visitor });
}

// Navazující krok trychtýře (vyplněný formulář, rezervace…) podle kódu varianty z adresy (v=…).
export function logGoal(env, { token, goal, device, visitor }) {
  return send(env, { type: 'goal', token, goal, device, visitor });
}
