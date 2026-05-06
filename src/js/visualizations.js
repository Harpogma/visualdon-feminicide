/**
 * visualizations.js
 * Toutes les visualisations D3 pour les écrans de la timeline
 */

import * as d3 from 'd3'
import { feature } from 'topojson-client'
import { drawFlower, drawCircle } from './flower.js'
import flowerUrl from '../assets/svg/flower.svg'
import { gsap } from 'gsap'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'

gsap.registerPlugin(MorphSVGPlugin)

// Path data for each petal of flower.svg (viewBox 263.7 × 266.59, center ≈ 131.85, 133.3)
const FLOWER_PATHS = [
  'M155.2,266.59c-31.95-14.59-46.04-52.37-31.46-84.31l8.4-18.39c31.95,14.59,46.04,52.36,31.46,84.31l-8.4,18.39Z',
  'M63.62,252.8c-15.1-31.71-1.61-69.71,30.1-84.81l18.26-8.69c15.1,31.71,1.61,69.71-30.1,84.81l-18.26,8.69Z',
  'M2.33,183.37c8.82-34,43.57-54.44,77.57-45.62l19.57,5.08c-8.82,34-43.57,54.44-77.57,45.62l-19.57-5.08Z',
  'M0,90.78c28.61-20.38,68.37-13.69,88.75,14.91l11.73,16.47c-28.61,20.38-68.37,13.69-88.75-14.91L0,90.78Z',
  'M57.74,18.37c35.01,2.78,61.18,33.46,58.4,68.47l-1.6,20.16c-35.01-2.78-61.18-33.46-58.4-68.47l1.6-20.16Z',
  'M148.51,0c25.03,24.63,25.36,64.95.72,89.99l-14.18,14.41c-25.03-24.63-25.36-64.95-.72-89.99l14.18-14.41Z',
  'M229.85,44.28c3.34,34.96-22.33,66.06-57.29,69.4l-20.13,1.92c-3.34-34.96,22.33-66.06,57.29-69.4l20.13-1.92Z',
  'M263.7,130.49c-19.91,28.93-59.56,36.25-88.49,16.34l-16.66-11.46c19.91-28.93,59.56-36.25,88.5-16.34l16.65,11.46Z',
  'M234.22,218.28c-33.85,9.36-68.93-10.52-78.29-44.37l-5.39-19.49c33.85-9.36,68.93,10.52,78.29,44.37l5.39,19.49Z',
]

// Clockwise order from 12 o'clock; svgCx/svgCy = petal centroid in SVG viewBox space
const PETAL_CW = [
  { pathIdx: 5, svgCx: 142, svgCy:  52, fallY: 250, fallX:   2, rot:   8 },  // 12 o'clock
  { pathIdx: 6, svgCx: 185, svgCy:  91, fallY: 230, fallX:  25, rot:  20 },  // 2 o'clock
  { pathIdx: 7, svgCx: 213, svgCy: 133, fallY: 220, fallX:  28, rot:  22 },  // 3 o'clock
  { pathIdx: 8, svgCx: 198, svgCy: 205, fallY: 200, fallX:  22, rot:  18 },  // 4-5 o'clock
  { pathIdx: 0, svgCx: 144, svgCy: 220, fallY: 195, fallX:  12, rot:  12 },  // 5-6 o'clock
  { pathIdx: 1, svgCx:  85, svgCy: 218, fallY: 195, fallX: -15, rot: -12 },  // 7-8 o'clock
  { pathIdx: 2, svgCx:  49, svgCy: 170, fallY: 210, fallX: -20, rot: -18 },  // 9 o'clock
  { pathIdx: 3, svgCx:  55, svgCy:  99, fallY: 230, fallX: -18, rot: -22 },  // 10-11 o'clock
  { pathIdx: 4, svgCx:  79, svgCy:  52, fallY: 240, fallX:  -8, rot: -10 },  // 11 o'clock
]

/** Crée un SVG responsive dans un conteneur */
function makeSVG(el, W, H) {
  return d3.select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr('height', '100%')
}

/* ══════════════════════════════════════════
   JJ — La mort: mois animés + colonnes de fleurs
══════════════════════════════════════════ */
export function vizJourJ() {
  const el = document.getElementById('viz-jour-j')
  if (!el) return
  const W = el.clientWidth || 760
  const H = el.clientHeight || 240

  // Slot-machine month scroller (left side, HTML overlay)
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre']

  const scroller = document.createElement('div')
  scroller.className = 'month-scroller'
  const track = document.createElement('div')
  track.className = 'month-track'
  months.forEach(m => {
    const slide = document.createElement('div')
    slide.className = 'month-slide'
    slide.textContent = m
    track.appendChild(slide)
  })
  scroller.appendChild(track)
  el.appendChild(scroller)
}

/* ══════════════════════════════════════════
   J-1 an — champ de 19 981 fleurs (Canvas)
   Phase 1 : 20 fleurs au centre, lentement
   Phase 2 : +19 961 envahissent tout l'espace
   Perf : bitmap 64px × setTransform × Float32Array
══════════════════════════════════════════ */
class FlowerField {
  constructor(el) {
    this.el       = el
    this.canvas   = null
    this.ctx      = null
    this.img      = null        // SVG pré-rastérisé en bitmap 64×64
    this.positions = null       // Float32Array [x,y,cos,sin] × 19 981
    this._fs      = 12          // taille courante (px)
    this.drawn    = 0           // watermark : fleurs déjà tracées
    this.tl       = null
    this._played  = false
    this._ro      = null
  }

  async init() {
    this._buildCanvas()
    await this._bakeImage()
    this._recompute()
    this._buildTimeline()

    // Responsive avant démarrage uniquement
    this._ro = new ResizeObserver(() => {
      if (this._played) return
      this.canvas.width  = this.el.clientWidth  || 800
      this.canvas.height = this.el.clientHeight || 300
      this._recompute()
      if (this.tl) this.tl.kill()
      this.drawn = 0
      this._buildTimeline()
    })
    this._ro.observe(this.el)
  }

  _buildCanvas() {
    this.canvas           = document.createElement('canvas')
    this.canvas.className = 'flower-canvas'
    this.canvas.width     = this.el.clientWidth  || 800
    this.canvas.height    = this.el.clientHeight || 300
    this.el.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')
  }

  _bakeImage() {
    // Charge le SVG une seule fois, rastérisé en canvas 64×64
    // → drawImage sur bitmap = blit pixel, pas de re-parse SVG
    return new Promise((resolve, reject) => {
      const raw = new Image()
      raw.onload = () => {
        const bmp = document.createElement('canvas')
        bmp.width = bmp.height = 64
        bmp.getContext('2d').drawImage(raw, 0, 0, 64, 64)
        this.img = bmp
        resolve()
      }
      raw.onerror = reject
      raw.src = flowerUrl
    })
  }

