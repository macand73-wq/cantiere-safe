// ─────────────────────────────────────────────
//  CantiereSafe — app.js v1.3
//  Checklist dinamiche per tipo di luogo
// ─────────────────────────────────────────────

const db = new Dexie('CantiereSafeDB');
db.version(1).stores({
  sopralluoghi: '++id, azienda, data, createdAt, updatedAt',
  settings: 'key'
});

// ═══════════════════════════════════════
//  CHECKLIST PER TIPO DI LUOGO
// ═══════════════════════════════════════

const CHECKLIST_CANTIERE = [
  // DPI
  {id:'ca01',testo:'Elmetto protettivo indossato da tutti i lavoratori',categoria:'DPI'},
  {id:'ca02',testo:'Scarpe antinfortunistiche in uso',categoria:'DPI'},
  {id:'ca03',testo:'Imbragature e sistemi anticaduta presenti e in uso',categoria:'DPI'},
  {id:'ca04',testo:'Guanti da lavoro idonei alla mansione',categoria:'DPI'},
  {id:'ca05',testo:'Indumenti ad alta visibilità indossati',categoria:'DPI'},
  {id:'ca06',testo:'Occhiali/visiere di protezione dove necessario',categoria:'DPI'},
  {id:'ca_x1',testo:'',categoria:'DPI',personalizzabile:true},
  // Lavori in quota
  {id:'ca07',testo:'Ponteggi con parapetti regolamentari (h>2m)',categoria:'Lavori in quota'},
  {id:'ca08',testo:'Scale a pioli fissate e in buone condizioni',categoria:'Lavori in quota'},
  {id:'ca09',testo:'Reti di protezione installate dove necessario',categoria:'Lavori in quota'},
  {id:'ca10',testo:'Tavole fermapiede presenti sui ponteggi',categoria:'Lavori in quota'},
  {id:'ca11',testo:'Piano di montaggio ponteggio (PiMUS) presente',categoria:'Lavori in quota'},
  {id:'ca_x2',testo:'',categoria:'Lavori in quota',personalizzabile:true},
  // Macchine
  {id:'ca12',testo:'Macchine con protezioni e ripari funzionanti',categoria:'Macchine'},
  {id:'ca13',testo:'Revisioni e collaudi aggiornati',categoria:'Macchine'},
  {id:'ca14',testo:'Operatori abilitati e formati per uso macchine',categoria:'Macchine'},
  {id:'ca15',testo:'Gru e apparecchi di sollevamento verificati',categoria:'Macchine'},
  {id:'ca_x3',testo:'',categoria:'Macchine',personalizzabile:true},
  // Elettrico
  {id:'ca16',testo:'Impianto elettrico di cantiere a norma CEI 64-8',categoria:'Elettrico'},
  {id:'ca17',testo:'Quadri elettrici protetti e chiusi a chiave',categoria:'Elettrico'},
  {id:'ca18',testo:'Cavi senza danneggiamenti visibili',categoria:'Elettrico'},
  {id:'ca19',testo:'Messa a terra e interruttori differenziali presenti',categoria:'Elettrico'},
  {id:'ca_x4',testo:'',categoria:'Elettrico',personalizzabile:true},
  // Emergenza
  {id:'ca20',testo:'Estintori presenti, accessibili e revisionati',categoria:'Emergenza'},
  {id:'ca21',testo:'Vie di evacuazione libere e segnalate',categoria:'Emergenza'},
  {id:'ca22',testo:'Cassetta di pronto soccorso completa',categoria:'Emergenza'},
  {id:'ca23',testo:'Piano di emergenza affisso e noto ai lavoratori',categoria:'Emergenza'},
  {id:'ca_x5',testo:'',categoria:'Emergenza',personalizzabile:true},
  // Ordine
  {id:'ca24',testo:'Cantiere in ordine, passaggi liberi',categoria:'Ordine'},
  {id:'ca25',testo:'Rifiuti e materiali di risulta smaltiti correttamente',categoria:'Ordine'},
  {id:'ca26',testo:'Segnaletica di sicurezza presente e leggibile',categoria:'Ordine'},
  {id:'ca27',testo:'Recinzione e delimitazione cantiere adeguata',categoria:'Ordine'},
  {id:'ca_x6',testo:'',categoria:'Ordine',personalizzabile:true},
  // Documenti
  {id:'ca28',testo:'PSC / POS presenti in cantiere',categoria:'Documenti'},
  {id:'ca29',testo:'Notifica preliminare affissa',categoria:'Documenti'},
  {id:'ca30',testo:'Registro infortuni aggiornato',categoria:'Documenti'},
  {id:'ca31',testo:'Idoneità sanitaria lavoratori aggiornata',categoria:'Documenti'},
  {id:'ca_x7',testo:'',categoria:'Documenti',personalizzabile:true},
];

