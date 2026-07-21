// ── STATE ─────────────────────────────────────────
const ST = {
    cur:1,
    name:'',
    hh:2,
    province:'',
    freq:'weekly',

    wasteType:'',
    wasteIcon:'',
    co2Factor:0,
    wasteKg:0,

    totalCO2:0,
    totalPts:0,
    entries:[]
};

// Load saved waste selection
const savedType = localStorage.getItem("wasteType");
if (savedType) ST.wasteType = savedType;

const savedIcon = localStorage.getItem("wasteIcon");
if (savedIcon) ST.wasteIcon = savedIcon;

const savedFactor = localStorage.getItem("co2Factor");
if (savedFactor) ST.co2Factor = Number(savedFactor);

const savedKg = localStorage.getItem("wasteKg");
if (savedKg) ST.wasteKg = Number(savedKg);
const ORDER = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];

// CO2 factors (kg CO2 per kg waste) from GreenPulse_Emission_Constants
const CO2_FACTORS = {
  'Plastic':      2.0,
  'Mixed (MSW)':  1.2,
  'Organic':      0.6,
  'Paper':        0.7
};

const PMOD = {
  'Gauteng':1.0,'Mpumalanga':1.35,'Limpopo':0.95,
  'KwaZulu-Natal':0.88,'Western Cape':0.78,'Eastern Cape':0.82,
  'Free State':0.92,'Northern Cape':0.85,'North West':1.10
};
const PDESC = {
  'Gauteng':'Average Highveld grid intensity',
  'Mpumalanga':'High — major coal belt region',
  'Limpopo':'Moderate — mixed energy mix',
  'KwaZulu-Natal':'Below avg — coastal diversification',
  'Western Cape':'Lowest — renewable-heavy grid',
  'Eastern Cape':'Below avg — wind corridor',
  'Free State':'Moderate — agricultural region',
  'Northern Cape':'Below avg — solar-rich province',
  'North West':'Above avg — mining &amp; industry'
};

function calcCO2() {
  const mod = PMOD[ST.province] || 1.0;
  return +(0.62 * ST.hh * mod).toFixed(2);
}

// ── NAVIGATION ────────────────────────────────────
function goTo(n) {
  if (n === ST.cur) return;
  const fwd = ORDER.indexOf(n) > ORDER.indexOf(ST.cur);
  const from = document.getElementById('s' + ST.cur);
  const to   = document.getElementById('s' + n);

  from.classList.remove('visible');
  from.classList.add(fwd ? 'sol' : 'sor');
  to.classList.add(fwd ? 'sir' : 'sil', 'visible');

  from.addEventListener('animationend', () => from.classList.remove('sol','sor'), {once:true});
  to.addEventListener('animationend',   () => to.classList.remove('sir','sil'),   {once:true});

  ST.cur = n;
  document.querySelectorAll('.snav button').forEach((b,i) => b.classList.toggle('active', i+1===n));

  if (n===5)  updateCarbon();
  if (n===6||n===7) { updateGreeting(); if(n===6) updateSummary(); }
  if (n>=12)  updateRewards();
  if (n>=17) updateAccountInfo();
  if (n===9)  prepQtyScreen();
}

// ── ACCOUNT INFO DISPLAY ──────────────────────────
function updateAccountInfo() {
  const nm = ST.fullName || ST.name || 'Samantha Jenkins';
  const setTxt = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setTxt('acc-initial', nm.charAt(0).toUpperCase());
  setTxt('acc-name', nm);
  setTxt('acc-user', nm);
  setTxt('acc-email', ST.email || 'samantha@greenpulse.app');
  setTxt('acc-hh', (ST.hh||1) + ' ' + ((ST.hh||1)===1?'person':'people'));
  setTxt('acc-prov', ST.province || '—');
  const freqMap = { weekly:'Weekly', biweekly:'Bi-weekly', other:'Other' };
  setTxt('acc-freq', freqMap[ST.freq] || 'Weekly');

  // Password — masked by default, real value available for reveal toggle
  const pwEl = document.getElementById('acc-password');
  if (pwEl) {
    const realPw = localStorage.getItem('password') || '';
    pwEl.dataset.real = realPw;
    pwEl.dataset.visible = 'false';
    pwEl.textContent = realPw ? '•'.repeat(realPw.length) : '— (signed in via social login)';
  }
}