  _recompute() {
    const W   = this.canvas.width
    const H   = this.canvas.height
    // Taille : ≈2× couverture → tapis dense mais formes encore lisibles
    this._fs  = Math.max(8, Math.min(28,
      Math.sqrt(W * H * 8 / (Math.PI * 19981))
    ))
    const TAU = Math.PI * 2
    const buf = new Float32Array(19981 * 4)

    // Phase 1 – 20 fleurs groupées au centre
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * TAU
      const d = Math.random() * Math.min(W, H) * 0.18
      const r = Math.random() * TAU
      const j = i * 4
      buf[j]     = W / 2 + Math.cos(a) * d
      buf[j + 1] = H / 2 + Math.sin(a) * d
      buf[j + 2] = Math.cos(r)
      buf[j + 3] = Math.sin(r)
    }

    // Phase 2 – 19 961 fleurs réparties sur tout le conteneur
    for (let i = 20; i < 19981; i++) {
      const r = Math.random() * TAU
      const j = i * 4
      buf[j]     = Math.random() * W
      buf[j + 1] = Math.random() * H
      buf[j + 2] = Math.cos(r)
      buf[j + 3] = Math.sin(r)
    }
    this.positions = buf
  }

  // Trace les fleurs [from, to[ sans jamais effacer le canvas
  _flush(from, to) {
    const ctx = this.ctx
    const img = this.img
    const buf = this.positions
    const s   = this._fs
    const hs  = s / 2

    for (let i = from; i < to; i++) {
      const j = i * 4
      // setTransform remplace save/translate/rotate/restore → 1 appel au lieu de 4
      ctx.setTransform(buf[j + 2], buf[j + 3], -buf[j + 3], buf[j + 2], buf[j], buf[j + 1])
      ctx.drawImage(img, -hs, -hs, s, s)
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)   // reset
    this.drawn = to
  }

  _buildTimeline() {
    const proxy = { n: 0 }
    const tick  = () => {
      const n = Math.min(Math.round(proxy.n), 19981)
      if (n > this.drawn) this._flush(this.drawn, n)
    }

    this.tl = gsap.timeline({ paused: true })
      // Phase 1 : 20 fleurs, 2 s — on voit chaque fleur apparaître
      .to(proxy, { n: 20,    duration: 2,   ease: 'power1.out', onUpdate: tick, onComplete: tick })
      // Silence de 1.5 s — le spectateur comprend l'échelle
      .to(proxy, { n: 19981, duration: 4.5, ease: 'power3.in',  onUpdate: tick, onComplete: tick, delay: 1.5 })
  }

  play() {
    if (this._played || !this.tl) return
    this._played = true
    // Déconnecte le ResizeObserver : canvas gelé pendant l'animation
    if (this._ro) { this._ro.disconnect(); this._ro = null }
    this.tl.play()
  }
}

let _flowerField = null

export function initFlowerField() {
  const el = document.getElementById('viz-j1a')
  if (!el) return
  el.innerHTML = ''
  _flowerField = new FlowerField(el)
  _flowerField.init()   // async — terminé bien avant que l'utilisateur scroll jusqu'ici
}

export function playFlowerAnim() {
  _flowerField?.play()
}

/* ══════════════════════════════════════════
   J-15 ans — 163 points → grille → floraison
   Phase 1 : vol depuis l'extérieur (expo.out)
   Phase 2 : 2 s de calme
   Phase 3 : 125 cercles → fleurs (par fondu)
   Technique : <image> cachée derrière chaque cercle-femme
               → révélée quand le cercle s'efface
══════════════════════════════════════════ */
let _homicideTl     = null
let _homicidePlayed = false

export function initHomicideGrid() {
  const el = document.getElementById('viz-j15a')
  if (!el) return
  el.innerHTML = ''

  const W     = el.clientWidth  || 900
  const H     = el.clientHeight || 300
  const TOTAL = 163
  const WOMEN = 125
  const COLS  = 16
  const ROWS  = Math.ceil(TOTAL / COLS)   // 11 rangées

  // Espacement : s'adapte au conteneur (max 44 px)
  const sp   = Math.min(W / (COLS + 2), (H * 0.82) / (ROWS + 1), 44)
  const r    = sp * 0.30           // rayon des points
  const imgS = sp * 0.86           // taille des images-fleurs

  // Coin supérieur-gauche de la grille (centrée)
  const ox = (W - (COLS - 1) * sp) / 2
  const oy = (H - (ROWS - 1) * sp) / 2

  // Positions finales — dernière ligne centrée
  const finalPos = Array.from({ length: TOTAL }, (_, i) => {
    const col      = i % COLS
    const row      = Math.floor(i / COLS)
    const rowCount = row === ROWS - 1 ? TOTAL - (ROWS - 1) * COLS : COLS
    const rowShift = ((COLS - rowCount) * sp) / 2
    return { x: ox + col * sp + rowShift, y: oy + row * sp }
  })

  const svg = makeSVG(el, W, H)

  const groupEls       = []   // tous les <g> (163)
  const womanCircleEls = []   // les 125 cercles-femmes (disparaissent)
  const womanImageEls  = []   // les 125 images-fleurs (apparaissent)

  for (let i = 0; i < TOTAL; i++) {
    const isWoman = i < WOMEN
    const g = svg.append('g')
    groupEls.push(g.node())

    if (isWoman) {
      // L'image est ajoutée EN PREMIER → derrière le cercle en SVG
      womanImageEls.push(
        g.append('image')
          .attr('href', flowerUrl)
          .attr('x', -imgS / 2).attr('y', -imgS / 2)
          .attr('width', imgS).attr('height', imgS)
          .node()
      )
      womanCircleEls.push(
        g.append('circle')
          .attr('r', r)
          .attr('fill', '#F29CB7')
          .node()
      )
    } else {
      // Homme : cercle plus petit, opacité réduite
      g.append('circle')
        .attr('r', r * 0.68)
        .attr('fill', '#F29CB7')
        .attr('opacity', 0.36)
    }
  }

  // État initial des images : invisibles et écrasées à 0
  gsap.set(womanImageEls, {
    opacity: 0,
    scale: 0,
    transformOrigin: '50% 50%',
  })

  // Position de départ : chaque groupe part d'un bord aléatoire
  const diagonal = Math.hypot(W, H)
  groupEls.forEach((gEl, i) => {
    const { x, y } = finalPos[i]
    const angle    = Math.random() * Math.PI * 2
    const dist     = diagonal * 0.65 + 60
    gsap.set(gEl, {
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
    })
  })

  // ── GSAP Timeline ─────────────────────────────────────────────────────────
  _homicideTl = gsap.timeline({ paused: true })

    // Phase 1 — 163 points volent vers leur case dans la grille
    .to(groupEls, {
      x: (i) => finalPos[i].x,
      y: (i) => finalPos[i].y,
      duration: 0.85,
      stagger: { amount: 1.4, from: 'random' },
      ease: 'expo.out',
    })

    // Phase 2 — silence de 2 s (délai positionnel dans la timeline)

    // Phase 3a — les cercles-femmes s'effacent (révèle les images)
    .to(womanCircleEls, {
      opacity: 0,
      scale: 0.25,
      transformOrigin: '50% 50%',
      duration: 0.35,
      stagger: { amount: 2.2, from: 'random' },
      ease: 'power2.in',
    }, '+=0')

    // Phase 3b — les fleurs fleurissent à leur place exacte
    .to(womanImageEls, {
      opacity: 1,
      scale: 1,
      transformOrigin: '50% 50%',
      duration: 0.55,
      stagger: { amount: 2.2, from: 'random' },
      ease: 'back.out(1.5)',
    }, '<0.2')         // commence 0.2 s après le début du fondu-sortie
}

