// ─────────────────────────────────────────────
//  CantiereSafe — app.js v1.2
//  Offline-First PWA per Sopralluoghi RSPP
// ─────────────────────────────────────────────

const db = new Dexie('CantiereSafeDB');
db.version(1).stores({
  sopralluoghi: '++id, azienda, data, createdAt, updatedAt',
  settings: 'key'
});

const CHECKLIST_TEMPLATE = [
  {id:'c01',testo:'Lavoratori dotati di elmetto protettivo',categoria:'DPI'},
  {id:'c02',testo:'Uso di scarpe antinfortunistiche',categoria:'DPI'},
  {id:'c03',testo:'Imbragature e sistemi anticaduta presenti',categoria:'DPI'},
  {id:'c04',testo:'Guanti da lavoro idonei alla mansione',categoria:'DPI'},
  {id:'c05',testo:'Indumenti ad alta visibilità indossati',categoria:'DPI'},
  {id:'c06',testo:'Ponteggi con parapetti regolamentari (>2m)',categoria:'Lavori in quota'},
  {id:'c07',testo:'Scale a pioli fissate e in buone condizioni',categoria:'Lavori in quota'},
  {id:'c08',testo:'Reti di protezione installate dove necessario',categoria:'Lavori in quota'},
  {id:'c09',testo:'Macchine con protezioni e ripari funzionanti',categoria:'Macchine'},
  {id:'c10',testo:'Revisioni e collaudi aggiornati',categoria:'Macchine'},
  {id:'c11',testo:'Operatori abilitati per uso macchine',categoria:'Macchine'},
  {id:'c12',testo:'Impianto elettrico di cantiere a norma CEI 64-8',categoria:'Elettrico'},
  {id:'c13',testo:'Quadri elettrici protetti e chiusi a chiave',categoria:'Elettrico'},
  {id:'c14',testo:'Cavi senza danneggiamenti visibili',categoria:'Elettrico'},
  {id:'c15',testo:'Estintori presenti, accessibili e revisionati',categoria:'Emergenza'},
  {id:'c16',testo:'Vie di evacuazione libere e segnalate',categoria:'Emergenza'},
  {id:'c17',testo:'Cassetta di pronto soccorso completa',categoria:'Emergenza'},
  {id:'c18',testo:'Piano di emergenza affisso e noto ai lavoratori',categoria:'Emergenza'},
  {id:'c19',testo:'Cantiere in ordine, passaggi liberi',categoria:'Ordine'},
  {id:'c20',testo:'Rifiuti e materiali di risulta smaltiti',categoria:'Ordine'},
  {id:'c21',testo:'Segnaletica di sicurezza presente e leggibile',categoria:'Ordine'},
  {id:'c22',testo:'PSC / POS presenti in cantiere',categoria:'Documenti'},
  {id:'c23',testo:'Notifica preliminare affissa',categoria:'Documenti'},
  {id:'c24',testo:'Registro infortuni aggiornato',categoria:'Documenti'},
];

let currentView = 'home';
let currentSopralluogo = null;
let currentDetailId = null;
let allSopralluoghi = [];
let recognition = null;
let isRecording = false;
let photoIdCounter = 0;
let chkPhotoCounters = {};

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

// ── COMPRESSIONE FOTO ──
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

// ── HOME ──
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
    const tot = s.checklist?.length || 0;
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

