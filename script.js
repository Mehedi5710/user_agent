// UA Studio — History + Fresh generation + local uniqueness
// Author: improved example for Mehedi5710
// Notes:
// - History and generated UAs are stored in localStorage (persist toggled in UI).
// - New generation archives current displayed session (if any) into history.
// - Global uniqueness avoids repeating UAs across history + current session.
// - Optionally append a uniqueness token (timestamp or uuid) to each UA.

const STORAGE_KEY = 'ua_studio_list_v2';        // global set stored (for fast check)
const HISTORY_KEY = 'ua_studio_history_v1';     // array of sessions

// DOM
const quantityEl = document.getElementById('quantity');
const deviceGrid = document.getElementById('deviceGrid');
const uaTypeEl = document.getElementById('uaType');
const localeEl = document.getElementById('locale');
const includeTimeEl = document.getElementById('includeTime');
const uniqueTokenEl = document.getElementById('uniqueToken');
const persistEl = document.getElementById('persist');
const generateBtn = document.getElementById('generate');
const clearBtn = document.getElementById('clear');
const outputEl = document.getElementById('output');
const progressBar = document.getElementById('progressBar');
const statsEl = document.getElementById('stats');
const presetEl = document.getElementById('preset');
const searchEl = document.getElementById('search');
const copyAllBtn = document.getElementById('copyAll');
const downloadBtn = document.getElementById('download');
const resetAllBtn = document.getElementById('resetAll');
const historyListEl = document.getElementById('historyList');
const restoreLastBtn = document.getElementById('restoreLast');

// Data structures
let generatedSet = new Set();   // includes all UAs ever generated & saved locally
let currentSession = [];        // array of UAs currently displayed (this session)
let history = [];               // array of {id, createdAt, count, uas}

// DEVICE DB
const DEVICE_DB = [
  {id:'iphone14', label:'iPhone 14', model:'iPhone14,5', icon:'phone'},
  {id:'iphone13', label:'iPhone 13', model:'iPhone13,2', icon:'phone'},
  {id:'iphone12', label:'iPhone 12', model:'iPhone12,1', icon:'phone'},
  {id:'ipad', label:'iPad Air', model:'iPad13,1', icon:'tablet'},
  {id:'pixel7', label:'Pixel 7', model:'Pixel 7', icon:'android'},
  {id:'pixel6', label:'Pixel 6', model:'Pixel 6', icon:'android'},
  {id:'samsung_s22', label:'Galaxy S22', model:'SM-S901U', icon:'android'},
  {id:'oneplus9', label:'OnePlus 9', model:'OnePlus9', icon:'android'},
  {id:'redmi', label:'Redmi Note 11', model:'Redmi Note 11', icon:'android'}
];
let activeDevice = DEVICE_DB[0].model;

// version pools
const IOS_VERS = ['15_1','15_6','16_0','16_4','16_5','17_0'];
const IOS_WEBKIT_MAP = {
  '15': ['605.1.15','605.1.33'],
  '16': ['606.1.36','608.1.40'],
  '17': ['610.1.45']
};
const ANDROID_VERS = ['11','12','13','14'];
const CHROME_MAJOR = ['100','101','102','103','104','105','106','107','108','109','110','111','112','113','114','115','116','117','118','119','120','121','122','123','124','125'];
const LOCALES = ['en_US','en_GB','fr_FR','de_DE','es_ES','pt_BR','hi_IN','zh_CN','ja_JP'];

// helpers
function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function randomBuild(len=6){ let s=''; for(let i=0;i<len;i++) s+=randInt(0,9); return s; }
function uuidv4(){
  // simple & safe UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}
function nowISO(){ return new Date().toISOString(); }

// Storage helpers
function loadState(){
  try{
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    generatedSet = new Set(Array.isArray(arr) ? arr : []);
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history = Array.isArray(h) ? h : [];
    // ensure generatedSet includes all UAs from history (safety)
    history.forEach(s => {
      if(Array.isArray(s.uas)) s.uas.forEach(u => generatedSet.add(u));
    });
  }catch(e){
    console.warn('loadState error', e);
    generatedSet = new Set();
    history = [];
  }
}

function saveState(){
  if(persistEl.checked){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(generatedSet)));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }catch(e){
      console.warn('saveState error', e);
    }
  }
}