function togglePasswordVisibility() {
  const pwEl = document.getElementById('acc-password');
  const eye = document.getElementById('acc-password-eye');
  if (!pwEl) return;
  const real = pwEl.dataset.real || '';
  if (!real) return; // nothing to reveal (social sign-in account)

  const isVisible = pwEl.dataset.visible === 'true';
  if (isVisible) {
    pwEl.textContent = '•'.repeat(real.length);
    pwEl.dataset.visible = 'false';
    if (eye) eye.innerHTML = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
  } else {
    pwEl.textContent = real;
    pwEl.dataset.visible = 'true';
    if (eye) eye.innerHTML = '<path d="M17 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a18.5 18.5 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c7 0 11 7 11 7a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  }
}

// ── PASSWORD STRENGTH ────────────────────────────
function getPasswordChecks(pw) {
  return {
    len:     pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    num:     /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw)
  };
}

function checkPasswordStrength() {
  const pw = document.getElementById('reg-pass').value;
  const checks = getPasswordChecks(pw);
  const passedCount = Object.values(checks).filter(Boolean).length;

  const setReq = (id, met) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('met', met);
  };
  setReq('req-len', checks.len);
  setReq('req-upper', checks.upper);
  setReq('req-lower', checks.lower);
  setReq('req-num', checks.num);
  setReq('req-special', checks.special);

  const segs = [document.getElementById('pass-seg-1'), document.getElementById('pass-seg-2'), document.getElementById('pass-seg-3')];
  segs.forEach(s => s && s.classList.remove('on-weak','on-medium','on-strong'));

  const label = document.getElementById('pass-strength-label');
  if (!pw) {
    if (label) label.textContent = 'Password strength';
    return 'empty';
  }

  let level, cls;
  if (passedCount <= 2) { level = 'Weak'; cls = 'on-weak'; segs[0] && segs[0].classList.add(cls); }
  else if (passedCount <= 4) { level = 'Medium'; cls = 'on-medium'; segs[0] && segs[0].classList.add(cls); segs[1] && segs[1].classList.add(cls); }
  else { level = 'Strong'; cls = 'on-strong'; segs.forEach(s => s && s.classList.add(cls)); }

  if (label) label.textContent = 'Password strength: ' + level;
  return checks.len && checks.upper && checks.lower && checks.num && checks.special ? 'strong' : level.toLowerCase();
}

// ── REGISTER ─────────────────────────────────────
function doRegister() {
  const ne = document.getElementById('reg-name');
  const ee = document.getElementById('reg-email');
  const pe = document.getElementById('reg-pass');
  const pce = document.getElementById('reg-pass-confirm');
  const tc = document.getElementById('tc');
  const tw = document.getElementById('terms-wrap');

  let ok = true;
  if (!ne.value.trim()) { ne.style.borderColor='#e24b4a'; ne.classList.add('err-shake'); setTimeout(()=>{ne.style.borderColor='';ne.classList.remove('err-shake');},800); ne.focus(); ok=false; }
  if (!ee.value.trim()) { ee.style.borderColor='#e24b4a'; ee.classList.add('err-shake'); setTimeout(()=>{ee.style.borderColor='';ee.classList.remove('err-shake');},800); if(ok)ee.focus(); ok=false; }

  const checks = getPasswordChecks(pe.value);
  const passwordStrong = checks.len && checks.upper && checks.lower && checks.num && checks.special;
  if (!passwordStrong) {
    pe.style.borderColor='#e24b4a'; pe.classList.add('err-shake');
    setTimeout(()=>{pe.style.borderColor='';pe.classList.remove('err-shake');},800);
    if (ok) pe.focus();
    ok = false;
  }
  if (pe.value !== pce.value || !pce.value) {
    pce.style.borderColor='#e24b4a'; pce.classList.add('err-shake');
    setTimeout(()=>{pce.style.borderColor='';pce.classList.remove('err-shake');},800);
    if (ok) pce.focus();
    ok = false;
  }

  if (!tc.checked) { tw.style.borderColor='#e24b4a'; tw.classList.add('err-shake'); setTimeout(()=>{tw.style.borderColor='#c3e8d0';tw.classList.remove('err-shake');},900); ok=false; }

  if (!ok) return;
 ST.fullName = ne.value.trim();
ST.email    = ee.value.trim();
ST.name     = ST.fullName.split(' ')[0];

// Save to localStorage
localStorage.setItem("fullName", ST.fullName);
localStorage.setItem("firstName", ST.name);
localStorage.setItem("email", ST.email);
localStorage.setItem("password", pe.value);
localStorage.setItem("authProvider", "email");

goTo(4);
}

