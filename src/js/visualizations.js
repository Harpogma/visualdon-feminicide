/**
 * visualizations.js
 * Toutes les visualisations D3 pour les écrans de la timeline
 */

import * as d3 from 'd3'
import { feature } from 'topojson-client'
import { drawFlower, drawCircle } from './flower.js'
import { INFRACTION_DATA } from './data.js'
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
   J-15 ans — matrice de 163 icônes
   125 fleurs (femmes) + 38 cercles (hommes)
══════════════════════════════════════════ */
export function vizJ15Ans() {
  const el = document.getElementById('viz-j15a')
  if (!el) return
  const W = el.clientWidth || 760
  const H = el.clientHeight || 230
  const svg = makeSVG(el, W, H)

  const total = 163, females = 125
  const cols = 20
  const sp = Math.min(W / (cols + 1.5), 34)
  const r = sp * 0.28
  const gridW = cols * sp
  const startX = (W - gridW) / 2 + sp / 2
  const startY = H * 0.04

  for (let i = 0; i < total; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = startX + col * sp
    const cy = startY + row * sp
    if (i < females) {
      drawFlower(svg, cx, cy, r, '#F29CB7', 0.82)
    } else {
      drawCircle(svg, cx, cy, r * 0.62)
    }
  }

  // Légende
  const lY = H * 0.91
  const lX = startX + 4
  drawFlower(svg, lX, lY, 7, '#F29CB7', 0.82)
  svg.append('text').attr('x', lX + 14).attr('y', lY + 4)
    .attr('font-size', 10).attr('fill', '#F29CB7').attr('opacity', 0.45)
    .attr('font-family', 'DM Sans, serif').text('= 1 femme')
  drawCircle(svg, lX + 100, lY, 4.5)
  svg.append('text').attr('x', lX + 112).attr('y', lY + 4)
    .attr('font-size', 10).attr('fill', '#F29CB7').attr('opacity', 0.45)
    .attr('font-family', 'DM Sans, serif').text('= 1 homme')
}

/* ══════════════════════════════════════════
   J-30 ans — bar chart horizontal des infractions
══════════════════════════════════════════ */
export function vizJ30Ans() {
  const el = document.getElementById('viz-j30a')
  if (!el) return
  const W = el.clientWidth || 760
  const H = el.clientHeight || 220
  const svg = makeSVG(el, W, H)

  const maxVal = d3.max(INFRACTION_DATA, d => d.valeur)
  const mL = 238, mR = 80, barH = 22, barGap = 9
  const chartH = INFRACTION_DATA.length * (barH + barGap)
  const sY = (H - chartH) / 2
  const xScale = d3.scaleLinear().domain([0, maxVal]).range([0, W - mL - mR])

  INFRACTION_DATA.forEach((d, i) => {
    const y = sY + i * (barH + barGap)
    const isH = d.type.toLowerCase().includes('homicide')

    // Label
    svg.append('text').attr('x', mL - 12).attr('y', y + barH / 2 + 4)
      .attr('text-anchor', 'end').attr('font-size', 11)
      .attr('fill', '#F29CB7').attr('opacity', 0.62)
      .attr('font-family', 'DM Sans, serif').text(d.type)

    // Fond de barre
    svg.append('rect').attr('x', mL).attr('y', y)
      .attr('width', W - mL - mR).attr('height', barH)
      .attr('fill', '#F29CB7').attr('opacity', 0.055).attr('rx', 2)

    // Barre remplie
    svg.append('rect').attr('x', mL).attr('y', y)
      .attr('width', xScale(d.valeur)).attr('height', barH)
      .attr('fill', '#F29CB7').attr('opacity', isH ? 0.92 : 0.48).attr('rx', 2)

    // Valeur
    svg.append('text').attr('x', mL + xScale(d.valeur) + 8).attr('y', y + barH / 2 + 4)
      .attr('font-size', 10).attr('fill', '#F29CB7').attr('opacity', 0.72)
      .attr('font-family', 'DM Sans, serif').text(d.valeur.toLocaleString('fr-CH'))
  })
}