const CHECKLIST_AZIENDA = [
  // DPI
  {id:'az01',testo:'DPI idonei disponibili e in buono stato',categoria:'DPI'},
  {id:'az02',testo:'Lavoratori formati sull\'uso dei DPI',categoria:'DPI'},
  {id:'az03',testo:'DPI correttamente indossati durante le lavorazioni',categoria:'DPI'},
  {id:'az_x1',testo:'',categoria:'DPI',personalizzabile:true},
  // Ambienti di lavoro
  {id:'az04',testo:'Pavimenti in buone condizioni, senza rischio scivolamento',categoria:'Ambienti di lavoro'},
  {id:'az05',testo:'Illuminazione adeguata in tutti i locali',categoria:'Ambienti di lavoro'},
  {id:'az06',testo:'Aerazione e ventilazione sufficienti',categoria:'Ambienti di lavoro'},
  {id:'az07',testo:'Temperature adeguate nei luoghi di lavoro',categoria:'Ambienti di lavoro'},
  {id:'az08',testo:'Servizi igienici presenti e in buone condizioni',categoria:'Ambienti di lavoro'},
  {id:'az09',testo:'Spogliatoi adeguati al numero dei lavoratori',categoria:'Ambienti di lavoro'},
  {id:'az_x2',testo:'',categoria:'Ambienti di lavoro',personalizzabile:true},
  // Impianti
  {id:'az10',testo:'Impianto elettrico a norma e verificato',categoria:'Impianti'},
  {id:'az11',testo:'Quadri elettrici accessibili e segnalati',categoria:'Impianti'},
  {id:'az12',testo:'Impianto di messa a terra verificato',categoria:'Impianti'},
  {id:'az13',testo:'Impianto termico e di condizionamento in manutenzione',categoria:'Impianti'},
  {id:'az_x3',testo:'',categoria:'Impianti',personalizzabile:true},
  // Emergenza
  {id:'az14',testo:'Estintori presenti, segnalati e revisionati',categoria:'Emergenza'},
  {id:'az15',testo:'Idranti presenti e funzionanti',categoria:'Emergenza'},
  {id:'az16',testo:'Uscite di emergenza libere e segnalate',categoria:'Emergenza'},
  {id:'az17',testo:'Planimetria con vie di fuga affissa',categoria:'Emergenza'},
  {id:'az18',testo:'Squadra di emergenza formata e nominata',categoria:'Emergenza'},
  {id:'az19',testo:'Prove di evacuazione effettuate',categoria:'Emergenza'},
  {id:'az_x4',testo:'',categoria:'Emergenza',personalizzabile:true},
  // Segnaletica
  {id:'az20',testo:'Segnaletica di sicurezza presente e leggibile',categoria:'Segnaletica'},
  {id:'az21',testo:'Cartelli di divieto e obbligo correttamente affissi',categoria:'Segnaletica'},
  {id:'az22',testo:'Pittogrammi sui prodotti chimici presenti',categoria:'Segnaletica'},
  {id:'az_x5',testo:'',categoria:'Segnaletica',personalizzabile:true},
  // Valutazioni dei Rischi
  {id:'az23',testo:'DVR (Documento Valutazione Rischi) aggiornato',categoria:'Valutazioni dei Rischi'},
  {id:'az24',testo:'DUVRI redatto per lavori in appalto',categoria:'Valutazioni dei Rischi'},
  {id:'az25',testo:'Valutazione rischio stress lavoro-correlato effettuata',categoria:'Valutazioni dei Rischi'},
  {id:'az26',testo:'Valutazione rischio chimico aggiornata',categoria:'Valutazioni dei Rischi'},
  {id:'az27',testo:'Valutazione rischio rumore effettuata',categoria:'Valutazioni dei Rischi'},
  {id:'az28',testo:'Valutazione rischio vibrazioni effettuata',categoria:'Valutazioni dei Rischi'},
  {id:'az29',testo:'Valutazione rischio incendio aggiornata',categoria:'Valutazioni dei Rischi'},
  {id:'az30',testo:'Valutazione rischio biologico effettuata',categoria:'Valutazioni dei Rischi'},
  {id:'az31',testo:'Valutazione rischio movimentazione manuale dei carichi',categoria:'Valutazioni dei Rischi'},
  {id:'az32',testo:'Valutazione rischio videoterminali (VDT)',categoria:'Valutazioni dei Rischi'},
  {id:'az_x6',testo:'',categoria:'Valutazioni dei Rischi',personalizzabile:true},
  // Documenti
  {id:'az33',testo:'Registro infortuni aggiornato',categoria:'Documenti'},
  {id:'az34',testo:'Sorveglianza sanitaria attiva e aggiornata',categoria:'Documenti'},
  {id:'az35',testo:'Nomine sicurezza (RSPP, RLS, addetti emergenza) aggiornate',categoria:'Documenti'},
  {id:'az36',testo:'Piano formazione lavoratori aggiornato',categoria:'Documenti'},
  {id:'az37',testo:'Registro manutenzioni attrezzature aggiornato',categoria:'Documenti'},
  {id:'az_x7',testo:'',categoria:'Documenti',personalizzabile:true},
  // Ergonomia
  {id:'az38',testo:'Postazioni VDT ergonomiche e regolabili',categoria:'Ergonomia'},
  {id:'az39',testo:'Sedute ergonomiche presenti',categoria:'Ergonomia'},
  {id:'az40',testo:'Illuminazione postazioni lavoro adeguata',categoria:'Ergonomia'},
  {id:'az41',testo:'Pause regolari per operatori VDT garantite',categoria:'Ergonomia'},
  {id:'az_x8',testo:'',categoria:'Ergonomia',personalizzabile:true},
];