// ── HOUSEHOLD ────────────────────────────────────
function chg(d) {
    ST.hh = Math.min(12, Math.max(1, ST.hh + d));
    document.getElementById('hc').textContent = ST.hh;

    // Save the selected household size
    localStorage.setItem("householdMembers", ST.hh);
}

// Load saved household size when a page opens
document.addEventListener("DOMContentLoaded", () => {

    // Household
    const savedHH = localStorage.getItem("householdMembers");
    if (savedHH) {
        ST.hh = Number(savedHH);

        const hc = document.getElementById("hc");
        if (hc) hc.textContent = ST.hh;
    }

    // Name
    const savedFullName = localStorage.getItem("fullName");
    const savedFirstName = localStorage.getItem("firstName");
    const savedEmail = localStorage.getItem("email");

    if (savedFullName) ST.fullName = savedFullName;
    if (savedFirstName) ST.name = savedFirstName;
    if (savedEmail) ST.email = savedEmail;

    // Province & frequency
    const savedProvince = localStorage.getItem("province");
    const savedFreq = localStorage.getItem("freq");
    if (savedProvince) ST.province = savedProvince;
    if (savedFreq) ST.freq = savedFreq;

    // Load waste data
    const savedEntries = localStorage.getItem("entries");
    const savedCO2 = localStorage.getItem("totalCO2");
    const savedPts = localStorage.getItem("totalPts");
    const savedKg = localStorage.getItem("wasteKg");
  
    if (savedEntries) ST.entries = JSON.parse(savedEntries);
    if (savedCO2) ST.totalCO2 = Number(savedCO2);
    if (savedPts) ST.totalPts = Number(savedPts);
    if (savedKg) ST.wasteKg = Number(savedKg);
});

// ── PROVINCE ─────────────────────────────────────
function onProv() {
  ST.province = document.getElementById('prov').value;
  localStorage.setItem("province", ST.province);
  const noteEl = document.getElementById('pnote');
  const txtEl  = document.getElementById('ptxt');
  if (ST.province) {
    noteEl.style.display = 'flex';
    txtEl.innerHTML = '<strong>' + ST.province + '</strong> · ' + (PDESC[ST.province]||'');
  } else {
    noteEl.style.display = 'none';
  }
}

// ── FREQ TOGGLE ──────────────────────────────────
function selTog(el, v) {
  document.querySelectorAll('.to').forEach(t => t.classList.remove('sel'));
  el.classList.add('sel');
  ST.freq = v;
  localStorage.setItem("freq", v);
}

// ── CARBON SCREEN ────────────────────────────────
function updateCarbon() {

  // Load the household size that the user selected
  const savedHH = localStorage.getItem("householdMembers");
  if (savedHH) {
      ST.hh = Number(savedHH);
  }

  const perPerson = 7.19;
  const t = perPerson * ST.hh;
  const circ = 2 * Math.PI * 75; // r=75
  const pct  = Math.min(Math.max((t - 0.4) / 7.0, 0.04), 0.96);
  const arc  = circ * 0.06 + pct * circ * 0.78;

  document.getElementById('garc').setAttribute('stroke-dasharray', arc.toFixed(1) + ' ' + circ.toFixed(1));
  document.getElementById('gnum').textContent = t.toFixed(2);

  const km    = Math.round(t * 1000);
  const trees = Math.round(t * 36);
  const diff  = Math.round(Math.abs(7.8 - t) / 7.8 * 100);
  const dir   = t < 7.8 ? diff + '% below' : diff + '% above';

  document.getElementById('ekm').textContent   = km.toLocaleString('en-ZA') + ' km driving';
  document.getElementById('etree').textContent = trees + ' trees to offset';
  document.getElementById('eavg').textContent  = dir + ' SA avg of 7.8 t/yr';

  const prov = ST.province || 'your area';
  document.getElementById('s5-sub').textContent =
    'For ' + ST.hh + ' ' + (ST.hh===1?'person':'people') + ' in ' + prov + '.';
}

