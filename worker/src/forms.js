// Dotazníky: cesty na této doméně, které se průhledně přeposílají do aplikace Dotazníky
// (Cloudflare Worker `dotazniky`, admin na admin.leadershiprestart.cz). Formulář tak běží
// pod leadershiprestart.cz, odpovědi se ukládají a rozesílají v aplikaci Dotazníky.
// POZOR: origin musí být workers.dev adresa, ne admin.leadershiprestart.cz — stejná zóna
// by fetch poslala na DNS origin místo na worker (viz stejná past v Dotaznících).
export const FORM_PATHS = {
  // Leadership Up-Grade: LP /up-great-lp → dotazník → informační schůzka (Calendly)
  '/up-great-dotaznik': 'up-great',
  '/up-great-dotazník': 'up-great',
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
  if (target.startsWith('/f/') || target.startsWith('/r/')) headers.set('cache-control', 'no-store');
  return new Response(r.body, { status: r.status, headers });
}