const CHECKLIST_EDIFICIO = [
  // Vie di esodo
  {id:'ed01',testo:'Uscite di emergenza libere e apribili dall\'interno',categoria:'Vie di esodo'},
  {id:'ed02',testo:'Maniglioni antipanico funzionanti e in manutenzione',categoria:'Vie di esodo'},
  {id:'ed03',testo:'Cartellonistica vie di fuga presente e illuminata',categoria:'Vie di esodo'},
  {id:'ed04',testo:'Luci di emergenza funzionanti',categoria:'Vie di esodo'},
  {id:'ed05',testo:'Corridoi e scale liberi da ingombri',categoria:'Vie di esodo'},
  {id:'ed06',testo:'Larghezza vie di esodo regolamentare',categoria:'Vie di esodo'},
  {id:'ed_x1',testo:'',categoria:'Vie di esodo',personalizzabile:true},
  // Porte REI
  {id:'ed07',testo:'Porte REI in buone condizioni e funzionanti',categoria:'Porte REI'},
  {id:'ed08',testo:'Porte REI con etichetta manutenzione aggiornata',categoria:'Porte REI'},
  {id:'ed09',testo:'Porte REI non tenute aperte in modo improprio',categoria:'Porte REI'},
  {id:'ed10',testo:'Maniglioni e serrature porte REI funzionanti',categoria:'Porte REI'},
  {id:'ed11',testo:'Nessuna crepa o danneggiamento visibile sulle porte REI',categoria:'Porte REI'},
  {id:'ed_x2',testo:'',categoria:'Porte REI',personalizzabile:true},
  // Antincendio
  {id:'ed12',testo:'Estintori presenti, segnalati e revisionati',categoria:'Antincendio'},
  {id:'ed13',testo:'Idranti presenti, accessibili e funzionanti',categoria:'Antincendio'},
  {id:'ed14',testo:'Centralina antincendio funzionante e senza anomalie',categoria:'Antincendio'},
  {id:'ed15',testo:'Rilevatori di fumo attivi e non esclusi',categoria:'Antincendio'},
  {id:'ed16',testo:'Pulsanti di allarme presenti e segnalati',categoria:'Antincendio'},
  {id:'ed17',testo:'TOA/impianto di diffusione sonora funzionante',categoria:'Antincendio'},
  {id:'ed18',testo:'Registro controlli antincendio aggiornato',categoria:'Antincendio'},
  {id:'ed_x3',testo:'',categoria:'Antincendio',personalizzabile:true},
  // Impianti elevatori
  {id:'ed19',testo:'Ascensori con libretto di impianto aggiornato',categoria:'Impianti elevatori'},
  {id:'ed20',testo:'Verifica periodica ascensori in regola',categoria:'Impianti elevatori'},
  {id:'ed21',testo:'Nessuna perdita di olio visibile dagli impianti',categoria:'Impianti elevatori'},
  {id:'ed22',testo:'Cartello divieto utilizzo in caso di incendio presente',categoria:'Impianti elevatori'},
  {id:'ed23',testo:'Montacarichi e piattaforme elevatrici verificati',categoria:'Impianti elevatori'},
  {id:'ed_x4',testo:'',categoria:'Impianti elevatori',personalizzabile:true},
  // Copertura e linea vita
  {id:'ed24',testo:'Linea vita presente e in manutenzione annuale',categoria:'Copertura e linea vita'},
  {id:'ed25',testo:'Accesso copertura sicuro e segnalato',categoria:'Copertura e linea vita'},
  {id:'ed26',testo:'Nessuna infiltrazione visibile dalla copertura',categoria:'Copertura e linea vita'},
  {id:'ed27',testo:'Cavedi e lucernari in buone condizioni',categoria:'Copertura e linea vita'},
  {id:'ed28',testo:'Sistemi antivolatili (reti, dissuasori) presenti se necessario',categoria:'Copertura e linea vita'},
  {id:'ed_x5',testo:'',categoria:'Copertura e linea vita',personalizzabile:true},
  // Parti comuni
  {id:'ed29',testo:'Parti comuni libere da ingombri e materiali abbandonati',categoria:'Parti comuni'},
  {id:'ed30',testo:'Illuminazione parti comuni funzionante',categoria:'Parti comuni'},
  {id:'ed31',testo:'Nessuna perdita d\'acqua o umidità visibile',categoria:'Parti comuni'},
  {id:'ed32',testo:'Pavimenti in buone condizioni, nessun rischio caduta',categoria:'Parti comuni'},
  {id:'ed33',testo:'Gradini e dislivelli segnalati correttamente',categoria:'Parti comuni'},
  {id:'ed34',testo:'Cartellonistica obsoleta o non pertinente rimossa',categoria:'Parti comuni'},
  {id:'ed_x6',testo:'',categoria:'Parti comuni',personalizzabile:true},
  // Documentazione
  {id:'ed35',testo:'Certificato di agibilità presente',categoria:'Documentazione'},
  {id:'ed36',testo:'CPI (Certificato Prevenzione Incendi) in corso di validità',categoria:'Documentazione'},
  {id:'ed37',testo:'Piano di emergenza ed evacuazione aggiornato',categoria:'Documentazione'},
  {id:'ed38',testo:'Registro controlli e manutenzioni aggiornato',categoria:'Documentazione'},
  {id:'ed39',testo:'Documentazione impianti (elettrico, termico) disponibile',categoria:'Documentazione'},
  {id:'ed_x7',testo:'',categoria:'Documentazione',personalizzabile:true},
];

function getChecklistByLuogo(luogo) {
  switch(luogo) {
    case 'azienda': return CHECKLIST_AZIENDA;
    case 'edificio': return CHECKLIST_EDIFICIO;
    default: return CHECKLIST_CANTIERE;
  }
}

// ═══════════════════════════════════════
//  STATE
// ═══════════════════════════════════════

let currentView = 'home';
let currentSopralluogo = null;
let currentDetailId = null;
let allSopralluoghi = [];
let recognition = null;
let isRecording = false;
let photoIdCounter = 0;
let chkPhotoCounters = {};