// ── LOGIN ─────────────────────────────────────────
function doLogin() {
  const ee = document.getElementById('login-email');
  const pe = document.getElementById('login-pass');
  const errEl = document.getElementById('login-error');

  const showErr = (msg) => {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    [ee, pe].forEach(el => {
      if (!el) return;
      el.style.borderColor = 'rgba(255,100,100,0.7)';
      el.classList.add('err-shake');
      setTimeout(()=>{ el.style.borderColor=''; el.classList.remove('err-shake'); }, 800);
    });
  };

  if (errEl) errEl.style.display = 'none';

  if (!ee.value.trim() || !pe.value.trim()) {
    showErr('Please enter your username/email and password.');
    ee.focus();
    return;
  }

  const savedEmail = localStorage.getItem('email');
  const savedFullName = localStorage.getItem('fullName');
  const savedPassword = localStorage.getItem('password');

  if (!savedEmail || !savedPassword) {
    showErr('No account found. Please create an account first.');
    return;
  }

  const entered = ee.value.trim().toLowerCase();
  const matchesEmail = entered === savedEmail.toLowerCase();
  const matchesName = savedFullName && entered === savedFullName.toLowerCase();

  if ((!matchesEmail && !matchesName) || pe.value !== savedPassword) {
    showErr('Incorrect username/email or password.');
    return;
  }

  // Credentials match — restore session
  const savedFirstName = localStorage.getItem('firstName');
  ST.name = savedFirstName || (savedFullName ? savedFullName.split(' ')[0] : '');
  ST.fullName = savedFullName || '';
  ST.email = savedEmail;

  goTo(6);
}

// ── SOCIAL SIGN-IN (simulated — no real OAuth backend in this prototype) ──
const SOCIAL_DEMO_IDENTITY = {
  google: { icon: '🔵', title: 'Continue with Google', name: 'Alex Green', email: 'alex.green@gmail.com' },
  apple:  { icon: '⚪', title: 'Continue with Apple',  name: 'Jamie Smith', email: 'jamie.smith@icloud.com' }
};
let _socialProvider = null;

function socialAuth(provider) {
  // Returning user who previously signed up with this same provider — log straight in
  const savedProvider = localStorage.getItem('authProvider');
  const savedEmail = localStorage.getItem('email');
  const savedFullName = localStorage.getItem('fullName');
  const savedFirstName = localStorage.getItem('firstName');

  if (savedProvider === provider && savedEmail) {
    ST.name = savedFirstName || (savedFullName ? savedFullName.split(' ')[0] : '');
    ST.fullName = savedFullName || '';
    ST.email = savedEmail;
    goTo(6);
    return;
  }

  // New sign-up via this provider — show simulated consent modal
  _socialProvider = provider;
  const identity = SOCIAL_DEMO_IDENTITY[provider];
  document.getElementById('social-modal-icon').textContent = identity.icon;
  document.getElementById('social-modal-title').textContent = identity.title;
  document.getElementById('social-name').value = identity.name;
  document.getElementById('social-email').value = identity.email;
  document.getElementById('social-modal').style.display = 'flex';
}

function closeSocialModal() {
  document.getElementById('social-modal').style.display = 'none';
  _socialProvider = null;
}

