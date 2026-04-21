/**
 * visualizations.js
 * Toutes les visualisations D3 pour les écrans de la timeline
 */

import * as d3 from 'd3'
import { drawFlower, drawCircle } from './flower.js'
import { INFRACTION_DATA } from './data.js'

/** Crée un SVG responsive dans un conteneur */
function makeSVG(el, W, H) {
  return d3.select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%')
    .attr('height', '100%')
}

/* ══════════════════════════════════════════
   JJ — La mort: "365" + colonnes de fleurs
══════════════════════════════════════════ */
export function vizJourJ() {
  const el = document.getElementById('viz-jour-j')
  if (!el) return
  const W = el.clientWidth || 760
  const H = el.clientHeight || 240
  const svg = makeSVG(el, W, H)

  // Grand "365"
  svg.append('text')
    .attr('x', W * 0.24).attr('y', H * 0.78)
    .attr('text-anchor', 'middle')
    .attr('font-size', Math.min(H * 0.78, 196))
    .attr('font-weight', '300')
    .attr('fill', '#F29CB7')
    .attr('font-family', 'DM Sans, Georgia, serif')
    .attr('letter-spacing', '-.04em')
    .text('365')

  // Colonnes de fleurs (droite)
  const cols = 6, rows = 6
  const startX = W * 0.46
  const spX = Math.min(46, (W * 0.5) / cols)
  const spY = Math.min(38, (H * 0.88) / rows)
  const baseR = 13

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const cx = startX + c * spX + spX / 2
      const cy = H * 0.06 + r * spY
      const scale = 0.58 + (r / rows) * 0.56
      const fr = baseR * scale
      drawFlower(svg, cx, cy, fr, '#F29CB7', 0.76 + r * 0.024)
      if (r >= rows - 2) {
        svg.append('line')
          .attr('x1', cx).attr('y1', cy + fr + 1)
          .attr('x2', cx).attr('y2', H - 3)
          .attr('stroke', '#F29CB7').attr('stroke-width', 1.4).attr('opacity', 0.26)
      }
    }
  }
}

/* ══════════════════════════════════════════
   J-1 an — fleurs éparpillées (4/9 lumineuses)
══════════════════════════════════════════ */
export function vizJ1An() {
  const el = document.getElementById('viz-j1a')
  if (!el) return
  const W = el.clientWidth || 760
  const H = el.clientHeight || 200
  const svg = makeSVG(el, W, H)

  const flowers = [
    { rx: 0.06, ry: 0.46, r: 22, bright: true  },
    { rx: 0.18, ry: 0.24, r: 17, bright: false },
    { rx: 0.30, ry: 0.62, r: 22, bright: false },
    { rx: 0.42, ry: 0.20, r: 16, bright: false },
    { rx: 0.52, ry: 0.52, r: 24, bright: true  },
    { rx: 0.63, ry: 0.34, r: 17, bright: false },
    { rx: 0.74, ry: 0.66, r: 19, bright: false },
    { rx: 0.83, ry: 0.22, r: 16, bright: true  },
    { rx: 0.91, ry: 0.56, r: 18, bright: true  },
  ]

  flowers.forEach(f => {
    drawFlower(svg, W * f.rx, H * f.ry, f.r, '#F29CB7', f.bright ? 0.92 : 0.20)
  })
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

/** Lance toutes les visualisations */
export function initAllViz() {
  vizJourJ()
  vizJ1An()
  vizJ15Ans()
  vizJ30Ans()
  vizJ46Ans()
}
