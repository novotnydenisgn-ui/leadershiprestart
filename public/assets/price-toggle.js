/* Přepínač ceny „Při startu / Po dokončení" (cenik.html, draftcenik.html).
   Markup na stránce:
     <div class="pt-wrap"><div class="pt-tabs" data-price-toggle>
       <button type="button" data-pt="start">…</button>
       <button type="button" data-pt="end">… <span class="pt-badge">−5 000 Kč</span></button>
     </div></div>
     <span class="pt-num" data-end="11850">16 850</span>      ← číslo, které se přepočítá
     <div class="c-eur" data-pt-end="≈ 479 € · …">≈ 679 €</div> ← text, který se vymění
   Přepnutí na „end" = odpočet ceny + konfety. */
(function () {
  var root = document.querySelector('[data-price-toggle]');
  if (!root) return;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = document.createElement('style');
  css.textContent =
    '.pt-wrap{display:flex;justify-content:center;margin-top:34px;position:relative}' +
    '.pt-tabs{position:relative;display:inline-flex;padding:5px;border-radius:999px;' +
      'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}' +
    '.pt-tabs button{position:relative;z-index:1;-webkit-appearance:none;appearance:none;border:0;background:none;' +
      'color:#aeb6c2;font:inherit;font-weight:700;font-size:14.5px;line-height:1.2;padding:11px 18px;' +
      'border-radius:999px;cursor:pointer;display:inline-flex;align-items:center;gap:9px;transition:color .25s}' +
    '.pt-tabs button[aria-pressed="true"]{color:#fff}' +
    '.pt-tabs button:focus-visible{outline:2px solid #f6d47c;outline-offset:2px}' +
    '.pt-slider{position:absolute;top:5px;bottom:5px;left:0;width:0;border-radius:999px;' +
      'background:rgba(255,255,255,.13);box-shadow:0 4px 14px rgba(0,0,0,.25);' +
      'transition:transform .4s cubic-bezier(.34,1.4,.64,1),width .4s cubic-bezier(.34,1.4,.64,1),background .3s,box-shadow .3s}' +
    '.pt-tabs[data-state="end"] .pt-slider{background:linear-gradient(120deg,rgba(246,212,124,.3),rgba(233,182,79,.16));' +
      'box-shadow:inset 0 0 0 1px rgba(233,182,79,.6),0 6px 22px rgba(233,182,79,.22)}' +
    '.pt-badge{font-size:12px;font-weight:800;padding:4px 9px 3px;border-radius:999px;' +
      'background:rgba(233,182,79,.16);color:#f6d47c;white-space:nowrap}' +
    '.cena-card.pt-won .c-price{animation:pt-pop .7s cubic-bezier(.34,1.4,.64,1)}' +
    '@keyframes pt-pop{0%{transform:scale(1)}35%{transform:scale(1.14)}100%{transform:scale(1)}}' +
    '.pt-confetti{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999}' +
    '@media(max-width:520px){.pt-tabs button{font-size:13px;padding:10px 12px;gap:6px}.pt-badge{font-size:11px;padding:3px 7px 2px}}' +
    '@media(prefers-reduced-motion:reduce){.pt-slider{transition:none}.cena-card.pt-won .c-price{animation:none}}';
  document.head.appendChild(css);

  var tabs = [].slice.call(root.querySelectorAll('button[data-pt]'));
  var slider = document.createElement('span');
  slider.className = 'pt-slider';
  root.insertBefore(slider, root.firstChild);

  var nums = [].slice.call(document.querySelectorAll('.pt-num[data-end]'));
  var texts = [].slice.call(document.querySelectorAll('[data-pt-end]'));
  var digits = function (s) { return parseInt(String(s).replace(/\D/g, ''), 10) || 0; };
  var fmt = function (n) { return Math.round(n).toLocaleString('cs-CZ'); };
  nums.forEach(function (n) { n._start = digits(n.textContent); n._end = digits(n.dataset.end); n._cur = n._start; });
  texts.forEach(function (t) { t._start = t.textContent; });

  function moveSlider() {
    var act = root.querySelector('button[aria-pressed="true"]');
    if (!act) return;
    slider.style.width = act.offsetWidth + 'px';
    slider.style.transform = 'translateX(' + (act.offsetLeft) + 'px)';
  }

  function tween(n, to) {
    cancelAnimationFrame(n._raf);
    if (reduce) { n._cur = to; n.textContent = fmt(to); return; }
    var from = n._cur, t0 = performance.now(), dur = 900;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      n._cur = from + (to - from) * e;
      n.textContent = fmt(n._cur);
      if (p < 1) n._raf = requestAnimationFrame(step);
    })(t0);
  }

  function confetti() {
    if (reduce) return;
    var cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.className = 'pt-confetti';
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    var colors = ['#F6D47C', '#E9B64F', '#C8952F', '#ff6339', '#0080ff', '#ffffff'], ps = [];
    nums.forEach(function (n) {
      if (!n.closest('.c-price')) return;
      var r = n.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      for (var i = 0; i < 70; i++) {
        var a = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 5 + Math.random() * 9;
        ps.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, rot: Math.random() * 6.3, vr: (Math.random() - .5) * .4,
          c: colors[i % colors.length], life: 1 });
      }
    });
    if (!ps.length) { cv.remove(); return; }
    (function frame() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      var alive = false;
      ps.forEach(function (p) {
        p.vy += .28; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= .011;
        if (p.life <= 0) return;
        alive = true;
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (alive) requestAnimationFrame(frame); else cv.remove();
    })();
  }

  function set(state, celebrate) {
    root.dataset.state = state;
    tabs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.pt === state ? 'true' : 'false'); });
    moveSlider();
    var end = state === 'end';
    nums.forEach(function (n) {
      tween(n, end ? n._end : n._start);
      var card = n.closest('.cena-card');
      if (card) { card.classList.remove('pt-won'); if (end) { void card.offsetWidth; card.classList.add('pt-won'); } }
    });
    texts.forEach(function (t) { t.textContent = end ? t.dataset.ptEnd : t._start; });
    if (end && celebrate) { confetti(); }
  }

  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-pressed') === 'true') return;
      set(b.dataset.pt, true);
    });
  });
  addEventListener('resize', moveSlider);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveSlider);
  set('start', false);
})();