function confirmSocialAuth() {
  const nameEl = document.getElementById('social-name');
  const emailEl = document.getElementById('social-email');
  const fullName = nameEl.value.trim();
  const email = emailEl.value.trim();

  if (!fullName || !email) {
    [nameEl, emailEl].forEach(el => {
      el.style.borderColor = '#e24b4a';
      setTimeout(()=>{ el.style.borderColor=''; }, 800);
    });
    return;
  }

  ST.fullName = fullName;
  ST.name = fullName.split(' ')[0];
  ST.email = email;

  localStorage.setItem('fullName', ST.fullName);
  localStorage.setItem('firstName', ST.name);
  localStorage.setItem('email', ST.email);
  localStorage.setItem('authProvider', _socialProvider || '');
  // Social sign-in doesn't use a password in this app
  localStorage.removeItem('password');

  document.getElementById('social-modal').style.display = 'none';
  goTo(4); // continue into household setup, same as a normal new signup
}

// ── GREETING ─────────────────────────────────────
function updateGreeting() {
  const h = new Date().getHours();
  const g = h<12 ? 'Good morning' : h<17 ? 'Good afternoon' : 'Good evening';
  const display = ST.name ? g + ', ' + ST.name + ' 👋' : g + ' 👋';
  ['hn6','hn7'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=display; });
}

// ── EMISSION SUMMARY ──────────────────────────────
const CAT_META = {
  'Plastic':     { icon:'♻️', color:'rgba(61,199,107,0.13)' },
  'Mixed (MSW)': { icon:'🗑️', color:'rgba(255,193,7,0.11)'  },
  'Organic':     { icon:'🌿', color:'rgba(100,200,120,0.13)' },
  'Paper':       { icon:'📄', color:'rgba(100,160,255,0.11)' }
};

function updateSummary() {
  const total = ST.totalCO2;
  const pts   = ST.totalPts;
  const count = ST.entries.length;

  // arc gauge (max scale ~200 kg)
  const circ = 2 * Math.PI * 31;
  const pct  = Math.min(total / 200, 1);
  const arc  = document.getElementById('sum-arc');
  if (arc) arc.setAttribute('stroke-dasharray', (circ * pct).toFixed(1) + ' ' + circ.toFixed(1));

  const totalEl = document.getElementById('sum-total');
  if (totalEl) totalEl.textContent = total.toFixed(2);

  const tagEl = document.getElementById('sum-entries-tag');
  if (tagEl) tagEl.textContent = count + (count===1?' entry':' entries') + ' logged';

  const ptsEl = document.getElementById('sum-pts-line');
  if (ptsEl) ptsEl.textContent = '🌱 ' + pts + ' Green Points earned';

  // per-category totals
  const cats = {};
  ST.entries.forEach(e => {
    if (!cats[e.category]) cats[e.category] = 0;
    cats[e.category] += e.co2;
  });

  const bdEl = document.getElementById('sum-breakdown');
  if (bdEl) {
    if (Object.keys(cats).length === 0) {
      bdEl.innerHTML = '<div class="sc" style="grid-column:1/-1;text-align:center;padding:20px;"><p style="color:#aaa;font-size:12px;">No entries yet.<br>Tap + to log your first waste entry.</p></div>';
    } else {
      bdEl.innerHTML = Object.entries(cats).map(([cat, co2]) => {
        const m = CAT_META[cat] || { icon:'📦', color:'rgba(255,255,255,0.08)' };
        return `<div class="sc"><div class="si">${m.icon}</div><p class="sn">${co2.toFixed(1)} kg</p><p class="sl">${cat}</p></div>`;
      }).join('');
    }
  }

  // recent history list
  const hw = document.getElementById('sum-history-wrap');
  const hl = document.getElementById('sum-history');
  if (hw && hl) {
    if (ST.entries.length === 0) {
      hw.style.display = 'none';
    } else {
      hw.style.display = 'block';
      const recent = [...ST.entries].reverse().slice(0, 5);
      hl.innerHTML = recent.map(e => {
        const m = CAT_META[e.category] || { icon:'📦', color:'rgba(255,255,255,0.08)' };
        return `<div class="trow">
          <div class="tico" style="background:${m.color}">${m.icon}</div>
          <div class="ttxt"><p>${e.category} · ${e.size}</p><span>${e.kg} kg · ${e.co2.toFixed(2)} kg CO₂e</span></div>
          <span class="tpts">+${e.pts} pts</span>
        </div>`;
      }).join('');
    }
  }
}