// UI rendering
function renderDevices(){
  deviceGrid.innerHTML = '';
  DEVICE_DB.forEach(d=>{
    const btn = document.createElement('button');
    btn.className = 'device-chip' + (d.model===activeDevice ? ' active' : '');
    btn.type = 'button';
    btn.title = d.label;
    btn.innerHTML = `${deviceIcon(d.icon)}<span>${d.label}</span>`;
    btn.addEventListener('click', ()=> {
      activeDevice = d.model;
      document.querySelectorAll('.device-chip').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
    });
    deviceGrid.appendChild(btn);
  });
}
function deviceIcon(kind){
  if(kind==='tablet') return `<svg viewBox="0 0 24 24" width="18" height="18"><rect x="4" y="3" width="16" height="18" rx="2" fill="currentColor" opacity="0.9"/></svg>`;
  if(kind==='android') return `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 10v6h2v-6H7zm8 0v6h2v-6h-2zM12 2c-1 0-2 .9-2 2v1H7c-1.1 0-2 .9-2 2v2h14V7c0-1.1-.9-2-2-2h-3V4c0-1.1-1-2-2-2z" fill="currentColor"/></svg>`;
  return `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2l3 6h6l-5 4 2 6-6-3-6 3 2-6-5-4h6z" fill="currentColor"/></svg>`;
}

// HISTORY UI
function renderHistory(){
  historyListEl.innerHTML = '';
  if(history.length === 0){
    historyListEl.innerHTML = '<div class="muted" style="padding:8px">No history yet — generations you make will appear here.</div>';
    return;
  }
  // newest first
  const list = [...history].reverse();
  list.forEach(s => {
    const row = document.createElement('div');
    row.className = 'history-row';
    const left = document.createElement('div');
    left.innerHTML = `<div><strong>${s.count} UA(s)</strong></div><small>${new Date(s.createdAt).toLocaleString()}</small>`;
    const right = document.createElement('div');
    right.className = 'history-actions';
    const viewBtn = document.createElement('button');
    viewBtn.className = 'small';
    viewBtn.textContent = 'View';
    viewBtn.addEventListener('click', ()=> viewSession(s.id));
    const exportBtn = document.createElement('button');
    exportBtn.className = 'small';
    exportBtn.textContent = 'Export';
    exportBtn.addEventListener('click', ()=> exportSessionCSV(s.id));
    const delBtn = document.createElement('button');
    delBtn.className = 'small danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', ()=> deleteSession(s.id));
    right.appendChild(viewBtn);
    right.appendChild(exportBtn);
    right.appendChild(delBtn);
    row.appendChild(left);
    row.appendChild(right);
    historyListEl.appendChild(row);
  });
}

function viewSession(id){
  const s = history.find(x => x.id === id);
  if(!s) return alert('Session not found');
  // show in output area but do NOT change currentSession or generatedSet
  outputEl.value = s.uas.join('\n');
  statsEl.textContent = `Viewing archived session from ${new Date(s.createdAt).toLocaleString()} — ${s.count} UA(s)`;
}

// export
function exportSessionCSV(id){
  const s = history.find(x => x.id === id);
  if(!s) return alert('Session not found');
  const csv = 'ua\n' + s.uas.map(u => `"${u.replace(/"/g,'""')}"`).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ua_session_${id}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// delete session (remove its UAs from generatedSet and from history)
function deleteSession(id){
  if(!confirm('Delete this session from history? This will free its UAs for reuse locally.')) return;
  const idx = history.findIndex(h => h.id === id);
  if(idx === -1) return;
  // remove UAs from generatedSet
  const s = history[idx];
  if(Array.isArray(s.uas)){
    s.uas.forEach(u => generatedSet.delete(u));
  }
  history.splice(idx,1);
  saveState();
  renderHistory();
  statsEl.textContent = `Deleted session ${id}.`;
  // if currently viewing that session in output, clear
  if(outputEl.value && outputEl.value.split('\n').length === s.count && outputEl.value.includes(s.uas[0] || '')){
    outputEl.value = '';
  }
}

// restore last archived to output (preview)
function restoreLast(){
  if(history.length === 0) return alert('No history to restore');
  const last = history[history.length-1];
  viewSession(last.id);
}

// archive currentSession into history (if non-empty). Does NOT remove them from generatedSet (we keep uniqueness)
function archiveCurrentSession(){
  if(currentSession.length === 0) return null;
  const id = 's-' + Date.now() + '-' + Math.floor(Math.random()*10000);
  const sess = {
    id,
    createdAt: Date.now(),
    count: currentSession.length,
    uas: [...currentSession]
  };
  history.push(sess);
  saveState();
  renderHistory();
  return sess;
}

// UA generation functions (map versions, realistic fields)
function genIOSUA({deviceModel, iosVersion, includeTime, locale, fbInApp, fbVersion, uniqueToken}){
  const shortMajor = iosVersion.split('_')[0] || '15';
  const webkitList = IOS_WEBKIT_MAP[shortMajor] || IOS_WEBKIT_MAP['15'];
  const webkit = choice(webkitList);
  const safariVersion = `${shortMajor}.0`;
  const mobileBuild = `${randInt(10,40)}${String.fromCharCode(65+randInt(0,20))}${randInt(100,999)}`;
  let uaBase = `Mozilla/5.0 (${deviceModel.includes('iPad') ? 'iPad' : 'iPhone'}; CPU ${deviceModel.includes('iPad') ? 'iPad' : 'iPhone'} OS ${iosVersion} like Mac OS X) AppleWebKit/${webkit} (KHTML, like Gecko) Version/${safariVersion} Mobile/${mobileBuild} Safari/${webkit}`;
  // append tokens realistically
  if(fbInApp){
    const fbav = fbVersion || `${randInt(350,460)}.${randInt(0,9)}.${randInt(0,99)}`;
    const fbbv = randomBuild(8);
    const fbmd = deviceModel.replace(',', '');
    const fbLocale = (locale && locale!=='auto') ? locale : choice(LOCALES);
    let fbToken = `[FBAN/FBIOS;FBAV/${fbav};FBBV/${fbbv};FBDV/${deviceModel};FBMD/${fbmd};FBLC/${fbLocale.replace('_','-')};FBOP/5]`;
    if(uniqueToken && uniqueToken !== 'none'){
      const tok = uniqueToken === 'uuid' ? uuidv4() : String(Date.now());
      fbToken = fbToken.replace(/\]$/, `;FBU/${tok}]`);
    } else if(includeTime){
      fbToken = fbToken.replace(/\]$/, `;FBU/${Date.now()}]`);
    }
    uaBase = `${uaBase} ${fbToken}`;
    return uaBase;
  }
  // non-fb append
  if(uniqueToken && uniqueToken !== 'none'){
    const tok = uniqueToken === 'uuid' ? uuidv4() : String(Date.now());
    uaBase = `${uaBase} [uid=${tok}]`;
  } else if(includeTime){
    uaBase = `${uaBase} [t=${Date.now()}]`;
  }
  return uaBase;
}

