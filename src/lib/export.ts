// Localized report generation for a sopralluogo: PDF (jsPDF), HTML for Word,
// and plain text. Framework-free by design: no Vue, no PocketBase SDK, so it is
// unit-testable in isolation. Everything locale-specific flows through the
// translator, which callers supply from vue-i18n (`useI18n().t`).

import { jsPDF } from 'jspdf'
import type { Sopralluogo, ChecklistItem } from '../types'

export type Translator = (key: string) => string

export interface ReportSummaryItem {
  label: string
  count: number
}

export interface ReportItem {
  testo: string
  valore: 'SI' | 'NO' | 'NA'
  commento: string
  foto: string[]
}

export interface ReportCategory {
  nome: string
  items: ReportItem[]
}

export interface ReportSections {
  title: string
  subtitle: string
  azienda: string
  luogo: string
  cantiere: string
  indirizzo: string
  data: string
  rspp: string
  rischio: string
  summary: ReportSummaryItem[]
  note: string
  categories: ReportCategory[]
  generalPhotos: string[]
}

// Removes emoji and pictographs while keeping BMP Latin, accented letters
// included. Astral-plane code points (surrogate pairs) cover most emoji; the
// two BMP ranges cover misc symbols (U+2600..U+27BF) and variation selectors
// (U+FE00..U+FE0F); the final surrogate sweep drops any non-BMP char not
// already matched, which for a safety report only ever means emoji.
export function stripEmoji(value: string): string {
  return value
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .trim()
}

function luogoKey(luogo: string): string {
  if (luogo === 'azienda') return 'sopralluoghi.luogoAzienda'
  if (luogo === 'edificio') return 'sopralluoghi.luogoEdificio'
  return 'sopralluoghi.luogoCantiere'
}

function rischioKey(rischio: string): string {
  if (rischio === 'basso') return 'sopralluoghi.rischioBasso'
  if (rischio === 'alto') return 'sopralluoghi.rischioAlto'
  return 'sopralluoghi.rischioMedio'
}

function itemTesto(c: ChecklistItem, t: Translator): string {
  // Custom items carry user text verbatim; template items carry an i18n key.
  return c.personalizzabile ? c.testo : t(c.testo)
}

// Turns a sopralluogo into a locale-aware, presentation-agnostic structure the
// TXT/DOC/PDF writers all share: header fields, summary counts, notes, the
// checklist grouped by categoria, and per-item photo metadata.
export function buildReportSections(s: Sopralluogo, t: Translator): ReportSections {
  const visible = (s.checklist ?? []).filter((c) => !c.nascosta && c.testo)

  const count = (v: 'SI' | 'NO' | 'NA') => visible.filter((c) => c.valore === v).length

  // Group by category, preserving first-seen order.
  const categories: ReportCategory[] = []
  for (const item of visible) {
    const nome = t(item.categoria)
    let group = categories.find((g) => g.nome === nome)
    if (!group) {
      group = { nome, items: [] }
      categories.push(group)
    }
    group.items.push({
      testo: itemTesto(item, t),
      valore: item.valore,
      commento: item.commento,
      foto: item.foto ?? [],
    })
  }

  // General photos are the record-level photos not referenced by any item.
  const referenced = new Set(visible.flatMap((c) => c.foto ?? []))
  const generalPhotos = (s.foto ?? []).filter((f) => !referenced.has(f))

  return {
    title: t('export.title'),
    subtitle: t('export.subtitle'),
    azienda: s.azienda,
    luogo: t(luogoKey(s.luogo)),
    cantiere: s.cantiere ?? '',
    indirizzo: s.indirizzo,
    data: s.data ? s.data.slice(0, 10) : '',
    rspp: s.rspp,
    rischio: t(rischioKey(s.rischio_generale)),
    summary: [
      { label: t('export.conformi'), count: count('SI') },
      { label: t('export.nonConformi'), count: count('NO') },
      { label: t('export.na'), count: count('NA') },
    ],
    note: s.note_libere,
    categories,
    generalPhotos,
  }
}

