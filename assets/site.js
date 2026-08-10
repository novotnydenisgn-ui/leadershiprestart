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
  var CTA = { href: KVALIFIKACE, label: 'Chci svůj restart' };

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
      '<a href="' + CTA.href + '" class="nav-cta" target="_blank" rel="noopener">' + CTA.label + '</a></nav>' +
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

  function mountCookies() {
    if (document.getElementById('ckFab')) return;
    var c = readConsent();

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<button class="ck-fab" id="ckFab" type="button" aria-label="Nastavení cookies">' + COOKIE_ICON + '</button>' +
      '<div class="ck-scrim" id="ckScrim" hidden></div>' +
      '<div class="ck-panel" id="ckPanel" role="dialog" aria-modal="true" aria-labelledby="ckTitle" hidden>' +
      '<h2 class="display" id="ckTitle">Cookies na tomhle webu</h2>' +
      '<p class="ck-lead">Nezbytné cookies web potřebuje k fungování. U ostatních se ptáme — ' +
      'vybereš si sám a rozhodnutí můžeš kdykoli změnit. Podrobnosti v ' +
      '<a href="gdpr.html#cookies">zásadách zpracování údajů</a>.</p>' +
      '<div class="ck-cats">' +
      '<label class="ck-row"><span><b>Nezbytné</b><small>Bez nich se stránka nenačte a nezapamatuje si tvou volbu.</small></span>' +
      '<input type="checkbox" checked disabled></label>' +
      '<label class="ck-row"><span><b>Analytické</b><small>Anonymní měření návštěvnosti — kolik lidí a odkud přišlo.</small></span>' +
      '<input type="checkbox" id="ckAna"></label>' +
      '<label class="ck-row"><span><b>Marketingové</b><small>Měření reklam a remarketing (např. Meta, Google).</small></span>' +
      '<input type="checkbox" id="ckMkt"></label>' +
      '</div>' +
      '<div class="ck-acts">' +
      '<button class="btn btn-ghost on-dark" type="button" data-ck="reject">Odmítnout</button>' +
      '<button class="btn btn-ghost on-dark" type="button" data-ck="save">Uložit výběr</button>' +
      '<button class="btn btn-r21" type="button" data-ck="all">Přijmout vše</button>' +
      '</div></div>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

    var fab = document.getElementById('ckFab');
    var panel = document.getElementById('ckPanel');
    var scrim = document.getElementById('ckScrim');
    var ana = document.getElementById('ckAna');
    var mkt = document.getElementById('ckMkt');

    function open() {
      var cur = readConsent();
      ana.checked = !!(cur && cur.analytics);
      mkt.checked = !!(cur && cur.marketing);
      panel.hidden = false; scrim.hidden = false;
      void panel.offsetWidth; /* vynutí reflow — spolehlivější než rAF (na skryté kartě je pozastavené) */
      panel.classList.add('open'); scrim.classList.add('open');
    }
    function close() {
      panel.classList.remove('open'); scrim.classList.remove('open');
      setTimeout(function () { panel.hidden = true; scrim.hidden = true; }, 250);
    }
    function decide(analytics, marketing) {
      saveConsent({ necessary: true, analytics: analytics, marketing: marketing });
      close();
    }

    fab.addEventListener('click', open);
    scrim.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
    panel.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ck]'); if (!a) return;
      var k = a.getAttribute('data-ck');
      if (k === 'reject') decide(false, false);
      if (k === 'save') decide(ana.checked, mkt.checked);
      if (k === 'all') decide(true, true);
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
  });
})();
