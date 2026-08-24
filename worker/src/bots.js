// Filtrace botů, vlastních návštěv a preview režimu.
// Bot => vždy kontrolní varianta, žádná cookie, žádný log (konzistence pro SEO/scrapery).
const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|yandex|baidu|duckduck|facebookexternalhit|meta-externalagent|whatsapp|telegram|skype|slack|discord|twitterbot|linkedin|pinterest|embedly|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|scan|fetch\b|curl|wget|python-requests|python-urllib|aiohttp|axios|node-fetch|go-http-client|okhttp|java\//i;

export function isBot(ua) {
  return !ua || BOT_RE.test(ua);
}

export function isExcluded(cookies, url) {
  return cookies.ab_x === '1' || url.searchParams.get('exclude') === '1';
}

export function previewVariant(url) {
  return url.searchParams.get('preview');
}