// ═══════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const v = document.getElementById('view-' + name);
  if (v) v.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-view="${name}"]`);
  if (btn) btn.classList.add('active');
  currentView = name;
}

function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', {day:'2-digit',month:'2-digit',year:'numeric'});
}

function getRiskoClass(r) {
  return {basso:'green', medio:'amber', alto:'red'}[r] || 'amber';
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ═══════════════════════════════════════
//  HOME
// ═══════════════════════════════════════

async function loadHome() {
  allSopralluoghi = await db.sopralluoghi.orderBy('createdAt').reverse().toArray();
  const list = document.getElementById('sopr-list');
  if (!allSopralluoghi.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>Nessun sopralluogo</h3>
      <p>Inizia creando il tuo primo<br>sopralluogo con il pulsante +</p>
    </div>`;
    return;
  }
  list.innerHTML = allSopralluoghi.map(s => {
    const si = s.checklist?.filter(c => c.valore === 'SI').length || 0;
    const no = s.checklist?.filter(c => c.valore === 'NO').length || 0;
    const tot = s.checklist?.filter(c => !c.nascosta).length || 0;
    const fotoN = s.foto?.length || 0;
    const luogoIcon = {cantiere:'🏗', azienda:'🏢', edificio:'🏠'}[s.luogo] || '📍';
    return `<div class="sopralluogo-card" onclick="openDetail(${s.id})">
      <div class="sopr-company">${escHtml(s.azienda || 'Azienda N/D')}</div>
      <div class="sopr-meta">
        <span class="sopr-date">📅 ${formatDate(s.data)}</span>
        <span class="sopr-date">${luogoIcon} ${escHtml(s.luogo || '')}</span>
        <div class="sopr-tags">
          ${tot ? `<span class="tag">${si}/${tot} ✓</span>` : ''}
          ${no ? `<span class="tag red">${no} NO</span>` : ''}
          ${fotoN ? `<span class="tag amber">📷 ${fotoN}</span>` : ''}
          ${s.rischioGenerale ? `<span class="tag ${getRiskoClass(s.rischioGenerale)}">${s.rischioGenerale.toUpperCase()}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════
//  NUOVO FORM
// ═══════════════════════════════════════

function initNuovoForm() {
  const luogo = 'cantiere';
  const template = getChecklistByLuogo(luogo);
  currentSopralluogo = {
    azienda:'', cantiere:'', indirizzo:'', rspp:'', luogo,
    data: new Date().toISOString().split('T')[0],
    rischioGenerale:'medio',
    noteLibere:'', dettatura:'',
    checklist: template.map(t => ({...t, valore:'NA', commento:'', foto:[], nascosta:false})),
    foto:[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  photoIdCounter = 0;
  chkPhotoCounters = {};
  ['azienda','cantiere','indirizzo','rspp','data','luogo','rischioGenerale','noteLibere'].forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) el.value = currentSopralluogo[f];
  });
  document.getElementById('voice-text').textContent = 'Premi il microfono per dettare note...';
  renderChecklist();
  renderPhotoGrid();
  showView('nuovo');
}

// Cambio tipo luogo — aggiorna checklist
function onLuogoChange() {
  const luogo = document.getElementById('f-luogo').value;
  const template = getChecklistByLuogo(luogo);
  currentSopralluogo.luogo = luogo;
  currentSopralluogo.checklist = template.map(t => ({
    ...t, valore:'NA', commento:'', foto:[], nascosta:false
  }));
  chkPhotoCounters = {};
  renderChecklist();
  toast('Checklist aggiornata per ' + luogo + ' ✓', 'success');
}

// ═══════════════════════════════════════
//  CHECKLIST
// ═══════════════════════════════════════

function renderChecklist() {
  const cats = [...new Set(currentSopralluogo.checklist.map(c => c.categoria))];
  const container = document.getElementById('checklist-container');
  container.innerHTML = cats.map(cat => {
    const items = currentSopralluogo.checklist.filter(c => c.categoria === cat);
    return `
      <div class="card-title" style="margin-top:12px;margin-bottom:6px;">
        <span>▶</span>${escHtml(cat)}
      </div>
      ${items.map(item => {
        if (item.nascosta) return `
          <div class="checklist-item-hidden" id="chkitem-${item.id}">
            <span style="font-size:11px;color:var(--text-muted);font-style:italic">${escHtml(item.testo||'Voce personalizzata')} — nascosta</span>
            <button class="chk-ripristina-btn" onclick="toggleNascondi('${item.id}')">↩ Ripristina</button>
          </div>`;

        if (item.personalizzabile) return `
          <div class="checklist-item" id="chkitem-${item.id}">
            <input type="text" class="form-input chk-custom-input"
              placeholder="✏️ Aggiungi voce personalizzata..."
              value="${escHtml(item.testo||'')}"
              oninput="setTestoPersonalizzato('${item.id}', this.value)"
              style="flex:1;font-size:13px;padding:8px 10px">
            <div class="tri-toggle">
              <input type="radio" name="chk-${item.id}" id="${item.id}-si" value="SI" ${item.valore==='SI'?'checked':''} onchange="setCheck('${item.id}','SI')">
              <label for="${item.id}-si">SI</label>
              <input type="radio" name="chk-${item.id}" id="${item.id}-no" value="NO" ${item.valore==='NO'?'checked':''} onchange="setCheck('${item.id}','NO')">
              <label for="${item.id}-no">NO</label>
              <input type="radio" name="chk-${item.id}" id="${item.id}-na" value="NA" ${item.valore==='NA'?'checked':''} onchange="setCheck('${item.id}','NA')">
              <label for="${item.id}-na">N.A.</label>
            </div>
          </div>`;

        return `
          <div class="checklist-item" id="chkitem-${item.id}">
            <div class="checklist-item-text">${escHtml(item.testo)}</div>
            <div style="display:flex;align-items:center;gap:6px">
              <div class="tri-toggle">
                <input type="radio" name="chk-${item.id}" id="${item.id}-si" value="SI" ${item.valore==='SI'?'checked':''} onchange="setCheck('${item.id}','SI')">
                <label for="${item.id}-si">SI</label>
                <input type="radio" name="chk-${item.id}" id="${item.id}-no" value="NO" ${item.valore==='NO'?'checked':''} onchange="setCheck('${item.id}','NO')">
                <label for="${item.id}-no">NO</label>
                <input type="radio" name="chk-${item.id}" id="${item.id}-na" value="NA" ${item.valore==='NA'?'checked':''} onchange="setCheck('${item.id}','NA')">
                <label for="${item.id}-na">N.A.</label>
              </div>
              <button class="chk-nascondi-btn" onclick="toggleNascondi('${item.id}')" title="Nascondi voce">✕</button>
            </div>
            <input type="text" class="commento-input"
              placeholder="Nota..."
              value="${escHtml(item.commento||'')}"
              oninput="setCommento('${item.id}', this.value)">
            <div class="chk-foto-row" id="chkfotos-${item.id}">
              ${renderChkFotos(item)}
            </div>
            <input type="file" accept="image/*" multiple
              id="chk-photo-input-${item.id}"
              style="display:none"
              onchange="handleChkPhoto(event,'${item.id}')">
            <label for="chk-photo-input-${item.id}" class="chk-add-foto-btn">
              📷 +foto
            </label>
          </div>`;
      }).join('')}`;
  }).join('');
}

function setTestoPersonalizzato(id, val) {
  const item = currentSopralluogo.checklist.find(c => c.id === id);
  if (item) item.testo = val;
}

function toggleNascondi(id) {
  const item = currentSopralluogo.checklist.find(c => c.id === id);
  if (item) {
    item.nascosta = !item.nascosta;
    renderChecklist();
  }
}

function renderChkFotos(item) {
  if (!item.foto || !item.foto.length) return '';
  return item.foto.map(p =>
    `<img class="chk-photo-thumb" src="${p.dataUrl}" onclick="openLightboxFromChk('${item.id}','${p.id}')">`
  ).join('');
}

function setCheck(id, val) {
  const item = currentSopralluogo.checklist.find(c => c.id === id);
  if (item) item.valore = val;
}

function setCommento(id, val) {
  const item = currentSopralluogo.checklist.find(c => c.id === id);
  if (item) item.commento = val;
}

function handleChkPhoto(e, itemId) {
  const item = currentSopralluogo.checklist.find(c => c.id === itemId);
  if (!item) return;
  if (!item.foto) item.foto = [];
  [...e.target.files].forEach(file => {
    compressImage(file, dataUrl => {
      if (!chkPhotoCounters[itemId]) chkPhotoCounters[itemId] = 0;
      chkPhotoCounters[itemId]++;
      item.foto.push({
        id: itemId + '_p' + chkPhotoCounters[itemId],
        dataUrl,
        timestamp: new Date().toISOString()
      });
      const row = document.getElementById('chkfotos-' + itemId);
      if (row) row.innerHTML = renderChkFotos(item);
    });
  });
  e.target.value = '';
}

function openLightboxFromChk(itemId, photoId) {
  const item = currentSopralluogo?.checklist.find(c => c.id === itemId);
  const foto = item?.foto?.find(p => p.id === photoId);
  if (!foto) return;
  document.getElementById('lightbox-img').src = foto.dataUrl;
  document.getElementById('lightbox').classList.add('open');
}

// ═══════════════════════════════════════
//  FOTO GENERALI
// ═══════════════════════════════════════

function renderPhotoGrid() {
  const grid = document.getElementById('photo-grid');
  grid.innerHTML = currentSopralluogo.foto.map(p =>
    `<img class="photo-thumb" src="${p.dataUrl}" alt="" onclick="openLightbox('${p.id}')">`
  ).join('');
  grid.innerHTML += `<label class="photo-add-btn" for="photo-input">
    <span>📷</span>
    <span style="font-size:11px;font-weight:600;">AGGIUNGI</span>
  </label>`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);
});