export function playHomicideGrid() {
  if (_homicidePlayed || !_homicideTl) return
  _homicidePlayed = true
  _homicideTl.play()
}

/* ══════════════════════════════════════════
   J+46 ans — 357 pousses dans la silhouette suisse
══════════════════════════════════════════ */

const _SWISS_PATH_D = 'M626.72,26.11l12.96,18.05,42.11,21.33h19.44l14.58,11.49-16.2,49.23-8.1,24.61,1.62,27.89,19.44,1.64,53.45,13.13,6.48,16.41,24.3,13.13,37.26,6.56,32.39-31.18,12.96,4.92,8.1,24.61-8.1,50.87,8.1,29.54-30.78-3.28-16.2-14.77-21.06,4.92-9.72,29.54,24.3,57.43-19.44,4.92-22.68-31.18-11.34-1.64-46.97,18.05-32.4-13.13-12.96-34.46-32.39,1.64v47.59l-8.1,18.05-35.63,42.66-3.24,16.41,11.34,27.9-19.44,11.49-14.58-22.97-21.06-19.69,6.48-19.69-35.64-9.85-38.87-32.82-3.24-41.02-16.2-9.85-55.07,47.59,9.72,24.61-25.92,36.1-38.87,22.97-50.21-13.13-42.11,16.41-38.87,8.2-22.68-11.49-14.58-22.97-37.25-37.74,8.1-27.9-12.96-36.1-35.63-4.92-30.78,1.64-37.25,24.61,8.1,21.33-37.25,26.26-22.68-1.64v-16.41l24.3-16.41,4.86-24.61-12.96-11.49,17.82-47.59,48.59-36.1,8.1-47.59,34.01-14.77,61.55-65.64,9.72-14.77-21.06-18.05,29.16-22.97h17.82l12.96,13.13,43.73-4.92,12.96-22.97,24.3-11.49,16.2,4.92,45.35,1.64,53.45-9.85,42.11,3.28-3.24-24.61,21.06-19.69h21.06l22.68,16.41,12.96-3.28,17.82,14.77,59.93-3.28Z'
const _MAP_W = 889, _MAP_H = 492

function _getContourPositions(n) {
  const ns = 'http://www.w3.org/2000/svg'
  const tmpSvg = document.createElementNS(ns, 'svg')
  tmpSvg.setAttribute('viewBox', `0 0 ${_MAP_W} ${_MAP_H}`)
  Object.assign(tmpSvg.style, {
    position: 'fixed', top: '-9999px', left: '-9999px',
    width: `${_MAP_W}px`, height: `${_MAP_H}px`,
    visibility: 'hidden', pointerEvents: 'none',
  })
  const pathEl = document.createElementNS(ns, 'path')
  pathEl.setAttribute('d', _SWISS_PATH_D)
  tmpSvg.appendChild(pathEl)
  document.body.appendChild(tmpSvg)

  const total = pathEl.getTotalLength()
  const step = total / n
  const positions = Array.from({ length: n }, (_, i) => {
    const d = i * step
    const pt  = pathEl.getPointAtLength(d)
    const pt2 = pathEl.getPointAtLength((d + 2) % total)
    const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI
    return { x: pt.x, y: pt.y, angle }
  })

  document.body.removeChild(tmpSvg)
  return positions
}

let _adolTl = null, _adolPlayed = false

export function initAdolescenceMap() {
  const el = document.getElementById('viz-j46a')
  if (!el) return

  const W = el.clientWidth || 760, H = el.clientHeight || 220
  const mapScale = Math.min(W / _MAP_W, H / _MAP_H)
  const offX = (W - _MAP_W * mapScale) / 2, offY = (H - _MAP_H * mapScale) / 2

  const N = 357
  const positions = _getContourPositions(N)

  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H)
  const g = svg.append('g').attr('transform', `translate(${offX},${offY}) scale(${mapScale})`)

  const BASE_SIZE = 32
  let rng = 0xBEEF
  const rnd = () => { rng = (Math.imul(rng, 1664525) + 1013904223) | 0; return (rng >>> 0) / 0x100000000 }

  const imgEls = positions.map(pos => {
    const svar = 0.7 + rnd() * 0.6   // 0.7 → 1.3
    const s = BASE_SIZE * svar
    const hs = s / 2
    // Orient outward (perp. to tangent, clockwise Swiss border = right-hand outward)
    // tangent - 90° points away from interior; ±12° jitter for organicity
    const rot = pos.angle - 90 + (rnd() - 0.5) * 24
    const img = g.append('image')
      .attr('href', flowerUrl)
      .attr('x', pos.x - hs)
      .attr('y', pos.y - hs)
      .attr('width', s)
      .attr('height', s)
      .node()
    gsap.set(img, { rotation: rot, scale: 0, opacity: 0, transformOrigin: 'center center' })
    return img
  })

  _adolTl = gsap.timeline({ paused: true })
    .to(imgEls, {
      scale: 1,
      opacity: 1,
      duration: 0.45,
      stagger: { amount: 4.0, from: 'start' },
      ease: 'back.out(1.6)',
    })
}

export function playAdolescenceMap() {
  if (_adolPlayed || !_adolTl) return
  _adolPlayed = true
  _adolTl.play()
}

