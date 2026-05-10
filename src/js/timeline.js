/**
 * timeline.js
 * Scrollytelling horizontal avec GSAP ScrollTrigger
 */

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  startJourJAnim,
  playFlowerAnim,
  playHomicideGrid,
  playAdolescenceMap,
  manageLottieWalker,
  playViolentometre,
  cleanupFlowerPoem,
} from "./visualizations.js";

gsap.registerPlugin(ScrollTrigger)

/* Dates de chaque étape de la vie de Marie (ordre chronologique inversé) */
const SCREEN_DATES = {
  'screen-mort':            '23.01.2026',
  'screen-jj':              '23.01.2026',
  'screen-quelques-jours':  '19.01.2026',
  'screen-3-semaines':      '02.01.2026',
  'screen-j2m':             '24.11.2025',
  'screen-j1a':             '23.01.2025',
  'screen-j2a':             '23.01.2024',
  'screen-j15a':            '12.08.2011',
  'screen-adolescence':     '05.06.2008',
  'screen-naissance':       '15.05.1996',
};

/* Effet TextShuffle : révèle les chiffres progressivement */
const _shuffleTimers = new Map();
function shuffleText(el, finalText) {
  if (!el) return;
  if (_shuffleTimers.has(el)) {
    clearInterval(_shuffleTimers.get(el));
    _shuffleTimers.delete(el);
  }
  const chars = '0123456789';
  const steps = 14;
  let step = 0;
  const timer = setInterval(() => {
    const ratio = step / steps;
    el.textContent = finalText.split('').map((c) => {
      if (c === '.' || c === ' ' || c === "'") return c;
      return Math.random() < ratio ? c : chars[Math.floor(Math.random() * 10)];
    }).join('');
    step++;
    if (step > steps) {
      clearInterval(timer);
      _shuffleTimers.delete(el);
      el.textContent = finalText;
    }
  }, 38);
  _shuffleTimers.set(el, timer);
}

