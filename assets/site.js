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
      '<span class="fl-copy">© Leadership Restart ' + y + '</span>' +
      '</nav>' +
      '<p class="footer-ico">Denis Novotný, se sídlem Vranov 198, Vranov u Brna<br>' +
      'IČO 05876664, datová schránka cdawukj<br>' +
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

  /* Video facáda — iframe (Vimeo/YouTube) se načte až po kliknutí na Play */
  function videos() {
    document.querySelectorAll('.video-facade').forEach(function (box) {
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

  document.addEventListener('DOMContentLoaded', function () {
    mountNav();
    mountFooter();
    reveals();
    videos();
    counters();
  });
})();