function handlePhotoUpload(e) {
  [...e.target.files].forEach(file => {
    compressImage(file, dataUrl => {
      photoIdCounter++;
      currentSopralluogo.foto.push({
        id: 'p' + photoIdCounter,
        dataUrl,
        didascalia: '',
        timestamp: new Date().toISOString()
      });
      renderPhotoGrid();
    });
  });
  e.target.value = '';
}

function openLightbox(id) {
  const foto = currentSopralluogo?.foto.find(p => p.id === id)
    || currentDetailFotos?.find(p => p.id === id);
  if (!foto) return;
  document.getElementById('lightbox-img').src = foto.dataUrl;
  document.getElementById('lightbox').classList.add('open');
}
let currentDetailFotos = [];

// ═══════════════════════════════════════
//  VOICE
// ═══════════════════════════════════════

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    document.getElementById('voice-btn').disabled = true;
    document.getElementById('voice-text').textContent = 'Dettatura non supportata';
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = (e) => {
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    document.getElementById('voice-text').textContent = transcript;
    if (e.results[e.results.length - 1].isFinal) {
      currentSopralluogo.dettatura += (currentSopralluogo.dettatura ? '\n' : '') + transcript;
    }
  };
  recognition.onerror = () => { stopRecording(); toast('Errore microfono', 'error'); };
  recognition.onend = () => { if (isRecording) recognition.start(); };
}

function toggleRecording() {
  if (isRecording) { stopRecording(); } else { startRecording(); }
}

function startRecording() {
  if (!recognition) initVoice();
  if (!recognition) return;
  isRecording = true;
  recognition.start();
  document.getElementById('voice-btn').classList.add('recording');
  document.getElementById('voice-btn').textContent = '⏹';
  document.getElementById('voice-text').textContent = 'In ascolto...';
}

function stopRecording() {
  isRecording = false;
  if (recognition) recognition.stop();
  document.getElementById('voice-btn').classList.remove('recording');
  document.getElementById('voice-btn').textContent = '🎙';
  if (currentSopralluogo?.dettatura) {
    document.getElementById('f-noteLibere').value += (document.getElementById('f-noteLibere').value ? '\n\n' : '') + '[DETTATURA]\n' + currentSopralluogo.dettatura;
    currentSopralluogo.noteLibere = document.getElementById('f-noteLibere').value;
    document.getElementById('voice-text').textContent = 'Testo aggiunto alle note ✓';
    currentSopralluogo.dettatura = '';
    toast('Dettatura aggiunta ✓', 'success');
  }
}

// ═══════════════════════════════════════
//  SALVA
// ═══════════════════════════════════════

async function saveSopralluogo() {
  ['azienda','cantiere','indirizzo','rspp','data','luogo','rischioGenerale','noteLibere'].forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) currentSopralluogo[f] = el.value;
  });
  if (!currentSopralluogo.azienda.trim()) { toast('Inserisci il nome azienda/cantiere', 'error'); return; }
  if (!currentSopralluogo.data) { toast('Inserisci la data', 'error'); return; }
  currentSopralluogo.updatedAt = new Date().toISOString();
  try {
    if (currentSopralluogo.id) {
      await db.sopralluoghi.update(currentSopralluogo.id, currentSopralluogo);
      toast('Aggiornato ✓', 'success');
    } else {
      const id = await db.sopralluoghi.add(currentSopralluogo);
      currentSopralluogo.id = id;
      toast('Salvato ✓', 'success');
    }
    await loadHome();
    showView('home');
  } catch(err) { toast('Errore: ' + err.message, 'error'); }
}

// ═══════════════════════════════════════
//  DETTAGLIO
// ═══════════════════════════════════════

async function openDetail(id) {
  const s = await db.sopralluoghi.get(id);
  if (!s) return;
  currentDetailId = id;
  currentDetailFotos = s.foto || [];

  const visibili = (s.checklist||[]).filter(c => !c.nascosta && c.testo);
  const si = visibili.filter(c => c.valore === 'SI').length;
  const no = visibili.filter(c => c.valore === 'NO').length;
  const na = visibili.filter(c => c.valore === 'NA').length;
  const luogoIcon = {cantiere:'🏗', azienda:'🏢', edificio:'🏠'}[s.luogo] || '📍';

  const photosHtml = (s.foto||[]).map(p =>
    `<img class="photo-thumb" src="${p.dataUrl}" onclick="openLightbox('${p.id}')">`
  ).join('');

  const cats = [...new Set((s.checklist||[]).map(c => c.categoria))];
  const checklistHtml = cats.map(cat => {
    const items = (s.checklist||[]).filter(c => c.categoria === cat && !c.nascosta && c.testo);
    if (!items.length) return '';
    const colorMap = {SI:'#22c55e', NO:'#ef4444', NA:'#64748b'};
    return `<div class="card-title" style="margin-top:12px;margin-bottom:6px;"><span>▶</span>${escHtml(cat)}</div>
      ${items.map(c => `
        <div class="checklist-item">
          <div class="checklist-item-text">${escHtml(c.testo)}</div>
          <span style="font-family:var(--font-display);font-size:13px;font-weight:800;color:${colorMap[c.valore]||'#64748b'}">${c.valore}</span>
          ${c.commento ? `<div style="width:100%;font-size:12px;color:var(--text-secondary);font-style:italic;margin-top:4px;">💬 ${escHtml(c.commento)}</div>` : ''}
          ${c.foto?.length ? `<div class="chk-foto-row" style="margin-top:6px">${c.foto.map(p=>`<img class="chk-photo-thumb" src="${p.dataUrl}" onclick="openDetailChkPhoto('${p.dataUrl}')">`).join('')}</div>` : ''}
        </div>`).join('')}`;
  }).join('');

  document.getElementById('detail-content').innerHTML = `
    <button class="back-btn" onclick="showView('home'); loadHome()">← Indietro</button>
    <div class="section-title">${escHtml(s.azienda||'N/D')}</div>
    <div class="section-sub">${luogoIcon} ${escHtml(s.luogo||'')} — ${escHtml(s.cantiere||'')} — ${formatDate(s.data)}</div>
    <div class="checklist-summary">
      <div class="summary-box si"><span class="num">${si}</span><span class="lbl">Conformi</span></div>
      <div class="summary-box no"><span class="num">${no}</span><span class="lbl">Non conf.</span></div>
      <div class="summary-box na"><span class="num">${na}</span><span class="lbl">N.A.</span></div>
    </div>
    <div class="card">
      <div class="card-title">📋 Informazioni</div>
      ${s.indirizzo ? `<p style="font-size:14px;color:var(--text-secondary);margin-bottom:6px;">📍 ${escHtml(s.indirizzo)}</p>` : ''}
      ${s.rspp ? `<p style="font-size:14px;color:var(--text-secondary);margin-bottom:6px;">👤 RSPP: ${escHtml(s.rspp)}</p>` : ''}
      ${s.rischioGenerale ? `<span class="risk-badge ${s.rischioGenerale}">Rischio ${s.rischioGenerale}</span>` : ''}
    </div>
    ${s.noteLibere ? `<div class="card"><div class="card-title">📝 Note</div><p style="font-size:14px;line-height:1.6;white-space:pre-wrap">${escHtml(s.noteLibere)}</p></div>` : ''}
    ${s.foto?.length ? `<div class="card"><div class="card-title">📷 Foto generali (${s.foto.length})</div><div class="photo-grid">${photosHtml}</div></div>` : ''}
    <div class="card"><div class="card-title">✅ Checklist</div>${checklistHtml}</div>
    <hr class="divider">
    <div class="flex-row mt-12">
      <button class="btn btn-ghost" onclick="editSopralluogo(${s.id})">✏️ Modifica</button>
      <button class="btn btn-danger" onclick="deleteSopralluogo(${s.id})">🗑 Elimina</button>
    </div>
    <button class="btn btn-primary mt-8" onclick="showExportForId(${s.id})">📤 Esporta Report</button>`;
  showView('detail');
}

