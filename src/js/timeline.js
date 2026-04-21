/**
 * timeline.js
 * Scrollytelling horizontal avec GSAP ScrollTrigger
 */

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { startJourJAnim } from './visualizations.js'

gsap.registerPlugin(ScrollTrigger)

export function initTimeline() {
  const wrapper = document.getElementById('timeline-wrapper')
  const track   = document.getElementById('timeline-track')
  const screens = document.querySelectorAll('.timeline-screen')
  const N = screens.length
  const dotContainer = document.getElementById('timeline-progress')

  /* ── Création des points de progression ── */
  for (let i = 0; i < N; i++) {
    const dot = document.createElement('div')
    dot.className = 'progress-dot' + (i === 0 ? ' active' : '')
    dot.addEventListener('click', () => {
      const progress = i / (N - 1)
      const sts = ScrollTrigger.getAll()
      const st  = sts.find(t => t.vars && t.vars.trigger === wrapper)
      if (st) {
        window.scrollTo({ top: st.start + progress * (st.end - st.start), behavior: 'smooth' })
      }
    })
    dotContainer.appendChild(dot)
  }

  /* ── Visibilité des dots ── */
  ScrollTrigger.create({
    trigger: '#page-timeline',
    start: 'top 85%',
    end: 'bottom 15%',
    onEnter:     () => dotContainer.classList.add('visible'),
    onLeave:     () => dotContainer.classList.remove('visible'),
    onEnterBack: () => dotContainer.classList.add('visible'),
    onLeaveBack: () => dotContainer.classList.remove('visible'),
  })

  /* Index de l'écran JJ - La mort */
  const jourJIdx = Array.from(screens).findIndex(s => s.querySelector('#viz-jour-j'))

  /* ── Scroll horizontal pinné ── */
  gsap.to(track, {
    x: () => -(track.scrollWidth - window.innerWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: wrapper,
      start: 'top top',
      end: () => `+=${track.scrollWidth - window.innerWidth}`,
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate(self) {
        const idx = Math.round(self.progress * (N - 1))

        /* Dots actifs */
        document.querySelectorAll('.progress-dot').forEach((d, i) =>
          d.classList.toggle('active', i === idx)
        )

        /* Classes in-view pour animations CSS */
        screens.forEach((s, i) => {
          if (i === idx) {
            s.classList.add('in-view')
          } else if (Math.abs(i - idx) > 1) {
            s.classList.remove('in-view')
          }
        })

        /* Démarre l'animation des mois quand l'écran JJ entre en vue */
        if (idx === jourJIdx) startJourJAnim()
      },
    },
  })

  window.addEventListener('resize', () => ScrollTrigger.refresh())
}
