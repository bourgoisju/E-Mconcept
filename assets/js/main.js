/* EM Concept — interactions (vanilla, no dependencies) */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header: scrolled state ---------- */
  const header = $('[data-header]');
  if (header && !header.classList.contains('is-solid')) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Mobile navigation ---------- */
  const toggle = $('[data-nav-toggle]');
  const nav = $('[data-nav]');
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
  if (navLinks.length && 'IntersectionObserver' in window) {
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

  /* ---------- Reveal on scroll (staggered per parent) ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const groups = new Map();
    reveals.forEach((el) => {
      const i = groups.get(el.parentElement) || 0;
      el.style.setProperty('--delay', `${Math.min(i, 6) * 0.08}s`);
      groups.set(el.parentElement, i + 1);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Hero light switch ---------- */
  const hero = $('[data-hero]');
  const lightSwitch = $('[data-light-switch]');
  if (hero && lightSwitch) {
    const label = $('[data-switch-label]', lightSwitch);
    const setLight = (on) => {
      hero.classList.toggle('is-lit', on);
      lightSwitch.setAttribute('aria-pressed', String(on));
      label.textContent = on ? 'Éteindre la lumière' : 'Allumer la lumière';
    };
    const heroImg = $('.hero-media img', hero);
    const turnOn = () => setTimeout(() => setLight(true), reduceMotion ? 0 : 450);
    setLight(false);
    if (heroImg.complete) turnOn(); else heroImg.addEventListener('load', turnOn, { once: true });
    lightSwitch.addEventListener('click', () => setLight(!hero.classList.contains('is-lit')));
  }

  /* ---------- Service cards: pointer spotlight ---------- */
  if (window.matchMedia('(hover: hover)').matches) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- Gallery filters ---------- */
  const gallery = $('[data-gallery]');
  const items = gallery ? $$('.gallery-item', gallery) : [];
  $$('[data-filter]').forEach((btn, _, all) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      all.forEach((b) => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      items.forEach((item) => {
        const show = f === 'all' || item.dataset.cat.split(' ').includes(f);
        item.hidden = !show;
        item.classList.remove('is-entering');
        if (show && !reduceMotion) { void item.offsetWidth; item.classList.add('is-entering'); }
      });
    });
  });

  /* ---------- Lightbox ---------- */
  const lb = $('[data-lightbox]');
  if (lb && gallery && typeof lb.showModal === 'function') {
    const img = $('[data-lightbox-img]', lb);
    const cap = $('[data-lightbox-cap]', lb);
    let current = 0;
    let opener = null;
    const visible = () => items.filter((i) => !i.hidden).map((i) => $('.gallery-btn', i));

    const show = (index) => {
      const list = visible();
      current = (index + list.length) % list.length;
      const btn = list[current];
      const thumb = $('img', btn);
      img.src = btn.dataset.full;
      img.alt = thumb.alt;
      cap.innerHTML = btn.querySelector('.gallery-cap').innerHTML;
    };

    gallery.addEventListener('click', (e) => {
      const btn = e.target.closest('.gallery-btn');
      if (!btn) return;
      opener = btn;
      show(visible().indexOf(btn));
      lb.showModal();
      document.body.style.overflow = 'hidden';
    });
    $('[data-lb-prev]', lb).addEventListener('click', () => show(current - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => show(current + 1));
    $('[data-lb-close]', lb).addEventListener('click', () => lb.close());
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') lb.close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
    lb.addEventListener('close', () => {
      document.body.style.overflow = '';
      img.removeAttribute('src');
      if (opener) requestAnimationFrame(() => opener.focus());
    });

    let startX = null;
    lb.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Steps progress line ---------- */
  const steps = $('[data-steps]');
  if (steps && !reduceMotion) {
    let ticking = false;
    const update = () => {
      const r = steps.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      steps.style.setProperty('--progress', p.toFixed(3));
      ticking = false;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  } else if (steps) {
    steps.style.setProperty('--progress', '1');
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
      status.textContent = 'Envoi en cours…';
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
})();