function openDetailChkPhoto(dataUrl) {
  document.getElementById('lightbox-img').src = dataUrl;
  document.getElementById('lightbox').classList.add('open');
}

async function editSopralluogo(id) {
  const s = await db.sopralluoghi.get(id);
  currentSopralluogo = JSON.parse(JSON.stringify(s));
  photoIdCounter = s.foto?.length || 0;
  chkPhotoCounters = {};
  ['azienda','cantiere','indirizzo','rspp','data','luogo','rischioGenerale','noteLibere'].forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) el.value = currentSopralluogo[f] || '';
  });
  document.getElementById('voice-text').textContent = 'Premi il microfono per dettare note...';
  renderChecklist();
  renderPhotoGrid();
  showView('nuovo');
}

async function deleteSopralluogo(id) {
  if (!confirm('Eliminare definitivamente questo sopralluogo?')) return;
  await db.sopralluoghi.delete(id);
  toast('Eliminato', 'error');
  await loadHome();
  showView('home');
}

// ═══════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════

let exportTargetId = null;

async function showExportForId(id) {
  exportTargetId = id;
  showView('export');
}

async function exportPDF() {
  const id = exportTargetId || allSopralluoghi[0]?.id;
  if (!id) { toast('Nessun sopralluogo', 'error'); return; }
  const s = await db.sopralluoghi.get(id);
  if (!s) return;
  toast('Generazione PDF...', '');
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  const margin=18, pageW=210, usableW=pageW-margin*2;
  let y = margin;
  const CH=[15,25,35],CA=[245,158,11],CG=[34,197,94],CR=[239,68,68],CGR=[100,116,139],CT=[30,40,50],CL=[248,250,252];

  function checkPage(need=20){ if(y+need>275){doc.addPage();y=margin;} }

  doc.setFillColor(...CH); doc.rect(0,0,pageW,42,'F');
  doc.setFillColor(...CA); doc.rect(0,42,pageW,2,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.setTextColor(...CA); doc.text('CANTIERE SAFE',margin,20);
  doc.setFontSize(10); doc.setTextColor(200,210,220); doc.text('Verbale di Sopralluogo — Sicurezza sul Lavoro',margin,28);
  doc.setFontSize(9); doc.text('D.Lgs. 81/2008 — RSPP Report',margin,35);
  y=52;

  const luogoLabel = {cantiere:'🏗 Cantiere', azienda:'🏢 Azienda', edificio:'🏠 Edificio'}[s.luogo]||s.luogo||'';
  doc.setFillColor(245,247,250); doc.roundedRect(margin,y,usableW,42,3,3,'F');
  doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(...CT);
  doc.text((s.azienda||'N/D').toUpperCase(),margin+5,y+10);
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(...CGR);
  doc.text('Tipo: '+luogoLabel,margin+5,y+18);
  if(s.cantiere) doc.text('Cantiere: '+s.cantiere,margin+5,y+24);
  if(s.indirizzo) doc.text('Indirizzo: '+s.indirizzo,margin+5,y+30);
  doc.text('Data: '+formatDate(s.data),margin+5,y+37);
  if(s.rspp) doc.text('RSPP: '+s.rspp,margin+5+usableW/2,y+37);
  y+=48;

  const visibili = (s.checklist||[]).filter(c => !c.nascosta && c.testo);
  const si=visibili.filter(c=>c.valore==='SI').length;
  const no=visibili.filter(c=>c.valore==='NO').length;
  const na=visibili.filter(c=>c.valore==='NA').length;
  const bW=(usableW-8)/3;
  [[si,CG,'CONFORMI'],[no,CR,'NON CONFORMI'],[na,CGR,'N.A.']].forEach(([v,c,l],i)=>{
    const bx=margin+i*(bW+4);
    doc.setFillColor(...c); doc.roundedRect(bx,y,bW,18,2,2,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(255,255,255);
    doc.text(String(v),bx+bW/2,y+11,{align:'center'});
    doc.setFontSize(7); doc.text(l,bx+bW/2,y+16,{align:'center'});
  });
  y+=24;

  if(s.rischioGenerale){
    const rC={basso:CG,medio:CA,alto:CR}[s.rischioGenerale]||CGR;
    doc.setFillColor(...rC); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(255,255,255);
    doc.roundedRect(margin,y,50,9,2,2,'F');
    doc.text('RISCHIO: '+s.rischioGenerale.toUpperCase(),margin+25,y+6,{align:'center'});
    y+=14;
  } else { y+=4; }

  if(s.noteLibere?.trim()){
    checkPage(30);
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...CA);
    doc.text('NOTE LIBERE',margin,y); y+=5;
    const nl=doc.splitTextToSize(s.noteLibere,usableW-8);
    doc.setFillColor(...CL); doc.roundedRect(margin,y,usableW,nl.length*4.5+6,2,2,'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...CT);
    nl.forEach((line,i)=>doc.text(line,margin+4,y+5+i*4.5));
    y+=nl.length*4.5+12;
  }

  const chkFotoRimandi = [];
  const cats=[...new Set((s.checklist||[]).map(c=>c.categoria))];
  for(const cat of cats){
    const items=(s.checklist||[]).filter(c=>c.categoria===cat && !c.nascosta && c.testo);
    if(!items.length) continue;
    checkPage(18);
    doc.setFillColor(...CH); doc.rect(margin,y,usableW,8,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(255,255,255);
    doc.text(cat.toUpperCase(),margin+4,y+5.5);
    y+=10;
    for(const item of items){
      const hasFoto = item.foto && item.foto.length > 0;
      const fotoInline = hasFoto && item.foto.length <= 2;
      const rowH = item.commento ? 14 : 8;
      checkPage(rowH+4);
      const idx=items.indexOf(item);
      if(idx%2===0){doc.setFillColor(...CL);doc.rect(margin,y-1,usableW,rowH,'F');}
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...CT);
      const tl=doc.splitTextToSize(item.testo,usableW-22);
      doc.text(tl[0],margin+2,y+4.5);
      const vC={SI:CG,NO:CR,NA:CGR}[item.valore]||CGR;
      doc.setFillColor(...vC); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
      doc.roundedRect(pageW-margin-16,y+0.5,16,6,1,1,'F');
      doc.text(item.valore,pageW-margin-8,y+5,{align:'center'});
      let afterY=y+8;
      if(item.commento){
        doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(...CGR);
        doc.text('💬 '+item.commento,margin+2,afterY-1.5);
        afterY+=6;
      }
      if(fotoInline){
        const fW=(usableW-4)/2;
        item.foto.forEach((f,fi)=>{
          checkPage(28);
          const fx=margin+(fi%2)*(fW+4);
          try{ doc.addImage(f.dataUrl,'JPEG',fx,afterY,fW,24,undefined,'MEDIUM'); }catch(e){}
          if(fi%2===1||fi===item.foto.length-1) afterY+=26;
        });
      } else if(hasFoto){
        const rimandoId=chkFotoRimandi.length+1;
        chkFotoRimandi.push({id:rimandoId, testo:item.testo, foto:item.foto});
        doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(...CA);
        doc.text('📷 Vedi foto allegate — Ref. F'+rimandoId,margin+2,afterY-1);
        afterY+=5;
      }
      y=afterY+2;
    }
    y+=4;
  }

  if(s.foto?.length){
    checkPage(30);
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...CA);
    doc.text('DOCUMENTAZIONE FOTOGRAFICA GENERALE',margin,y); y+=6;
    let col=0; const iW=(usableW-6)/2,iH=50;
    for(const foto of s.foto){
      checkPage(iH+10);
      const bx=margin+col*(iW+6);
      try{ doc.addImage(foto.dataUrl,'JPEG',bx,y,iW,iH,undefined,'MEDIUM'); doc.setDrawColor(200,210,220); doc.setLineWidth(0.3); doc.rect(bx,y,iW,iH); }
      catch(e){ doc.setFillColor(230,230,240); doc.rect(bx,y,iW,iH,'F'); }
      col++; if(col>=2){col=0;y+=iH+8;}
    }
    if(col>0) y+=iH+8;
  }

  if(chkFotoRimandi.length){
    checkPage(30);
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...CA);
    doc.text('FOTO ALLEGATE — VOCI CHECKLIST',margin,y); y+=6;
    for(const rimando of chkFotoRimandi){
      checkPage(20);
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...CT);
      doc.text('F'+rimando.id+' — '+rimando.testo,margin,y); y+=6;
      let col=0; const iW=(usableW-6)/2,iH=46;
      for(const f of rimando.foto){
        checkPage(iH+8);
        const bx=margin+col*(iW+6);
        try{ doc.addImage(f.dataUrl,'JPEG',bx,y,iW,iH,undefined,'MEDIUM'); }
        catch(e){ doc.setFillColor(230,230,240); doc.rect(bx,y,iW,iH,'F'); }
        col++; if(col>=2){col=0;y+=iH+6;}
      }
      if(col>0) y+=iH+6;
      y+=4;
    }
  }

  checkPage(30); y+=10;
  doc.setDrawColor(...CGR); doc.setLineWidth(0.3);
  doc.line(margin,y,margin+70,y); doc.line(pageW-margin-70,y,pageW-margin,y);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...CGR);
  doc.text('Firma RSPP',margin+35,y+5,{align:'center'});
  doc.text('Firma Resp. Cantiere',pageW-margin-35,y+5,{align:'center'});

  const pages=doc.internal.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...CGR);
    doc.text('Pagina '+i+' di '+pages,pageW-margin,290,{align:'right'});
    doc.text('CantiereSafe — Report RSPP | '+new Date().toLocaleDateString('it-IT'),margin,290);
    doc.setDrawColor(...CA); doc.setLineWidth(0.4); doc.line(margin,287,pageW-margin,287);
  }
  doc.save('sopralluogo_'+(s.azienda||'cantiere').replace(/[^a-z0-9]/gi,'_')+'_'+(s.data||'data')+'.pdf');
  toast('PDF esportato ✓', 'success');
}