export function exportTxt(s: Sopralluogo, t: Translator): string {
  const r = buildReportSections(s, t)
  const thin = '─'.repeat(35)

  const out: string[] = []
  out.push(`${r.title} - CantiereSafe`)
  out.push('='.repeat(55))
  out.push('')
  out.push(`${t('sopralluoghi.azienda')}: ${r.azienda || t('export.nd')}`)
  out.push(`${t('export.tipo')}: ${r.luogo}`)
  out.push(`${t('sopralluoghi.cantiere')}: ${r.cantiere || t('export.nd')}`)
  out.push(`${t('sopralluoghi.indirizzo')}: ${r.indirizzo || t('export.nd')}`)
  out.push(`${t('sopralluoghi.rspp')}: ${r.rspp || t('export.nd')}`)
  out.push(`${t('sopralluoghi.data')}: ${r.data || t('export.nd')}`)
  out.push(`${t('sopralluoghi.rischioGenerale')}: ${r.rischio}`)
  out.push('')
  out.push(t('export.summary'))
  out.push(thin)
  out.push(r.summary.map((x) => `${x.label}: ${x.count}`).join(' / '))
  out.push('')
  if (r.note.trim()) {
    out.push(t('sopralluoghi.noteLibere'))
    out.push(thin)
    out.push(r.note)
    out.push('')
  }
  out.push(t('sopralluoghi.checklist'))
  out.push('='.repeat(55))
  for (const cat of r.categories) {
    out.push('')
    out.push(`[${cat.nome.toUpperCase()}]`)
    for (const item of cat.items) {
      out.push(`  [${item.valore.padEnd(2)}] ${item.testo}`)
      if (item.commento) out.push(`         ${t('checklist.commento')}: ${item.commento}`)
      if (item.foto.length) out.push(`         ${t('export.fotoAllegate')}: ${item.foto.length}`)
    }
  }
  if (r.generalPhotos.length) {
    out.push('')
    out.push(t('export.fotoGenerali'))
    out.push(thin)
    out.push(`${t('export.fotoAllegate')}: ${r.generalPhotos.length}`)
  }
  out.push('')
  out.push('='.repeat(55))
  out.push(`${t('export.generato')} ${new Date().toLocaleString()}`)
  out.push('CantiereSafe - RSPP')
  return out.join('\n')
}

function escHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function exportDoc(s: Sopralluogo, t: Translator): string {
  const r = buildReportSections(s, t)

  const rows = r.categories
    .map((cat) => {
      const head =
        `<tr><td colspan="2" style="background:#1e2832;color:white;padding:6px 8px;font-size:11px;font-weight:bold">` +
        escHtml(cat.nome.toUpperCase()) +
        `</td></tr>`
      const body = cat.items
        .map((item) => {
          const color = { SI: '#16a34a', NO: '#dc2626', NA: '#64748b' }[item.valore] ?? '#64748b'
          const commento = item.commento
            ? `<br><span style="font-size:11px;color:#64748b;font-style:italic;">${escHtml(
                t('checklist.commento'),
              )}: ${escHtml(item.commento)}</span>`
            : ''
          const foto = item.foto.length
            ? `<br><span style="font-size:10px;color:#f59e0b">${escHtml(
                t('export.fotoAllegate'),
              )}: ${item.foto.length}</span>`
            : ''
          return (
            `<tr><td style="padding:5px 8px;font-size:11px;border-bottom:1px solid #e2e8f0">` +
            escHtml(item.testo) +
            commento +
            foto +
            `</td><td style="padding:5px 8px;text-align:center;font-weight:bold;color:${color};font-size:11px;border-bottom:1px solid #e2e8f0;width:60px">${item.valore}</td></tr>`
          )
        })
        .join('')
      return head + body
    })
    .join('')

  const meta = [
    `<p><b>${t('sopralluoghi.azienda')}:</b> ${escHtml(r.azienda || t('export.nd'))}</p>`,
    `<p><b>${t('export.tipo')}:</b> ${escHtml(r.luogo)} &nbsp; <b>${t('sopralluoghi.data')}:</b> ${escHtml(r.data)}</p>`,
    `<p><b>${t('sopralluoghi.rspp')}:</b> ${escHtml(r.rspp || t('export.nd'))}${
      r.indirizzo ? ` &nbsp; <b>${t('sopralluoghi.indirizzo')}:</b> ${escHtml(r.indirizzo)}` : ''
    }</p>`,
    `<p><b>${t('sopralluoghi.rischioGenerale')}:</b> ${escHtml(r.rischio)} &nbsp; <b>${
      r.summary[0].label
    }:</b> ${r.summary[0].count} &nbsp; <b>${r.summary[1].label}:</b> ${r.summary[1].count} &nbsp; <b>${
      r.summary[2].label
    }:</b> ${r.summary[2].count}</p>`,
  ].join('')

  const notes = r.note.trim()
    ? `<h2>${escHtml(t('sopralluoghi.noteLibere'))}</h2><p style="white-space:pre-wrap">${escHtml(r.note)}</p>`
    : ''

  const generalPhotos = r.generalPhotos.length
    ? `<h2>${escHtml(t('export.fotoGenerali'))}</h2><p>${escHtml(t('export.fotoAllegate'))}: ${r.generalPhotos.length}</p>`
    : ''

  return (
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="UTF-8"><meta name="ProgId" content="Word.Document">` +
    `<style>body{font-family:Arial;color:#1e2832;margin:2cm}h1{color:#b45309;font-size:16pt;border-bottom:3px solid #f59e0b;padding-bottom:6px}h2{font-size:12pt;background:#f1f5f9;padding:4px 8px;margin-top:14px}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#1e2832;color:white;padding:6px 8px;text-align:left;font-size:10pt}p{font-size:10pt;margin:4px 0}</style></head><body>` +
    `<h1>CantiereSafe - ${escHtml(r.title)}</h1>` +
    meta +
    notes +
    `<h2>${escHtml(t('sopralluoghi.checklist'))}</h2><table><thead><tr><th>${escHtml(
      t('export.puntoControllo'),
    )}</th><th style="width:60px;text-align:center">${escHtml(t('export.esito'))}</th></tr></thead><tbody>` +
    rows +
    `</tbody></table>` +
    generalPhotos +
    `<p style="margin-top:24px;font-size:9pt;color:#64748b">${escHtml(t('export.generato'))} ${new Date().toLocaleString()} - CantiereSafe RSPP</p>` +
    `</body></html>`
  )
}

async function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    // jsPDF can place an image without knowing its aspect; try the DOM Image
    // for a faithful fit, falling back to a 4:3 box where decoding is
    // unavailable (Node, happy-dom).
    if (typeof Image === 'undefined') {
      resolve({ w: 0, h: 0 })
      return
    }
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height })
    img.onerror = () => resolve({ w: 0, h: 0 })
    img.src = dataUrl
  })
}

function fitDims(nw: number, nh: number, maxW: number, maxH: number): { w: number; h: number } {
  if (!nw || !nh) return { w: maxW, h: Math.min(maxH, maxW * 0.75) }
  const ratio = nw / nh
  let w = maxW
  let h = w / ratio
  if (h > maxH) {
    h = maxH
    w = h * ratio
  }
  return { w, h }
}

