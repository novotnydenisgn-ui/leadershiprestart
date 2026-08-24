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

  function mountPixel() {
    /* Pixel se načítá hned pro všechny — stejný režim jako stará stránka na
       Tildě, aby obě varianty A/B testu sbíraly data identicky. Lišta níže
       o měření informuje (nenabízí volbu, která by se nerespektovala). */
    loadPixel();
  }

  var COOKIE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-5-5 4 4 0 0 1-4-4Z"/>' +
    '<path d="M8.5 10.5h.01M12 15h.01M15.5 12h.01M9 14.5h.01"/></svg>';

  /* Informační lišta: web měří od první návštěvy (viz mountPixel), takže lišta
     o měření informuje a odkazuje na podrobnosti — nenabízí přepínače, které by
     se stejně nerespektovaly. Zavření se pamatuje, ať neotravuje. */
  var NOTE_KEY = 'lr-cookie-note';

  function mountCookies() {
    if (document.getElementById('ckNote')) return;
    var seen = null;
    try { seen = localStorage.getItem(NOTE_KEY); } catch (e) {}
    if (seen) return;

    var bar = document.createElement('div');
    bar.className = 'ck-note';
    bar.id = 'ckNote';
    bar.innerHTML =
      '<span class="ck-note-ico" aria-hidden="true">' + COOKIE_ICON + '</span>' +
      '<p>Web používá cookies pro měření návštěvnosti a fungování reklamy. ' +
      'Podrobnosti v <a href="gdpr.html#cookies">zásadách zpracování údajů</a>.</p>' +
      '<button class="btn btn-r21" type="button" id="ckOk">Rozumím</button>';
    document.body.appendChild(bar);
    void bar.offsetWidth; /* reflow -> spustí přechod i na skryté kartě */
    bar.classList.add('open');

    document.getElementById('ckOk').addEventListener('click', function () {
      try { localStorage.setItem(NOTE_KEY, '1'); } catch (e) {}
      bar.classList.remove('open');
      setTimeout(function () { bar.remove(); }, 250);
    });
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
  });
})();
