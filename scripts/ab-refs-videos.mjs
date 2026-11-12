// A/B test „Reference bez YouTube“: vygeneruje HTML varianty pro slot refs_videos na hlavní stránce
// (mřížka „Co o mě a programu říkají“). Výstup jde do Velínu jako obsah varianty testu
// (admin → A/B testy → test → varianta). Kontrola = YouTube embedy přímo v public/index.html.
//   node scripts/ab-refs-videos.mjs            → vypíše HTML
//   node scripts/ab-refs-videos.mjs --json     → JSON řetězec (pro velin_api / PUT testu)
// Videa a náhledy: public/video/ref/<klic>.mp4 + .jpg (servíruje Worker s podporou Range).
// Pořadí a texty odpovídají YouTube embedům v kontrole, ať se varianty liší jen přehrávačem.

const REFS = [
  // klíč, citát (z názvu videa na YouTube, prázdný = jen jméno), kdo, YouTube id v kontrole
  ['roman', 'Větší disciplína a firmy jednou', 'Roman', 'M6q2CLq_170'],
  ['mia', 'Díky programu podnikám dál', 'Mia', '-v6xZ6xo5w8'],
  ['eva-v-prubehu', '', 'Eva – v průběhu výzvy', 'J9Jlyw0-Jiw'],
  ['eva-po-programu', '', 'Eva – po programu', 'cbf6HUMZFt8'],
  ['adam', 'Nastartovalo to', 'Adam', 'N5T8hqXaFCk'],
  ['dalibor', '', 'Dalibor', '7cJ2fcQ0J_I'],
  ['lukas-berka', 'Neskutečně doporučuji', 'Lukáš Berka', 'c1EyZpkdmiY'],
  ['petr-galaxy-riders', 'Odvaha do nových kroků', 'majitel firmy Galaxy riders', '347l1tHpooM'],
  ['andelka', 'Nový nadhled, doporučuji', 'Andělka R.', 'bU3qbJcYPGk'],
  ['david', 'Udělal jsem konečně ten krok…', 'David S.', 'Iivs0hrn_VE'],
  ['marie', 'Jsem šťastná a zjistila jsem, že výzvy miluju', 'Marie E.', 'yzCJE_t99B8'],
  ['lukas-scorvan', 'Program mi změnil pohled na podnikání', 'Lukáš Scorvan', 'Lt9ly4qTcf0'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

const card = ([key, quote, who]) =>
  `<div class="ref-embed ref-own reveal" data-ref="${key}">` +
  `<img class="ref-own-bg" src="/video/ref/${key}.jpg" alt="" loading="lazy">` +
  `<img class="ref-own-img" src="/video/ref/${key}.jpg" alt="${esc(who)} – video reference" loading="lazy">` +
  `<button class="ref-own-play" type="button" aria-label="Přehrát referenci: ${esc(who)}"><span>${PLAY}</span></button>` +
  `<div class="ref-own-cap">${quote ? `<b>„${esc(quote)}“</b><span>${esc(who)}</span>` : `<b>${esc(who)}</b>`}</div></div>`;

const html = REFS.map(card).join('\n');
process.stdout.write(process.argv.includes('--json') ? JSON.stringify(html) : html + '\n');