/** Démarre l'animation des mois (appelé quand l'écran JJ entre en vue) */
let _jourJStarted = false
export function startJourJAnim() {
  if (_jourJStarted) return
  _jourJStarted = true

  const el = document.getElementById('viz-jour-j')
  const track = document.querySelector('#viz-jour-j .month-track')
  const scroller = document.querySelector('#viz-jour-j .month-scroller')
  if (!el || !track || !scroller) return

  const flowerEls = []

  setTimeout(() => {
    track.classList.add('animate')

    for (let i = 0; i < 21; i++) {
      const img = document.createElement('img')
      img.src = flowerUrl
      img.style.cssText = `
        position: absolute;
        width: 50px;
        left: ${Math.random() * 88}%;
        top: ${Math.random() * 78}%;
        transform: rotate(${Math.random() * 360}deg);
        opacity: 0;
        transition: opacity 0.7s ease;
        pointer-events: none;
      `
      el.appendChild(img)
      flowerEls.push(img)
      setTimeout(() => { img.style.opacity = '1' }, Math.random() * 4500)
    }
  }, 2000)

  setTimeout(() => {
    track.style.transition = 'opacity 0.45s ease'
    track.style.opacity = '0'
    setTimeout(() => {
      scroller.innerHTML = ''
      const num = document.createElement('div')
      num.className = 'month-slide'
      num.textContent = '21'
      num.style.opacity = '0'
      num.style.transition = 'opacity 0.45s ease'
      scroller.appendChild(num)
      setTimeout(() => { num.style.opacity = '1' }, 20)
    }, 450)
  }, 7000)

  // 1 s after "21" appears, merge 10 random flowers into one
  setTimeout(() => mergeFlowersTransition(flowerEls), 8500)
}

/** Animate 10 random flowers converging into a single flower using MorphSVG */
function mergeFlowersTransition(flowerEls) {
  const selected = [...flowerEls].sort(() => Math.random() - 0.5).slice(0, 10)

  // Convergence point (center of screen 1)
  const cx = window.innerWidth * 0.65
  const cy = window.innerHeight * 0.5

  const FLOWER_W = 150
  const FLOWER_H = Math.round(FLOWER_W * 266.59 / 263.7)

  const ns = 'http://www.w3.org/2000/svg'

  // Overlay SVG — only for the 10 converging image clones
  const overlay = document.createElementNS(ns, 'svg')
  overlay.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:999;overflow:visible'
  document.body.appendChild(overlay)

  const svgImgs = selected.map(img => {
    const r = img.getBoundingClientRect()
    const si = document.createElementNS(ns, 'image')
    si.setAttribute('href', flowerUrl)
    si.setAttribute('x', String(r.left))
    si.setAttribute('y', String(r.top))
    si.setAttribute('width', String(r.width))
    si.setAttribute('height', String(r.height))
    overlay.appendChild(si)
    img.style.visibility = 'hidden'
    return si
  })

  // Separate fixed SVG for the merged flower — this one stays visible
  const flowerSvg = document.createElementNS(ns, 'svg')
  flowerSvg.setAttribute('viewBox', '0 0 263.7 266.59')
  flowerSvg.style.cssText = `
    position: fixed;
    width: ${FLOWER_W}px;
    height: ${FLOWER_H}px;
    left: ${cx - FLOWER_W / 2}px;
    top: ${cy - FLOWER_H / 2}px;
    pointer-events: none;
    z-index: 999;
    overflow: visible;
  `
  document.body.appendChild(flowerSvg)

  // MorphSVG source: tiny circle at flower centre (131.85, 133.3)
  const FCX = 131.85, FCY = 133.3, R = 14
  const morphPath = document.createElementNS(ns, 'path')
  morphPath.setAttribute('d', `M${FCX - R},${FCY} a${R},${R} 0 1,0 ${R * 2},0 a${R},${R} 0 1,0 -${R * 2},0`)
  morphPath.setAttribute('fill', '#f29cb7')
  morphPath.setAttribute('opacity', '0')
  flowerSvg.appendChild(morphPath)

  const restPetals = FLOWER_PATHS.slice(1).map(d => {
    const p = document.createElementNS(ns, 'path')
    p.setAttribute('d', d)
    p.setAttribute('fill', '#f29cb7')
    p.setAttribute('opacity', '0')
    flowerSvg.appendChild(p)
    return p
  })

  gsap.timeline()
    // Phase 1 — converge images toward merge point
    .to(svgImgs, {
      attr: { x: cx - 25, y: cy - 25, width: 50, height: 50 },
      duration: 1.4,
      ease: 'power2.in',
      stagger: { amount: 0.4, from: 'random' },
    })
    // Phase 2 — fade images out
    .to(svgImgs, {
      opacity: 0,
      duration: 0.5,
      stagger: 0.04,
      ease: 'power1.in',
    }, '-=0.5')
    // Phase 3 — MorphSVG: circle → first petal
    .to(morphPath, { opacity: 1, duration: 0.15 })
    .to(morphPath, { morphSVG: FLOWER_PATHS[0], duration: 0.9, ease: 'power2.out' }, '-=0.05')
    // Phase 4 — remaining petals bloom in
    .to(restPetals, { opacity: 1, duration: 0.4, stagger: 0.06, ease: 'power1.out' }, '-=0.4')
    // Phase 5 — flower travels to the right boundary of screen 1 and vanishes there
    .to(flowerSvg, {
      left: window.innerWidth,
      opacity: 0,
      duration: 1.4,
      ease: 'power2.in',
    })
    // Cleanup both elements
    .call(() => { overlay.remove(); flowerSvg.remove() })
}