function genAndroidUA({deviceModel, androidVersion, includeTime, locale, fbInApp, fbVersion, uniqueToken}){
  const build = ['TP1A','SKQ1','SP1A','TQ1A'][randInt(0,3)] + '.' + randomBuild(3);
  const chromeMajor = choice(CHROME_MAJOR);
  const chromeFull = `${chromeMajor}.0.${randInt(1000,8500)}.${randInt(10,300)}`;
  let uaBase = `Mozilla/5.0 (Linux; Android ${androidVersion}; ${deviceModel} Build/${build}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeFull} Mobile Safari/537.36`;
  if(fbInApp){
    const fbav = fbVersion || `${randInt(300,460)}.0.${randInt(0,99)}.${randInt(0,999)}`;
    let fbToken = `[FB_IAB/FB4A;FBAV/${fbav};FBLR/${(locale && locale!=='auto') ? locale : choice(LOCALES)}]`;
    if(uniqueToken && uniqueToken !== 'none'){
      const tok = uniqueToken === 'uuid' ? uuidv4() : String(Date.now());
      fbToken = fbToken.replace(/\]$/, `;FBU/${tok}]`);
    } else if(includeTime){
      fbToken = fbToken.replace(/\]$/, `;FBU/${Date.now()}]`);
    }
    uaBase = `${uaBase} ${fbToken}`;
    return uaBase;
  }
  if(uniqueToken && uniqueToken !== 'none'){
    const tok = uniqueToken === 'uuid' ? uuidv4() : String(Date.now());
    uaBase = `${uaBase} [uid=${tok}]`;
  } else if(includeTime){
    uaBase = `${uaBase} [t=${Date.now()}]`;
  }
  return uaBase;
}

// decide platform by activeDevice string (simple)
function isIOSModel(model){
  return model.toLowerCase().includes('iphone') || model.toLowerCase().includes('ipad');
}

// generate one UA (uses global uniqueness check)
function generateOne(opts){
  const uaType = opts.uaType === 'mixed' ? choice(['fb','chrome','safari']) : opts.uaType;
  const locale = opts.locale === 'auto' ? choice(LOCALES) : opts.locale;
  const uniqueToken = opts.uniqueToken;
  if(isIOSModel(activeDevice)){
    const model = activeDevice;
    const iosVersion = choice(IOS_VERS);
    const fbInApp = uaType === 'fb' || (uaType === 'mixed' && Math.random()<0.6);
    return genIOSUA({deviceModel: model, iosVersion, includeTime: opts.includeTime, locale, fbInApp, fbVersion: opts.fbVersion, uniqueToken});
  } else {
    const model = activeDevice;
    const androidVersion = choice(ANDROID_VERS);
    const fbInApp = uaType === 'fb' || (uaType === 'mixed' && Math.random()<0.6);
    return genAndroidUA({deviceModel: model, androidVersion, includeTime: opts.includeTime, locale, fbInApp, fbVersion: opts.fbVersion, uniqueToken});
  }
}