export function initTimeline() {
  const wrapper = document.getElementById("timeline-wrapper");
  const track = document.getElementById("timeline-track");
  const screens = document.querySelectorAll(".timeline-screen");
  const N = screens.length;
  const dotContainer = document.getElementById("timeline-progress");

  /* ── Pré-population des dates dans les footers ──
     Les screens sont en ordre HTML : [sources, naissance, …, mort]
     En scroll, on les voit dans l'ordre inverse : mort → … → naissance → sources.
     Pour l'écran à htmlIdx k, le "suivant dans le passé" est screens[k-1]. */
  screens.forEach((screen, htmlIdx) => {
    const date = SCREEN_DATES[screen.id];
    if (!date) return;
    const footerDate = screen.querySelector('.footer-date');
    const footerNext = screen.querySelector('.footer-next');
    if (footerDate) footerDate.textContent = date;
    if (footerNext) {
      if (htmlIdx <= 1) {
        footerNext.textContent = "L'origine";
      } else {
        const nextScreen = screens[htmlIdx - 1];
        footerNext.textContent = SCREEN_DATES[nextScreen?.id] || '';
      }
    }
  });

  /* ── 10 points de progression (une étape de la vie = un dot) ──
     On exclut screen-sources (htmlIdx 0) qui n'est pas une étape de vie.
     Dot i (0=naissance … 9=mort) navigue vers screens[i+1]. */
  const LIFE_COUNT = N - 1;
  for (let i = 0; i < LIFE_COUNT; i++) {
    const dot = document.createElement("div");
    dot.className = "progress-dot" + (i === LIFE_COUNT - 1 ? " active" : "");
    dot.addEventListener("click", () => {
      /* screens[i+1] est visible quand idx = i+1, soit progress = 1 - (i+1)/(N-1) */
      const progress = 1 - (i + 1) / (N - 1);
      const sts = ScrollTrigger.getAll();
      const st = sts.find((t) => t.vars && t.vars.trigger === wrapper);
      if (st) {
        window.scrollTo({
          top: st.start + progress * (st.end - st.start),
          behavior: "smooth",
        });
      }
    });
    dotContainer.appendChild(dot);
  }

  /* ── Visibilité des dots ── */
  ScrollTrigger.create({
    trigger: "#page-timeline",
    start: "top 85%",
    end: "bottom 15%",
    onEnter: () => dotContainer.classList.add("visible"),
    onLeave: () => dotContainer.classList.remove("visible"),
    onEnterBack: () => dotContainer.classList.add("visible"),
    onLeaveBack: () => dotContainer.classList.remove("visible"),
  });

  /* Index de l'écran JJ - La mort */
  const jourJIdx = Array.from(screens).findIndex((s) =>
    s.querySelector("#viz-jour-j"),
  );
  /* Index de l'écran J-2 mois - Violentomètre */
  const j2mIdx = Array.from(screens).findIndex((s) => s.id === "screen-j2m");
  /* Index de l'écran J — 3 semaines — fleur + pétales */
  const j3sIdx = Array.from(screens).findIndex((s) => s.id === "screen-3-semaines");
  /* Index de l'écran J-1 an - Floraison */
  const j1aIdx = Array.from(screens).findIndex((s) => s.id === "screen-j1a");
  /* Index de l'écran J-2 ans - Homme marchant (Lottie) */
  const j2aIdx = Array.from(screens).findIndex((s) => s.id === "screen-j2a");
  /* Index de l'écran J-15 ans - Grille → Fleurs */
  const j15aIdx = Array.from(screens).findIndex((s) => s.id === "screen-j15a");
  /* Index de l'écran Adolescence - Carte Suisse */
  const adolescenceIdx = Array.from(screens).findIndex((s) => s.id === "screen-adolescence");

  /* Dernier idx connu — détecte les transitions de slide */
  let _prevIdx = -1;

  /* ── Scroll horizontal pinné ── */
  gsap.fromTo(
    track,
    { x: () => -(track.scrollWidth - window.innerWidth) },
    {
      x: 0,
      ease: "none",
      scrollTrigger: {
        trigger: wrapper,
        start: "top top",
        end: () => `+=${track.scrollWidth - window.innerWidth}`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          const idx = Math.round((1 - self.progress) * (N - 1));

          /* Dot actif : dot i = screens[i+1], donc quand idx=k → dot k-1
             (idx=0 = sources → aucun dot actif) */
          const activeDot = idx - 1;
          document
            .querySelectorAll(".progress-dot")
            .forEach((d, i) => d.classList.toggle("active", i === activeDot));

          /* Classes in-view pour animations CSS */
          screens.forEach((s, i) => {
            if (i === idx) {
              s.classList.add("in-view");
            } else if (Math.abs(i - idx) > 1) {
              s.classList.remove("in-view");
            }
          });

          /* Démarre l'animation des mois quand l'écran JJ entre en vue */
          if (idx === jourJIdx) startJourJAnim();
          /* Lance le violentomètre quand l'écran J-2 mois entre en vue */
          if (idx === j2mIdx) playViolentometre();
          /* Lance la floraison quand l'écran J-1 an entre en vue */
          if (idx === j1aIdx) playFlowerAnim();
          /* Lance la grille animée quand l'écran J-15 ans entre en vue */
          if (idx === j15aIdx) playHomicideGrid();
          /* Lance la carte de pousses quand l'écran Adolescence entre en vue */
          if (idx === adolescenceIdx) playAdolescenceMap();

          if (idx !== _prevIdx) {
            /* Play/pause Lottie sur entrée et sortie de screen-j2a */
            if (j2aIdx >= 0 && (idx === j2aIdx || _prevIdx === j2aIdx)) {
              manageLottieWalker(idx === j2aIdx);
            }

            /* Efface les pétales tombés quand on quitte screen-3-semaines */
            if (j3sIdx >= 0 && _prevIdx === j3sIdx) {
              cleanupFlowerPoem();
            }

            /* Animation TextShuffle sur les dates du footer de l'écran courant */
            const currentScreen = screens[idx];
            if (currentScreen && SCREEN_DATES[currentScreen.id]) {
              const fd = currentScreen.querySelector('.footer-date');
              const fn = currentScreen.querySelector('.footer-next');
              if (fd && fd.textContent) shuffleText(fd, fd.textContent);
              if (fn && fn.textContent) shuffleText(fn, fn.textContent);
            }

            _prevIdx = idx;
          }
        },
      },
    },
  );

  window.addEventListener("resize", () => ScrollTrigger.refresh());
}
