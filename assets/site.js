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

  function mountFooter() {
    var el = document.getElementById('siteFooter');
    if (!el) return;
    var y = new Date().getFullYear();
    el.outerHTML =
      '<footer class="footer"><div class="wrap">' +
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
      '<span><a href="gdpr.html">Ochrana osobních údajů (GDPR)</a></span></div>' +
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
