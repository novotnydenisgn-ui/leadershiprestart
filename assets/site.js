/* Leadership Restart — sdílená navigace, patička, leadmagnet a chování.
   Stránka obsahuje jen <div id="siteNav"></div> nahoře a
   <div id="siteLead"></div><div id="siteFooter"></div> před </body>. */
(function () {
  'use strict';

  var PAGES = [
    { href: 'index.html',     label: 'Domů' },
    { href: 'program.html',   label: 'Program' },
    { href: 'cenik.html',     label: 'Ceník' },
    { href: 'vysledky.html',  label: 'Výsledky' },
    { href: 'rezervace.html', label: 'Rezervace' }
  ];
  var CTA = { href: 'vyzva.html', label: '21denní výzva' };
  var CALENDLY = 'https://calendly.com/novotny-denis-gn/uvodni-konzultace-zdarma-clone-1';
  var KVALIFIKACE = 'https://silabytsebou.cz/kvalifikace_do_vyzvy';

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
      '<a class="nav-brand" href="index.html">' +
      '<img src="assets/img/r21-badge.png" alt="Leadership R21">' +
      '<span><b>Leadership Restart</b><small>leadershiprestart.cz</small></span></a>' +
      '<button class="nav-burger" aria-label="Menu" aria-expanded="false">☰</button>' +
      '<nav class="nav-links">' + links +
      '<a href="' + CTA.href + '" class="nav-cta">' + CTA.label + '</a></nav>' +
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

  function mountLead() {
    var el = document.getElementById('siteLead');
    if (!el) return;
    el.outerHTML =
      '<section class="lead-band" id="leadmagnet"><div class="aura"></div><div class="wrap"><div class="lead-in">' +
      '<div class="reveal">' +
      '<span class="kicker">Zdarma pro tebe</span>' +
      '<h2 class="display h-section">Mini audit <span class="grad-text">disciplíny</span></h2>' +
      '<p class="h-sub">Zjisti během pár minut, kde tě disciplína (nebo její absence) reálně brzdí — v byznysu i v životě. ' +
      'Interaktivní lekci ti otevřeme v aplikaci Dimi a k tomu ti budeme posílat motivační newsletter, ' +
      'který tě posune, ne zahltí.</p>' +
      '<form class="lead-form" data-lead-form novalidate>' +
      '<input type="email" name="email" required placeholder="Tvůj e-mail" aria-label="E-mail">' +
      '<button class="btn btn-r21" type="submit">Chci audit zdarma</button>' +
      '</form>' +
      '<div class="lead-ok" role="status">Díky! Jakmile bude mini audit připraven, přijde ti na e-mail jako prvnímu. 💪</div>' +
      '<p class="lead-note">Žádný spam. Odhlásíš se jedním klikem. Odesláním souhlasíš se <a href="gdpr.html" style="color:inherit">zpracováním osobních údajů</a>.</p>' +
      '</div>' +
      '<div class="reveal"><img src="assets/img/statue-pullup.png" alt="Antická socha při shybu — disciplína v praxi" ' +
      'style="max-height:420px;margin:0 auto;filter:drop-shadow(0 30px 60px rgba(0,0,0,.45))"></div>' +
      '</div></div></section>';

    var form = document.querySelector('[data-lead-form]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { form.email.focus(); return; }
      /* TODO: napojit na e-mailový nástroj (Ecomail/MailerLite) — viz TODO.md.
         Zatím se e-maily ukládají lokálně v prohlížeči návštěvníka. */
      try {
        var k = 'lr-leads';
        var arr = JSON.parse(localStorage.getItem(k) || '[]');
        if (arr.indexOf(email) === -1) arr.push(email);
        localStorage.setItem(k, JSON.stringify(arr));
      } catch (err) {}
      form.style.display = 'none';
      document.querySelector('.lead-ok').style.display = 'block';
    });
  }

  /* --- brandové prvky z manuálu (kostka + kruh + spojka) --------------------
     TEX = dlaždice 140×140 pro texturu v pozadí, WAVE = „vlna" (dělič),
     MARK = značka „Krok" (dvě kostky přes spojku). Nikdy needituj tvary ručně —
     pochází z brand manuálu (sekce Designové prvky). */
  var TEX =
    '<path d="M0 70a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z"/><path d="M7 112H21A7 7 0 0 1 28 119V133A7 7 0 0 1 21 140H7A7 7 0 0 1 0 133V119A7 7 0 0 1 7 112Z"/>' +
    '<path d="M35 28H49A7 7 0 0 1 56 35V49A7 7 0 0 1 49 56H35A7 7 0 0 1 28 49V35A7 7 0 0 1 35 28Z"/><path d="M28 84H56V112H28Z"/>' +
    '<path d="M56 0H84V28H56Z"/><path d="M56 56H84V84H56Z"/><path d="M56 126a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z"/>' +
    '<path d="M84 42a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z"/><path d="M91 84H105A7 7 0 0 1 112 91V105A7 7 0 0 1 105 112H91A7 7 0 0 1 84 105V91A7 7 0 0 1 91 84Z"/>' +
    '<path d="M119 0H133A7 7 0 0 1 140 7V21A7 7 0 0 1 133 28H119A7 7 0 0 1 112 21V7A7 7 0 0 1 119 0Z"/><path d="M112 70a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z"/>' +
    '<path d="M112 112H140V140H112Z"/>' +
    '<path d="M14 56A14 14 0 0 0 28 42H42V56A14 14 0 0 0 28 70H14Z"/><path d="M28 70A14 14 0 0 0 42 84V98H28A14 14 0 0 0 14 84V70Z"/>' +
    '<path d="M14 112A14 14 0 0 0 28 98H42V112A14 14 0 0 0 28 126H14Z"/><path d="M42 28A14 14 0 0 0 56 14H70V28A14 14 0 0 0 56 42H42Z"/>' +
    '<path d="M56 42A14 14 0 0 0 70 56V70H56A14 14 0 0 0 42 56V42Z"/><path d="M42 84A14 14 0 0 0 56 70H70V84A14 14 0 0 0 56 98H42Z"/>' +
    '<path d="M56 98A14 14 0 0 0 70 112V126H56A14 14 0 0 0 42 112V98Z"/><path d="M84 14A14 14 0 0 0 98 28V42H84A14 14 0 0 0 70 28V14Z"/>' +
    '<path d="M70 56A14 14 0 0 0 84 42H98V56A14 14 0 0 0 84 70H70Z"/><path d="M84 70A14 14 0 0 0 98 84V98H84A14 14 0 0 0 70 84V70Z"/>' +
    '<path d="M70 112A14 14 0 0 0 84 98H98V112A14 14 0 0 0 84 126H70Z"/><path d="M98 28A14 14 0 0 0 112 14H126V28A14 14 0 0 0 112 42H98Z"/>' +
    '<path d="M112 42A14 14 0 0 0 126 56V70H112A14 14 0 0 0 98 56V42Z"/><path d="M98 84A14 14 0 0 0 112 70H126V84A14 14 0 0 0 112 98H98Z"/>' +
    '<path d="M112 98A14 14 0 0 0 126 112V126H112A14 14 0 0 0 98 112V98Z"/>';
  var WAVE =
    '<path d="M0 42a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z"/><path d="M35 0H49A7 7 0 0 1 56 7V21A7 7 0 0 1 49 28H35A7 7 0 0 1 28 21V7A7 7 0 0 1 35 0Z"/>' +
    '<path d="M56 42a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z"/><path d="M91 0H105A7 7 0 0 1 112 7V21A7 7 0 0 1 105 28H91A7 7 0 0 1 84 21V7A7 7 0 0 1 91 0Z"/>' +
    '<path d="M112 42a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z"/>' +
    '<path d="M14 28A14 14 0 0 0 28 14H42V28A14 14 0 0 0 28 42H14Z"/><path d="M56 14A14 14 0 0 0 70 28V42H56A14 14 0 0 0 42 28V14Z"/>' +
    '<path d="M70 28A14 14 0 0 0 84 14H98V28A14 14 0 0 0 84 42H70Z"/><path d="M112 14A14 14 0 0 0 126 28V42H112A14 14 0 0 0 98 28V14Z"/>';
  var MARK =
    '<path d="M0 28H28V56H0Z"/><path d="M28 0H56V28H28Z"/>' +
    '<path d="M14 28A14 14 0 0 0 28 14H42V28A14 14 0 0 0 28 42H14Z"/>';

  function footerBand() {
    return '<div class="footer-band">' +
      '<svg class="fb-tex" aria-hidden="true"><defs>' +
      '<pattern id="fbTex" width="140" height="140" patternUnits="userSpaceOnUse">' +
      '<g fill="#EFEEEC" opacity=".04">' + TEX + '</g></pattern>' +
      '<linearGradient id="fbGrad" x1="0%" y1="100%" x2="100%" y2="0%">' +
      '<stop offset="0%" stop-color="#0080ff"/><stop offset="100%" stop-color="#ff6339"/>' +
      '</linearGradient></defs>' +
      '<rect width="100%" height="100%" fill="url(#fbTex)"/></svg>' +
      '<div class="wrap fb-inner">' +
      '<svg class="fb-mark" viewBox="0 0 56 56" aria-hidden="true"><g fill="url(#fbGrad)">' + MARK + '</g></svg>' +
      '<p class="fb-claim">Krok za krokem k novému standardu</p>' +
      '<p class="fb-sub">Kostka je hotový krok, kruh otevřený začátek. Za 21 dní z nich složíš systém,' +
      ' který drží — i když se den nepovede.</p>' +
      '<div class="fb-ctas">' +
      '<a class="btn btn-r21" href="' + KVALIFIKACE + '" target="_blank" rel="noopener">Zjistit, zda splňuji kritéria</a>' +
      '<a class="btn btn-ghost on-dark" href="rezervace.html">Nezávazná konzultace</a>' +
      '</div>' +
      '<svg class="fb-wave" viewBox="0 0 140 56" aria-hidden="true"><g fill="#EFEEEC">' + WAVE + '</g></svg>' +
      '</div></div>';
  }

  function mountFooter() {
    var el = document.getElementById('siteFooter');
    if (!el) return;
    var y = new Date().getFullYear();
    el.outerHTML =
      '<footer class="footer">' + footerBand() + '<div class="wrap">' +
      '<div class="footer-grid">' +
      '<div><div class="footer-brand"><img src="assets/img/r21-badge.png" alt=""><b>Leadership Restart</b></div>' +
      '<p>Program pro podnikatele a lídry, kteří už nechtějí o změně jen mluvit. ' +
      'Nezničitelné návyky, disciplína a byznys bez brzd — za 21 dní.</p></div>' +
      '<div><h4>Web</h4><ul>' +
      '<li><a href="index.html">Domů</a></li>' +
      '<li><a href="program.html">Program</a></li>' +
      '<li><a href="cenik.html">Ceník</a></li>' +
      '<li><a href="vysledky.html">Výsledky &amp; reference</a></li>' +
      '<li><a href="vyzva.html">21denní výzva</a></li>' +
      '<li><a href="rezervace.html">Rezervace konzultace</a></li>' +
      '</ul></div>' +
      '<div><h4>Kontakt</h4><ul>' +
      '<li><a href="mailto:info@denisnovotny.cz">info@denisnovotny.cz</a></li>' +
      '<li>Denis Novotný</li><li>IČO&nbsp;05876664, Vranov&nbsp;198</li>' +
      '<li><a href="' + CALENDLY + '" target="_blank" rel="noopener">Rezervovat hovor&nbsp;→</a></li>' +
      '</ul></div></div>' +
      '<div class="footer-bottom"><span>© ' + y + ' Denis Novotný — Leadership Restart. Váš partner na cestě k osobnímu a profesnímu rozvoji.</span>' +
      '<span><a href="brand.html">Brand design</a> · <a href="gdpr.html">Ochrana osobních údajů (GDPR)</a></span></div>' +
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
    mountLead();
    mountFooter();
    reveals();
    videos();
    counters();
  });
})();