/* ══════════════════════════════════════════
   J — Naissance : globe terrestre 3D interactif
══════════════════════════════════════════ */
export async function initGlobe() {
  const el = document.getElementById('viz-naissance')
  if (!el) return

  el.innerHTML = ''
  el.style.position = 'relative'

  // ── Calcul dynamique des dimensions ──────────────────────────────────────
  function measure() {
    const cW = el.clientWidth  || 560
    const cH = el.clientHeight || 320
    // Globe diameter = 75% du plus petit côté (évite les débordements de viewport)
    const diam = Math.min(cW, cH) * 0.75
    return { W: cW, H: cH, radius: diam / 2 }
  }

  let { W, H, radius } = measure()
  const PAD = 20   // décalage gauche : bord du SVG → centre du globe

  // ISO 3166-1 numeric code → legislation data
  const codeMap = {
    '188': { pays: 'Costa Rica',     cat: 'A', year: 2007, statut: 'Pionnier mondial – Loi 8589' },
    '320': { pays: 'Guatemala',      cat: 'A', year: 2008, statut: 'Décret 22-2008' },
    '152': { pays: 'Chili',          cat: 'A', year: 2010, statut: 'Loi 20.480 (étendu en 2020 via Loi Gabriela)' },
    '222': { pays: 'Salvador',       cat: 'A', year: 2011, statut: 'Loi spéciale intégrale' },
    '484': { pays: 'Mexique',        cat: 'A', year: 2012, statut: 'Inscrit au Code Pénal Fédéral' },
    '032':  { pays: 'Argentine',      cat: 'A', year: 2012, statut: 'Article 80 inc. 11 du Code pénal' },
    '076':  { pays: 'Brésil',         cat: 'A', year: 2015, statut: 'Loi 13.104' },
    '170': { pays: 'Colombie',       cat: 'A', year: 2015, statut: 'Loi Rosa Elvira Cely' },
    '470': { pays: 'Malte',          cat: 'A', year: 2022, statut: "Premier pays de l'UE à nommer le crime" },
    '196': { pays: 'Chypre',         cat: 'A', year: 2022, statut: 'Loi 123(I)/2022' },
    '191': { pays: 'Croatie',        cat: 'A', year: 2024, statut: 'Réforme du Code Pénal (Mars 2024)' },
    '380': { pays: 'Italie',         cat: 'A', year: 2025, statut: 'Loi suite au mouvement Giulia Cecchettin' },
    '724': { pays: 'Espagne',        cat: 'B', year: 2004, statut: "Cadre légal intégral – pas de crime nommé 'féminicide' mais protection stricte" },
    '250': { pays: 'France',         cat: 'B', year: 2017, statut: "Circonstance aggravante 'en raison du sexe' (Art. 132-77)" },
    '056':  { pays: 'Belgique',       cat: 'B', year: 2023, statut: 'Loi Stop Féminicide (définition légale sans crime autonome)' },
    '788': { pays: 'Tunisie',        cat: 'B', year: 2017, statut: 'Loi 58-2017 contre les violences faites aux femmes' },
    '710': { pays: 'Afrique du Sud', cat: 'B', year: 2024, statut: 'GBVF Act (National Strategic Plan)' },
  }
  const SWISS_CODE = '756'
  const SWISS_GEO  = [8.23, 46.82]

  // Tooltip
  const tooltip = d3.select(el)
    .append('div')
    .attr('class', 'globe-tooltip')
    .style('opacity', '0')

  // SVG
  const svg = d3.select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr('height', '100%')
    .style('cursor', 'grab')
    .style('display', 'block')
    .style('opacity', '0')

  const projection = d3.geoOrthographic()
    .scale(radius)
    .translate([radius + PAD, H / 2])
    .clipAngle(90)
    .rotate([20, 0, 0])

  const pathGen = d3.geoPath().projection(projection)

  // Ocean sphere (référence conservée pour les mises à jour resize)
  const ocean = svg.append('circle')
    .attr('cx', radius + PAD).attr('cy', H / 2).attr('r', radius)
    .attr('fill', '#3a1e52')
    .attr('stroke', '#F29CB7').attr('stroke-opacity', 0.10).attr('stroke-width', 1)

  // Graticule grid
  const graticulePath = svg.append('path')
    .datum(d3.geoGraticule()())
    .attr('fill', 'none')
    .attr('stroke', '#F29CB7')
    .attr('stroke-opacity', 0.07)
    .attr('stroke-width', 0.4)
    .attr('d', pathGen)

  // Load world TopoJSON
  let world
  try {
    world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
  } catch (e) {
    console.error('Globe: échec du chargement world-atlas', e)
    return
  }

  const countries = feature(world, world.objects.countries)

  // Country paths
  const countryPaths = svg.append('g')
    .selectAll('path')
    .data(countries.features)
    .join('path')
    .attr('fill', d => codeMap[String(d.id)] ? '#F29CB7' : 'none')
    .attr('fill-opacity', d => {
      const law = codeMap[String(d.id)]
      if (!law) return 0
      return law.cat === 'A' ? 0.78 : 0.36
    })
    .attr('stroke', '#F29CB7')
    .attr('stroke-opacity', d => String(d.id) === SWISS_CODE ? 0.90 : 0.18)
    .attr('stroke-width', d => String(d.id) === SWISS_CODE ? 1.6 : 0.4)
    .attr('d', pathGen)
    .on('mouseover', function (event, d) {
      const law = codeMap[String(d.id)]
      if (!law) return
      isHovering = true
      d3.select(this).attr('fill-opacity', law.cat === 'A' ? 0.96 : 0.62)
      const elRect = el.getBoundingClientRect()
      tooltip
        .html(
          `<span class="glob-t-pays">${law.pays}</span>` +
          `<span class="glob-t-year">${law.year}</span>` +
          `<span class="glob-t-cat">${law.cat === 'A' ? '● Crime autonome' : '● Circonstance aggravante'}</span>` +
          `<span class="glob-t-statut">${law.statut}</span>`
        )
        .style('opacity', '1')
        .style('left', (event.clientX - elRect.left + 14) + 'px')
        .style('top',  (event.clientY - elRect.top  - 10) + 'px')
    })
    .on('mousemove', function (event) {
      const elRect = el.getBoundingClientRect()
      tooltip
        .style('left', (event.clientX - elRect.left + 14) + 'px')
        .style('top',  (event.clientY - elRect.top  - 10) + 'px')
    })
    .on('mouseout', function (event, d) {
      const law = codeMap[String(d.id)]
      if (law) d3.select(this).attr('fill-opacity', law.cat === 'A' ? 0.78 : 0.36)
      tooltip.style('opacity', '0')
      isHovering = false
    })

  // Switzerland marker — pulsing ring + cross (absent de la loi)
  const swissG = svg.append('g').attr('class', 'swiss-marker')
  swissG.append('circle').attr('r', 7)
    .attr('fill', 'none').attr('stroke', '#F29CB7')
    .attr('stroke-width', 1.2).attr('class', 'swiss-pulse-ring')
  swissG.append('circle').attr('r', 2.5)
    .attr('fill', '#F29CB7').attr('fill-opacity', 0.90)
  // Cross (Swiss flag)
  const cs = 3.2
  swissG.append('rect').attr('x', -0.9).attr('y', -cs).attr('width', 1.8).attr('height', cs * 2)
    .attr('fill', '#3a1e52').attr('fill-opacity', 0.85)
  swissG.append('rect').attr('x', -cs).attr('y', -0.9).attr('width', cs * 2).attr('height', 1.8)
    .attr('fill', '#3a1e52').attr('fill-opacity', 0.85)

  // Rotation state
  let isHovering = false
  let isDragging = false
  let resumeTimer = null
  let _phiTween   = null

  function redraw() {
    countryPaths.attr('d', pathGen)
    graticulePath.attr('d', pathGen)
    const proj = projection(SWISS_GEO)
    if (proj) {
      swissG.attr('transform', `translate(${proj[0]},${proj[1]})`).style('display', null)
    } else {
      swissG.style('display', 'none')
    }
  }

  // ── ResizeObserver : recalcule viewBox + projection au resize ────────────
  const ro = new ResizeObserver(() => {
    const next = measure()
    if (Math.abs(next.W - W) < 4 && Math.abs(next.H - H) < 4) return
    W = next.W; H = next.H; radius = next.radius
    svg.attr('viewBox', `0 0 ${W} ${H}`)
    projection.scale(radius).translate([radius + PAD, H / 2])
    ocean.attr('cx', radius + PAD).attr('cy', H / 2).attr('r', radius)
    redraw()
  })
  ro.observe(el)

  // Auto-rotation (stops while user interacts or hovers)
  d3.timer(() => {
    if (isHovering || isDragging) return
    const [λ, φ] = projection.rotate()
    projection.rotate([λ + 0.12, φ])
    redraw()
  })

  // Drag to rotate manually
  svg.call(
    d3.drag()
      .on('start', () => {
        isDragging = true
        if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null }
        if (_phiTween)   { _phiTween.kill(); _phiTween = null }
        svg.style('cursor', 'grabbing')
        tooltip.style('opacity', '0')
      })
      .on('drag', (event) => {
        const [λ, φ] = projection.rotate()
        projection.rotate([
          λ + event.dx * 0.4,
          Math.max(-80, Math.min(80, φ - event.dy * 0.3)),
        ])
        redraw()
      })
      .on('end', () => {
        svg.style('cursor', 'grab')
        // Après 500 ms, ramène φ doucement à 0 (équateur centré)
        resumeTimer = setTimeout(() => {
          resumeTimer = null
          const [, φ] = projection.rotate()
          if (Math.abs(φ) < 0.5) { isDragging = false; return }
          const proxy = { phi: φ }
          _phiTween = gsap.to(proxy, {
            phi: 0,
            duration: 0.9,
            ease: 'power2.out',
            onUpdate() {
              const [currentLambda] = projection.rotate()
              projection.rotate([currentLambda, proxy.phi])
              redraw()
            },
            onComplete() { _phiTween = null; isDragging = false },
          })
        }, 500)
      })
  )

  redraw()
  svg.transition().duration(900).ease(d3.easeQuadOut).style('opacity', '1')
}

