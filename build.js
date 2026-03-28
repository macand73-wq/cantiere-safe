// build.js — Script di build per Netlify
const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8');

code = code.replace(
  'INSERISCI_QUI_IL_PROJECT_URL',
  process.env.SUPABASE_URL || ''
);

code = code.replace(
  'INSERISCI_QUI_LA_ANON_KEY',
  process.env.SUPABASE_ANON_KEY || ''
);

fs.writeFileSync('app.js', code, 'utf8');
console.log('Build completato! Variabili iniettate.');