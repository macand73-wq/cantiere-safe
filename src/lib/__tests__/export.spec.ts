import { describe, it, expect } from 'vitest'
import { createI18n } from 'vue-i18n'
import { buildReportSections, stripEmoji, exportTxt, exportDoc } from '../export'
import en from '../../locales/en.json'
import itLocale from '../../locales/it.json'
import type { Sopralluogo } from '../../types'

// Real translators for both locales, mirroring the app's i18n setup but with
// an explicit locale so the assertions are deterministic.
const i18nIt = createI18n({ legacy: false, locale: 'it', messages: { en, it: itLocale } })
const i18nEn = createI18n({ legacy: false, locale: 'en', messages: { en, it: itLocale } })
const tIt = (key: string) => i18nIt.global.t(key)
const tEn = (key: string) => i18nEn.global.t(key)

const sample: Sopralluogo = {
  id: 'abc123',
  user: 'u1',
  cantiere: 'Cantiere Nord',
  azienda: 'ACME <script>alert(1)</script> S.r.l.',
  indirizzo: 'Via Roma 1, Milano',
  rspp: 'Mario Rossi',
  luogo: 'cantiere',
  data: '2026-11-07T10:00:00.000Z',
  rischio_generale: 'alto',
  note_libere: 'Note con accenti: perché è così',
  checklist: [
    {
      id: 'ca01',
      testo: 'checklist.ca01',
      categoria: 'checklist.cat.dpi',
      valore: 'SI',
      commento: 'ok',
      foto: ['f1.jpg'],
    },
    {
      id: 'ca02',
      testo: 'checklist.ca02',
      categoria: 'checklist.cat.dpi',
      valore: 'NO',
      commento: '<script>bad()</script>',
      foto: [],
    },
    {
      id: 'custom1',
      testo: 'Verifica <b>extra</b>',
      categoria: 'checklist.cat.dpi',
      personalizzabile: true,
      valore: 'NA',
      commento: '',
      foto: [],
    },
  ],
  foto: ['f1.jpg', 'general.jpg'],
  created: '2026-11-07T10:00:00.000Z',
  updated: '2026-11-07T10:00:00.000Z',
}

describe('buildReportSections', () => {
  it('uses localized labels with the real it and en translators, never the raw keys', () => {
    const itS = buildReportSections(sample, tIt)
    const enS = buildReportSections(sample, tEn)

    expect(itS.title).toBe('VERBALE DI SOPRALLUOGO')
    expect(enS.title).toBe('INSPECTION REPORT')

    expect(itS.summary.map((x) => x.label)).toEqual(['CONFORMI', 'NON CONFORMI', 'N.A.'])
    expect(enS.summary.map((x) => x.label)).toEqual(['COMPLIANT', 'NON-COMPLIANT', 'N/A'])
    expect(itS.summary.map((x) => x.count)).toEqual([1, 1, 1])

    expect(itS.categories[0].nome).toBe('DPI')
    expect(enS.categories[0].nome).toBe('PPE')

    expect(itS.categories[0].items[0].testo).toBe('Elmetto protettivo indossato da tutti i lavoratori')
    expect(enS.categories[0].items[0].testo).toBe('Protective helmet worn by all workers')

    // Custom (personalizzabile) items keep their user text verbatim.
    expect(itS.categories[0].items[2].testo).toBe('Verifica <b>extra</b>')

    // General photos exclude the filename already referenced by an item.
    expect(itS.generalPhotos).toEqual(['general.jpg'])
    expect(itS.categories[0].items[0].foto).toEqual(['f1.jpg'])
  })
})

describe('stripEmoji', () => {
  it('preserves accented Latin characters', () => {
    expect(stripEmoji('perché è così àèìòù')).toBe('perché è così àèìòù')
  })

  it('strips emoji and pictographs', () => {
    expect(stripEmoji('😀')).toBe('')
    expect(stripEmoji('A✅B')).toBe('AB')
    expect(stripEmoji('👷 cantiere')).toBe('cantiere')
  })
})

describe('exportTxt and exportDoc', () => {
  it('exportTxt contains the localized summary and checklist', () => {
    const txt = exportTxt(sample, tIt)
    expect(txt).toContain('CONFORMI: 1')
    expect(txt).toContain('Elmetto protettivo')
    expect(txt).toContain('DPI')
    expect(txt).toContain('foto allegate: 1')
  })

  it('exportDoc escapes user HTML', () => {
    const doc = exportDoc(sample, tEn)
    expect(doc).not.toContain('<script>')
    expect(doc).toContain('&lt;script&gt;')
    expect(doc).toContain('Protective helmet worn by all workers')
  })
})