// ── WASTE CATEGORY SELECT ─────────────────────────

function selCat(el, name, icon, factor) {
  document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  ST.wasteType = name;
  ST.wasteIcon = icon;
  ST.co2Factor = factor;
  // reset quantity
  ST.wasteKg   = 0;

  // Persist immediately — this screen reloads to screen-9.html next,
  // which wipes ST from memory and rebuilds it from localStorage.
  localStorage.setItem("wasteType", ST.wasteType);
  localStorage.setItem("wasteIcon", ST.wasteIcon);
  localStorage.setItem("co2Factor", ST.co2Factor);
  localStorage.setItem("wasteKg", ST.wasteKg);

  document.getElementById('cat-next-btn').classList.add('ready');
}


// ── POPULATE QUANTITY SCREEN ──────────────────────
function prepQtyScreen() {

    // Display selected waste category
    document.getElementById("qty-cat-label").textContent =
        ST.wasteType.toUpperCase();

    // Reset quantity
    ST.wasteKg = 0;

    // Reset slider
    const slider = document.getElementById("qty-slider");
    slider.value = 0;

    // Update display
    document.getElementById("qty-weight-val").textContent = "0.0";

    // Remove selected quick buttons
    document.querySelectorAll(".qty-quick-btn").forEach(btn => {
        btn.classList.remove("active");
    });
}

// ── SUBMIT ENTRY ──────────────────────────────────
function submitEntry() {
localStorage.setItem("wasteType", ST.wasteType);
localStorage.setItem("wasteIcon", ST.wasteIcon);
localStorage.setItem("co2Factor", ST.co2Factor);
localStorage.setItem("wasteKg", ST.wasteKg);

console.log(ST.wasteType, ST.co2Factor, ST.wasteKg);
  goTo(11);
}

// ── SHOW RESULT ───────────────────────────────────
function showResult() {
  const co2 = +(ST.wasteKg * ST.co2Factor).toFixed(2);
  const pts  = Math.max(5, Math.round(co2 * 1.5));

  // save to entries log
 ST.entries.push({
    category: ST.wasteType,
    icon: ST.wasteIcon,
    factor: ST.co2Factor,
    size: ST.wasteKg + " kg",
    kg: ST.wasteKg,
    co2,
    pts
});
  ST.totalCO2 = +((ST.totalCO2 + co2).toFixed(2));
  ST.totalPts += pts;

  // Save waste data
localStorage.setItem("entries", JSON.stringify(ST.entries));
localStorage.setItem("totalCO2", ST.totalCO2);
localStorage.setItem("totalPts", ST.totalPts);
localStorage.setItem("wasteKg", ST.wasteKg);
  
  const circ = 2 * Math.PI * 62;
  const pct  = Math.min(Math.max(co2 / 200, 0.04), 0.96);
  const arc  = circ * 0.05 + pct * circ * 0.8;

  document.getElementById('res-arc').setAttribute('stroke-dasharray', arc.toFixed(1) + ' ' + circ.toFixed(1));
 document.getElementById('res-num').textContent = co2.toFixed(2);
document.getElementById('res-sub').textContent = ST.wasteType + ' logged';
document.getElementById('res-pts').textContent = '+' + pts + ' Green Points';

document.getElementById('rd-type').textContent = ST.wasteType;
document.getElementById('rd-qty').textContent = ST.wasteKg.toFixed(1) + ' kg';
document.getElementById('rd-factor').textContent = ST.co2Factor + ' kg CO₂/kg';
document.getElementById('rd-total').textContent = co2.toFixed(2) + ' kg CO₂e';
}