async function exportTXT() {
  const id = exportTargetId || allSopralluoghi[0]?.id;
  if (!id) { toast('Nessun sopralluogo', 'error'); return; }
  const s = await db.sopralluoghi.get(id);
  if (!s) return;
  const visibili=(s.checklist||[]).filter(c=>!c.nascosta&&c.testo);
  const si=visibili.filter(c=>c.valore==='SI').length;
  const no=visibili.filter(c=>c.valore==='NO').length;
  const na=visibili.filter(c=>c.valore==='NA').length;
  const luogoLabel={cantiere:'Cantiere',azienda:'Azienda',edificio:'Edificio'}[s.luogo]||s.luogo||'N/D';
  let txt='VERBALE DI SOPRALLUOGO — CANTIERE SAFE\n'+'='.repeat(55)+'\n\n';
  txt+='Azienda          : '+(s.azienda||'N/D')+'\n';
  txt+='Tipo Luogo       : '+luogoLabel+'\n';
  txt+='Cantiere         : '+(s.cantiere||'N/D')+'\n';
  txt+='Indirizzo        : '+(s.indirizzo||'N/D')+'\n';
  txt+='RSPP             : '+(s.rspp||'N/D')+'\n';
  txt+='Data Ispezione   : '+formatDate(s.data)+'\n';
  txt+='Rischio Generale : '+((s.rischioGenerale||'N/D').toUpperCase())+'\n\n';
  txt+='RIEPILOGO\n'+'─'.repeat(35)+'\n';
  txt+='Conformi: '+si+' / Non Conformi: '+no+' / N.A.: '+na+'\n\n';
  if(s.noteLibere) txt+='NOTE LIBERE\n'+'─'.repeat(35)+'\n'+s.noteLibere+'\n\n';
  txt+='CHECKLIST\n'+'─'.repeat(55)+'\n';
  const cats=[...new Set((s.checklist||[]).map(c=>c.categoria))];
  cats.forEach(cat=>{
    const items=(s.checklist||[]).filter(c=>c.categoria===cat&&!c.nascosta&&c.testo);
    if(!items.length) return;
    txt+='\n['+cat.toUpperCase()+']\n';
    items.forEach(c=>{
      txt+='  ['+(c.valore.padEnd(3))+'] '+c.testo+'\n';
      if(c.commento) txt+='         💬 '+c.commento+'\n';
      if(c.foto?.length) txt+='         📷 '+c.foto.length+' foto allegate\n';
    });
  });
  txt+='\n'+'='.repeat(55)+'\nGenerato il '+new Date().toLocaleString('it-IT')+'\nCantiereSafe — Gestione Sopralluoghi RSPP\n';
  downloadText(txt,'sopralluogo_'+(s.azienda||'cantiere').replace(/[^a-z0-9]/gi,'_')+'_'+(s.data||'data')+'.txt','text/plain');
  toast('TXT esportato ✓', 'success');
}