/* ══════════════════════════════════════════
   J — Quelques jours: fleur apparaît à gauche puis rejoint le bout de la anse
══════════════════════════════════════════ */
export function initFlowerToStem() {
  const screen3  = document.getElementById('screen-j3j')
  const flowerEl = screen3?.querySelector('.flower-left')
  if (!screen3 || !flowerEl) return

  requestAnimationFrame(() => {
    const vaseEl = screen3.querySelector('.vase-svg')
    if (!vaseEl) return

    const s3r   = screen3.getBoundingClientRect()
    const vaseR = vaseEl.getBoundingClientRect()

    // Vase position relative to screen 3
    const vaseRelLeft = vaseR.left - s3r.left
    const vaseRelTop  = vaseR.top  - s3r.top

    const FLOWER_W = 90
    const FLOWER_H = Math.round(FLOWER_W * 266.59 / 263.7)
    const FLOWER_CX = Math.round(131.85 / 263.7 * FLOWER_W)
    const FLOWER_CY = Math.round(133.3  / 266.59 * FLOWER_H)

    // Convert CSS top:50% + translateY(-50%) to an explicit pixel value so GSAP can tween from it
    gsap.set(flowerEl, { top: window.innerHeight / 2 - FLOWER_H / 2, y: 0 })

    // Stem tip: handle top at (17.77, 4.15) in SVG viewBox 113.5 × 255.5
    const stemX = vaseRelLeft + (17.77 / 113.5) * vaseR.width
    const stemY = vaseRelTop  + (4.15  / 255.5) * vaseR.height
    const finalLeft = stemX - FLOWER_CX
    const finalTop  = stemY - FLOWER_CY + 100

    // One-shot: fade in, then fly to stem tip when the screen becomes active
    const observer = new MutationObserver(() => {
      if (!screen3.classList.contains('in-view')) return
      observer.disconnect()
      gsap.timeline()
        .to(flowerEl, { opacity: 1, duration: 0.5, ease: 'power1.out' })
        .to(flowerEl, { left: finalLeft, top: finalTop, duration: 1.2, ease: 'power2.out' }, '+=0.1')
    })
    observer.observe(screen3, { attributes: true, attributeFilter: ['class'] })
  })
}

/* ══════════════════════════════════════════
   J — 3 semaines : fleur + poème des pétales
   flower.svg à 120% du screen-2 (90px × 1.2 = 108px)
   5 pétales tombent en même temps que les 5 lignes du poème,
   puis cascade rapide sur "plus du tout"
══════════════════════════════════════════ */
export function initFlowerPoem() {
  const screen    = document.getElementById('screen-j3s')
  if (!screen) return
  const wrapper   = screen.querySelector('.flower-s3-wrap')
  const poemDiv   = screen.querySelector('.poem-lines-s3')
  const poemLines = Array.from(screen.querySelectorAll('.poem-line-s3'))
  if (!wrapper || !poemDiv || poemLines.length < 6) return

  let played = false
  const FLOWER_W = 108   // 90 (screen 2) × 1.2
  const FLOWER_H = Math.round(FLOWER_W * 266.59 / 263.7)  // 109

  // Timing constants (seconds)
  const PETAL_DUR   = 1.8   // fall duration for poem-petal pairs
  const CASCADE_DUR = 1.2   // fall duration for cascade petals
  // Absolute time of each poem line in the GSAP timeline:
  // flower arrival at t=2.6, then 0.5s pause, then lines every 1.0s
  const POEM_START = 3.1
  const LINE_GAP   = 1.0

  const observer = new MutationObserver(() => {
    if (!screen.classList.contains('in-view') || played) return
    played = true
    observer.disconnect()

    const W = window.innerWidth
    const H = window.innerHeight
    const finalLeft = (W - FLOWER_W) / 2
    const finalTop  = (H - FLOWER_H) / 2

    // Start off-screen left, vertically centred
    gsap.set(wrapper, { left: -FLOWER_W - 20, top: finalTop, y: 0, opacity: 0 })

    // Poem container: top-right area of the flower's resting position
    gsap.set(poemDiv, { left: W / 2 + FLOWER_W / 2 + 18, top: H / 2 - 90 })

    // Poem lines: start invisible, slightly below final position
    poemLines.forEach(line => gsap.set(line, { opacity: 0, y: 6 }))

    const tl = gsap.timeline()

    // Flower slides in from the left edge (t=0 → t=2.6)
    tl.to(wrapper, { opacity: 1, duration: 0.6, ease: 'power1.out' })
      .to(wrapper, { left: finalLeft, duration: 2.4, ease: 'power1.inOut' }, '-=0.4')

    // Lines 1-5: each paired with one petal falling clockwise (1s apart)
    poemLines.slice(0, 5).forEach((line, i) => {
      const t = POEM_START + i * LINE_GAP
      tl.to(line, { opacity: 0.78, y: 0, duration: 0.7, ease: 'power1.out' }, t)
      tl.call(() => _dropPetal(PETAL_CW[i], wrapper, PETAL_DUR), null, t)
    })

    // "plus du tout": 1.5s after "à la folie" — then fast cascade of remaining petals
    const PLUS_T = POEM_START + 4 * LINE_GAP + 1.5
    tl.to(poemLines[5], { opacity: 0.78, y: 0, duration: 0.7, ease: 'power1.out' }, PLUS_T)
    tl.call(() => {
      PETAL_CW.slice(5).forEach((petal, i) => {
        setTimeout(() => _dropPetal(petal, wrapper, CASCADE_DUR), i * 130)
      })
    }, null, PLUS_T)
  })

  observer.observe(screen, { attributes: true, attributeFilter: ['class'] })
}

