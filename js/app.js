(() => {
  'use strict';

  /* ---------- Firebase Config ---------- */
  const firebaseConfig = {
    apiKey: "AIzaSyBfZC8Pg4IC-0Ing8KL_YApUcKj01WGck",
    authDomain: "life-expiry-1381.firebaseapp.com",
    projectId: "life-expiry-1381",
    storageBucket: "life-expiry-1381.firebasestorage.app",
    messagingSenderId: "1064612334781",
    appId: "1:1064612334781:web:4ba7c8dbc7a2b5970cfbd4"
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  /* ---------- I18N (Translations) ---------- */
  const i18n = {
    en: {
      title: "⏳ Life Expiry", sub: "Everything eventually runs out — remembered here.",
      total: "Total", exp: "Expired", soon: "Next 7d", ok: "Safe",
      addTitle: "➕ Add new item", editTitle: "✏️ Edit item",
      name: "Name", cat: "Category", date: "Expiry date", location: "Location (optional)", tags: "Tags",
      qty: "Quantity", unit: "Unit", repeat: "Repeat",
      saveItem: "Save Item", cancel: "Cancel", backup: "⬇ Backup", csv: "📊 CSV", restore: "⬆ Restore",
      search: "🔍 Search everything...", selectAll: "Select all", delExpired: "Delete expired",
      notRecurring: "Not recurring", daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly",
      activeTab: "📋 Active", archivedTab: "🗄️ Archived",
      archive: "Archive", unarchive: "Restore",
      navList: "My Items", navAdd: "Add New", navSettings: "Settings",
      layoutCompact: "📑 Compact", layoutDetailed: "📱 Detailed"
    },
    fa: {
      title: "⏳ تاریخ انقضای زندگی", sub: "هر چیزی که روزی تمام می‌شود.",
      total: "کل", exp: "منقضی", soon: "تا ۷ روز", ok: "سالم",
      addTitle: "➕ افزودن مورد جدید", editTitle: "✏️ ویرایش مورد",
      name: "نام", cat: "دسته‌بندی", date: "تاریخ انقضا", location: "مکان", tags: "برچسب‌ها",
      qty: "تعداد", unit: "واحد", repeat: "تکرار",
      saveItem: "ذخیره", cancel: "انصراف", backup: "⬇ پشتیبان", csv: "📊 اکسل", restore: "⬆ بازیابی",
      search: "🔍 جستجو...", selectAll: "انتخاب همه", delExpired: "حذف منقضی‌ها",
      notRecurring: "بدون تکرار", daily: "روزانه", weekly: "هفتگی", monthly: "ماهانه", yearly: "سالانه",
      activeTab: "📋 فعال", archivedTab: "🗄️ بایگانی",
      archive: "بایگانی", unarchive: "بازگردانی",
      navList: "آیتم‌ها", navAdd: "افزودن", navSettings: "تنظیمات",
      layoutCompact: "📑 فشرده", layoutDetailed: "📱 تفصیلی"
    }
  };

  let currentLang = localStorage.getItem('lifeexpiry.lang') || 'en';

  /* ---------- Config & State ---------- */
  const CATS = { food:{ label:'Food & Fridge', icon:'🥛' }, medicine:{ label:'Medicine', icon:'💊' }, warranty:{ label:'Warranty', icon:'🛡️' }, sub:{ label:'Subscription', icon:'🔁' }, cosmetic:{ label:'Cosmetics', icon:'🧴' }, doc:{ label:'Documents', icon:'📄' }, other:{ label:'Other', icon:'📦' } };
  const CALENDARS = { gregory:{ label:'Gregorian', locale:'en-US-u-ca-gregory' }, persian:{ label:'Persian', locale:'fa-IR-u-ca-persian' } };
  
  const KEY = 'lifeexpiry.v1', CAL_KEY = 'lifeexpiry.calendar', THEME_KEY = 'lifeexpiry.theme', MS = 86400000, LAYOUT_KEY = 'lifeexpiry.layout';
  const $ = id => document.getElementById(id);

  const state = { 
    items: [], editingId: null, view: 'active', filterCat: 'all', query: '', sort: 'date-asc', selected: new Set(), 
    calendar: localStorage.getItem(CAL_KEY) || 'gregory', theme: localStorage.getItem(THEME_KEY) || 'light', 
    syncId: localStorage.getItem('lifeexpiry.syncId') || null,
    layout: localStorage.getItem(LAYOUT_KEY) || 'compact' // DEFAULT IS COMPACT NOW
  };

  /* ---------- Date Helpers ---------- */
  const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const parseDate = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
  const toISO = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };
  const daysLeft = s => Math.round((parseDate(s) - today0()) / MS);

  function formatDate(iso) {
    const cfg = CALENDARS[state.calendar] || CALENDARS.gregory;
    try { return new Intl.DateTimeFormat(cfg.locale, { day:'numeric', month:'short', year:'numeric' }).format(parseDate(iso)); }
    catch { return iso; }
  }

  function statusOf(d) {
    if (d < 0) return { key:'expired', text: `Expired ${-d}d` };
    if (d === 0) return { key:'today', text: 'Today' };
    if (d === 1) return { key:'soon', text: 'Tomorrow' };
    if (d <= 7) return { key:'soon', text: `${d}d left` };
    if (d <= 30) return { key:'warn', text: `${d}d left` };
    return { key:'ok', text: `${d}d left` };
  }

  /* ---------- UI Translation & Tabs ---------- */
  function applyLanguage() {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
    const t = i18n[currentLang];

    $('nav-lbl-list').textContent = t.navList;
    $('nav-lbl-add').textContent = t.navAdd;
    $('nav-lbl-settings').textContent = t.navSettings;

    $('app-title').textContent = t.title; $('app-sub').textContent = t.sub;
    $('lbl-total').textContent = t.total; $('lbl-exp').textContent = t.exp;
    $('lbl-soon').textContent = t.soon; $('lbl-ok').textContent = t.ok;
    $('lbl-name').textContent = t.name; $('lbl-cat').textContent = t.cat;
    $('lbl-date').textContent = t.date; $('lbl-location').textContent = t.location; $('lbl-tags').textContent = t.tags;
    $('lbl-qty').textContent = t.qty; $('lbl-unit').textContent = t.unit; $('lbl-recurring').textContent = t.repeat;
    $('search').placeholder = t.search;
    
    $('view-active-btn').textContent = t.activeTab;
    $('view-archived-btn').textContent = t.archivedTab;
    
    // Update Layout Button Text
    $('layout-btn').textContent = state.layout === 'compact' ? t.layoutCompact : t.layoutDetailed;

    if (state.editingId) { $('form-title').textContent = t.editTitle; $('submit-btn').textContent = t.saveItem; }
    else { $('form-title').textContent = t.addTitle; $('submit-btn').textContent = t.saveItem; }
    
    $('cancel-btn').textContent = t.cancel; $('export-btn').textContent = t.backup;
    $('csv-btn').textContent = t.csv; $('import-btn').textContent = t.restore;
    $('select-all-btn').textContent = t.selectAll; $('delete-expired-btn').textContent = t.delExpired;

    const recSel = $('recurring');
    recSel.options[0].text = t.notRecurring; recSel.options[1].text = t.daily;
    recSel.options[2].text = t.weekly; recSel.options[3].text = t.monthly; recSel.options[4].text = t.yearly;

    initChips(); render();
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    $(tabId).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
  }

  /* ---------- Theme Logic ---------- */
  function applyTheme() { 
    document.documentElement.setAttribute('data-theme', state.theme); 
    const btn = $('theme-btn');
    if (state.theme === 'dark') btn.textContent = '🌌';
    else if (state.theme === 'luxe') btn.textContent = '🌸';
    else btn.textContent = '🌅';
  }

  function initSelect() { $('cat').innerHTML = Object.entries(CATS).map(([k,v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join(''); }
  function initChips() { const all = [['all', { label:'All', icon:'🗂️' }], ...Object.entries(CATS)]; $('chips').innerHTML = all.map(([k,v]) => `<button class="chip${k === state.filterCat ? ' on' : ''}" data-cat="${k}">${v.icon} ${v.label}</button>`).join(''); }
  function initCalendarPicker() { $('cal').innerHTML = Object.entries(CALENDARS).map(([k,v]) => `<option value="${k}"${k === state.calendar ? ' selected' : ''}>${v.label}</option>`).join(''); }

  /* ---------- Cloud Sync Logic ---------- */
  let unsubscribe = null;
  function initCloudSync() {
    if (unsubscribe) unsubscribe();
    if (!state.syncId) { state.items = JSON.parse(localStorage.getItem(KEY)) || []; render(); return; }
    $('sync-status').textContent = "Connecting...";
    unsubscribe = db.collection('users').doc(state.syncId).collection('items').onSnapshot(snapshot => {
      state.items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      $('sync-status').textContent = "✅ Connected & Synced!";
      render();
    });
  }

  function saveItemsToCloud() {
    if (!state.syncId) { localStorage.setItem(KEY, JSON.stringify(state.items)); return; }
    const batch = db.batch();
    const userRef = db.collection('users').doc(state.syncId);
    db.collection('users').doc(state.syncId).collection('items').get().then(snapshot => {
      snapshot.docs.forEach(doc => { if (!state.items.find(i => i.id === doc.id)) batch.delete(doc.ref); });
      state.items.forEach(item => batch.set(userRef.collection('items').doc(item.id), item));
      return batch.commit();
    });
  }

  /* ---------- Render ---------- */
  function render() {
    let exp = 0, soon = 0, ok = 0;
    state.items.filter(i => !i.isArchived).forEach(i => { const d = daysLeft(i.date); if (d < 0) exp++; else if (d <= 7) soon++; else ok++; });
    $('s-total').textContent = state.items.filter(i => !i.isArchived).length; 
    $('s-exp').textContent = exp; $('s-soon').textContent = soon; $('s-ok').textContent = ok;

    if (state.view === 'archived') { $('view-active-btn').classList.remove('active'); $('view-archived-btn').classList.add('active'); } 
    else { $('view-active-btn').classList.add('active'); $('view-archived-btn').classList.remove('active'); }

    let vis = state.items.filter(i => state.view === 'archived' ? i.isArchived : !i.isArchived);
    if (state.filterCat !== 'all') vis = vis.filter(i => i.cat === state.filterCat);
    if (state.query) {
      const q = state.query.toLowerCase();
      vis = vis.filter(i => (i.name + ' ' + (i.location||'') + ' ' + (i.tags ? i.tags.join(' ') : '')).toLowerCase().includes(q));
    }
    vis.sort((a, b) => state.sort === 'name-asc' ? a.name.localeCompare(b.name) : (state.sort === 'date-desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

    const list = $('list');
    if (!vis.length) { list.innerHTML = `<div class="empty"><div class="big">📭</div><p>No ${state.view} items found.</p></div>`; updateBulkBar(); return; }

    // RENDER BASED ON SELECTED LAYOUT (COMPACT OR DETAILED)
    list.innerHTML = vis.map(i => {
      const d = daysLeft(i.date);
      const st = statusOf(d);
      const c = CATS[i.cat] || CATS.other;
      const qtyStr = i.quantity ? ` ×${i.quantity} ${i.unit||''}` : '';
      const locStr = i.location ? `📍 ${esc(i.location)}` : '';
      const tagsHTML = i.tags && i.tags.length ? `<div class="tags-container">${i.tags.map(t => `<span class="tag-pill">#${esc(t)}</span>`).join('')}</div>` : '';
      const recurring = i.recurring ? `<span class="tag-pill" style="color:var(--accent);">🔁 ${i18n[currentLang][i.recurring]}</span>` : '';
      
      const actionBtn = i.isArchived 
        ? `<button class="archive-btn" data-act="unarchive" data-id="${i.id}">${i18n[currentLang].unarchive}</button>`
        : `<button class="archive-btn" data-act="archive" data-id="${i.id}">${i18n[currentLang].archive}</button>`;

      if (state.layout === 'compact') {
        // --- COMPACT ACCORDION BAR ---
        return `
          <div class="item compact ${i.isArchived ? 'archived' : ''}" data-s="${st.key}" data-id="${i.id}">
            <div class="compact-header">
              <div class="compact-left">
                <span class="ico">${c.icon}</span>
                <span class="name">${esc(i.name)}</span>
              </div>
              <div class="compact-right">
                <span class="badge ${st.key}">${st.text}</span>
                <span class="chevron">▼</span>
              </div>
            </div>
            <div class="item-details">
              <div class="meta">
                <span>${formatDate(i.date)}</span>
                ${locStr ? `<span>· ${locStr}</span>` : ''}
                ${qtyStr ? `<span>· ${qtyStr}</span>` : ''}
                ${recurring}
              </div>
              ${tagsHTML}
              <div class="mini">
                ${!i.isArchived ? `<button data-act="edit" data-id="${i.id}">Edit</button>` : ''}
                ${actionBtn}
                <button class="del" data-act="del" data-id="${i.id}">Delete</button>
              </div>
            </div>
          </div>`;
      } else {
        // --- DETAILED CARD LAYOUT ---
        return `
          <div class="item detailed ${i.isArchived ? 'archived' : ''}" data-s="${st.key}">
            <div class="checkbox-wrap">
              <input type="checkbox" class="item-check" data-id="${i.id}" ${state.selected.has(i.id) ? 'checked' : ''}>
            </div>
            <div class="ico">${c.icon}</div>
            <div class="body">
              <div class="name">${esc(i.name)} ${recurring}</div>
              <div class="meta">
                <span>${formatDate(i.date)}</span>
                ${locStr ? `<span>· ${locStr}</span>` : ''}
                ${qtyStr ? `<span>· ${qtyStr}</span>` : ''}
              </div>
              ${tagsHTML}
            </div>
            <div class="side">
              <span class="badge ${st.key}">${st.text}</span>
              <div class="mini">
                ${!i.isArchived ? `<button data-act="edit" data-id="${i.id}">Edit</button>` : ''}
                ${actionBtn}
                <button class="del" data-act="del" data-id="${i.id}">Delete</button>
              </div>
            </div>
          </div>`;
      }
    }).join('');
    updateBulkBar();
  }

  const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
  function updateBulkBar() { const bar = $('bulk-bar'); if (state.selected.size === 0) bar.hidden = true; else { bar.hidden = false; $('bulk-count').textContent = `${state.selected.size} selected`; } }

  /* ---------- Events ---------- */
  function bind() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    // Theme Dropdown Logic
    $('theme-btn').addEventListener('click', (e) => { e.stopPropagation(); $('theme-dropdown').classList.toggle('show'); });
    document.querySelectorAll('.theme-menu button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        state.theme = e.target.dataset.theme; localStorage.setItem(THEME_KEY, state.theme); applyTheme(); $('theme-dropdown').classList.remove('show');
      });
    });
    window.addEventListener('click', (e) => { if (!e.target.closest('.theme-dropdown')) $('theme-dropdown').classList.remove('show'); });

    // Layout Toggle Button (Safe Check)
    if ($('layout-btn')) {
      $('layout-btn').addEventListener('click', () => {
        state.layout = state.layout === 'compact' ? 'detailed' : 'compact';
        localStorage.setItem(LAYOUT_KEY, state.layout);
        applyLanguage();
      });
    }

    $('lang-btn').addEventListener('click', () => { currentLang = currentLang === 'en' ? 'fa' : 'en'; localStorage.setItem('lifeexpiry.lang', currentLang); applyLanguage(); });
    
    $('view-active-btn').addEventListener('click', () => { state.view = 'active'; state.selected.clear(); render(); });
    $('view-archived-btn').addEventListener('click', () => { state.view = 'archived'; state.selected.clear(); render(); });

    $('cloud-btn').addEventListener('click', () => { $('cloud-modal').hidden = false; if(state.syncId) $('sync-status').textContent = "✅ Connected"; });
    $('cloud-close').addEventListener('click', () => $('cloud-modal').hidden = true);
    $('sync-save-btn').addEventListener('click', () => {
      const code = $('sync-code-input').value.trim().toUpperCase();
      if (!code) return; state.syncId = code; localStorage.setItem('lifeexpiry.syncId', state.syncId);
      $('cloud-modal').hidden = true; initCloudSync();
    });

    $('cal').addEventListener('change', e => { state.calendar = e.target.value; localStorage.setItem(CAL_KEY, state.calendar); render(); });
    $('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });

    $('form').addEventListener('submit', e => {
      e.preventDefault();
      const tags = $('tags').value ? $('tags').value.split(',').map(t => t.trim()).filter(Boolean) : [];
      const data = {
        name: $('name').value.trim(), cat: $('cat').value, date: $('date').value,
        location: $('location').value.trim() || null, tags,
        quantity: parseInt($('qty').value, 10) || null, unit: $('unit').value.trim() || null,
        recurring: $('recurring').value || null
      };

      if (state.editingId) {
        const it = state.items.find(i => i.id === state.editingId);
        if (it) Object.assign(it, data);
      } else {
        state.items.push({ id: Date.now().toString(36), ...data, isArchived: false, created: Date.now() });
      }
      
      if (state.syncId) saveItemsToCloud(); else localStorage.setItem(KEY, JSON.stringify(state.items));
      resetForm(); 
      if(!state.syncId) render();
      
      switchTab('tab-list'); 
    });

    $('cancel-btn').addEventListener('click', () => { resetForm(); switchTab('tab-list'); });
    $('search').addEventListener('input', e => { state.query = e.target.value; render(); });
    $('chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; state.filterCat = b.dataset.cat; initChips(); render(); });

    // List Click Events
    $('list').addEventListener('click', e => {
      // 1. Handle Compact Accordion Toggle
      if (state.layout === 'compact') {
        const itemDiv = e.target.closest('.item.compact');
        // Only toggle if NOT clicking a button inside the details
        if (itemDiv && !e.target.closest('button')) {
          itemDiv.classList.toggle('expanded');
          return; 
        }
      }

      // 2. Handle Checkboxes (Detailed View only)
      const cb = e.target.closest('.item-check');
      if (cb) { if (cb.checked) state.selected.add(cb.dataset.id); else state.selected.delete(cb.dataset.id); updateBulkBar(); return; }
      
      // 3. Handle Action Buttons
      const b = e.target.closest('button[data-act]'); if (!b) return;
      const id = b.dataset.id; const it = state.items.find(i => i.id === id);
      if (!it) return;

      if (b.dataset.act === 'edit') {
        state.editingId = id;
        $('name').value = it.name; $('cat').value = it.cat; $('date').value = it.date;
        $('location').value = it.location || ''; $('tags').value = it.tags ? it.tags.join(', ') : '';
        $('qty').value = it.quantity || ''; $('unit').value = it.unit || ''; $('recurring').value = it.recurring || '';
        applyLanguage(); 
        switchTab('tab-add'); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } 
      else if (b.dataset.act === 'archive' || b.dataset.act === 'unarchive') {
        it.isArchived = !it.isArchived;
        if (state.syncId) saveItemsToCloud(); else { localStorage.setItem(KEY, JSON.stringify(state.items)); render(); }
      } 
      else if (b.dataset.act === 'del') {
        if (confirm('Delete this item?')) {
          state.items = state.items.filter(i => i.id !== id); state.selected.delete(id); 
          if (state.syncId) saveItemsToCloud(); else { localStorage.setItem(KEY, JSON.stringify(state.items)); render(); }
        }
      }
    });

    $('bulk-clear-btn').addEventListener('click', () => { state.selected.clear(); render(); });
    $('bulk-delete-btn').addEventListener('click', () => {
      if (confirm(`Delete ${state.selected.size} items?`)) {
        state.items = state.items.filter(i => !state.selected.has(i.id)); state.selected.clear();
        if (state.syncId) saveItemsToCloud(); else { localStorage.setItem(KEY, JSON.stringify(state.items)); render(); }
      }
    });
    
    $('stats-btn').addEventListener('click', () => {
      $('stats-modal').hidden = false; 
      let html = ''; const counts = {}; state.items.forEach(i => counts[i.cat] = (counts[i.cat]||0)+1);
      Object.entries(CATS).forEach(([k,v]) => { if(counts[k]) html += `<div class="chart-row"><div class="chart-label">${v.label}</div><div class="chart-track"><div class="chart-fill" style="width:${(counts[k]/state.items.length)*100}%"></div></div><div class="chart-value">${counts[k]}</div></div>`; });
      $('chart-categories').innerHTML = html;
    });
    $('stats-close').addEventListener('click', () => $('stats-modal').hidden = true);
  }

  function resetForm() { state.editingId = null; $('form').reset(); applyLanguage(); $('cancel-btn').style.display = 'none'; $('date-hint').innerHTML = ''; }

  /* ---------- Boot ---------- */
  applyTheme(); applyLanguage(); initSelect(); initCalendarPicker(); bind(); initCloudSync();
  document.querySelectorAll('.quick button').forEach(b => b.addEventListener('click', () => { const d = today0(); d.setDate(d.getDate() + Number(b.dataset.days)); $('date').value = toISO(d); }));
})();