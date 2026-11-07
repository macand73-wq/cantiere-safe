// Typed app records shared by the API layer and its consumers.
//
// Field names mirror the committed PocketBase migrations. Server-controlled
// fields (id, created, updated) are present for reading but are excluded from
// the create/update input types below.

export interface Profile {
  id: string
  email: string
  nome?: string
  studio?: string
  verified: boolean
  created: string
  updated: string
}

export interface Cantiere {
  id: string
  user: string
  nome: string
  indirizzo: string
  comune: string
  committente: string
  impresa_affidataria: string
  cse: string
  dl: string
  responsabile_lavori: string
  importo: string
  data_inizio: string
  data_fine: string
  notifica_preliminare: boolean
  created: string
  updated: string
}

export interface Sopralluogo {
  id: string
  user: string
  cantiere?: string
  azienda: string
  indirizzo: string
  rspp: string
  luogo: string
  data: string
  rischio_generale: string
  note_libere: string
  checklist: ChecklistItem[]
  foto: string[]
  created: string
  updated: string
}

// One answered item of a sopralluogo checklist. Mirrors the legacy checklist
// item shape (template fields plus per-answer fields); `lib/checklist.ts` owns
// the actual templates in a later task.
export interface ChecklistItem {
  id: string
  testo: string
  categoria: string
  personalizzabile?: boolean
  valore: 'SI' | 'NO' | 'NA'
  commento: string
  foto: string[]
  nascosta?: boolean
}

// Writable fields only: no id, no owner user (set by the API layer from the
// auth store), no created/updated timestamps.
export type CantiereInput = Partial<
  Omit<Cantiere, 'id' | 'user' | 'created' | 'updated'>
>
export type SopralluogoInput = Partial<
  Omit<Sopralluogo, 'id' | 'user' | 'created' | 'updated'>
>