// PDF export. `resolveImage` turns a persisted filename into a data URL; the
// caller resolves protected files via `photoUrl` + fetch + FileReader. Photos
// that cannot be resolved or placed are skipped and noted rather than failing.
export async function exportPdf(
  s: Sopralluogo,
  t: Translator,
  resolveImage?: (filename: string) => Promise<string>,
): Promise<Blob> {
  const r = buildReportSections(s, t)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const margin = 18
  const pageW = 210
  const usableW = pageW - margin * 2
  let y = margin

  const CH: [number, number, number] = [15, 25, 35]
  const CA: [number, number, number] = [245, 158, 11]
  const CG: [number, number, number] = [34, 197, 94]
  const CR: [number, number, number] = [239, 68, 68]
  const CGR: [number, number, number] = [100, 116, 139]
  const CT: [number, number, number] = [30, 40, 50]
  const CL: [number, number, number] = [248, 250, 252]

  const checkPage = (need = 20) => {
    if (y + need > 275) {
      doc.addPage()
      y = margin
    }
  }

  const skipped: string[] = []

  async function resolveOrSkip(filename: string): Promise<string | null> {
    if (!resolveImage) return null
    try {
      return (await resolveImage(filename)) || null
    } catch {
      skipped.push(filename)
      return null
    }
  }

  async function placeImage(dataUrl: string, maxW: number, maxH: number): Promise<boolean> {
    const { w, h } = await imageSize(dataUrl)
    const fit = fitDims(w, h, maxW, maxH)
    checkPage(fit.h + 6)
    const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
    try {
      doc.addImage(dataUrl, fmt, margin, y, fit.w, fit.h, undefined, 'MEDIUM')
    } catch {
      return false
    }
    y += fit.h + 4
    return true
  }

  // Header band.
  doc.setFillColor(...CH)
  doc.rect(0, 0, pageW, 42, 'F')
  doc.setFillColor(...CA)
  doc.rect(0, 42, pageW, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...CA)
  doc.text('CantiereSafe', margin, 20)
  doc.setFontSize(10)
  doc.setTextColor(200, 210, 220)
  doc.text(stripEmoji(r.subtitle), margin, 28)
  doc.setFontSize(9)
  doc.text('D.Lgs. 81/2008 - RSPP', margin, 35)
  y = 52

  // Header info box.
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(margin, y, usableW, 42, 3, 3, 'F')
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CT)
  doc.text(stripEmoji(r.azienda || t('export.nd')).toUpperCase(), margin + 5, y + 10)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...CGR)
  doc.text(`${t('export.tipo')}: ${r.luogo}`, margin + 5, y + 18)
  if (r.cantiere) doc.text(`${t('sopralluoghi.cantiere')}: ${stripEmoji(r.cantiere)}`, margin + 5, y + 24)
  if (r.indirizzo) doc.text(`${t('sopralluoghi.indirizzo')}: ${stripEmoji(r.indirizzo)}`, margin + 5, y + 30)
  doc.text(`${t('sopralluoghi.data')}: ${r.data}`, margin + 5, y + 37)
  if (r.rspp) doc.text(`${t('sopralluoghi.rspp')}: ${stripEmoji(r.rspp)}`, margin + 5 + usableW / 2, y + 37)
  y += 48

  // Summary boxes.
  const bW = (usableW - 8) / 3
  const summaryColors: [number, number, number][] = [CG, CR, CGR]
  r.summary.forEach((entry, i) => {
    const bx = margin + i * (bW + 4)
    doc.setFillColor(...summaryColors[i])
    doc.roundedRect(bx, y, bW, 18, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.text(String(entry.count), bx + bW / 2, y + 11, { align: 'center' })
    doc.setFontSize(7)
    doc.text(entry.label, bx + bW / 2, y + 16, { align: 'center' })
  })
  y += 24

  // Risk badge.
  if (s.rischio_generale) {
    const riskColors: Record<string, [number, number, number]> = { basso: CG, medio: CA, alto: CR }
    const rc = riskColors[s.rischio_generale] ?? CGR
    doc.setFillColor(...rc)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.roundedRect(margin, y, 55, 9, 2, 2, 'F')
    doc.text(`${t('export.rischio')}: ${r.rischio.toUpperCase()}`, margin + 27, y + 6, { align: 'center' })
    y += 14
  } else {
    y += 4
  }

  // Notes.
  if (r.note.trim()) {
    checkPage(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...CA)
    doc.text(t('sopralluoghi.noteLibere'), margin, y)
    y += 5
    const clean = stripEmoji(r.note)
    const lines = doc.splitTextToSize(clean, usableW - 8) as string[]
    doc.setFillColor(...CL)
    doc.roundedRect(margin, y, usableW, lines.length * 4.5 + 6, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...CT)
    lines.forEach((line, i) => doc.text(line, margin + 4, y + 5 + i * 4.5))
    y += lines.length * 4.5 + 12
  }

  // Checklist grouped by category, with per-item photos embedded inline.
  const valueColors: Record<'SI' | 'NO' | 'NA', [number, number, number]> = {
    SI: CG,
    NO: CR,
    NA: CGR,
  }
  for (const cat of r.categories) {
    checkPage(18)
    doc.setFillColor(...CH)
    doc.rect(margin, y, usableW, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(stripEmoji(cat.nome).toUpperCase(), margin + 4, y + 5.5)
    y += 10
    for (let idx = 0; idx < cat.items.length; idx++) {
      const item = cat.items[idx]
      checkPage(20)
      if (idx % 2 === 0) {
        doc.setFillColor(...CL)
        doc.rect(margin, y - 1, usableW, 10, 'F')
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...CT)
      const tl = doc.splitTextToSize(stripEmoji(item.testo), usableW - 22) as string[]
      doc.text(tl[0], margin + 2, y + 5)
      doc.setFillColor(...valueColors[item.valore])
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(255, 255, 255)
      doc.roundedRect(pageW - margin - 16, y + 1, 16, 6, 1, 1, 'F')
      doc.text(item.valore, pageW - margin - 8, y + 5.5, { align: 'center' })
      y += 10
      if (item.commento) {
        checkPage(8)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(7.5)
        doc.setTextColor(...CGR)
        doc.text(`${t('checklist.commento')}: ${stripEmoji(item.commento)}`, margin + 4, y + 4)
        y += 7
      }
      if (item.foto.length && resolveImage) {
        for (const filename of item.foto) {
          const dataUrl = await resolveOrSkip(filename)
          if (!dataUrl) continue
          if (!(await placeImage(dataUrl, usableW, 60))) skipped.push(filename)
        }
        y += 2
      }
    }
    y += 4
  }

  // General photos.
  if (r.generalPhotos.length && resolveImage) {
    checkPage(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...CA)
    doc.text(t('export.fotoGenerali'), margin, y)
    y += 6
    for (const filename of r.generalPhotos) {
      const dataUrl = await resolveOrSkip(filename)
      if (!dataUrl) continue
      if (!(await placeImage(dataUrl, usableW, 80))) skipped.push(filename)
      y += 4
    }
  }

  if (skipped.length) {
    checkPage(20)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...CGR)
    doc.text(`${t('export.fotoNonDisponibili')}: ${skipped.length}`, margin, y)
    y += 6
  }

  // Signature block.
  checkPage(30)
  y += 10
  doc.setDrawColor(...CGR)
  doc.setLineWidth(0.3)
  doc.line(margin, y, margin + 70, y)
  doc.line(pageW - margin - 70, y, pageW - margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...CGR)
  doc.text(t('export.firmaRspp'), margin + 35, y + 5, { align: 'center' })
  doc.text(t('export.firmaRespCantiere'), pageW - margin - 35, y + 5, { align: 'center' })

  // Page footer.
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...CGR)
    doc.text(`${t('export.pagina')} ${i} ${t('export.di')} ${pages}`, pageW - margin, 290, { align: 'right' })
    doc.text(`CantiereSafe - RSPP | ${new Date().toLocaleDateString()}`, margin, 290)
    doc.setDrawColor(...CA)
    doc.setLineWidth(0.4)
    doc.line(margin, 287, pageW - margin, 287)
  }

  return doc.output('blob')
}

// Sanitised download filename: `sopralluogo_<azienda|sopralluogo>_<data>.<ext>`.
export function exportFilename(s: Sopralluogo, ext: string): string {
  const base = (s.azienda || 'sopralluogo').replace(/[^a-z0-9]/gi, '_')
  const date = (s.data || '').slice(0, 10).replace(/[^0-9-]/g, '') || 'data'
  return `sopralluogo_${base}_${date}.${ext}`
}
