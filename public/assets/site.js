/* Leadership Restart — sdílená navigace, patička, leadmagnet a chování.
   Stránka obsahuje jen <div id="siteNav"></div> nahoře a
   <div id="siteFooter"></div> před </body>. */
(function () {
  'use strict';

  /* Menu je záměrně prázdné — landing page vede návštěvníka jedním směrem.
     Na ceník se prokliká z FAQ, na konzultaci přes Calendly v CTA. */
  var PAGES = [];
  var CALENDLY = 'https://calendly.com/novotny-denis-gn/uvodni-konzultace-zdarma-clone-1';
  var KVALIFIKACE = 'https://silabytsebou.cz/kvalifikace_do_vyzvy';

  /* A/B: server (Cloudflare Worker) vkládá window.__AB = {t, v, q, x}.
     q = query string (v=varianta + utm), který se připojuje k odkazům na
     kvalifikaci vkládaným JavaScriptem — hardcoded odkazy v HTML přepisuje server. */
  var AB = window.__AB || {};
  var kvalifikaceHref = AB.q ? KVALIFIKACE + '?' + AB.q : KVALIFIKACE;
  var CTA = { href: kvalifikaceHref, label: 'Chci svůj restart' };

  /* --- LOGO (brand manuál v1.0) ------------------------------------------
     Značka = dvě kostky spojené krčkem, JEDEN přechod přes celý tvar
     (modrá vpravo nahoře → oranžová vlevo dole). Tvar se nikdy nemění. */
  var LOGO_MARK = 'M52 6 L94 6 L94 48 L74 48 A22 22 0 0 0 52 70 L52 94 L6 94 ' +
    'L6 52 L26 52 A22 22 0 0 0 48 30 L48 6 Z';

  function logo(id, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 380 100" role="img" aria-label="Leadership Restart za 21 dní">' +
      '<defs><linearGradient id="' + id + '" x1="100%" y1="0%" x2="0%" y2="100%">' +
      '<stop offset="0%" stop-color="#377EF7"/><stop offset="100%" stop-color="#ED6D47"/>' +
      '</linearGradient></defs>' +
      '<path d="' + LOGO_MARK + '" fill="url(#' + id + ')"/>' +
      '<text x="128" y="40" font-family="League Spartan, sans-serif" font-weight="800" font-size="30" fill="#EFEEEC">Leadership</text>' +
      '<text x="128" y="74" font-family="League Spartan, sans-serif" font-weight="800" font-size="30" fill="#377EF7">RE<tspan fill="#EFEEEC">START</tspan></text>' +
      '<text x="128" y="92" font-family="Manrope, sans-serif" font-weight="600" font-size="12" letter-spacing="1.5" fill="#9A9A98">ZA 21 DNÍ</text>' +
      '</svg>';
  }

  function current() {
    var f = location.pathname.split('/').pop() || 'index.html';
    return f === '' ? 'index.html' : f;
  }

  function mountNav() {
    var el = document.getElementById('siteNav');
    if (!el) return;
    var cur = current();
    var links = PAGES.map(function (p) {
      var act = p.href === cur ? ' class="active"' : '';
      return '<a href="' + p.href + '"' + act + '>' + p.label + '</a>';
    }).join('');
    el.outerHTML =
      '<header class="nav"><div class="nav-in">' +
      '<a class="nav-brand" href="index.html">' + logo('lrLogoNav', 'brand-logo') + '</a>' +
      '<button class="nav-burger" aria-label="Menu" aria-expanded="false">☰</button>' +
      '<nav class="nav-links">' + links +
      '<a href="' + CTA.href + '" class="nav-cta" data-cta-pos="nav" target="_blank" rel="noopener">' + CTA.label + '</a></nav>' +
      '</div></header>';

    var burger = document.querySelector('.nav-burger');
    var menu = document.querySelector('.nav-links');
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') menu.classList.remove('open');
    });
  }

  function mountFooter() {
    var el = document.getElementById('siteFooter');
    if (!el) return;
    var y = new Date().getFullYear();
    el.outerHTML =
      '<footer class="footer"><div class="wrap">' +
      '<nav class="footer-legal">' +
      '<a href="gdpr.html">Ochrana osobních údajů</a>' +
      '<a href="gdpr.html#cookies">Zásady používání souborů cookie</a>' +
      '<a href="odstoupeni.html">Odstoupení od smlouvy</a>' +
      '<span class="fl-copy">© Leadership Restart ' + y + '</span>' +
      '</nav>' +
      '<p class="footer-ico">Denis Novotný, se sídlem Vranov 198, Vranov u Brna<br>' +
      'IČO 05876664, datová schránka cdawukj<br>' +
      'Fyzická osoba zapsaná v živnostenském rejstříku vedeném Magistrátem města Brna. Nejsem plátce DPH.<br>' +
      '<a href="mailto:novotny.denis.gn@gmail.com">novotny.denis.gn@gmail.com</a><br>' +
      '<a class="fl-brand" href="brand.html">Brand design</a></p>' +
      '</div></footer>';
  }

  function reveals() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
    /* Fallback: po 5 s odkrýt vše — DOM snímky (Clarity heatmapy) jinak
       zachytí prvky pod ohybem s opacity:0 a screenshot vyjde prázdný. */
    setTimeout(function () {
      els.forEach(function (e) { e.classList.add('in'); io.unobserve(e); });
    }, 5000);
  }

  /* Video facáda — iframe (Vimeo/YouTube) se načte až po kliknutí na Play.
     Do té doby je na stránce jen náhledový obrázek → žádné skripty YouTube. */
  function videos() {
    document.querySelectorAll('.video-facade').forEach(function (box) {
      /* klávesnice: Enter/mezerník na prvku s role="button" */
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); box.click(); }
      });
      box.addEventListener('click', function () {
        if (box.dataset.loaded) return;
        var src = '';
        if (box.dataset.vimeo) {
          src = 'https://player.vimeo.com/video/' + box.dataset.vimeo +
                '?autoplay=1&title=0&byline=0&portrait=0&dnt=1';
        } else if (box.dataset.youtube) {
          src = 'https://www.youtube-nocookie.com/embed/' + box.dataset.youtube + '?autoplay=1&rel=0';
        }
        if (!src) return;
        var f = document.createElement('iframe');
        f.src = src;
        f.allow = 'autoplay; fullscreen; picture-in-picture';
        f.allowFullscreen = true;
        /* křížek na zavření — odstraní iframe (zastaví přehrávání) a vrátí náhled */
        var close = document.createElement('button');
        close.className = 'vf-close';
        close.setAttribute('aria-label', 'Zavřít video');
        close.textContent = '✕';
        close.addEventListener('click', function (e) {
          e.stopPropagation();
          f.remove();
          close.remove();
          delete box.dataset.loaded;
        });
        box.appendChild(f);
        box.appendChild(close);
        box.dataset.loaded = '1';
      }, { once: false });
    });
  }

  /* Animace čísel ve statistikách */
  function counters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, target = parseFloat(el.dataset.count),
            suf = el.dataset.suffix || '', dur = 1400, t0 = null;
        function step(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          p = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * p) + suf;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* --- A/B: měření kliků na kvalifikační CTA ------------------------------
     sendBeacon přežije odchod ze stránky; server si test/variantu čte sám
     z cookie a boty/výluky filtruje — tady jen pozice CTA a stránka.
     AB.x === 1 znamená bot / vlastní návštěva / preview => neměřit. */
  function abClicks() {
    if (!AB.t || AB.x === 1 || !navigator.sendBeacon) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="silabytsebou.cz/kvalifikace_do_vyzvy"]');
      if (!a) return;
      var pos = a.getAttribute('data-cta-pos') || 'other';
      try {
        navigator.sendBeacon('/api/click', new Blob(
          [JSON.stringify({ pos: pos, page: location.pathname })],
          { type: 'application/json' }
        ));
      } catch (err) { /* měření nesmí nikdy rozbít proklik */ }
    });
  }

  /* --- Meta Pixel -----------------------------------------------------------
     Stejné pixely jako na staré stránce (silabytsebou.cz) — na nich se trénuje
     reklama, proto běží na každém webu. Načítá se jen s marketingovým souhlasem.
     Varianta A/B testu jde jako PARAMETR standardních eventů (ab_test,
     ab_variant) — žádné nové custom eventy, ať se nerozbije optimalizace
     kampaní v Events Manageru. */
  var PIXEL_IDS = ['1323130886277601', '672648001991578'];

  function loadPixel() {
    if (!PIXEL_IDS.length || window.fbq) return;
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    for (var i = 0; i < PIXEL_IDS.length; i++) fbq('init', PIXEL_IDS[i]);
    fbq('track', 'PageView', { ab_test: AB.t || '', ab_variant: AB.v || '' });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="silabytsebou.cz/kvalifikace_do_vyzvy"]');
      if (!a || !window.fbq) return;
      fbq('track', 'Lead', {
        ab_test: AB.t || '',
        ab_variant: AB.v || '',
        cta_pos: a.getAttribute('data-cta-pos') || 'other'
      });
    });
  }

  /* --- Wistia přehrávač (A/B varianta videa) -----------------------------
     Skripty se načítají jen na stránce, kde slot [data-lr-wistia] opravdu je. */
  var wistiaDone = false;

  function loadWistia(host, id) {
    if (wistiaDone) return;
    wistiaDone = true;
    var s1 = document.createElement('script');
    s1.src = 'https://fast.wistia.com/player.js';
    s1.async = true;
    var s2 = document.createElement('script');
    s2.src = 'https://fast.wistia.com/embed/' + id + '.js';
    s2.async = true;
    s2.type = 'module';
    document.head.appendChild(s1);
    document.head.appendChild(s2);
    host.innerHTML = '<wistia-player media-id="' + id + '" aspect="1.7777777777777777"></wistia-player>';
  }

  function mountWistia() {
    /* Přehrávač je zařazený mezi nezbytné technologie (bez něj video nejde
       přehrát), takže se načítá vždy — v panelu je uvedený v kategorii
       Nezbytné, která nejde vypnout. */
    var host = document.querySelector('[data-lr-wistia]');
    if (!host) return;
    var id = (host.getAttribute('data-lr-wistia') || '').replace(/[^a-z0-9]/gi, '');
    if (id) loadWistia(host, id);
  }

  /* --- Microsoft Clarity (heatmapy, nahrávky) ---------------------------
     Načítá se jen se souhlasem s funkčními cookies. Každé sezení označíme
     testem a variantou (window.__AB), aby šly nahrávky a heatmapy v Clarity
     filtrovat po variantách — všechny varianty žijí na stejné URL. */
  var CLARITY_ID = 'y8r8i1rby4';

  function loadClarity() {
    if (!CLARITY_ID || window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
    if (AB.t && AB.v) {
      clarity('set', 'ab_test', AB.t);
      clarity('set', 'ab_variant', AB.v);
    }
  }

  function mountClarity() {
    var c = readConsent();
    if (c && c.analytics) loadClarity();
    document.addEventListener('lr:consent', function (e) {
      if (e.detail && e.detail.analytics) loadClarity();
    });
  }

  function mountPixel() {
    /* Pixel se načte jen se souhlasem s marketingovými cookies a hned, jakmile
       ho návštěvník udělí. Odvolání souhlasu se projeví po znovunačtení stránky
       (fbq nejde z běžící stránky odinstalovat) — proto po změně volby reload. */
    var c = readConsent();
    if (c && c.marketing) loadPixel();
    document.addEventListener('lr:consent', function (e) {
      if (e.detail && e.detail.marketing) loadPixel();
    });
  }

  /* --- souhlas s cookies -------------------------------------------------
     Volba se ukládá do localStorage a rozesílá jako událost `lr:consent`,
     aby se na ni daly navázat budoucí skripty (GA4, Meta Pixel).
     Nezbytné cookies jsou vždy zapnuté — bez nich web nefunguje. */
  var CONSENT_KEY = 'lr-consent';

  function readConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function saveConsent(c) {
    c.ts = new Date().toISOString();
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('lr:consent', { detail: c }));
  }

  var COOKIE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-5-5 4 4 0 0 1-4-4Z"/>' +
    '<path d="M8.5 10.5h.01M12 15h.01M15.5 12h.01M9 14.5h.01"/></svg>';

  /* Katalog toho, co web opravdu používá. `key` = kategorie souhlasu,
     null = nezbytné (nejde vypnout). Počty v odznacích se počítají odsud,
     takže seznam a čísla nemůžou rozejít. */
  var CK_CATS = [
    {
      key: null,
      name: 'Nezbytné',
      desc: 'Tyto technologie jsou nezbytné k aktivaci základních funkcí naší služby.',
      items: [
        { n: 'ab_v', p: 'Leadership Restart', d: '90 dní', u: 'Která verze stránky se ti zobrazila, ať se ti obsah při návratu nemění.' },
        { n: 'ab_utm', p: 'Leadership Restart', d: '30 dní', u: 'Technické označení zdroje návštěvy (odkud jsi přišel).' },
        { n: 'ab_x', p: 'Leadership Restart', d: '1 rok', u: 'Výluka z měření — používá ji provozovatel pro vlastní návštěvy.' },
        { n: 'lr-consent', p: 'Leadership Restart', d: 'trvale', u: 'Tvoje volba v tomhle okně, ať se tě neptáme pořád dokola.' },
        { n: 'Wistia (přehrávač videa)', p: 'Wistia, Inc., USA', d: 'až 1 rok', u: 'Technické přehrání videa přímo na stránce — pamatuje si hlasitost a místo, kde jsi přestal. Bez přehrávače by video nešlo pustit.' }
      ]
    },
    {
      key: 'analytics',
      name: 'Funkční',
      desc: 'Tyto technologie nám umožňují analyzovat chování uživatelů za účelem měření a zlepšování výkonu.',
      items: [
        { n: 'Měření obsahu', p: 'Leadership Restart', d: 'neukládá cookies', u: 'Anonymní součty zobrazení a prokliků. Neukládáme jméno ani e-mail a jednotlivce z toho nepoznáme.' },
        { n: 'Microsoft Clarity', p: 'Microsoft Ireland Operations Ltd.', d: 'až 1 rok', u: 'Anonymní záznam pohybu po stránce (kliky, posouvání) a teplotní mapy — pomáhá nám web zlepšovat. Bez tvého souhlasu se nespustí.' }
      ]
    },
    {
      key: 'marketing',
      name: 'Marketing',
      desc: 'Tyto technologie používají inzerenti k zobrazování reklam, které jsou relevantní pro vaše zájmy.',
      items: [
        { n: 'Meta Pixel', p: 'Meta Platforms Ireland Ltd.', d: 'až 2 roky', u: 'Měření reklamy na Facebooku a Instagramu a remarketing.' },
        { n: 'Meta Pixel (druhý účet)', p: 'Meta Platforms Ireland Ltd.', d: 'až 2 roky', u: 'Druhý reklamní účet se stejným účelem.' }
      ]
    }
  ];

  function ckEsc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function ckCatRow(c, i) {
    var lock = c.key === null;
    var rows = c.items.map(function (it) {
      return '<div class="ck-svc"><div class="ck-svc-h"><b>' + ckEsc(it.n) + '</b>' +
        '<span>' + ckEsc(it.d) + '</span></div>' +
        '<p>' + ckEsc(it.u) + '</p>' +
        '<small>Poskytovatel: ' + ckEsc(it.p) + '</small></div>';
    }).join('');
    return '<div class="ck-cat" data-cat="' + i + '">' +
      '<div class="ck-cat-h">' +
      '<button class="ck-exp" type="button" aria-expanded="false" aria-label="Rozbalit ' + ckEsc(c.name) + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>' +
      '<span class="ck-cat-n">' + ckEsc(c.name) + '</span>' +
      '<span class="ck-badge">' + c.items.length + '</span>' +
      (lock
        ? '<input class="ck-tog" type="checkbox" checked disabled aria-label="Nezbytné — vždy zapnuto">'
        : '<input class="ck-tog" type="checkbox" data-ck-key="' + c.key + '" aria-label="' + ckEsc(c.name) + '">') +
      '</div>' +
      '<p class="ck-cat-d">' + ckEsc(c.desc) + '</p>' +
      '<div class="ck-svcs" hidden>' + rows + '</div>' +
      '</div>';
  }

  function mountCookies() {
    if (document.getElementById('ckFab')) return;
    var c = readConsent();

    var cats = CK_CATS.map(ckCatRow).join('');
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<button class="ck-fab" id="ckFab" type="button" aria-label="Nastavení cookies">' + COOKIE_ICON + '</button>' +
      '<div class="ck-scrim" id="ckScrim" hidden></div>' +
      '<div class="ck-panel" id="ckPanel" role="dialog" aria-modal="true" aria-labelledby="ckTitle" hidden>' +
        '<div class="ck-top">' +
          '<span class="ck-brand">' + logo('lrLogoCk', 'ck-logo') + '</span>' +
          '<button class="ck-x" type="button" data-ck="close" aria-label="Zavřít">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '</div>' +
        '<h2 id="ckTitle" class="ck-sr">Nastavení soukromí</h2>' +
        '<div class="ck-tabs" role="tablist">' +
          '<button class="ck-tab active" type="button" data-tab="cats" role="tab" aria-selected="true">Kategorie</button>' +
          '<button class="ck-tab" type="button" data-tab="svcs" role="tab" aria-selected="false">Služby</button>' +
          '<button class="ck-tab" type="button" data-tab="info" role="tab" aria-selected="false">Co se týká cookies?</button>' +
        '</div>' +
        '<div class="ck-body">' +
          '<div class="ck-pane" data-pane="cats">' + cats + '</div>' +
          '<div class="ck-pane" data-pane="svcs" hidden>' +
            '<p class="ck-lead">Přesný seznam toho, co na webu běží. Nic dalšího tu není.</p>' +
            CK_CATS.map(function (x) {
              return '<h3 class="ck-sub">' + ckEsc(x.name) + '</h3>' +
                x.items.map(function (it) {
                  return '<div class="ck-svc"><div class="ck-svc-h"><b>' + ckEsc(it.n) + '</b><span>' + ckEsc(it.d) + '</span></div>' +
                    '<p>' + ckEsc(it.u) + '</p><small>Poskytovatel: ' + ckEsc(it.p) + '</small></div>';
                }).join('');
            }).join('') +
          '</div>' +
          '<div class="ck-pane" data-pane="info" hidden>' +
            '<p class="ck-lead">Cookies jsou drobné soubory, které si web uloží ve tvém prohlížeči. ' +
            'Některé potřebuje k fungování — třeba aby si zapamatoval tvoje rozhodnutí z tohohle okna. ' +
            'Jiné slouží k měření reklamy.</p>' +
            '<p class="ck-lead"><b>Rozhoduješ ty.</b> Co si tu vypneš, se opravdu nespustí. ' +
            'Volbu můžeš kdykoli změnit — sušenka v levém dolním rohu webu. ' +
            'Když souhlas odvoláš, měření se okamžitě zastaví.</p>' +
            '<p class="ck-lead">Odmítnutím o nic nepřijdeš: web funguje úplně stejně. ' +
            'Podrobnosti v <a href="gdpr.html#cookies">zásadách zpracování údajů</a>.</p>' +
          '</div>' +
        '</div>' +
        '<div class="ck-acts">' +
          '<button class="ck-btn" type="button" data-ck="reject">Odmítnout</button>' +
          '<button class="ck-btn" type="button" data-ck="only">Jen nezbytné</button>' +
          '<button class="ck-btn" type="button" data-ck="save" id="ckSave">Přijmout vše</button>' +
        '</div>' +
      '</div>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

    var fab = document.getElementById('ckFab');
    var panel = document.getElementById('ckPanel');
    var scrim = document.getElementById('ckScrim');
    var togs = panel.querySelectorAll('[data-ck-key]');

    var saveBtn = panel.querySelector('#ckSave');

    /* Popisek posledního tlačítka se řídí přepínači: dokud jsou všechny zapnuté,
       je to „Přijmout vše"; jakmile něco vypneš, uloží se tvůj výběr. */
    function syncSaveLabel() {
      var all = true;
      togs.forEach(function (t) { if (!t.checked) all = false; });
      saveBtn.textContent = all ? 'Přijmout vše' : 'Uložit výběr';
    }

    function open() {
      var cur = readConsent();
      /* Bez uložené volby jsou přepínače přednastavené na zapnuto. */
      togs.forEach(function (t) { t.checked = cur ? !!cur[t.dataset.ckKey] : true; });
      syncSaveLabel();
      panel.hidden = false; scrim.hidden = false;
      void panel.offsetWidth; /* vynutí reflow — spolehlivější než rAF (na skryté kartě je pozastavené) */
      panel.classList.add('open'); scrim.classList.add('open');
    }
    function close() {
      panel.classList.remove('open'); scrim.classList.remove('open');
      setTimeout(function () { panel.hidden = true; scrim.hidden = true; }, 250);
    }
    function decide(analytics, marketing) {
      var prev = readConsent();
      var revoked = prev && prev.marketing && !marketing; /* odvolání souhlasu */
      saveConsent({ necessary: true, analytics: analytics, marketing: marketing });
      close();
      /* Jednou načtený pixel ani přehrávač nejdou z běžící stránky odstranit —
         po odvolání souhlasu proto stránku znovu načteme, ať se opravdu vypnou. */
      if (revoked) setTimeout(function () { location.reload(); }, 300);
    }
    function picked(key) {
      var t = panel.querySelector('[data-ck-key="' + key + '"]');
      return !!(t && t.checked);
    }

    fab.addEventListener('click', open);
    scrim.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });

    panel.addEventListener('change', function (e) {
      if (e.target.classList.contains('ck-tog')) syncSaveLabel();
    });

    panel.addEventListener('click', function (e) {
      /* přepínání záložek */
      var tab = e.target.closest('.ck-tab');
      if (tab) {
        panel.querySelectorAll('.ck-tab').forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panel.querySelectorAll('.ck-pane').forEach(function (p) {
          p.hidden = p.dataset.pane !== tab.dataset.tab;
        });
        panel.querySelector('.ck-body').scrollTop = 0;
        return;
      }
      /* rozbalení kategorie */
      var exp = e.target.closest('.ck-exp');
      if (exp) {
        var cat = exp.closest('.ck-cat');
        var list = cat.querySelector('.ck-svcs');
        var openNow = list.hidden;
        list.hidden = !openNow;
        cat.classList.toggle('open', openNow);
        exp.setAttribute('aria-expanded', openNow ? 'true' : 'false');
        return;
      }
      /* rozhodnutí */
      var a = e.target.closest('[data-ck]'); if (!a) return;
      var k = a.getAttribute('data-ck');
      if (k === 'close') close();
      if (k === 'reject' || k === 'only') decide(false, false);
      if (k === 'save') decide(picked('analytics'), picked('marketing'));
    });

    /* první návštěva → panel sám vyskočí */
    if (!c) setTimeout(open, 900);
  }

  /* --- fade-up: automaticky označí obsahové bloky ------------------------- */
  function autoReveal() {
    var SEL = '.section .wrap > .kicker, .section .wrap > h2, .section .wrap > .h-sub,' +
      '.section .wrap > p, .glass-card, .stat, .mentor, .faq details, .logo-marquee';
    document.querySelectorAll(SEL).forEach(function (el) {
      if (el.closest('.hero-land, .hero-vyzva, .ck-panel')) return;
      if (!el.classList.contains('reveal')) el.classList.add('reveal');
    });
    /* jemné prodlevy uvnitř skupin, ať prvky nenaskočí naráz */
    document.querySelectorAll('.grid-2, .grid-3, .arzenal, .stats, .mentors-row, .refs-grid').forEach(function (g) {
      [].slice.call(g.children).forEach(function (ch, i) {
        var r = ch.classList.contains('reveal') ? ch : ch.querySelector('.reveal');
        if (r) r.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
      });
    });
  }

  /* --- pozadí hera se při scrollu zvětšuje -------------------------------- */
  function heroZoom() {
    var hero = document.querySelector('.hero-land, .hero-vyzva');
    if (!hero) return;
    var bg = hero.querySelector('.bg');
    if (!bg || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ticking = false;
    function update() {
      ticking = false;
      var h = hero.offsetHeight || 1;
      var p = Math.min(Math.max(window.scrollY / h, 0), 1);
      bg.style.setProperty('--hz', (1 + p * 0.18).toFixed(4));
      bg.style.setProperty('--hy', (p * 6).toFixed(2) + '%');
    }
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  document.addEventListener('DOMContentLoaded', function () {
    mountNav();
    mountFooter();
    autoReveal();
    reveals();
    videos();
    counters();
    heroZoom();
    mountCookies();
    abClicks();
    mountPixel();
    mountClarity();
    mountWistia();
  });
})();