// Drops one petal: creates a fixed clone SVG, reveals the hole mask, animates the fall
function _dropPetal(petalDef, wrapper, duration) {
  const wrapRect = wrapper.getBoundingClientRect()
  const ns   = 'http://www.w3.org/2000/svg'
  const W    = wrapper.offsetWidth   // 108
  const H    = wrapper.offsetHeight  // 109
  const scale = W / 263.7

  // Clone SVG at the wrapper's exact screen position, only this petal's path
  const cloneSvg = document.createElementNS(ns, 'svg')
  cloneSvg.setAttribute('viewBox', '0 0 263.7 266.59')
  Object.assign(cloneSvg.style, {
    position:      'fixed',
    width:         `${W}px`,
    height:        `${H}px`,
    left:          `${wrapRect.left}px`,
    top:           `${wrapRect.top}px`,
    pointerEvents: 'none',
    zIndex:        '999',
    overflow:      'visible',
  })
  const clonePath = document.createElementNS(ns, 'path')
  clonePath.setAttribute('d', FLOWER_PATHS[petalDef.pathIdx])
  clonePath.setAttribute('fill', '#f29cb7')
  cloneSvg.appendChild(clonePath)
  document.body.appendChild(cloneSvg)

  // Reveal hole mask for this petal (background-coloured path over the img)
  const holePath = wrapper.querySelector(`[data-pidx="${petalDef.pathIdx}"]`)
  if (holePath) holePath.style.visibility = 'visible'

  // Fall: translateY + slight X drift + rotation around petal centroid
  const cx = Math.round(petalDef.svgCx * scale)
  const cy = Math.round(petalDef.svgCy * scale)
  gsap.to(cloneSvg, {
    y: petalDef.fallY,
    x: petalDef.fallX,
    rotation: petalDef.rot,
    transformOrigin: `${cx}px ${cy}px`,
    duration,
    ease: 'power2.in',
  })
}

/* ══════════════════════════════════════════
   J — 2 ans : homme marchant (Lottie play/pause)
   Déclenchement : présence de la slide à l'écran
     play()  quand screen-j2a devient active
     pause() quand l'utilisateur quitte la slide
══════════════════════════════════════════ */
let _walkerLottie = null
let _walkerActive = false

async function _initWalkerLottie() {
  await customElements.whenDefined('dotlottie-wc')
  const wc = document.getElementById('walker-lottie')
  if (!wc) return

  // dotLottie est instancié dans connectedCallback (upgrade synchrone)
  const player = wc.dotLottie
  if (!player) return

  const onReady = () => {
    _walkerLottie = player
    // Si la slide est déjà active quand le chargement réseau se termine
    if (_walkerActive) player.play()
  }

  if (player.isLoaded) {
    onReady()
  } else {
    player.addEventListener('load', onReady)
  }
}

export function manageLottieWalker(isActive) {
  _walkerActive = isActive
  if (!_walkerLottie) return  // onReady() prendra le relais si le player n'est pas encore prêt

  if (isActive) {
    _walkerLottie.play()
  } else {
    _walkerLottie.pause()
  }
}

/* ══════════════════════════════════════════
   J — 2 mois : Violentomètre
   SVG inline par fleur — 9 pétales animables individuellement
   Hover : révélation circulaire sens horaire, vitesse adaptative
   Fleurs 6-10 : dépérissement (rotation + scale) + tremblement
══════════════════════════════════════════ */

// Paths des 9 pétales de flower.svg dans leur ordre de déclaration (idx 0-8)
const VIO_PETAL_D = [
  'M155.2,266.59c-31.95-14.59-46.04-52.37-31.46-84.31l8.4-18.39c31.95,14.59,46.04,52.36,31.46,84.31l-8.4,18.39Z',
  'M63.62,252.8c-15.1-31.71-1.61-69.71,30.1-84.81l18.26-8.69c15.1,31.71,1.61,69.71-30.1,84.81l-18.26,8.69Z',
  'M2.33,183.37c8.82-34,43.57-54.44,77.57-45.62l19.57,5.08c-8.82,34-43.57,54.44-77.57,45.62l-19.57-5.08Z',
  'M0,90.78c28.61-20.38,68.37-13.69,88.75,14.91l11.73,16.47c-28.61,20.38-68.37,13.69-88.75-14.91L0,90.78Z',
  'M57.74,18.37c35.01,2.78,61.18,33.46,58.4,68.47l-1.6,20.16c-35.01-2.78-61.18-33.46-58.4-68.47l1.6-20.16Z',
  'M148.51,0c25.03,24.63,25.36,64.95.72,89.99l-14.18,14.41c-25.03-24.63-25.36-64.95-.72-89.99l14.18-14.41Z',
  'M229.85,44.28c3.34,34.96-22.33,66.06-57.29,69.4l-20.13,1.92c-3.34-34.96,22.33-66.06,57.29-69.4l20.13-1.92Z',
  'M263.7,130.49c-19.91,28.93-59.56,36.25-88.49,16.34l-16.66-11.46c19.91-28.93,59.56-36.25,88.5-16.34l16.65,11.46Z',
  'M234.22,218.28c-33.85,9.36-68.93-10.52-78.29-44.37l-5.39-19.49c33.85-9.36,68.93,10.52,78.29,44.37l5.39,19.49Z',
]

// Ordre de révélation dans le sens horaire depuis 12h (pathIdx dans le SVG source)
const VIO_CW_ORDER = [5, 6, 7, 8, 0, 1, 2, 3, 4]

