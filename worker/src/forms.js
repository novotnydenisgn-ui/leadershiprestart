// Dotazníky: cesty na této doméně, které se průhledně přeposílají do aplikace Dotazníky
// (Cloudflare Worker `dotazniky`, admin na admin.leadershiprestart.cz). Formulář tak běží
// pod leadershiprestart.cz, odpovědi se ukládají a rozesílají v aplikaci Dotazníky.
// POZOR: origin musí být workers.dev adresa, ne admin.leadershiprestart.cz — stejná zóna
// by fetch poslala na DNS origin místo na worker (viz stejná past v Dotaznících).
export const FORM_PATHS = {
  // Leadership Up-Grade: LP /up-great-lp → dotazník → informační schůzka (Calendly)
  '/up-great-dotaznik': 'up-great',
  '/up-great-dotazník': 'up-great',
  // Diagnóza po nástupu (Up-Grade / Launch Boost / Elite): kopie dotazníku leadershipupgreat.denisnovotny.cz + připravenost na implementaci
  '/up-great-diagnoza': 'up-great-diagnoza',
  '/up-great-diagnóza': 'up-great-diagnoza',
  // Kariéra: stránka /kariera → náborový dotazník „Výběrové řízení: Coach“ (Dotazníky, složka Leadership Restart)
  '/kariera-dotaznik': 'kariera-coach',
  '/kariera-dotazník': 'kariera-coach',
  // Dárek pro účastníky programu: dotazník pro doručení balíčku (styl „Výrazný“) → Google tabulka „Balíček_leadership restart“
  '/darek': 'darek',
  '/dárek': 'darek',
  // Black Friday – dárková karta: po platbě (Stripe → /black-friday-dekujeme) kupující doplní údaje pro kartu
  // (dotazník „Dárková karta – údaje“, slug darkova-karta) → Velín pošle e-mail s kartou a upozorní Denise
  '/darkova-karta': 'darkova-karta',
  '/dárková-karta': 'darkova-karta',
  // Výzva (kopie Tilda funnelu silabytsebou.cz): kvalifikace → rezervace
  '/kvalifikace-vyzva': 'kvalifikace-vyzva',
  '/kvalifikace_do_vyzvy': 'kvalifikace-vyzva',
  // Případová studie zdarma (funnel z reklamy): dotazník → /rezervace (Velín, projekt Leadership Restart)
  '/pripadova-studie-dotaznik': 'pripadova-studie',
};
// Stránky funnelu z Velínu (Velín → projekt → Stránky): /<cesta> → /p/<slug>
export const PAGE_PATHS = {
  '/rezervace-vyzva': 'rezervace-vyzva',
  '/rezervace_vyzva': 'rezervace-vyzva',
  // Případová studie zdarma: opt-in → (dotazník) → rezervace → studie z e-mailu → rezervováno; nevhodní → děkujeme za zájem
  '/pripadova-studie-ziskat': 'pripadova-studie-ziskat',
  '/rezervace': 'rezervace',
  '/pripadova-studie': 'pripadova-studie',
  '/rezervovano': 'rezervovano',
  '/dekujeme-za-zajem': 'dekujeme-za-zajem',
  // Šablony pro klienty tu nejsou – jsou jen ve Velínu za přihlášením (index.js, SABLONY → přesměrování)
};
// Rezervace termínu (po kvalifikaci v dotazníku): /<cesta> → stránka /r/<slug> v aplikaci Dotazníky
export const BOOKING_PATHS = {};
const PASS_PREFIXES = ['/engine/', '/api/submit/', '/api/public/', '/r/', '/f/'];

export async function handleForms(request, env, url) {
  const origin = env.FORMS_ORIGIN;
  if (!origin) return null;
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { path = url.pathname; }
  path = path.replace(/\/+$/, '') || '/';
  let target = null;
  if (FORM_PATHS[path]) target = `/f/${FORM_PATHS[path]}${url.search}`;
  else if (BOOKING_PATHS[path]) target = `/r/${BOOKING_PATHS[path]}${url.search}`;
  else if (PAGE_PATHS[path]) target = `/p/${PAGE_PATHS[path]}${url.search}`;
  else if (PASS_PREFIXES.some(p => url.pathname.startsWith(p))) target = url.pathname + url.search;
  if (!target) return null;
  const upstream = new Request(origin + target, request);
  upstream.headers.set('X-Forwarded-Host', url.host);
  // IP návštěvníka pro Meta Conversions API v Dotaznících (subrequest by ji jinak ztratil)
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) upstream.headers.set('X-Forwarded-For', ip);
  const r = await fetch(upstream);
  const headers = new Headers(r.headers);
  // fetch tělo už dekódoval – hlavičky o kompresi by rozbily odpověď
  ['content-encoding', 'content-length', 'transfer-encoding'].forEach(h => headers.delete(h));
  if (target.startsWith('/f/') || target.startsWith('/r/') || target.startsWith('/p/')) headers.set('cache-control', 'no-store');
  return new Response(r.body, { status: r.status, headers });
}