// ── NUOVO FORM ──
function initNuovoForm() {
  currentSopralluogo = {
    azienda:'', cantiere:'', indirizzo:'', rspp:'', luogo:'cantiere',
    data: new Date().toISOString().split('T')[0],
    rischioGenerale:'medio',
    noteLibere:'', dettatura:'',
    checklist: CHECKLIST_TEMPLATE.map(t => ({...t, valore:'NA', commento:'', foto:[]})),
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

// ── CHECKLIST ──
function renderChecklist() {
  const cats = [...new Set(CHECKLIST_TEMPLATE.map(c => c.categoria))];
  const container = document.getElementById('checklist-container');
  container.innerHTML = cats.map(cat => {
    const items = currentSopralluogo.checklist.filter(c => c.categoria === cat);
    return `
      <div class="card-title" style="margin-top:12px;margin-bottom:6px;">
        <span>▶</span>${escHtml(cat)}
      </div>
      ${items.map(item => `
        <div class="checklist-item" id="chkitem-${item.id}">
          <div class="checklist-item-text">${escHtml(item.testo)}</div>
          <div class="tri-toggle">
            <input type="radio" name="chk-${item.id}" id="${item.id}-si" value="SI" ${item.valore==='SI'?'checked':''} onchange="setCheck('${item.id}','SI')">
            <label for="${item.id}-si">SI</label>
            <input type="radio" name="chk-${item.id}" id="${item.id}-no" value="NO" ${item.valore==='NO'?'checked':''} onchange="setCheck('${item.id}','NO')">
            <label for="${item.id}-no">NO</label>
            <input type="radio" name="chk-${item.id}" id="${item.id}-na" value="NA" ${item.valore==='NA'?'checked':''} onchange="setCheck('${item.id}','NA')">
            <label for="${item.id}-na">N.A.</label>
          </div>
          <input
            type="text"
            class="commento-input"
            placeholder="Nota..."
            value="${escHtml(item.commento || '')}"
            oninput="setCommento('${item.id}', this.value)"
          >
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
        </div>`).join('')}`;
  }).join('');
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

// ── FOTO GENERALI ──
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

// ── VOICE ──
function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    document.getElementById('voice-btn').disabled = true;
    document.getElementById('voice-text').textContent = 'Dettatura non supportata su questo browser';
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
    toast('Dettatura aggiunta alle note ✓', 'success');
  }
}

// ── SALVA ──
async function saveSopralluogo() {
  ['azienda','cantiere','indirizzo','rspp','data','luogo','rischioGenerale','noteLibere'].forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) currentSopralluogo[f] = el.value;
  });
  if (!currentSopralluogo.azienda.trim()) { toast('Inserisci il nome dell\'azienda/cantiere', 'error'); return; }
  if (!currentSopralluogo.data) { toast('Inserisci la data del sopralluogo', 'error'); return; }
  currentSopralluogo.updatedAt = new Date().toISOString();
  try {
    if (currentSopralluogo.id) {
      await db.sopralluoghi.update(currentSopralluogo.id, currentSopralluogo);
      toast('Sopralluogo aggiornato ✓', 'success');
    } else {
      const id = await db.sopralluoghi.add(currentSopralluogo);
      currentSopralluogo.id = id;
      toast('Sopralluogo salvato ✓', 'success');
    }
    await loadHome();
    showView('home');
  } catch(err) { toast('Errore: ' + err.message, 'error'); }
}