const VIO_LABELS = [
  'A confiance en toi',
  'Respecte tes décisions',
  'Te manipule',
  'Se moque de toi',
  'Contrôle tes sorties et tes habits',
  'Fouille tes messages et tes applications',
  'Menace de se suicider à cause de toi',
  "T'isole de ta famille et de tes amis",
  'Te pousse ou te frappe',
  "T'oblige à avoir des relations sexuelles",
]

// Couleur de remplissage par fleur — calculée d'après les brightness de l'itération précédente
const VIO_COLORS = [
  '#F29CB7',  // 1 — rose vif  (×1.00)
  '#F29CB7',  // 2 — rose vif  (×1.00)
  '#C68096',  // 3 — brightness(0.82)
  '#AE7084',  // 4 — brightness(0.72)
  '#966171',  // 5 — brightness(0.62)
  '#794E5B',  // 6 — brightness(0.50)
  '#66424D',  // 7 — brightness(0.42)
  '#52353E',  // 8 — brightness(0.34)
  '#3F2930',  // 9 — brightness(0.26)
  '#2C1C21',  // 10 — brightness(0.18)
]

// Durée totale de révélation au hover : du plus rapide (sain) au plus lent (danger)
const VIO_REVEAL = [0.30, 0.40, 0.55, 0.70, 0.85, 1.00, 1.15, 1.30, 1.42, 1.55]

let _violentometreTl     = null
let _violentometrePlayed = false

// Tremblement subtil sur les fleurs danger après complétion du hover
function _shakeVio(svgEl, i) {
  const px = (i - 4) * 1.0   // 1px (i=5) → 5px (i=9), progressif
  gsap.timeline()
    .to(svgEl, { x:  px,        duration: 0.055, ease: 'none' })
    .to(svgEl, { x: -px,        duration: 0.055, ease: 'none' })
    .to(svgEl, { x:  px * 0.6,  duration: 0.055, ease: 'none' })
    .to(svgEl, { x: -px * 0.6,  duration: 0.055, ease: 'none' })
    .to(svgEl, { x:  px * 0.25, duration: 0.04,  ease: 'none' })
    .to(svgEl, { x:  0,         duration: 0.04,  ease: 'power1.out' })
}

export function initViolentometre() {
  const grid = document.getElementById('viz-j2m')
  if (!grid) return
  grid.innerHTML = ''

  const ns = 'http://www.w3.org/2000/svg'

  const units = VIO_LABELS.map((label, i) => {
    const color    = VIO_COLORS[i]
    const isDanger = i >= 5

    // ── Conteneur ───────────────────────────────────────────
    const unit = document.createElement('div')
    unit.className = 'vio-unit'

    // ── SVG inline : 9 pétales, fill vide au repos ──────────
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', '0 0 263.7 266.59')
    svg.setAttribute('aria-hidden', 'true')
    svg.classList.add('vio-flower-svg')

    const pathEls = VIO_PETAL_D.map(d => {
      const p = document.createElementNS(ns, 'path')
      p.setAttribute('d', d)
      p.setAttribute('fill', color)
      p.setAttribute('stroke', color)
      p.setAttribute('stroke-width', '4')
      p.setAttribute('fill-opacity', '0')       // contour seul au repos
      p.setAttribute('stroke-opacity', '0.40')
      svg.appendChild(p)
      return p
    })

    // Ordre horaire pour l'animation (12h → 2h → 3h → … → 11h)
    const pathsCw = VIO_CW_ORDER.map(idx => pathEls[idx])

    // ── Label ────────────────────────────────────────────────
    const span = document.createElement('span')
    span.className = 'vio-label' + (i >= 7 ? ' vio-label--danger' : '')
    span.textContent = label

    unit.appendChild(svg)
    unit.appendChild(span)
    grid.appendChild(unit)

    // ── Hover : révélation circulaire adaptative ─────────────
    const totalReveal = VIO_REVEAL[i]
    const petalDur    = totalReveal * 0.38   // durée d'animation de chaque pétale
    const staggerAmt  = totalReveal * 0.62   // durée totale du stagger sur 9 pétales
    let hoverTl = null

    unit.addEventListener('mouseenter', () => {
      if (hoverTl) hoverTl.kill()
      gsap.to(svg, { opacity: 1, duration: 0.12, overwrite: 'auto' })
      span.style.color = '#ffffff'

      hoverTl = gsap.timeline({
        onComplete: () => { if (isDanger) _shakeVio(svg, i) },
      })
      .to(pathsCw, {
        attr: { 'fill-opacity': 1 },
        duration: petalDur,
        stagger: { amount: staggerAmt, ease: 'power1.in' },
        ease: 'power1.out',
      })
    })

    unit.addEventListener('mouseleave', () => {
      if (hoverTl) { hoverTl.kill(); hoverTl = null }
      // Ramène tous les pétales à l'état contour, quelle que soit leur position courante
      gsap.to(pathEls, {
        attr: { 'fill-opacity': 0 },
        duration: 0.22,
        ease: 'power1.in',
        overwrite: 'auto',
      })
      gsap.to(svg, { opacity: 0.72, duration: 0.2, overwrite: 'auto' })
      span.style.color = ''
    })

    return unit
  })

  // ── Dépérissement progressif pour les fleurs 6-10 ────────────
  units.slice(5).forEach((unit, j) => {
    const svg = unit.querySelector('.vio-flower-svg')
    gsap.set(svg, {
      rotation: 12 + j * 1.5,       // 12° → 18° croissant
      scale: 0.88 - j * 0.012,      // 0.88 → 0.83 décroissant
      transformOrigin: 'center bottom',
    })
  })

  // ── État initial (contours visibles, unités invisibles avant stagger) ──
  units.forEach(unit => {
    gsap.set(unit.querySelector('.vio-flower-svg'), { opacity: 0.72 })
  })
  gsap.set(units, { opacity: 0, x: -10 })

  // ── Timeline d'entrée ─────────────────────────────────────────
  _violentometreTl = gsap.timeline({ paused: true })
    .to(units, {
      opacity: 1,
      x: 0,
      duration: 0.5,
      stagger: 0.15,
      ease: 'power2.out',
    })
}

export function playViolentometre() {
  if (_violentometrePlayed || !_violentometreTl) return
  _violentometrePlayed = true
  _violentometreTl.play()
}

/** Lance toutes les visualisations */
export function initAllViz() {
  vizJourJ()
  initFlowerField()
  initHomicideGrid()
  initAdolescenceMap()
  initGlobe()
  initFlowerToStem()
  initFlowerPoem()
  initViolentometre()
  _initWalkerLottie()
}