// ── REWARDS SCREENS ──────────────────────────────
function updateRewards() {
  const pts  = ST.totalPts;
  const name = ST.name || 'there';
  const initial = name.charAt(0).toUpperCase();

  // S12 My Rewards
  const rwg = document.getElementById('rw-greeting');
  if (rwg) rwg.textContent = 'Hello, ' + name + '!';
  const rwp = document.getElementById('rw-pts-display');
  if (rwp) rwp.textContent = pts.toLocaleString('en-ZA');
  const rwpb = document.getElementById('rw-pts-bar-val');
  if (rwpb) rwpb.textContent = pts.toLocaleString('en-ZA') + ' pts';

  // S13 Marketplace
  const mkp = document.getElementById('mkt-pts');
  if (mkp) mkp.textContent = 'Points Balance: ' + pts.toLocaleString('en-ZA');

  // S15 Tier status — Bronze < 500, Silver 500–1999, Gold 2000+
  const tierCur = document.getElementById('tier-pts-cur');
  if (tierCur) tierCur.textContent = pts + ' pts';
  const tierFill = document.querySelector('.tier-progress-fill');
  if (tierFill) {
    if (pts < 500)       tierFill.style.width = Math.round(pts/500*100) + '%';
    else if (pts < 2000) tierFill.style.width = Math.round((pts-500)/1500*100) + '%';
    else                 tierFill.style.width = '100%';
  }

  // S16 Leaderboard — user row
  const lbName = document.getElementById('lb-my-name');
  const lbAva  = document.getElementById('lb-my-avatar');
  const lbPts  = document.getElementById('lb-my-pts');
  if (lbName) lbName.textContent = name;
  if (lbAva)  lbAva.textContent  = initial;
  if (lbPts)  lbPts.textContent  = pts + ' pts';
}

// ── MARKETPLACE REDEMPTION ────────────────────────
function getRedeemedCounts() {
  try { return JSON.parse(localStorage.getItem('redeemedCounts')) || {}; }
  catch(e) { return {}; }
}

function showMktToast(msg, isError) {
  const toast = document.getElementById('mkt-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.background = isError ? '#e24b4a' : '#1b1b1b';
  toast.style.display = 'block';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, 2200);
}

