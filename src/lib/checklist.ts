// The three legacy inspection checklists and their clone helper. Framework-free:
// no Vue imports, no PocketBase SDK. Item text and category are i18n keys that
// the view resolves; custom (personalizzabile) items have an empty `testo` the
// user fills in, so they carry no translation.

import type { PhotoDraft } from './photos'

export type Luogo = 'cantiere' | 'azienda' | 'edificio'

// A template item: `testo` is an i18n key ('' when personalizzabile), and
// `categoria` is an i18n key.
export interface ChecklistTemplateItem {
  id: string
  testo: string
  categoria: string
  personalizzabile?: boolean
}

// The form-level item: a template item plus per-answer state. `foto` holds the
// draft photos attached to this item (not yet persisted filenames).
export interface ChecklistItemDraft {
  id: string
  testo: string
  categoria: string
  personalizzabile?: boolean
  valore: 'SI' | 'NO' | 'NA'
  commento: string
  foto: PhotoDraft[]
  nascosta: boolean
}

const cat = {
  dpi: 'checklist.cat.dpi',
  lavoriQuota: 'checklist.cat.lavoriQuota',
  macchine: 'checklist.cat.macchine',
  elettrico: 'checklist.cat.elettrico',
  emergenza: 'checklist.cat.emergenza',
  ordine: 'checklist.cat.ordine',
  documenti: 'checklist.cat.documenti',
  ambienti: 'checklist.cat.ambienti',
  impianti: 'checklist.cat.impianti',
  segnaletica: 'checklist.cat.segnaletica',
  valutazioniRischi: 'checklist.cat.valutazioniRischi',
  ergonomia: 'checklist.cat.ergonomia',
  vieEsodo: 'checklist.cat.vieEsodo',
  porteRei: 'checklist.cat.porteRei',
  antincendio: 'checklist.cat.antincendio',
  impiantiElevatori: 'checklist.cat.impiantiElevatori',
  coperturaLineaVita: 'checklist.cat.coperturaLineaVita',
  partiComuni: 'checklist.cat.partiComuni',
  documentazione: 'checklist.cat.documentazione',
} as const

// Item text keys are `checklist.<id>`; the helper keeps the templates readable.
const t = (id: string): string => `checklist.${id}`

