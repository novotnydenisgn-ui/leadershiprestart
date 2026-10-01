// /darek — dotazník pro doručení dárkového balíčku (kopie darek.leadershiprestart.cz).
// Stránka = public/darek.html + React build v public/assets/darek/. Odeslání jde sem (POST /api/darek)
// a odtud do Google tabulky „Balíček_leadership restart“, list Objednávky (Apps Script
// scripts/darek-apps-script.gs; URL webové aplikace = secret DAREK_SHEET_URL).
// Volitelně se kopie posílá i na původní webhook GoHighLevel (var DAREK_GHL_WEBHOOK).

const MAX = 500;

export async function handleDarek(request, env, ctx, url) {
  if (url.pathname === '/darek/' || url.pathname === '/darek/index.html') {
    return Response.redirect(new URL('/darek' + url.search, url).toString(), 301);
  }
  if (url.pathname !== '/api/darek') return null;
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'json' }, 400);
  }
  // Klíče posílá bundle (funkce g v darek-1.js) — stejné jako původní webhook.
  const order = {
    name: clean(body['Jméno']),
    email: clean(body['E-mail']),
    phone: clean(body['Telefon']),
    address: clean(body['Adresa doručení']),
    sport: clean(body['Sport']),
    hours: clean(body['Hodiny pohybu týdně']),
  };
  if (!order.name || !order.email.includes('@') || !order.address) {
    return json({ ok: false, error: 'invalid' }, 400);
  }

  const jobs = [];
  if (env.DAREK_GHL_WEBHOOK) {
    jobs.push(
      fetch(env.DAREK_GHL_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch((e) => console.error('darek: GHL webhook selhal', String(e)))
    );
  }
  ctx.waitUntil(Promise.all(jobs));

  const sheet = await toSheet(env, order);
  if (!sheet.ok) {
    // Objednávka se nesmí ztratit: celé zadání do logu (Workers → leadershiprestart → Logs).
    console.error('darek: zápis do tabulky selhal', sheet.error, JSON.stringify(order));
    return json({ ok: false, error: 'sheet' }, 502);
  }
  return json({ ok: true });
}

async function toSheet(env, order) {
  if (!env.DAREK_SHEET_URL) return { ok: false, error: 'chybí DAREK_SHEET_URL' };
  try {
    // Apps Script odpoví 302 na script.googleusercontent.com, výsledek je tam přes GET.
    const first = await fetch(env.DAREK_SHEET_URL, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(order),
    });
    let res = first;
    const loc = first.headers.get('location');
    if (first.status >= 300 && first.status < 400 && loc) res = await fetch(loc, { redirect: 'follow' });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {}
    if (res.status === 200 && data && data.ok === true) return { ok: true };
    return { ok: false, error: `HTTP ${res.status} ${text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function clean(v) {
  return String(v ?? '').trim().slice(0, MAX);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
