import { describe, it, expect } from 'vitest'
import { CHECKLIST_TEMPLATES, cloneChecklist, checklistForLuogo } from '../checklist'

describe('cloneChecklist', () => {
  it('returns fresh items with valore NA, empty answers and no shared references', () => {
    const template = CHECKLIST_TEMPLATES.cantiere
    const first = cloneChecklist(template)
    const second = cloneChecklist(template)

    expect(first.length).toBe(template.length)

    for (const item of first) {
      expect(item.valore).toBe('NA')
      expect(item.commento).toBe('')
      expect(item.foto).toEqual([])
      expect(item.nascosta).toBe(false)
    }

    // Mutating one clone must not leak into the template or the other clone.
    first[0].valore = 'SI'
    first[0].commento = 'note'
    first[0].foto.push({ clientId: 'new-photo' })
    expect(template[0]).not.toHaveProperty('valore')
    expect(second[0].valore).toBe('NA')
    expect(second[0].foto).toEqual([])
  })

  it('preserves the personalizzabile flag on custom items', () => {
    const clone = cloneChecklist(CHECKLIST_TEMPLATES.cantiere)
    const custom = clone.find((i) => i.personalizzabile)
    expect(custom).toBeDefined()
    expect(custom?.testo).toBe('')
  })
})

describe('checklistForLuogo', () => {
  it('picks the right template per location type, defaulting to cantiere', () => {
    expect(checklistForLuogo('azienda')).toBe(CHECKLIST_TEMPLATES.azienda)
    expect(checklistForLuogo('edificio')).toBe(CHECKLIST_TEMPLATES.edificio)
    expect(checklistForLuogo('cantiere')).toBe(CHECKLIST_TEMPLATES.cantiere)
    expect(checklistForLuogo('unknown')).toBe(CHECKLIST_TEMPLATES.cantiere)
  })
})