async function exportDOC() {
  const id = exportTargetId || allSopralluoghi[0]?.id;
  if (!id) { toast('Nessun sopralluogo', 'error'); return; }
  const s = await db.sopralluoghi.get(id);
  if (!s) return;
  const visibili=(s.checklist||[]).filter(c=>!c.nascosta&&c.testo);
  const si=visibili.filter(c=>c.valore==='SI').length;
  const no=visibili.filter(c=>c.valore==='NO').length;
  const luogoLabel={cantiere:'🏗 Cantiere',azienda:'🏢 Azienda',edificio:'🏠 Edificio'}[s.luogo]||s.luogo||'N/D';
  const checklistRows=visibili.map(c=>{
    const col={SI:'#16a34a',NO:'#dc2626',NA:'#64748b'}[c.valore]||'#64748b';
    const fotoNote=c.foto?.length?'<br><span style="font-size:10px;color:#f59e0b">📷 '+c.foto.length+' foto allegate</span>':'';
    return '<tr><td style="padding:5px 8px;font-size:12px;">'+escHtml(c.testo)+(c.commento?'<br><span style="font-size:11px;color:#64748b;font-style:italic;">💬 '+escHtml(c.commento)+'</span>':'')+fotoNote+'</td><td style="padding:5px 8px;text-align:center;font-weight:bold;color:'+col+';font-size:12px;">'+c.valore+'</td></tr>';
  }).join('');
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial;color:#1e2832;margin:32px}h1{color:#b45309;font-size:22px;border-bottom:3px solid #f59e0b;padding-bottom:8px}h2{font-size:15px;background:#f1f5f9;padding:6px 10px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1e2832;color:white;padding:7px 10px;text-align:left;font-size:12px}td{border-bottom:1px solid #e2e8f0}</style></head><body>'
    +'<h1>CANTIERE SAFE — Verbale di Sopralluogo</h1>'
    +'<p><b>Azienda:</b> '+escHtml(s.azienda||'N/D')+' &nbsp; <b>Tipo:</b> '+luogoLabel+' &nbsp; <b>Data:</b> '+formatDate(s.data)+' &nbsp; <b>RSPP:</b> '+escHtml(s.rspp||'N/D')+'</p>'
    +'<p><b>Rischio:</b> '+(s.rischioGenerale||'N/D').toUpperCase()+' &nbsp; <b>Conformi:</b> '+si+' &nbsp; <b>Non Conformi:</b> '+no+'</p>'
    +(s.noteLibere?'<h2>NOTE LIBERE</h2><p style="font-size:13px;line-height:1.7;white-space:pre-wrap">'+escHtml(s.noteLibere)+'</p>':'')
    +'<h2>CHECKLIST</h2><table><thead><tr><th>Punto di Controllo</th><th style="width:80px;text-align:center">Esito</th></tr></thead><tbody>'+checklistRows+'</tbody></table>'
    +'<p style="margin-top:32px;font-size:11px;color:#64748b">Generato il '+new Date().toLocaleString('it-IT')+' — CantiereSafe RSPP</p>'
    +'</body></html>';
  downloadText(html,'sopralluogo_'+(s.azienda||'cantiere').replace(/[^a-z0-9]/gi,'_')+'_'+(s.data||'data')+'.doc','application/msword');
  toast('.doc esportato ✓', 'success');
}

function downloadText(content, filename, mimeType) {
  const blob = new Blob([content], {type:mimeType});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function renderSettings() {
  db.sopralluoghi.count().then(n => { document.getElementById('settings-count').textContent = n; });
}

async function clearAllData() {
  if (!confirm('ATTENZIONE: Eliminare TUTTI i sopralluoghi?')) return;
  if (!confirm('Sei sicuro? Operazione irreversibile.')) return;
  await db.sopralluoghi.clear();
  toast('Dati eliminati', 'error');
  allSopralluoghi = [];
  await loadHome();
}

document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW:', e));
  }
  const dot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  function updateOnlineStatus() {
    const online = navigator.onLine;
    dot.className = 'status-dot' + (online ? '' : ' offline');
    statusText.textContent = online ? 'Connesso — dati salvati offline' : 'Offline — modalità locale attiva';
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      if (v === 'nuovo') { initNuovoForm(); return; }
      if (v === 'export') { exportTargetId = null; showView('export'); return; }
      if (v === 'settings') { renderSettings(); showView('settings'); return; }
      showView(v);
      if (v === 'home') loadHome();
    });
  });

  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox' || e.target.id === 'lightbox-close') {
      document.getElementById('lightbox').classList.remove('open');
    }
  });

  await loadHome();
  showView('home');
  initVoice();
});