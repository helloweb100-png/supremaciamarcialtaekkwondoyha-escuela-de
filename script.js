/* =====================================================================
   SUPREMACÍA MARCIAL · TAEKWONDO, HAPKIDO Y KUMDO
   JavaScript sin dependencias.

   Índice
   01 Utilidades
   02 Bloqueo de scroll + scroll suave con inercia
   03 Loader
   04 Palabras animadas (split)
   05 Revelado al entrar en pantalla + contadores
   06 Header, menú móvil y enlace activo
   07 Motor de scroll (barra, parallax, tarjetas apiladas, manifiesto, marquee)
   08 Hero: typewriter, partículas, inclinación 3D
   09 Micro-interacciones (botones magnéticos, brillo de tarjetas)
   10 Modal de WhatsApp y formulario
   11 Lightbox de galería
   ===================================================================== */
(() => {
  "use strict";

  window.__sm = true; // avisa al script de seguridad del <head> que todo cargó

  /* ---------------------------------------------------------------
     01 UTILIDADES
     --------------------------------------------------------------- */
  const $ = (selector, ctx = document) => ctx.querySelector(selector);
  const $$ = (selector, ctx = document) => [...ctx.querySelectorAll(selector)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const root = document.documentElement;
  const body = document.body;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const WA_NUMBER = "5212288556713";

  /* ---------------------------------------------------------------
     02 BLOQUEO DE SCROLL + SCROLL SUAVE CON INERCIA
     Solo en escritorio con ratón (en táctil se respeta el scroll nativo)
     --------------------------------------------------------------- */
  let lockCount = 0;

  const smooth = (() => {
    const enabled = !reduced && finePointer;
    let target = window.scrollY;
    let current = target;
    let active = false;
    let last = 0;
    const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);

    const tick = (now) => {
      const dt = Math.min(64, now - last || 16.7);
      last = now;
      // interpolación independiente de la tasa de refresco: aquí vive el "motion slow"
      current += (target - current) * (1 - Math.pow(1 - 0.085, dt / 16.7));
      if (Math.abs(target - current) < 0.4) {
        current = target;
        active = false;
      }
      window.scrollTo(0, current);
      if (active) requestAnimationFrame(tick);
    };
    const start = () => {
      if (active) return;
      active = true;
      last = 0;
      requestAnimationFrame(tick);
    };

    const sync = () => { target = current = window.scrollY; };

    if (enabled) {
      root.classList.add("has-smooth");
      window.addEventListener("wheel", (event) => {
        if (event.ctrlKey || lockCount) return;
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return; // scroll horizontal nativo
        if (event.target.closest && event.target.closest("textarea, select, [data-native-scroll]")) return;
        event.preventDefault();
        const unit = event.deltaMode === 1 ? 34 : event.deltaMode === 2 ? window.innerHeight : 1;
        if (!active) sync();
        target = clamp(target + event.deltaY * unit, 0, maxScroll());
        start();
      }, { passive: false });
      // teclado, barra de scroll o "buscar en la página": se sincroniza con la posición real
      window.addEventListener("scroll", () => { if (!active) sync(); }, { passive: true });
    }

    return {
      enabled,
      sync,
      to(y) {
        if (enabled) {
          if (!active) sync();
          target = clamp(y, 0, maxScroll());
          start();
        } else {
          window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
        }
      }
    };
  })();

  const lockScroll = () => {
    lockCount += 1;
    root.classList.add("is-locked");
  };
  const unlockScroll = () => {
    lockCount = Math.max(0, lockCount - 1);
    if (!lockCount) {
      root.classList.remove("is-locked");
      smooth.sync();
    }
  };

  /* ---------------------------------------------------------------
     03 LOADER
     --------------------------------------------------------------- */
  const loader = $("#loader");
  const loaderFill = $("#loader-fill");
  const loaderPct = $("#loader-pct");
  let siteReady = false;
  const readyCallbacks = [];
  const onReady = (fn) => (siteReady ? fn() : readyCallbacks.push(fn));

  const revealSite = () => {
    if (siteReady) return;
    if (loaderFill) loaderFill.style.width = "100%";
    if (loaderPct) loaderPct.textContent = "100%";

    window.setTimeout(() => {
      loader?.classList.add("is-done");
      root.classList.remove("is-loading");
      smooth.sync();
      // el hero entra cuando las dos mitades del loader ya se están abriendo
      window.setTimeout(() => {
        siteReady = true;
        body.classList.add("is-ready");
        readyCallbacks.splice(0).forEach((fn) => fn());
      }, reduced ? 0 : 650);
      window.setTimeout(() => {
        loader?.classList.add("is-gone");
        loader?.setAttribute("aria-hidden", "true");
      }, reduced ? 0 : 1900);
    }, reduced ? 120 : 380);
  };

  if (!loader) {
    root.classList.remove("is-loading");
    siteReady = true;
    body.classList.add("is-ready");
  } else if (reduced) {
    window.setTimeout(revealSite, 250);
  } else {
    const MIN_MS = 1900;
    const MAX_MS = 4200;
    const t0 = performance.now();
    let loaded = document.readyState === "complete";
    let fontsReady = false;
    let shown = 0;

    window.addEventListener("load", () => { loaded = true; });
    (document.fonts?.ready || Promise.resolve()).then(() => { fontsReady = true; });

    const step = (now) => {
      const elapsed = now - t0;
      const ceiling = loaded && fontsReady ? 100 : 92;
      const target = Math.min(ceiling, (elapsed / MIN_MS) * 100);
      shown += (target - shown) * 0.12;
      const value = Math.min(100, Math.round(shown));
      if (loaderFill) loaderFill.style.width = `${value}%`;
      if (loaderPct) loaderPct.textContent = `${value}%`;
      if ((shown > 99.2 && elapsed > MIN_MS) || elapsed > MAX_MS) {
        revealSite();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------------
     04 PALABRAS ANIMADAS
     Envuelve cada palabra en .w > .w-i conservando los <span> internos
     --------------------------------------------------------------- */
  const splitWords = (el) => {
    let index = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.append(document.createTextNode(" "));
              return;
            }
            const outer = document.createElement("span");
            outer.className = "w";
            const inner = document.createElement("span");
            inner.className = "w-i";
            inner.textContent = part;
            inner.style.setProperty("--wi", index++);
            outer.append(inner);
            frag.append(outer);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
    el.dataset.split = "done";
    return index;
  };

  const splitTargets = $$("[data-split]").map((el) => ({ el, kind: el.dataset.split }));
  splitTargets.forEach(({ el }) => splitWords(el));
  const manifestoHeading = splitTargets.find((t) => t.kind === "scrub")?.el || null;

  /* ---------------------------------------------------------------
     05 REVELADO + CONTADORES
     --------------------------------------------------------------- */
  // retraso escalonado dentro de grupos y de la galería
  $$("[data-stagger]").forEach((group) => {
    $$(":scope > [data-reveal]", group).forEach((child, i) => child.style.setProperty("--d", `${i * 110}ms`));
  });
  $$(".masonry > [data-reveal]").forEach((child, i) => child.style.setProperty("--d", `${(i % 4) * 90}ms`));

  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const runCounter = (el) => {
    const end = Number(el.dataset.count);
    const from = Number(el.dataset.from || 0);
    const duration = 2200;
    const t0 = performance.now();
    const frame = (now) => {
      const p = clamp((now - t0) / duration, 0, 1);
      el.textContent = Math.round(from + (end - from) * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const counters = $$("[data-count]");
  if (!reduced) counters.forEach((el) => { el.textContent = el.dataset.from || "0"; });

  // titulares normales se revelan al entrar; el del hero (loader) y el del manifiesto (scroll) tienen su propio control
  const revealTargets = $$("[data-reveal]").concat(splitTargets.filter((t) => t.kind === "").map((t) => t.el));
  const revealIO = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealIO.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" })
    : null;

  revealTargets.forEach((el) => {
    if (revealIO) revealIO.observe(el);
    else el.classList.add("is-in");
  });

  if (counters.length && "IntersectionObserver" in window && !reduced) {
    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        counterIO.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => counterIO.observe(el));
  }

  /* ---------------------------------------------------------------
     06 HEADER, MENÚ MÓVIL, ENLACE ACTIVO
     --------------------------------------------------------------- */
  const header = $("#site-header");
  const navToggle = $("#nav-toggle");
  const navLinks = $$(".nav-link");
  let menuOpen = false;

  const setMenu = (open) => {
    if (open === menuOpen) return;
    menuOpen = open;
    body.classList.toggle("nav-open", open);
    navToggle?.setAttribute("aria-expanded", String(open));
    navToggle?.setAttribute("aria-label", open ? "Cerrar menú de navegación" : "Abrir menú de navegación");
    open ? lockScroll() : unlockScroll();
  };

  navToggle?.addEventListener("click", () => setMenu(!menuOpen));
  window.addEventListener("resize", () => { if (window.innerWidth >= 1180) setMenu(false); });

  // anclas: scroll suave con la misma inercia que la rueda
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute("href");
    if (hash.length < 2) return;
    const dest = document.getElementById(hash.slice(1));
    if (!dest) return;
    event.preventDefault();
    const wasOpen = menuOpen;
    setMenu(false);
    const go = () => {
      const y = dest.id === "inicio" ? 0 : dest.getBoundingClientRect().top + window.scrollY;
      smooth.to(y);
      history.pushState(null, "", hash);
    };
    wasOpen ? window.setTimeout(go, 60) : go();
  });

  const sectionLinks = new Map();
  navLinks.forEach((link) => sectionLinks.set(link.getAttribute("href").slice(1), link));
  // secciones que no tienen enlace propio resaltan el de la sección a la que pertenecen
  const navAlias = { "por-que": "servicios", crecimiento: "maestro" };
  Object.entries(navAlias).forEach(([id, target]) => sectionLinks.set(id, sectionLinks.get(target)));
  if ("IntersectionObserver" in window) {
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((l) => { l.classList.remove("is-active"); l.removeAttribute("aria-current"); });
        const active = sectionLinks.get(entry.target.id);
        active?.classList.add("is-active");
        active?.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sectionLinks.forEach((_, id) => { const s = document.getElementById(id); if (s) navIO.observe(s); });
  }

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------------------------------------------------------
     07 MOTOR DE SCROLL
     Un solo listener pasivo agrupado en requestAnimationFrame; cada módulo
     solo trabaja si su elemento está cerca de la pantalla.
     --------------------------------------------------------------- */
  const progressBar = $("#scroll-progress");
  const hero = $(".hero");
  const discs = $$(".disc");
  const manifesto = $(".manifesto");
  const manifestoStick = $(".manifesto-stick");
  const manifestoWords = manifestoHeading ? $$(".w-i", manifestoHeading) : [];
  const parallaxItems = $$("[data-parallax]").map((el) => ({ el, speed: Number(el.dataset.parallax) || 0.06, box: el.parentElement, visible: false }));
  const marqueeTrack = $("#marquee-track");

  const stackMQ = window.matchMedia("(min-width: 960px) and (min-height: 700px)");
  let stickyTops = [];
  const measureStack = () => {
    stickyTops = discs.map((d) => parseFloat(getComputedStyle(d).top) || 0);
  };
  measureStack();
  window.addEventListener("resize", measureStack);

  if (parallaxItems.length && "IntersectionObserver" in window) {
    const parallaxIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const item = parallaxItems.find((p) => p.box === entry.target);
        if (item) item.visible = entry.isIntersecting;
      });
    }, { rootMargin: "20% 0px" });
    parallaxItems.forEach((p) => parallaxIO.observe(p.box));
  } else {
    parallaxItems.forEach((p) => { p.visible = true; });
  }

  // marquee: se acelera con la velocidad del scroll y vuelve a su ritmo
  let marqueeAnim = null;
  let marqueeBoost = 0;
  let marqueeRunning = false;
  const marqueeLoop = () => {
    marqueeAnim = marqueeAnim || marqueeTrack?.getAnimations?.()[0];
    if (!marqueeAnim) { marqueeRunning = false; return; }
    marqueeBoost *= 0.93;
    if (Math.abs(marqueeBoost) < 0.02) marqueeBoost = 0;
    marqueeAnim.playbackRate = 1 + marqueeBoost;
    if (marqueeBoost !== 0) requestAnimationFrame(marqueeLoop);
    else marqueeRunning = false;
  };

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = root.scrollHeight - vh;

    if (progressBar) progressBar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    header?.classList.toggle("is-scrolled", y > 24);

    // hero se desvanece suavemente al salir
    if (hero && y < hero.offsetHeight + 200) {
      hero.style.setProperty("--hp", clamp(y / (hero.offsetHeight * 0.85), 0, 1).toFixed(3));
    }

    // parallax de imágenes (limitado al sobrante de la imagen para no mostrar bordes)
    if (!reduced) {
      parallaxItems.forEach((item) => {
        if (!item.visible) return;
        const r = item.box.getBoundingClientRect();
        const overscan = Math.max(0, (item.el.offsetHeight - r.height) / 2);
        const py = clamp((vh / 2 - (r.top + r.height / 2)) * item.speed, -overscan, overscan);
        item.el.style.setProperty("--py", `${py.toFixed(1)}px`);
      });
    }

    // tarjetas apiladas: la de abajo se hunde cuando llega la siguiente
    if (discs.length) {
      const on = stackMQ.matches && !reduced;
      discs.forEach((card, i) => {
        if (!on || i === discs.length - 1) {
          card.style.removeProperty("--stack");
          return;
        }
        const nextTop = discs[i + 1].getBoundingClientRect().top;
        const stopAt = stickyTops[i + 1] || 0;
        const p = clamp((vh - nextTop) / Math.max(1, vh - stopAt), 0, 1);
        card.style.setProperty("--stack", p.toFixed(3));
      });
    }

    // manifiesto: las palabras se encienden una a una con el scroll
    if (manifesto && manifestoWords.length) {
      const r = manifesto.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        const p = reduced ? 1 : clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
        const n = manifestoWords.length;
        manifestoWords.forEach((w, i) => {
          const wp = clamp((p / 0.8) * n - i, 0, 1);
          w.style.setProperty("--o", (0.16 + 0.84 * wp).toFixed(3));
        });
        manifestoStick?.style.setProperty("--mf-scale", (1.12 - 0.12 * p).toFixed(3));
      }
    }

    // marquee reactivo
    const dy = y - lastY;
    lastY = y;
    if (marqueeTrack && !reduced && Math.abs(dy) > 1) {
      marqueeBoost = clamp(marqueeBoost + Math.abs(dy) * 0.05, 0, 8);
      if (!marqueeRunning) { marqueeRunning = true; requestAnimationFrame(marqueeLoop); }
    }
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  update();

  /* ---------------------------------------------------------------
     08 HERO
     --------------------------------------------------------------- */
  // Typewriter con las palabras del cliente
  const typewriter = $("#typewriter");
  const words = ["Taekwondo", "Hapkido", "Kumdo", "Todas las edades"];
  if (typewriter) {
    if (reduced) {
      typewriter.textContent = words[0];
    } else {
      let w = 0;
      let c = 0;
      let deleting = false;
      const type = () => {
        const word = words[w];
        c += deleting ? -1 : 1;
        typewriter.textContent = word.slice(0, c);
        let delay = deleting ? 45 : 90;
        if (!deleting && c === word.length) { deleting = true; delay = 1700; }
        else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; delay = 400; }
        window.setTimeout(type, delay);
      };
      onReady(() => window.setTimeout(type, 1300));
    }
  }

  // Partículas: brasas naranjas + polvo índigo que reaccionan al puntero
  const canvas = $("#hero-canvas");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const COLORS = ["247,148,29", "247,148,29", "255,176,74", "146,152,245", "243,244,251"];
    const mouse = { x: -9999, y: -9999 };
    let w = 0;
    let h = 0;
    let parts = [];
    let running = false;
    let heroVisible = true;
    let t = 0;

    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 2.1,
      vy: -(0.14 + Math.random() * 0.55),
      vx: (Math.random() - 0.5) * 0.25,
      ph: Math.random() * Math.PI * 2,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      a: 0.25 + Math.random() * 0.6
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((w * h) / 15000, 26, 100));
      parts = Array.from({ length: count }, () => spawn(true));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      t += 1;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.y += p.vy;
        p.x += p.vx + Math.sin(t * 0.012 + p.ph) * 0.18;
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 16900) {
          const d = Math.sqrt(d2) || 1;
          const f = (130 - d) / 130;
          p.x += (dx / d) * f * 2.2;
          p.y += (dy / d) * f * 2.2;
        }
        if (p.y < -12 || p.x < -12 || p.x > w + 12) Object.assign(p, spawn(false));
        const flicker = 0.7 + Math.sin(t * 0.05 + p.ph) * 0.3;
        ctx.fillStyle = `rgba(${p.c},${(p.a * flicker).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fill();
        // red de conexión entre partículas cercanas
        for (let j = i + 1; j < parts.length; j++) {
          const q = parts[j];
          const lx = p.x - q.x;
          const ly = p.y - q.y;
          const ld = lx * lx + ly * ly;
          if (ld < 11000) {
            ctx.strokeStyle = `rgba(146,152,245,${((1 - ld / 11000) * 0.16).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = () => {
      if (!running) return;
      draw();
      requestAnimationFrame(loop);
    };
    const setRunning = () => {
      const should = heroVisible && !document.hidden && !reduced;
      if (should && !running) { running = true; requestAnimationFrame(loop); }
      else if (!should) running = false;
    };

    resize();
    if (reduced) draw();
    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { resize(); if (reduced) draw(); }, 200);
    });
    document.addEventListener("visibilitychange", setRunning);
    if ("IntersectionObserver" in window && hero) {
      new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; setRunning(); }, { threshold: 0 }).observe(hero);
    }
    hero?.addEventListener("pointermove", (event) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = event.clientX - r.left;
      mouse.y = event.clientY - r.top;
    });
    hero?.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
    setRunning();
  }

  // Inclinación 3D de la foto del hero
  const tilt = $("[data-tilt]");
  const heroVisual = $("[data-hero-visual]");
  if (tilt && heroVisual && finePointer && !reduced) {
    heroVisual.addEventListener("pointermove", (event) => {
      const r = heroVisual.getBoundingClientRect();
      const nx = (event.clientX - r.left) / r.width - 0.5;
      const ny = (event.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty("--ry", `${(nx * 9).toFixed(2)}deg`);
      tilt.style.setProperty("--rx", `${(-ny * 9).toFixed(2)}deg`);
    });
    heroVisual.addEventListener("pointerleave", () => {
      tilt.style.setProperty("--ry", "0deg");
      tilt.style.setProperty("--rx", "0deg");
    });
  }

  /* ---------------------------------------------------------------
     09 MICRO-INTERACCIONES
     --------------------------------------------------------------- */
  if (finePointer && !reduced) {
    // botones magnéticos
    $$("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("pointermove", (event) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--tx", `${((event.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px`);
        btn.style.setProperty("--ty", `${((event.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`);
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.setProperty("--tx", "0px");
        btn.style.setProperty("--ty", "0px");
      });
    });

    // brillo que sigue al puntero en tarjetas
    let spotRaf = 0;
    document.addEventListener("pointermove", (event) => {
      const card = event.target.closest && event.target.closest(".spot");
      if (!card || spotRaf) return;
      spotRaf = requestAnimationFrame(() => {
        spotRaf = 0;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - r.left}px`);
        card.style.setProperty("--my", `${event.clientY - r.top}px`);
      });
    });
  }

  /* ---------------------------------------------------------------
     10 MODAL DE WHATSAPP + FORMULARIO
     --------------------------------------------------------------- */
  const focusableSelector = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const trapFocus = (container, event) => {
    if (event.key !== "Tab") return;
    const items = $$(focusableSelector, container).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const waModal = $("#wa-modal");
  let waReturnFocus = null;
  const openWaModal = () => {
    if (!waModal) return;
    setMenu(false);
    waReturnFocus = document.activeElement;
    waModal.classList.add("is-open");
    waModal.setAttribute("aria-hidden", "false");
    lockScroll();
    $(".modal-close", waModal)?.focus();
  };
  const closeWaModal = () => {
    if (!waModal?.classList.contains("is-open")) return;
    waModal.classList.remove("is-open");
    waModal.setAttribute("aria-hidden", "true");
    unlockScroll();
    if (waReturnFocus instanceof HTMLElement) waReturnFocus.focus();
  };

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-wa-trigger]")) { event.preventDefault(); openWaModal(); }
    else if (event.target.closest("[data-wa-close]") || event.target.closest(".modal-option")) closeWaModal();
  });

  // Formulario: arma el mensaje y abre WhatsApp (no hay servidor)
  const form = $("#wa-form");
  if (form) {
    const nameInput = $("#f-nombre");
    const nameError = $("#f-nombre-err");
    const status = $("#wa-form-status");

    nameInput?.addEventListener("input", () => {
      if (nameInput.value.trim()) {
        nameInput.removeAttribute("aria-invalid");
        if (nameError) nameError.hidden = true;
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.setAttribute("aria-invalid", "true");
        if (nameError) nameError.hidden = false;
        nameInput.focus();
        return;
      }
      const discipline = $("#f-disciplina").value;
      const group = $("#f-grupo").value;
      const message = `Hola, soy ${name}. Quiero agendar mi clase gratis de ${discipline} (${group}). ¿Me pueden dar más información?`;
      const link = document.createElement("a");
      link.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
      link.target = "_blank";
      link.rel = "noopener";
      body.append(link);
      link.click();
      link.remove();
      if (status) {
        status.textContent = "Abriendo WhatsApp…";
        window.setTimeout(() => { status.textContent = ""; }, 6000);
      }
    });
  }

  /* ---------------------------------------------------------------
     11 LIGHTBOX
     --------------------------------------------------------------- */
  const lightbox = $("#lightbox");
  const lbImage = $("#lightbox-image");
  const lbCaption = $("#lightbox-caption");
  const lbCurrent = $("#lightbox-current");
  const lbTotal = $("#lightbox-total");
  const slides = $$(".g-item img").map((img) => ({ src: img.currentSrc || img.src, alt: img.alt || "" }));
  let lbIndex = 0;
  let lbReturnFocus = null;

  const renderSlide = () => {
    if (!lbImage || !slides.length) return;
    const slide = slides[lbIndex];
    lbImage.classList.remove("is-loaded");
    const apply = () => {
      lbImage.src = slide.src;
      lbImage.alt = slide.alt;
      requestAnimationFrame(() => lbImage.classList.add("is-loaded"));
    };
    const pre = new Image();
    pre.onload = apply;
    pre.onerror = apply;
    pre.src = slide.src;
    if (lbCaption) lbCaption.textContent = slide.alt;
    if (lbCurrent) lbCurrent.textContent = String(lbIndex + 1);
    if (lbTotal) lbTotal.textContent = String(slides.length);
  };

  const goSlide = (delta) => {
    lbIndex = (lbIndex + delta + slides.length) % slides.length;
    renderSlide();
  };
  const openLightbox = (index) => {
    if (!lightbox || !slides.length) return;
    lbIndex = ((index % slides.length) + slides.length) % slides.length;
    lbReturnFocus = document.activeElement;
    renderSlide();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    lockScroll();
    $(".lightbox-close", lightbox)?.focus();
  };
  const closeLightbox = () => {
    if (!lightbox?.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    unlockScroll();
    if (lbReturnFocus instanceof HTMLElement) lbReturnFocus.focus();
  };

  $$("[data-lightbox-open]").forEach((btn) => btn.addEventListener("click", () => openLightbox(Number(btn.dataset.lightboxIndex) || 0)));
  $$("[data-lightbox-close]").forEach((el) => el.addEventListener("click", closeLightbox));
  $("[data-lightbox-prev]")?.addEventListener("click", () => goSlide(-1));
  $("[data-lightbox-next]")?.addEventListener("click", () => goSlide(1));

  // deslizar con el dedo
  let touchX = null;
  lightbox?.addEventListener("touchstart", (event) => { touchX = event.touches[0].clientX; }, { passive: true });
  lightbox?.addEventListener("touchend", (event) => {
    if (touchX === null) return;
    const dx = event.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) goSlide(dx < 0 ? 1 : -1);
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox?.classList.contains("is-open")) {
      if (event.key === "Escape") closeLightbox();
      else if (event.key === "ArrowLeft") goSlide(-1);
      else if (event.key === "ArrowRight") goSlide(1);
      else trapFocus(lightbox, event);
    } else if (waModal?.classList.contains("is-open")) {
      if (event.key === "Escape") closeWaModal();
      else trapFocus($(".modal-panel", waModal), event);
    } else if (event.key === "Escape" && menuOpen) {
      setMenu(false);
    }
  });
})();
