// Black Friday 2026: kolik dárkových poukazů ještě zbývá – SKUTEČNÝ počet ze Stripe (times_redeemed kupónu = zaplacené
// objednávky). Žádné vymyšlené odečítání: bez klíče vrací left = null a stránka nechá „5 z 5“.
// 1. vlna (klienti, 5.–6. 11.) = 5 kusů; Payment Link má mít limit 5 plateb (nastavuje Denis) (kupón sám má 30 i pro 2. vlnu 27. 11.).
// Klíč: Stripe → Developers → API keys → Restricted key jen s oprávněním Coupons: Read → `npx wrangler secret put STRIPE_BF_KEY`.
const COUPON = '321jE13q';
const TOTAL = 5; // kusů v aktuální vlně (Payment Link: limit dokončených plateb)
const CACHE_KEY = 'https://leadershiprestart.cz/api/bf/zbyva';

export async function bfStock(env, ctx) {
  const cache = caches.default;
  const hit = await cache.match(CACHE_KEY);
  if (hit) return hit;

  let total = TOTAL, sold = null;
  if (env.STRIPE_BF_KEY) {
    try {
      const r = await fetch(`https://api.stripe.com/v1/coupons/${COUPON}`, { headers: { Authorization: `Bearer ${env.STRIPE_BF_KEY}` } });
      if (r.ok) {
        const c = await r.json();
        sold = Number(c.times_redeemed) || 0;
      } else console.error('bf stock: stripe', r.status);
    } catch (e) { console.error('bf stock', e); }
  }
  const body = { total, sold, left: sold == null ? null : Math.max(0, total - sold) };
  const res = new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=30' },
  });
  // 30 s mezipaměť: při náporu ve čtvrtek v 10:00 se Stripe neptá každý návštěvník
  if (sold != null) ctx.waitUntil(cache.put(CACHE_KEY, res.clone()));
  return res;
}
