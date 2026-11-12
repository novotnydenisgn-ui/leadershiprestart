// Mapa webu: z public/*.html vygeneruje public/sitemap.xml (bez závislostí, Node 18+).
//   npm run sitemap          (nebo: node scripts/sitemap.mjs)
// Spouštět před každým nasazením (npm run deploy to dělá samo) – nový soubor v public/ = nový řádek v mapě.
// Čte ji Google i Velín (admin.leadershiprestart.cz → Stránky: nové podstránky se zařadí do složky leadershiprestart.cz samy).
// Bez lastmod: datum změny souboru na disku neodpovídá skutečné změně stránky (checkout větve ho přepíše) a Google chce buď přesné, nebo žádné.
// Stránky s noindex (kampaňové LP, poděkování, právní texty) v mapě ZŮSTÁVAJÍ záměrně – Velín je potřebuje vidět;
// Google je jen vykáže jako „vyloučeno značkou noindex“, nic víc. Co do mapy nepatří, je v EXCLUDE.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://leadershiprestart.cz';
const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Soubory, které nejsou stránkou pro návštěvníky: šablona s [placeholdery], pracovní návrhy ceníků, podklady k tisku, brand manuál.
const EXCLUDE = new Set([
  'sablona-funnel.html',   // šablona funnelu s [doplň] – není hotová stránka
  'sablona-dashboard.html', // ukázka analytického dashboardu s vymyšlenými čísly (noindex)
  'cenik-draft.html',      // návrh ceníku (symfonie komponentů)
  'draftcenik.html', 'draftimplementace.html', 'draftupgrade.html', // DRAFT ceníky
  'letak-A5.html',         // letáček k tisku
  'brand.html',            // brand design (interní)
  'black-friday-karta.html', // dárkový poukaz k vytištění (otevírá se z e-mailu, ne z webu)
]);

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const urlOf = file => ORIGIN + (file === 'index.html' ? '/' : '/' + file.replace(/\.html$/, ''));

const files = readdirSync(PUBLIC).filter(f => f.endsWith('.html') && !EXCLUDE.has(f)).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
const rows = files.map(f => {
  const html = readFileSync(join(PUBLIC, f), 'utf8');
  const noindex = /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html);
  return { file: f, url: urlOf(f), noindex };
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generuje scripts/sitemap.mjs (npm run sitemap) – neupravovat ručně. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.map(r => `  <url><loc>${esc(r.url)}</loc></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(PUBLIC, 'sitemap.xml'), xml);

console.log(`public/sitemap.xml: ${rows.length} adres`);
for (const r of rows) console.log(`  ${r.url}${r.noindex ? '  (noindex)' : ''}`);
const skipped = readdirSync(PUBLIC).filter(f => f.endsWith('.html') && EXCLUDE.has(f));
if (skipped.length) console.log(`vynecháno (EXCLUDE): ${skipped.join(', ')}`);
