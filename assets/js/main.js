/* EM Concept — interactions & motion system (vanilla, no dependencies)
   Spec: docs/motion-system.md
   Rules: one rAF scroll loop, only visible elements update, only transform/opacity/clip-path move,
   everything degrades to the final state under prefers-reduced-motion. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasIO = 'IntersectionObserver' in window;
  const STAGGER = 70;   // ms, matches --stagger
  const EASE_IN_OUT = 'cubic-bezier(.65, 0, .35, 1)';
  const EASE_OUT = 'cubic-bezier(.16, 1, .3, 1)';
  const EASE_IN = 'cubic-bezier(.7, 0, .84, 0)';

  /* =========================================================
     Scroll engine: register effects, update them in a single rAF,
     skip the ones that are off-screen.
     ========================================================= */
  const effects = [];
  const onFrame = [];
  let rafId = 0;
  const frame = () => {
    rafId = 0;
    const vh = window.innerHeight;
    onFrame.forEach((fn) => fn(vh));
    effects.forEach((fx) => { if (fx.active) fx.update(fx.el.getBoundingClientRect(), vh); });
  };
  const requestFrame = () => { if (!rafId) rafId = requestAnimationFrame(frame); };
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);

  const fxObserver = hasIO && new IntersectionObserver((entries) => {
    // One last update on enter/leave so a section skipped by a fast jump settles in its end state.
    entries.forEach((e) => {
      e.target.__fx.forEach((fx) => { fx.active = e.isIntersecting; fx.update(e.target.getBoundingClientRect(), window.innerHeight); });
    });
    requestFrame();
  }, { rootMargin: '25% 0px' });

  const addEffect = (el, update) => {
    const fx = { el, update, active: true };
    (el.__fx = el.__fx || []).push(fx);
    effects.push(fx);
    if (fxObserver) fxObserver.observe(el);
    requestFrame();
  };

  /* ---------- Header: solid after the hero edge, hides on read-down, returns on scroll-up ---------- */
  const header = $('[data-header]');
  const nav = $('[data-nav]');
  if (header) {
    let lastY = window.scrollY;
    onFrame.push((vh) => {
      const y = window.scrollY;
      if (!header.classList.contains('is-solid')) header.classList.toggle('is-scrolled', y > 40);
      const busy = header.classList.contains('is-open') || header.contains(document.activeElement);
      if (!reduceMotion && !busy && y > vh * 0.9 && y > lastY + 6) header.classList.add('is-hidden');
      else if (y < lastY - 6 || y < vh * 0.5 || busy) header.classList.remove('is-hidden');
      lastY = y;
    });
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  }

  /* ---------- Mobile navigation ---------- */
  const toggle = $('[data-nav-toggle]');
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.visually-hidden').textContent = open ? 'Fermer le menu' : 'Menu';
      nav.classList.toggle('is-open', open);
      header.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- Active section in nav ---------- */
  const navLinks = $$('.site-nav ul a[href^="#"]');
  if (navLinks.length && hasIO) {
    const byId = new Map(navLinks.map((a) => [a.hash.slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (link && entry.isIntersecting) {
          navLinks.forEach((a) => a.removeAttribute('aria-current'));
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* =========================================================
     Reveals: headings get a masked wipe, photos a curtain,
     everything else a fade-up. Elements entering together are
     staggered in reading order (max 6 steps).
     ========================================================= */
  $$('.section-head h2.reveal, .contact-intro h2.reveal').forEach((h) => {
    const inner = document.createElement('span');
    inner.className = 'mask-inner';
    inner.append(...h.childNodes);
    h.append(inner);
    h.classList.add('reveal--mask');
  });
  $$('.gallery-item').forEach((item) => item.classList.add('reveal', 'reveal--curtain'));

  const reveals = $$('.reveal');
  if (hasIO && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((e, i) => {
          e.target.style.setProperty('--delay', `${Math.min(i, 6) * STAGGER}ms`);
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* =========================================================
     Hero: power-on intro, light switch / torch, parallax, scroll framing
     ========================================================= */
  const hero = $('[data-hero]');
  if (hero) {
    const lightSwitch = $('[data-light-switch]', hero);
    const label = lightSwitch && $('[data-switch-label]', lightSwitch);
    const hint = $('[data-switch-hint]', hero);
    const heroImg = $('.hero-img--dark', hero);

    const setLight = (on) => {
      hero.classList.toggle('is-lit', on);
      hero.classList.toggle('is-torch', !on);
      if (lightSwitch) {
        lightSwitch.setAttribute('aria-pressed', String(on));
        label.textContent = on ? 'Éteindre la lumière' : 'Allumer la lumière';
      }
      if (hint) hint.hidden = on;
    };

    // Intro (≈2.4 s): the current runs (0–1.3 s), copy rises (0.55 s +), light spreads (1.0–3.2 s).
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      if (reduceMotion) {
        hero.style.transition = 'none';
        hero.classList.add('is-ready', 'is-powered', 'is-lit');
        return;
      }
      requestAnimationFrame(() => {
        hero.classList.add('is-ready', 'is-powered');
        setTimeout(() => setLight(true), 1000);
      });
    };
    if (heroImg.complete) start(); else heroImg.addEventListener('load', start, { once: true });
    setTimeout(start, 2500); // never leave the hero dark if the image is slow

    if (lightSwitch) lightSwitch.addEventListener('click', () => setLight(!hero.classList.contains('is-lit')));

    const moveLight = (x, y) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--lx', `${x - r.left}px`);
      hero.style.setProperty('--ly', `${y - r.top}px`);
      return r;
    };
    if (finePointer && !reduceMotion) {
      hero.addEventListener('pointermove', (e) => {
        const r = moveLight(e.clientX, e.clientY);
        hero.style.setProperty('--tx', `${((e.clientX - r.left) / r.width - 0.5) * -18}px`);
        hero.style.setProperty('--ty', `${((e.clientY - r.top) / r.height - 0.5) * -12}px`);
      });
    } else {
      hero.addEventListener('touchmove', (e) => {
        if (hero.classList.contains('is-torch')) moveLight(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
    }

    // Scroll: the photo closes into a framed screen while the copy lifts away.
    if (!reduceMotion) {
      addEffect(hero, (r) => hero.style.setProperty('--sp', clamp(-r.top / r.height).toFixed(3)));
    }
    if (hasIO) {
      new IntersectionObserver(([entry]) => hero.classList.toggle('is-offscreen', !entry.isIntersecting)).observe(hero);
    }
  }

  /* ---------- Section transition: dark sections open from a frame ---------- */
  if (!reduceMotion) {
    $$('.section-dark').forEach((section) => {
      addEffect(section, (r, vh) => section.style.setProperty('--enter', clamp((vh - r.top) / (vh * 0.55)).toFixed(3)));
    });
  }

  /* ---------- Services index: the matching job floats under the cursor ----------
     Position eases toward the pointer (lerp 0.18/frame); tilt follows horizontal speed, ±6°. */
  const svcList = $('[data-svc-list]');
  const preview = $('[data-svc-preview]');
  if (svcList && preview && finePointer && !reduceMotion && window.matchMedia('(min-width: 901px)').matches) {
    const track = $('.svc-preview-track', preview);
    const rows = $$('.svc', svcList);
    const frames = rows.map((row) => {
      const img = document.createElement('img');
      img.src = $('.svc-img', row).src;
      img.alt = '';
      img.decoding = 'async';
      track.append(img);
      return img;
    });
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false;
    const tick = () => {
      const dx = tx - x;
      x += dx * 0.18;
      y += (ty - y) * 0.18;
      preview.style.setProperty('--x', `${x.toFixed(1)}px`);
      preview.style.setProperty('--y', `${y.toFixed(1)}px`);
      preview.style.setProperty('--rot', `${clamp(dx * 0.06, -6, 6).toFixed(2)}deg`);
      raf = (on || Math.abs(dx) > 0.5) ? requestAnimationFrame(tick) : 0;
    };
    rows.forEach((row, i) => {
      row.addEventListener('pointerenter', () => frames.forEach((f, j) => f.classList.toggle('is-current', i === j)));
    });
    svcList.addEventListener('pointerenter', (e) => {
      x = tx = e.clientX; y = ty = e.clientY;
      on = true;
      preview.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(tick);
    });
    svcList.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
    svcList.addEventListener('pointerleave', () => { on = false; preview.classList.remove('is-on'); });
    window.addEventListener('scroll', () => { if (on) { on = false; preview.classList.remove('is-on'); } }, { passive: true });
    svcList.addEventListener('pointermove', () => { if (!on) { on = true; preview.classList.add('is-on'); if (!raf) raf = requestAnimationFrame(tick); } });
  }

  /* ---------- Magnetic CTAs: follow the pointer a few pixels, spring back ---------- */
  if (finePointer && !reduceMotion) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.classList.remove('is-releasing');
        el.style.setProperty('--magx', `${clamp((e.clientX - r.left - r.width / 2) * 0.22, -8, 8)}px`);
        el.style.setProperty('--magy', `${clamp((e.clientY - r.top - r.height / 2) * 0.3, -6, 6)}px`);
      });
      el.addEventListener('pointerleave', () => {
        el.classList.add('is-releasing');
        el.style.setProperty('--magx', '0px');
        el.style.setProperty('--magy', '0px');
      });
    });
  }

  /* =========================================================
     Gallery: parallax inside frames, sliding filter pill,
     FLIP re-layout when filtering.
     ========================================================= */
  const gallery = $('[data-gallery]');
  const items = gallery ? $$('.gallery-item', gallery) : [];

  if (gallery && !reduceMotion) {
    items.forEach((item) => {
      const img = $('img', item);
      addEffect(item, (r, vh) => {
        const c = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
        img.style.setProperty('--py', `${(c * r.height * -0.05).toFixed(1)}px`);
      });
    });
  }

  const filters = $('[data-filters]');
  const placePill = () => {
    const active = filters && $('.filter.is-active', filters);
    if (!active) return;
    filters.style.setProperty('--fx', `${active.offsetLeft}px`);
    filters.style.setProperty('--fy', `${active.offsetTop}px`);
    filters.style.setProperty('--fw', `${active.offsetWidth}px`);
    filters.style.setProperty('--fh', `${active.offsetHeight}px`);
  };
  if (filters) {
    placePill();
    filters.classList.add('has-indicator');
    window.addEventListener('resize', placePill);
    if (document.fonts) document.fonts.ready.then(placePill);
  }

  const applyFilter = (f) => {
    const before = new Map(items.filter((i) => !i.hidden).map((i) => [i, i.getBoundingClientRect()]));
    items.forEach((item) => { item.hidden = !(f === 'all' || item.dataset.cat.split(' ').includes(f)); });
    if (reduceMotion) return;
    items.filter((i) => !i.hidden).forEach((item, i) => {
      const old = before.get(item);
      item.classList.remove('is-entering');
      if (old) {
        const now = item.getBoundingClientRect();
        const dx = old.left - now.left;
        const dy = old.top - now.top;
        if (dx || dy) {
          item.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
            { duration: 600, easing: EASE_IN_OUT });
        }
      } else {
        item.style.animationDelay = `${Math.min(i, 6) * STAGGER}ms`;
        void item.offsetWidth;
        item.classList.add('is-entering');
      }
    });
  };

  $$('[data-filter]').forEach((btn, _, all) => {
    btn.addEventListener('click', () => {
      all.forEach((b) => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      placePill();
      applyFilter(btn.dataset.filter);
    });
  });

  /* =========================================================
     Lightbox: the photo grows out of its thumbnail (FLIP) and
     shrinks back into it on close. Thumbnail first, full-res swap
     once decoded, so the animation never waits on the network.
     ========================================================= */
  const lb = $('[data-lightbox]');
  if (lb && gallery && typeof lb.showModal === 'function') {
    const img = $('[data-lightbox-img]', lb);
    const cap = $('[data-lightbox-cap]', lb);
    let current = 0;
    let opener = null;
    let closing = false;
    const visible = () => items.filter((i) => !i.hidden).map((i) => $('.gallery-btn', i));

    const load = (btn) => {
      const thumb = $('img', btn);
      img.style.setProperty('--ar', (thumb.naturalWidth / thumb.naturalHeight) || 4 / 3);
      img.src = thumb.currentSrc || thumb.src;
      img.alt = thumb.alt;
      cap.innerHTML = $('.gallery-cap', btn).innerHTML;
      const full = new Image();
      full.src = btn.dataset.full;
      full.decode().then(() => { if (visible()[current] === btn) img.src = full.src; }).catch(() => {});
    };

    // Transform that maps the lightbox image onto the thumbnail frame (cover-fit, cropped by clip-path).
    const flipFrom = (frame) => {
      const r = img.getBoundingClientRect();
      const s = Math.max(frame.width / r.width, frame.height / r.height);
      const cx = (r.width * s - frame.width) / (2 * s);
      const cy = (r.height * s - frame.height) / (2 * s);
      const dx = frame.left + frame.width / 2 - (r.left + r.width / 2);
      const dy = frame.top + frame.height / 2 - (r.top + r.height / 2);
      return { transform: `translate(${dx}px, ${dy}px) scale(${s})`, clipPath: `inset(${cy}px ${cx}px round ${14 / s}px)` };
    };
    const settled = { transform: 'none', clipPath: 'inset(0px 0px round 10px)' };
    const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };

    const open = (btn) => {
      if (lb.open) return;
      opener = btn;
      current = visible().indexOf(btn);
      load(btn);
      lb.showModal();
      document.body.style.overflow = 'hidden';
      if (!reduceMotion) img.animate([flipFrom(btn.getBoundingClientRect()), settled], { duration: 700, easing: EASE_IN_OUT });
    };

    const close = () => {
      if (closing || !lb.open) return;
      const btn = visible()[current];
      if (reduceMotion || !btn || !inView(btn)) { lb.close(); return; }
      closing = true;
      lb.classList.add('is-closing');
      const anim = img.animate([settled, flipFrom(btn.getBoundingClientRect())], { duration: 520, easing: EASE_IN_OUT, fill: 'forwards' });
      const done = () => { if (closing && lb.open) lb.close(); anim.cancel(); };
      anim.onfinish = done;
      setTimeout(done, 900); // safety net if the animation is interrupted
    };

    const step = (dir) => {
      const list = visible();
      const next = (current + dir + list.length) % list.length;
      if (reduceMotion) { current = next; load(list[next]); return; }
      img.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 40}px)` }], { duration: 180, easing: EASE_IN })
        .onfinish = () => {
          current = next;
          load(list[next]);
          img.animate([{ opacity: 0, transform: `translateX(${dir * 40}px)` }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE_OUT });
        };
    };

    gallery.addEventListener('click', (e) => {
      const btn = e.target.closest('.gallery-btn');
      if (btn) open(btn);
    });
    $('[data-lb-prev]', lb).addEventListener('click', () => step(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => step(1));
    $('[data-lb-close]', lb).addEventListener('click', close);
    lb.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    lb.addEventListener('close', () => {
      closing = false;
      lb.classList.remove('is-closing');
      document.body.style.overflow = '';
      img.removeAttribute('src');
      const back = visible()[current] || opener;
      if (back) requestAnimationFrame(() => back.focus({ preventScroll: true }));
    });

    let startX = null;
    lb.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
      startX = null;
    });
  }

  /* =========================================================
     Method: the current runs down the line as you read;
     each step lights up when the current reaches its node.
     ========================================================= */
  const steps = $('[data-steps]');
  if (steps) {
    const stepEls = $$('.step', steps);
    if (reduceMotion) {
      steps.style.setProperty('--progress', '1');
      stepEls.forEach((s) => s.classList.add('is-active'));
    } else {
      addEffect(steps, (r, vh) => {
        const p = clamp((vh * 0.62 - r.top) / r.height);
        steps.style.setProperty('--progress', p.toFixed(3));
        const reach = p * r.height;
        stepEls.forEach((s) => s.classList.toggle('is-active', s.offsetTop + 30 <= reach + 1));
      });
    }
  }

  /* ---------- Contact form ---------- */
  const form = $('[data-contact-form]');
  if (form) {
    const status = $('[data-form-status]', form);
    const submit = $('[data-submit]', form);
    const messages = {
      nom: 'Indiquez votre nom.',
      telephone: 'Indiquez un numéro de téléphone valide.',
      email: 'Cette adresse e-mail ne semble pas valide.',
      message: 'Décrivez votre projet en quelques mots (10 caractères minimum).',
    };

    const check = (field) => {
      const wrap = field.closest('.field');
      const err = wrap && $('.field-error', wrap);
      const ok = field.checkValidity();
      if (wrap) wrap.classList.toggle('has-error', !ok);
      field.setAttribute('aria-invalid', String(!ok));
      if (err) err.textContent = ok ? '' : (messages[field.name] || field.validationMessage);
      return ok;
    };
    const fields = $$('input[name]:not([type="hidden"]):not([name="_honey"]), textarea[name]', form);
    fields.forEach((f) => f.addEventListener('blur', () => { if (f.value) check(f); }));
    fields.forEach((f) => f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') check(f); }));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const invalid = fields.filter((f) => !check(f));
      if (invalid.length) { invalid[0].focus(); return; }
      if (form._honey.value) return;

      status.className = 'form-status';
      status.textContent = '';
      submit.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || String(data.success) === 'false') throw new Error(data.message || res.statusText);
        form.reset();
        status.classList.add('is-ok');
        status.textContent = 'Merci ! Votre demande est bien envoyée, nous vous recontactons rapidement.';
      } catch (err) {
        const body = encodeURIComponent(`${form.nom.value}\n${form.telephone.value}\n${form.projet.value}\n\n${form.message.value}`);
        status.classList.add('is-err');
        status.innerHTML = `L'envoi n'a pas abouti. Appelez-nous au <a href="tel:+33630201018">06 30 20 10 18</a> ou <a href="mailto:e.mconcept83@gmail.com?subject=Demande%20de%20devis&body=${body}">envoyez-nous un e-mail</a>.`;
      } finally {
        submit.removeAttribute('aria-busy');
      }
    });
  }

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  requestFrame();
})();