// Core generation (archives current session, clears output, generates new unique batch)
async function generateMany(n, opts){
  // Archive existing currentSession into history if any
  if(currentSession.length > 0){
    archiveCurrentSession();
    // keep their UAs in generatedSet so uniqueness is preserved
  }

  // Clear current session and UI
  currentSession = [];
  outputEl.value = '';
  statsEl.textContent = 'Generating...';
  generateBtn.classList.add('loading');

  const results = [];
  const MAX_TRIES = Math.max(20000, n * 50);
  let tries = 0;
  while(results.length < n && tries < MAX_TRIES){
    tries++;
    const ua = generateOne(opts);
    if(!generatedSet.has(ua)){
      generatedSet.add(ua);
      results.push(ua);
      currentSession.push(ua);
    }
    // progress update
    if(tries % 8 === 0){
      const pct = Math.min(100, Math.round((results.length / n) * 100));
      progressBar.style.width = pct + '%';
      // yield to UI for responsiveness
      await new Promise(r => setTimeout(r, 6));
    }
  }

  if(tries >= MAX_TRIES){
    console.warn('Reached retry limit while ensuring uniqueness. Generated:', results.length);
    statsEl.textContent = `Generated ${results.length} unique (retry limit)`;
  } else {
    statsEl.textContent = `Generated ${results.length} unique UAs`;
  }

  // Display results in output
  outputEl.value = currentSession.join('\n');

  // Save state (history and global set)
  saveState();

  // finalize UI
  generateBtn.classList.remove('loading');
  progressBar.style.width = '100%';
  setTimeout(()=>progressBar.style.width = '0%', 600);
  renderHistory();
  return results;
}

// UI wiring
generateBtn.addEventListener('click', ()=>{
  const q = Math.max(1, Math.min(5000, parseInt(quantityEl.value || '1', 10)));
  const opts = {
    uaType: uaTypeEl.value,
    locale: localeEl.value,
    includeTime: includeTimeEl.checked,
    fbVersion: null,
    uniqueToken: uniqueTokenEl.value
  };
  // apply presets quickly
  const preset = presetEl.value;
  if(preset === 'fb_latest'){ opts.uaType = 'fb'; opts.locale = 'auto'; }
  if(preset === 'fb_europe'){ opts.uaType = 'fb'; opts.locale = 'en_GB'; }
  if(preset === 'fb_india'){ opts.uaType = 'fb'; opts.locale = 'hi_IN'; }
  if(preset === 'chrome_new'){ opts.uaType = 'chrome'; }
  if(preset === 'safari_new'){ opts.uaType = 'safari'; }
  generateMany(q, opts);
});

clearBtn.addEventListener('click', ()=>{
  // Clear only the output/currentSession (archive to history already done by generate)
  currentSession = [];
  outputEl.value = '';
  statsEl.textContent = 'Output cleared';
});

copyAllBtn.addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(outputEl.value);
    alert('Copied output to clipboard');
  }catch(e){
    alert('Copy failed: ' + (e.message || e));
  }
});

downloadBtn.addEventListener('click', ()=>{
  const data = outputEl.value ? outputEl.value.split('\n') : [];
  if(data.length === 0){ alert('No UAs to download'); return; }
  const csv = 'ua\n' + data.map(u => `"${u.replace(/"/g,'""')}"`).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `user_agents_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

resetAllBtn.addEventListener('click', ()=>{
  if(!confirm('Reset ALL local storage (history + global set)? This cannot be undone.')) return;
  generatedSet.clear();
  history = [];
  currentSession = [];
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(HISTORY_KEY);
  outputEl.value = '';
  renderHistory();
  statsEl.textContent = 'Storage reset';
});

searchEl.addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  if(!q) {
    outputEl.value = currentSession.join('\n');
    return;
  }
  const filtered = currentSession.filter(u => u.toLowerCase().includes(q));
  outputEl.value = filtered.join('\n');
});

restoreLastBtn.addEventListener('click', restoreLast);

// initialize
function init(){
  loadState();
  renderDevices();
  renderHistory();
  // try to load last current session (not persisted unless user kept it)
  // If there is no currentSession and generatedSet has items, we don't auto-populate currentSession (makes UI fresh).
  if(history.length > 0){
    statsEl.textContent = `History: ${history.length} session(s), ${generatedSet.size} unique UAs stored locally.`;
  } else {
    statsEl.textContent = `Ready — ${generatedSet.size} UAs remembered locally.`;
  }
}

// Pre-generate example if nothing exists (makes first-run pleasant)
init();
if(generatedSet.size === 0 && history.length === 0){
  // small seed run to show UI, archived automatically on next generation
  (async ()=>{
    await generateMany(6, {uaType:'fb', locale:'auto', includeTime:true, uniqueToken:'none'});
  })();
}