// ── DETTAGLIO ──
async function openDetail(id) {
  const s = await db.sopralluoghi.get(id);
  if (!s) return;
  currentDetailId = id;
  currentDetailFotos = s.foto || [];
  const si = s.checklist?.filter(c => c.valore === 'SI').length || 0;
  const no = s.checklist?.filter(c => c.valore === 'NO').length || 0;
  const na = s.checklist?.filter(c => c.valore === 'NA').length || 0;
  const luogoIcon = {cantiere:'🏗', azienda:'🏢', edificio:'🏠'}[s.luogo] || '📍';
  const photosHtml = (s.foto || []).map(p =>
    `<img class="photo-thumb" src="${p.dataUrl}" onclick="openLightbox('${p.id}')">`
  ).join('');
  const cats = [...new Set(CHECKLIST_TEMPLATE.map(c => c.categoria))];
  const checklistHtml = cats.map(cat => {
    const items = (s.checklist || []).filter(c => c.categoria === cat);
    if (!items.length) return '';
    const colorMap = {SI:'#22c55e', NO:'#ef4444', NA:'#64748b'};
    return `<div class="card-title" style="margin-top:12px;margin-bottom:6px;"><span>▶</span>${escHtml(cat)}</div>
      ${items.map(c => `
        <div class="checklist-item">
          <div class="checklist-item-text">${escHtml(c.testo)}</div>
          <span style="font-family:var(--font-display);font-size:13px;font-weight:800;letter-spacing:0.06em;color:${colorMap[c.valore]||'#64748b'}">${c.valore}</span>
          ${c.commento ? `<div style="width:100%;font-size:12px;color:var(--text-secondary);font-style:italic;margin-top:4px;">💬 ${escHtml(c.commento)}</div>` : ''}
          ${c.foto?.length ? `<div class="chk-foto-row" style="margin-top:6px">${c.foto.map(p=>`<img class="chk-photo-thumb" src="${p.dataUrl}" onclick="openDetailChkPhoto('${p.dataUrl}')">`).join('')}</div>` : ''}
        </div>`).join('')}`;
  }).join('');

  document.getElementById('detail-content').innerHTML = `
    <button class="back-btn" onclick="showView('home'); loadHome()">← Indietro</button>
    <div class="section-title">${escHtml(s.azienda || 'Azienda N/D')}</div>
    <div class="section-sub">${luogoIcon} ${escHtml(s.luogo||'')} — ${escHtml(s.cantiere || '')} — ${formatDate(s.data)}</div>
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
  toast('Sopralluogo eliminato', 'error');
  await loadHome();
  showView('home');
}

// ── EXPORT ──
let exportTargetId = null;

async function showExportForId(id) {
  exportTargetId = id;
  showView('export');
}

async function exportPDF() {
  const id = exportTargetId || allSopralluoghi[0]?.id;
  if (!id) { toast('Nessun sopralluogo da esportare', 'error'); return; }
  const s = await db.sopralluoghi.get(id);
  if (!s) return;
  toast('Generazione PDF...', '');
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  const margin=18, pageW=210, usableW=pageW-margin*2;
  let y = margin;
  const CH=[15,25,35],CA=[245,158,11],CG=[34,197,94],CR=[239,68,68],CGR=[100,116,139],CT=[30,40,50],CL=[248,250,252];

  function checkPage(need=20){ if(y+need>275){doc.addPage();y=margin;} }

  // Header
  doc.setFillColor(...CH); doc.rect(0,0,pageW,42,'F');
  doc.setFillColor(...CA); doc.rect(0,42,pageW,2,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.setTextColor(...CA); doc.text('CANTIERE SAFE',margin,20);
  doc.setFontSize(10); doc.setTextColor(200,210,220); doc.text('Verbale di Sopralluogo — Sicurezza sul Lavoro',margin,28);
  doc.setFontSize(9); doc.text('D.Lgs. 81/2008 — RSPP Report',margin,35);
  y=52;

  // Info box
  const luogoLabel = {cantiere:'🏗 Cantiere', azienda:'🏢 Azienda', edificio:'🏠 Edificio'}[s.luogo] || s.luogo || '';
  doc.setFillColor(245,247,250); doc.roundedRect(margin,y,usableW,42,3,3,'F');
  doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(...CT); doc.text((s.azienda||'N/D').toUpperCase(),margin+5,y+10);
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(...CGR);
  doc.text('Tipo: '+luogoLabel, margin+5,y+18);
  if(s.cantiere) doc.text('Cantiere: '+s.cantiere,margin+5,y+24);
  if(s.indirizzo) doc.text('Indirizzo: '+s.indirizzo,margin+5,y+30);
  doc.text('Data: '+formatDate(s.data),margin+5,y+37);
  if(s.rspp) doc.text('RSPP: '+s.rspp,margin+5+usableW/2,y+37);
  y+=48;

  // Riepilogo
  const si=s.checklist?.filter(c=>c.valore==='SI').length||0;
  const no=s.checklist?.filter(c=>c.valore==='NO').length||0;
  const na=s.checklist?.filter(c=>c.valore==='NA').length||0;
  const bW=(usableW-8)/3;
  [[si,CG,'CONFORMI'],[no,CR,'NON CONFORMI'],[na,CGR,'N.A.']].forEach(([v,c,l],i)=>{
    const bx=margin+i*(bW+4);
    doc.setFillColor(...c); doc.roundedRect(bx,y,bW,18,2,2,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(255,255,255); doc.text(String(v),bx+bW/2,y+11,{align:'center'});
    doc.setFontSize(7); doc.text(l,bx+bW/2,y+16,{align:'center'});
  });
  y+=24;

  if(s.rischioGenerale){
    const rC={basso:CG,medio:CA,alto:CR}[s.rischioGenerale]||CGR;
    doc.setFillColor(...rC); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(255,255,255);
    doc.roundedRect(margin,y,50,9,2,2,'F'); doc.text('RISCHIO: '+s.rischioGenerale.toUpperCase(),margin+25,y+6,{align:'center'});
    y+=14;
  } else { y+=4; }

  // Note
  if(s.noteLibere?.trim()){
    checkPage(30);
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...CA); doc.text('NOTE LIBERE',margin,y); y+=5;
    const nl=doc.splitTextToSize(s.noteLibere,usableW-8);
    doc.setFillColor(...CL); doc.roundedRect(margin,y,usableW,nl.length*4.5+6,2,2,'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...CT);
    nl.forEach((line,i)=>doc.text(line,margin+4,y+5+i*4.5));
    y+=nl.length*4.5+12;
  }

  // Checklist con foto inline se ≤2 foto per voce, altrimenti rimando
  const chkFotoRimandi = [];
  const cats=[...new Set(CHECKLIST_TEMPLATE.map(c=>c.categoria))];
  for(const cat of cats){
    checkPage(18);
    doc.setFillColor(...CH); doc.rect(margin,y,usableW,8,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(255,255,255); doc.text(cat.toUpperCase(),margin+4,y+5.5);
    y+=10;
    const items=(s.checklist||[]).filter(c=>c.categoria===cat);
    for(const item of items){
      const hasFoto = item.foto && item.foto.length > 0;
      const fotoInline = hasFoto && item.foto.length <= 2;
      const rowH = hasFoto && fotoInline ? 8 + item.foto.length * 28 : item.commento ? 14 : 8;
      checkPage(rowH + 4);
      const idx = items.indexOf(item);
      if(idx%2===0){doc.setFillColor(...CL);doc.rect(margin,y-1,usableW,rowH,'F');}
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...CT);
      doc.text(item.testo,margin+2,y+4.5);
      const vC={SI:CG,NO:CR,NA:CGR}[item.valore]||CGR;
      doc.setFillColor(...vC); doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
      doc.roundedRect(pageW-margin-16,y+0.5,16,6,1,1,'F'); doc.text(item.valore,pageW-margin-8,y+5,{align:'center'});
      let afterY = y+8;
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
          try{ doc.addImage(f.dataUrl,'JPEG',fx,afterY,fW,24,undefined,'MEDIUM'); }
          catch(e){}
          if(fi%2===1||fi===item.foto.length-1) afterY+=26;
        });
      } else if(hasFoto){
        // rimando
        const rimandoId = chkFotoRimandi.length+1;
        chkFotoRimandi.push({id:rimandoId, testo:item.testo, foto:item.foto});
        doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(...CA);
        doc.text(`📷 Vedi foto allegate — Ref. F${rimandoId}`,margin+2,afterY-1);
        afterY+=5;
      }
      y = afterY+2;
    }
    y+=4;
  }

  // Foto generali
  if(s.foto?.length){
    checkPage(30);
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...CA); doc.text('DOCUMENTAZIONE FOTOGRAFICA GENERALE',margin,y); y+=6;
    let col=0; const iW=(usableW-6)/2, iH=50;
    for(const foto of s.foto){
      checkPage(iH+10);
      const bx=margin+col*(iW+6);
      try{ doc.addImage(foto.dataUrl,'JPEG',bx,y,iW,iH,undefined,'MEDIUM'); doc.setDrawColor(200,210,220); doc.setLineWidth(0.3); doc.rect(bx,y,iW,iH); }
      catch(e){ doc.setFillColor(230,230,240); doc.rect(bx,y,iW,iH,'F'); }
      col++; if(col>=2){col=0;y+=iH+8;}
    }
    if(col>0) y+=iH+8;
  }

  // Foto rimandi checklist
  if(chkFotoRimandi.length){
    checkPage(30);
    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...CA); doc.text('FOTO ALLEGATE — VOCI CHECKLIST',margin,y); y+=6;
    for(const rimando of chkFotoRimandi){
      checkPage(20);
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...CT);
      doc.text(`F${rimando.id} — ${rimando.testo}`,margin,y); y+=6;
      let col=0; const iW=(usableW-6)/2, iH=46;
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

  // Firme
  checkPage(30);
  y+=10;
  doc.setDrawColor(...CGR); doc.setLineWidth(0.3);
  doc.line(margin,y,margin+70,y); doc.line(pageW-margin-70,y,pageW-margin,y);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...CGR);
  doc.text('Firma RSPP',margin+35,y+5,{align:'center'});
  doc.text('Firma Resp. Cantiere',pageW-margin-35,y+5,{align:'center'});

  // Footer pagine
  const pages=doc.internal.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...CGR);
    doc.text(`Pagina ${i} di ${pages}`,pageW-margin,290,{align:'right'});
    doc.text('CantiereSafe — Report RSPP | '+new Date().toLocaleDateString('it-IT'),margin,290);
    doc.setDrawColor(...CA); doc.setLineWidth(0.4); doc.line(margin,287,pageW-margin,287);
  }
  doc.save(`sopralluogo_${(s.azienda||'cantiere').replace(/[^a-z0-9]/gi,'_')}_${s.data||'data'}.pdf`);
  toast('PDF esportato ✓', 'success');
}

async function exportTXT() {
  const id = exportTargetId || allSopralluoghi[0]?.id;
  if (!id) { toast('Nessun sopralluogo', 'error'); return; }
  const s = await db.sopralluoghi.get(id);
  if (!s) return;
  const si=s.checklist?.filter(c=>c.valore==='SI').length||0;
  const no=s.checklist?.filter(c=>c.valore==='NO').length||0;
  const na=s.checklist?.filter(c=>c.valore==='NA').length||0;
  const luogoLabel={cantiere:'Cantiere',azienda:'Azienda',edificio:'Edificio'}[s.luogo]||s.luogo||'N/D';
  let txt=`VERBALE DI SOPRALLUOGO — CANTIERE SAFE\n${'='.repeat(55)}\n\n`;
  txt+=`Azienda          : ${s.azienda||'N/D'}\nTipo Luogo       : ${luogoLabel}\nCantiere         : ${s.cantiere||'N/D'}\nIndirizzo        : ${s.indirizzo||'N/D'}\nRSPP             : ${s.rspp||'N/D'}\nData Ispezione   : ${formatDate(s.data)}\nRischio Generale : ${(s.rischioGenerale||'N/D').toUpperCase()}\n\n`;
  txt+=`RIEPILOGO\n${'─'.repeat(35)}\nConformi: ${si} / Non Conformi: ${no} / N.A.: ${na}\n\n`;
  if(s.noteLibere) txt+=`NOTE LIBERE\n${'─'.repeat(35)}\n${s.noteLibere}\n\n`;
  txt+=`CHECKLIST\n${'─'.repeat(55)}\n`;
  const cats=[...new Set(CHECKLIST_TEMPLATE.map(c=>c.categoria))];
  cats.forEach(cat=>{
    txt+=`\n[${cat.toUpperCase()}]\n`;
    (s.checklist||[]).filter(c=>c.categoria===cat).forEach(c=>{
      txt+=`  [${c.valore.padEnd(3)}] ${c.testo}\n`;
      if(c.commento) txt+=`         💬 ${c.commento}\n`;
      if(c.foto?.length) txt+=`         📷 ${c.foto.length} foto allegate\n`;
    });
  });
  txt+=`\n${'='.repeat(55)}\nGenerato il ${new Date().toLocaleString('it-IT')}\nCantiereSafe — Gestione Sopralluoghi RSPP\n`;
  downloadText(txt,`sopralluogo_${(s.azienda||'cantiere').replace(/[^a-z0-9]/gi,'_')}_${s.data||'data'}.txt`,'text/plain');
  toast('TXT esportato ✓', 'success');
}

async function exportDOC() {
  const id = exportTargetId || allSopralluoghi[0]?.id;
  if (!id) { toast('Nessun sopralluogo', 'error'); return; }
  const s = await db.sopralluoghi.get(id);
  if (!s) return;
  const si=s.checklist?.filter(c=>c.valore==='SI').length||0;
  const no=s.checklist?.filter(c=>c.valore==='NO').length||0;
  const luogoLabel={cantiere:'🏗 Cantiere',azienda:'🏢 Azienda',edificio:'🏠 Edificio'}[s.luogo]||s.luogo||'N/D';
  const checklistRows=(s.checklist||[]).map(c=>{
    const col={SI:'#16a34a',NO:'#dc2626',NA:'#64748b'}[c.valore]||'#64748b';
    const fotoNote = c.foto?.length ? `<br><span style="font-size:10px;color:#f59e0b">📷 ${c.foto.length} foto allegate</span>` : '';
    return `<tr><td style="padding:5px 8px;font-size:12px;">${escHtml(c.testo)}${c.commento?`<br><span style="font-size:11px;color:#64748b;font-style:italic;">💬 ${escHtml(c.commento)}</span>`:''}${fotoNote}</td><td style="padding:5px 8px;text-align:center;font-weight:bold;color:${col};font-size:12px;">${c.valore}</td></tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial;color:#1e2832;margin:32px}h1{color:#b45309;font-size:22px;border-bottom:3px solid #f59e0b;padding-bottom:8px}h2{font-size:15px;background:#f1f5f9;padding:6px 10px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1e2832;color:white;padding:7px 10px;text-align:left;font-size:12px}td{border-bottom:1px solid #e2e8f0}</style></head><body>
  <h1>CANTIERE SAFE — Verbale di Sopralluogo</h1>
  <p><b>Azienda:</b> ${escHtml(s.azienda||'N/D')} &nbsp; <b>Tipo:</b> ${luogoLabel} &nbsp; <b>Data:</b> ${formatDate(s.data)} &nbsp; <b>RSPP:</b> ${escHtml(s.rspp||'N/D')}</p>
  <p><b>Rischio:</b> ${(s.rischioGenerale||'N/D').toUpperCase()} &nbsp; <b>Conformi:</b> ${si} &nbsp; <b>Non Conformi:</b> ${no}</p>
  ${s.noteLibere?`<h2>NOTE LIBERE</h2><p style="font-size:13px;line-height:1.7;white-space:pre-wrap">${escHtml(s.noteLibere)}</p>`:''}
  <h2>CHECKLIST</h2><table><thead><tr><th>Punto di Controllo</th><th style="width:80px;text-align:center">Esito</th></tr></thead><tbody>${checklistRows}</tbody></table>
  <p style="margin-top:32px;font-size:11px;color:#64748b">Generato il ${new Date().toLocaleString('it-IT')} — CantiereSafe RSPP</p>
  </body></html>`;
  downloadText(html,`sopralluogo_${(s.azienda||'cantiere').replace(/[^a-z0-9]/gi,'_')}_${s.data||'data'}.doc`,'application/msword');
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
  if (!confirm('Sei sicuro? I dati non potranno essere recuperati.')) return;
  await db.sopralluoghi.clear();
  toast('Tutti i dati eliminati', 'error');
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