export const CHECKLIST_TEMPLATES: Record<Luogo, ChecklistTemplateItem[]> = {
  cantiere: [
    { id: 'ca01', testo: t('ca01'), categoria: cat.dpi },
    { id: 'ca02', testo: t('ca02'), categoria: cat.dpi },
    { id: 'ca03', testo: t('ca03'), categoria: cat.dpi },
    { id: 'ca04', testo: t('ca04'), categoria: cat.dpi },
    { id: 'ca05', testo: t('ca05'), categoria: cat.dpi },
    { id: 'ca06', testo: t('ca06'), categoria: cat.dpi },
    { id: 'ca_x1', testo: '', categoria: cat.dpi, personalizzabile: true },
    { id: 'ca07', testo: t('ca07'), categoria: cat.lavoriQuota },
    { id: 'ca08', testo: t('ca08'), categoria: cat.lavoriQuota },
    { id: 'ca09', testo: t('ca09'), categoria: cat.lavoriQuota },
    { id: 'ca10', testo: t('ca10'), categoria: cat.lavoriQuota },
    { id: 'ca11', testo: t('ca11'), categoria: cat.lavoriQuota },
    { id: 'ca_x2', testo: '', categoria: cat.lavoriQuota, personalizzabile: true },
    { id: 'ca12', testo: t('ca12'), categoria: cat.macchine },
    { id: 'ca13', testo: t('ca13'), categoria: cat.macchine },
    { id: 'ca14', testo: t('ca14'), categoria: cat.macchine },
    { id: 'ca15', testo: t('ca15'), categoria: cat.macchine },
    { id: 'ca_x3', testo: '', categoria: cat.macchine, personalizzabile: true },
    { id: 'ca16', testo: t('ca16'), categoria: cat.elettrico },
    { id: 'ca17', testo: t('ca17'), categoria: cat.elettrico },
    { id: 'ca18', testo: t('ca18'), categoria: cat.elettrico },
    { id: 'ca19', testo: t('ca19'), categoria: cat.elettrico },
    { id: 'ca_x4', testo: '', categoria: cat.elettrico, personalizzabile: true },
    { id: 'ca20', testo: t('ca20'), categoria: cat.emergenza },
    { id: 'ca21', testo: t('ca21'), categoria: cat.emergenza },
    { id: 'ca22', testo: t('ca22'), categoria: cat.emergenza },
    { id: 'ca23', testo: t('ca23'), categoria: cat.emergenza },
    { id: 'ca_x5', testo: '', categoria: cat.emergenza, personalizzabile: true },
    { id: 'ca24', testo: t('ca24'), categoria: cat.ordine },
    { id: 'ca25', testo: t('ca25'), categoria: cat.ordine },
    { id: 'ca26', testo: t('ca26'), categoria: cat.ordine },
    { id: 'ca27', testo: t('ca27'), categoria: cat.ordine },
    { id: 'ca_x6', testo: '', categoria: cat.ordine, personalizzabile: true },
    { id: 'ca28', testo: t('ca28'), categoria: cat.documenti },
    { id: 'ca29', testo: t('ca29'), categoria: cat.documenti },
    { id: 'ca30', testo: t('ca30'), categoria: cat.documenti },
    { id: 'ca31', testo: t('ca31'), categoria: cat.documenti },
    { id: 'ca_x7', testo: '', categoria: cat.documenti, personalizzabile: true },
  ],
  azienda: [
    { id: 'az01', testo: t('az01'), categoria: cat.dpi },
    { id: 'az02', testo: t('az02'), categoria: cat.dpi },
    { id: 'az03', testo: t('az03'), categoria: cat.dpi },
    { id: 'az_x1', testo: '', categoria: cat.dpi, personalizzabile: true },
    { id: 'az04', testo: t('az04'), categoria: cat.ambienti },
    { id: 'az05', testo: t('az05'), categoria: cat.ambienti },
    { id: 'az06', testo: t('az06'), categoria: cat.ambienti },
    { id: 'az07', testo: t('az07'), categoria: cat.ambienti },
    { id: 'az08', testo: t('az08'), categoria: cat.ambienti },
    { id: 'az09', testo: t('az09'), categoria: cat.ambienti },
    { id: 'az_x2', testo: '', categoria: cat.ambienti, personalizzabile: true },
    { id: 'az10', testo: t('az10'), categoria: cat.impianti },
    { id: 'az11', testo: t('az11'), categoria: cat.impianti },
    { id: 'az12', testo: t('az12'), categoria: cat.impianti },
    { id: 'az13', testo: t('az13'), categoria: cat.impianti },
    { id: 'az_x3', testo: '', categoria: cat.impianti, personalizzabile: true },
    { id: 'az14', testo: t('az14'), categoria: cat.emergenza },
    { id: 'az15', testo: t('az15'), categoria: cat.emergenza },
    { id: 'az16', testo: t('az16'), categoria: cat.emergenza },
    { id: 'az17', testo: t('az17'), categoria: cat.emergenza },
    { id: 'az18', testo: t('az18'), categoria: cat.emergenza },
    { id: 'az19', testo: t('az19'), categoria: cat.emergenza },
    { id: 'az_x4', testo: '', categoria: cat.emergenza, personalizzabile: true },
    { id: 'az20', testo: t('az20'), categoria: cat.segnaletica },
    { id: 'az21', testo: t('az21'), categoria: cat.segnaletica },
    { id: 'az22', testo: t('az22'), categoria: cat.segnaletica },
    { id: 'az_x5', testo: '', categoria: cat.segnaletica, personalizzabile: true },
    { id: 'az23', testo: t('az23'), categoria: cat.valutazioniRischi },
    { id: 'az24', testo: t('az24'), categoria: cat.valutazioniRischi },
    { id: 'az25', testo: t('az25'), categoria: cat.valutazioniRischi },
    { id: 'az26', testo: t('az26'), categoria: cat.valutazioniRischi },
    { id: 'az27', testo: t('az27'), categoria: cat.valutazioniRischi },
    { id: 'az28', testo: t('az28'), categoria: cat.valutazioniRischi },
    { id: 'az29', testo: t('az29'), categoria: cat.valutazioniRischi },
    { id: 'az30', testo: t('az30'), categoria: cat.valutazioniRischi },
    { id: 'az31', testo: t('az31'), categoria: cat.valutazioniRischi },
    { id: 'az32', testo: t('az32'), categoria: cat.valutazioniRischi },
    { id: 'az_x6', testo: '', categoria: cat.valutazioniRischi, personalizzabile: true },
    { id: 'az33', testo: t('az33'), categoria: cat.documenti },
    { id: 'az34', testo: t('az34'), categoria: cat.documenti },
    { id: 'az35', testo: t('az35'), categoria: cat.documenti },
    { id: 'az36', testo: t('az36'), categoria: cat.documenti },
    { id: 'az37', testo: t('az37'), categoria: cat.documenti },
    { id: 'az_x7', testo: '', categoria: cat.documenti, personalizzabile: true },
    { id: 'az38', testo: t('az38'), categoria: cat.ergonomia },
    { id: 'az39', testo: t('az39'), categoria: cat.ergonomia },
    { id: 'az40', testo: t('az40'), categoria: cat.ergonomia },
    { id: 'az41', testo: t('az41'), categoria: cat.ergonomia },
    { id: 'az_x8', testo: '', categoria: cat.ergonomia, personalizzabile: true },
  ],
  edificio: [
    { id: 'ed01', testo: t('ed01'), categoria: cat.vieEsodo },
    { id: 'ed02', testo: t('ed02'), categoria: cat.vieEsodo },
    { id: 'ed03', testo: t('ed03'), categoria: cat.vieEsodo },
    { id: 'ed04', testo: t('ed04'), categoria: cat.vieEsodo },
    { id: 'ed05', testo: t('ed05'), categoria: cat.vieEsodo },
    { id: 'ed06', testo: t('ed06'), categoria: cat.vieEsodo },
    { id: 'ed_x1', testo: '', categoria: cat.vieEsodo, personalizzabile: true },
    { id: 'ed07', testo: t('ed07'), categoria: cat.porteRei },
    { id: 'ed08', testo: t('ed08'), categoria: cat.porteRei },
    { id: 'ed09', testo: t('ed09'), categoria: cat.porteRei },
    { id: 'ed10', testo: t('ed10'), categoria: cat.porteRei },
    { id: 'ed11', testo: t('ed11'), categoria: cat.porteRei },
    { id: 'ed_x2', testo: '', categoria: cat.porteRei, personalizzabile: true },
    { id: 'ed12', testo: t('ed12'), categoria: cat.antincendio },
    { id: 'ed13', testo: t('ed13'), categoria: cat.antincendio },
    { id: 'ed14', testo: t('ed14'), categoria: cat.antincendio },
    { id: 'ed15', testo: t('ed15'), categoria: cat.antincendio },
    { id: 'ed16', testo: t('ed16'), categoria: cat.antincendio },
    { id: 'ed17', testo: t('ed17'), categoria: cat.antincendio },
    { id: 'ed18', testo: t('ed18'), categoria: cat.antincendio },
    { id: 'ed_x3', testo: '', categoria: cat.antincendio, personalizzabile: true },
    { id: 'ed19', testo: t('ed19'), categoria: cat.impiantiElevatori },
    { id: 'ed20', testo: t('ed20'), categoria: cat.impiantiElevatori },
    { id: 'ed21', testo: t('ed21'), categoria: cat.impiantiElevatori },
    { id: 'ed22', testo: t('ed22'), categoria: cat.impiantiElevatori },
    { id: 'ed23', testo: t('ed23'), categoria: cat.impiantiElevatori },
    { id: 'ed_x4', testo: '', categoria: cat.impiantiElevatori, personalizzabile: true },
    { id: 'ed24', testo: t('ed24'), categoria: cat.coperturaLineaVita },
    { id: 'ed25', testo: t('ed25'), categoria: cat.coperturaLineaVita },
    { id: 'ed26', testo: t('ed26'), categoria: cat.coperturaLineaVita },
    { id: 'ed27', testo: t('ed27'), categoria: cat.coperturaLineaVita },
    { id: 'ed28', testo: t('ed28'), categoria: cat.coperturaLineaVita },
    { id: 'ed_x5', testo: '', categoria: cat.coperturaLineaVita, personalizzabile: true },
    { id: 'ed29', testo: t('ed29'), categoria: cat.partiComuni },
    { id: 'ed30', testo: t('ed30'), categoria: cat.partiComuni },
    { id: 'ed31', testo: t('ed31'), categoria: cat.partiComuni },
    { id: 'ed32', testo: t('ed32'), categoria: cat.partiComuni },
    { id: 'ed33', testo: t('ed33'), categoria: cat.partiComuni },
    { id: 'ed34', testo: t('ed34'), categoria: cat.partiComuni },
    { id: 'ed_x6', testo: '', categoria: cat.partiComuni, personalizzabile: true },
    { id: 'ed35', testo: t('ed35'), categoria: cat.documentazione },
    { id: 'ed36', testo: t('ed36'), categoria: cat.documentazione },
    { id: 'ed37', testo: t('ed37'), categoria: cat.documentazione },
    { id: 'ed38', testo: t('ed38'), categoria: cat.documentazione },
    { id: 'ed39', testo: t('ed39'), categoria: cat.documentazione },
    { id: 'ed_x7', testo: '', categoria: cat.documentazione, personalizzabile: true },
  ],
}

// Picks the template for a location type, falling back to the cantiere
// checklist (the legacy default) for anything unrecognised.
export function checklistForLuogo(luogo: string): ChecklistTemplateItem[] {
  return CHECKLIST_TEMPLATES[luogo as Luogo] ?? CHECKLIST_TEMPLATES.cantiere
}

// Clones a template into fresh, unshared draft items with neutral answers.
export function cloneChecklist(template: ChecklistTemplateItem[]): ChecklistItemDraft[] {
  return template.map((item) => ({
    id: item.id,
    testo: item.testo,
    categoria: item.categoria,
    ...(item.personalizzabile ? { personalizzabile: true } : {}),
    valore: 'NA' as const,
    commento: '',
    foto: [],
    nascosta: false,
  }))
}