/* ══════════════════════════════════════════
   J-Adolescence — bourgeon + nuage de fleurs
══════════════════════════════════════════ */
export function vizJ46Ans() {
  const el = document.getElementById('viz-j46a')
  if (!el) return
  const W = el.clientWidth || 760
  const H = el.clientHeight || 220
  const svg = makeSVG(el, W, H)

  // Bourgeon (gauche)
  const sx = W * 0.22, sy = H * 0.60
  svg.append('line').attr('x1', sx).attr('y1', sy + 28).attr('x2', sx).attr('y2', sy - 18)
    .attr('stroke', '#F29CB7').attr('stroke-width', 2.2).attr('opacity', 0.52).attr('stroke-linecap', 'round')
  svg.append('ellipse').attr('cx', sx - 13).attr('cy', sy - 3).attr('rx', 13).attr('ry', 7)
    .attr('fill', '#F29CB7').attr('opacity', 0.5).attr('transform', `rotate(-35,${sx - 13},${sy - 3})`)
  svg.append('ellipse').attr('cx', sx + 13).attr('cy', sy - 10).attr('rx', 13).attr('ry', 7)
    .attr('fill', '#F29CB7').attr('opacity', 0.5).attr('transform', `rotate(35,${sx + 13},${sy - 10})`)

  // Nuage de fleurs (centre-droite)
  const cX = W * 0.60, cY = H * 0.44
  const cloud = [
    { a: 0.0,  d: 22, r: 6 }, { a: 0.5,  d: 35, r: 9  }, { a: 1.1,  d: 28, r: 7 },
    { a: 1.7,  d: 42, r: 8 }, { a: 2.2,  d: 30, r: 10 }, { a: 2.8,  d: 48, r: 6 },
    { a: 3.3,  d: 24, r: 8 }, { a: 3.9,  d: 38, r: 7  }, { a: 4.4,  d: 52, r: 9 },
    { a: 4.9,  d: 28, r: 6 }, { a: 5.4,  d: 44, r: 8  }, { a: 5.9,  d: 32, r: 7 },
    { a: 0.8,  d: 58, r: 6 }, { a: 1.4,  d: 18, r: 5  }, { a: 2.5,  d: 62, r: 7 },
    { a: 3.6,  d: 16, r: 5 }, { a: 4.8,  d: 66, r: 6  }, { a: 0.25, d: 48, r: 8 },
    { a: 2.0,  d: 70, r: 7 }, { a: 4.2,  d: 54, r: 9  }, { a: 5.2,  d: 72, r: 6 },
    { a: 1.0,  d: 80, r: 7 },
  ]

  cloud.forEach(f => {
    const fx = cX + Math.cos(f.a) * f.d
    const fy = cY + Math.sin(f.a) * f.d * 0.6
    drawFlower(svg, fx, fy, f.r, '#F29CB7', 0.26 + (f.r / 10) * 0.32)
  })

  // Fleur centrale principale
  drawFlower(svg, cX + 3, cY - 3, 19, '#F29CB7', 1.0)
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
    // Globe diameter = 80% du plus petit côté du conteneur
    const diam = Math.min(cW, cH) * 0.80
    return { W: cW, H: cH, radius: diam / 2 }
  }

  let { W, H, radius } = measure()

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

  const projection = d3.geoOrthographic()
    .scale(radius)
    .translate([W / 2, H / 2])
    .clipAngle(90)
    .rotate([-10, -25])

  const pathGen = d3.geoPath().projection(projection)

  // Ocean sphere (référence conservée pour les mises à jour resize)
  const ocean = svg.append('circle')
    .attr('cx', W / 2).attr('cy', H / 2).attr('r', radius)
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
    projection.scale(radius).translate([W / 2, H / 2])
    ocean.attr('cx', W / 2).attr('cy', H / 2).attr('r', radius)
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
        resumeTimer = setTimeout(() => { isDragging = false }, 2500)
      })
  )

  redraw()
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

/** Lance toutes les visualisations */
export function initAllViz() {
  vizJourJ()
  initFlowerField()   // remplace vizJ1An()
  vizJ15Ans()
  vizJ30Ans()
  vizJ46Ans()
  initGlobe()
  initFlowerToStem()
}