function updateRedeemBadge(elId, count) {
  const badge = document.getElementById(elId + '-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = 'Redeemed ×' + count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function initMarketplace() {
  const counts = getRedeemedCounts();
  const idMap = {
    'Tree Planting': 'mkt-item-tree',
    'Eco Gift Voucher': 'mkt-item-voucher',
    'Recycling Kit': 'mkt-item-kit',
    'Municipal Credit': 'mkt-item-credit'
  };
  Object.entries(idMap).forEach(([name, elId]) => {
    updateRedeemBadge(elId, counts[name] || 0);
  });

  const waitlistMap = { 'mkt-item-water': 'Water Rebate', 'mkt-item-energy': 'Energy Discount' };
  Object.entries(waitlistMap).forEach(([elId, itemName]) => {
    if (localStorage.getItem('waitlist_' + itemName)) {
      const el = document.getElementById(elId);
      if (!el) return;
      el.style.opacity = '0.55';
      el.onclick = null;
      const span = el.querySelector('.mkt-item-info span');
      if (span) span.textContent = 'On waitlist ✓';
    }
  });
}

function redeemItem(elId, itemName, cost) {
  if (ST.totalPts < cost) {
    showMktToast('Not enough points — need ' + (cost - ST.totalPts) + ' more', true);
    const el = document.getElementById(elId);
    if (el) {
      el.classList.add('err-shake');
      setTimeout(() => el.classList.remove('err-shake'), 500);
    }
    return;
  }

  // Deduct points and increment redemption count — repeatable reward
  ST.totalPts -= cost;
  localStorage.setItem('totalPts', ST.totalPts);

  const counts = getRedeemedCounts();
  counts[itemName] = (counts[itemName] || 0) + 1;
  localStorage.setItem('redeemedCounts', JSON.stringify(counts));

  updateRedeemBadge(elId, counts[itemName]);
  showMktToast('Redeemed: ' + itemName + ' 🎉');

  // Refresh all points displays across the screen (balance pill, etc.)
  if (typeof updateRewards === 'function') updateRewards();
  const mkp = document.getElementById('mkt-pts');
  if (mkp) mkp.textContent = 'Points Balance: ' + ST.totalPts.toLocaleString('en-ZA');
}

function joinWaitlist(elId, itemName) {
  const key = 'waitlist_' + itemName;
  if (localStorage.getItem(key)) {
    showMktToast('Already on the waitlist for ' + itemName);
    return;
  }
  localStorage.setItem(key, 'true');
  const el = document.getElementById(elId);
  if (el) {
    el.style.opacity = '0.55';
    el.onclick = null;
    const span = el.querySelector('.mkt-item-info span');
    if (span) span.textContent = 'On waitlist ✓';
  }
  showMktToast('Joined waitlist: ' + itemName);
}

// ── LOCATIONS SCREEN ──────────────────────────────
function showLocToast(msg) {
  const toast = document.getElementById('loc-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, 2200);
}

function changeWard() {
  const current = localStorage.getItem('ward') || 'Ward 117 · Rosebank';
  const updated = window.prompt('Enter your ward / suburb:', current);
  if (updated === null) return; // cancelled
  const trimmed = updated.trim();
  if (!trimmed) return;
  localStorage.setItem('ward', trimmed);
  const wardEl = document.getElementById('loc-ward');
  if (wardEl) wardEl.textContent = trimmed;
  showLocToast('Ward updated');
}

function selectLocFreq(el, v) {
  document.querySelectorAll('.loc-freq-pill').forEach(p => p.classList.remove('sel'));
  el.classList.add('sel');
  ST.freq = v;
  localStorage.setItem('freq', v);
}

function saveLocationSettings() {
  showLocToast('Collection settings saved ✓');
  setTimeout(() => goTo(17), 900);
}

function changeCollectionDate() {
  const current = localStorage.getItem('nextCollectionDate') || '';
  const input = window.prompt('Enter next collection date (e.g. Tue 19 May):', current || 'Tue 19 May');
  if (input === null) return; // cancelled
  const trimmed = input.trim();
  if (!trimmed) return;
  localStorage.setItem('nextCollectionDate', trimmed);
  const dateEl = document.getElementById('loc-next-date');
  if (dateEl) dateEl.textContent = trimmed;
  showLocToast('Next collection date updated');
}

function initLocations() {
  const savedWard = localStorage.getItem('ward');
  if (savedWard) {
    const wardEl = document.getElementById('loc-ward');
    if (wardEl) wardEl.textContent = savedWard;
  }

  const savedDate = localStorage.getItem('nextCollectionDate');
  if (savedDate) {
    const dateEl = document.getElementById('loc-next-date');
    if (dateEl) dateEl.textContent = savedDate;
  }

  const freqIdMap = { weekly: 'loc-freq-weekly', biweekly: 'loc-freq-biweekly', other: 'loc-freq-other' };
  const currentFreq = ST.freq || 'weekly';
  const activeId = freqIdMap[currentFreq] || freqIdMap.weekly;
  document.querySelectorAll('.loc-freq-pill').forEach(p => p.classList.remove('sel'));
  const activeEl = document.getElementById(activeId);
  if (activeEl) activeEl.classList.add('sel');
}

// ── COMFORT & PREFERENCES ─────────────────────────
function openPrefsModal() {
  const modal = document.getElementById('prefs-modal');
  if (!modal) return;

  const darkToggle = document.getElementById('pref-dark-toggle');
  const unitsSel = document.getElementById('pref-units');
  const langSel = document.getElementById('pref-language');

  const isDark = localStorage.getItem('darkMode') === 'true';
  if (darkToggle) darkToggle.classList.toggle('off', !isDark);
  if (unitsSel) unitsSel.value = localStorage.getItem('units') || 'metric';
  if (langSel) langSel.value = localStorage.getItem('language') || 'en';

  modal.style.display = 'flex';
}

function closePrefsModal() {
  const modal = document.getElementById('prefs-modal');
  if (modal) modal.style.display = 'none';
}

function togglePrefDark() {
  const toggle = document.getElementById('pref-dark-toggle');
  if (!toggle) return;
  const isOff = toggle.classList.toggle('off');
  localStorage.setItem('darkMode', (!isOff).toString());
}

function setPref(key, value) {
  localStorage.setItem(key, value);
}

// init — no name known yet, greeting will update when navigating to screen 6/7
