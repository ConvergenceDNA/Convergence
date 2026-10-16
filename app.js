'use strict';
/* =========================================================
   Convergence — Y-DNA Lineage Reconstruction
   Based on "Y-DNA Lineage Reconstruction: Theory and Application"
   by David C. Joyce
   ========================================================= */

const STORE_KEY = 'convergence-data-v1';
const DEFAULT_DATA = { settings: { ypg: 33, gpsMin: 3, gpsMax: 5 }, ancestors: [] };

let S = loadData();
let view = { page: 'home', id: null, tab: 'overview' };
let searchText = '';

/* ---------- Storage ---------- */
function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return normalizeData(JSON.parse(raw));
  } catch (e) { /* storage unavailable or damaged */ }
  return normalizeData({});
}
function normalizeData(d) {
  d = d || {};
  d.settings = Object.assign({}, DEFAULT_DATA.settings, d.settings || {});
  d.ancestors = Array.isArray(d.ancestors) ? d.ancestors : [];
  d.ancestors.forEach(fixAncestor);
  d.projects = Array.isArray(d.projects) ? d.projects : [];
  d.projects.forEach(fixProject);
  return d;
}
function fixAncestor(a) {
  ['documents', 'testers', 'gdPairs', 'conflicts', 'extraEvidence'].forEach(k => {
    if (!Array.isArray(a[k])) a[k] = [];
  });
  if (!a.conv || typeof a.conv !== 'object') a.conv = {};
  if (!a.checks || typeof a.checks !== 'object') a.checks = {};
  if (!a.id) a.id = uid();
  return a;
}
let savedTimer = null;
function saveData() {
  const el = document.getElementById('saved');
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
    el.textContent = 'All changes saved';
    el.className = 'saved';
  } catch (e) {
    el.textContent = 'Could not save — use Settings › Export to keep a copy';
    el.className = 'saved err';
  }
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { if (!el.classList.contains('err')) el.textContent = ''; }, 2500);
}

/* ---------- Helpers ---------- */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function num(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}
function fmt(n, d = 1) {
  if (n == null || !isFinite(n)) return '—';
  const p = Math.pow(10, d);
  return String(Math.round(n * p) / p);
}
function yearFmt(n) { return n == null || !isFinite(n) ? '—' : String(Math.round(n)); }
function cur() { return S.ancestors.find(a => a.id === view.id); }
/* The record being edited: an ancestor, or a non-tester research case. */
function rec() { return view.page === 'project' ? curProject() : cur(); }
function lifeYears(a) {
  const b = a.birth ? a.birth : '?';
  const d = a.death ? a.death : '?';
  return (a.birth || a.death) ? `${b}–${d}` : '';
}

/* ---------- SNP logic ---------- */
function normSNP(s) {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, '').replace(/^[A-Z][A-Z0-9]{0,3}-(?=[A-Z])/, '');
}
function pathOf(t) {
  return String(t.path || '').split(/[,;>\n→]+/).map(s => s.trim()).filter(Boolean);
}
function sharedSNP(testers) {
  const ts = testers.filter(t => pathOf(t).length);
  if (ts.length < 2) return null;
  const others = ts.slice(1).map(t => pathOf(t).map(normSNP));
  for (const s of pathOf(ts[0])) {
    if (others.every(p => p.includes(normSNP(s)))) return s;
  }
  return null;
}
function targetSNP(a) {
  return (a.targetSNP && a.targetSNP.trim()) || sharedSNP(a.testers) || '';
}
function snpCountFor(t, tgt) {
  if (num(t.snpCount) != null) return num(t.snpCount);
  if (!tgt) return null;
  const idx = pathOf(t).map(normSNP).indexOf(normSNP(tgt));
  return idx < 0 ? null : idx + 1;
}
function carriesSNP(t, snp) {
  return !!snp && pathOf(t).map(normSNP).includes(normSNP(snp));
}
function upstreamOf(t, snp) {
  const p = pathOf(t);
  const idx = p.map(normSNP).indexOf(normSNP(snp));
  return idx >= 0 && p[idx + 1] ? p[idx + 1] : '—';
}
function lineageYPG(a) {
  return num(a.ypg) != null ? num(a.ypg) : num(S.settings.ypg);
}
/* Generational Estimation for one tester (book formulas):
   GPS = Generations ÷ SNPs, YPS = GPS × YPG,
   Years = Generations × YPG, SNP Birth Year = Reference Year − (SNPs × YPS) */
function genRow(a, t) {
  const tgt = targetSNP(a);
  const snps = snpCountFor(t, tgt);
  const gens = num(t.generations);
  const ypg = lineageYPG(a);
  const gps = snps && gens != null ? gens / snps : null;
  const yps = gps != null && ypg != null ? gps * ypg : null;
  const years = gens != null && ypg != null ? gens * ypg : null;
  const tb = num(t.birth);
  const formation = tb != null && yps != null ? tb - snps * yps : null;
  const ab = num(a.birth);
  const diff = formation != null && ab != null ? formation - ab : null;
  const aligned = diff != null && yps != null ? Math.abs(diff) <= yps : null;
  const gpsOK = gps != null ? gps >= num(S.settings.gpsMin) && gps <= num(S.settings.gpsMax) : null;
  const docYPG = tb != null && ab != null && gens ? (tb - ab) / gens : null;
  return { t, tgt, snps, gens, ypg, gps, yps, years, tb, formation, diff, aligned, gpsOK, docYPG };
}

/* ---------- STR logic ---------- */
function parseSTR(text) {
  const map = new Map();
  String(text || '').split(/[\n,;\t]+/).forEach(part => {
    const m = part.trim().match(/^([A-Za-z0-9._\-]+?)\s*[=:\s]\s*([\d.]+(?:\s*[-\/]\s*[\d.]+)*)$/);
    if (!m) return;
    const vals = m[2].split(/[-\/]/).map(v => Number(v.trim())).filter(v => isFinite(v));
    if (vals.length) map.set(m[1].toUpperCase().replace(/\s+/g, ''), vals);
  });
  return map;
}
function strCompare(textA, textB) {
  const a = parseSTR(textA), b = parseSTR(textB);
  if (!a.size || !b.size) return null;
  let gd = 0, compared = 0;
  const diffs = [];
  a.forEach((va, k) => {
    if (!b.has(k)) return;
    compared++;
    const vb = b.get(k);
    const x = [...va].sort((p, q) => p - q), y = [...vb].sort((p, q) => p - q);
    let d = Math.abs(x.length - y.length);
    for (let i = 0; i < Math.min(x.length, y.length); i++) d += Math.abs(x[i] - y[i]);
    if (d) { gd += d; diffs.push({ marker: k, a: va.join('-'), b: vb.join('-'), d }); }
  });
  return { gd, compared, diffs };
}
function testerById(a, id) { return a.testers.find(t => t.id === id); }
function testerLabel(t) { return t ? (t.label || 'Unnamed tester') : '—'; }
function pairEval(a, p) {
  const ta = testerById(a, p.a), tb = testerById(a, p.b);
  const auto = ta && tb ? strCompare(ta.str, tb.str) : null;
  const gd = num(p.gd) != null ? num(p.gd) : (auto ? auto.gd : null);
  const markers = num(p.markers) != null ? num(p.markers) : (auto ? auto.compared : null);
  const min = num(p.expMin), max = num(p.expMax);
  const within = gd != null && min != null && max != null ? gd >= min && gd <= max : null;
  return { ta, tb, auto, gd, markers, min, max, within, manual: num(p.gd) != null };
}

/* ---------- Status (the three lines of evidence) ----------
   Manual "Consistent?" overrides on the Convergence tab take priority. */
function ovr(a, key) { return (a.conv[key] || {}).ov || ''; }
function snpStatus(a) {
  if (ovr(a, 'snp') === 'N') return { c: 'red', msg: 'SNP inheritance marked inconsistent.' };
  if (ovr(a, 'gps') === 'N') return { c: 'red', msg: 'Generational consistency marked inconsistent.' };
  const ts = a.testers.filter(t => pathOf(t).length);
  const tgt = targetSNP(a);
  if (ovr(a, 'snp') !== 'Y') {
    if (!ts.length) return { c: 'grey', msg: 'No tester SNP paths entered yet.' };
    if (!tgt) return { c: 'amber', msg: 'Set the ancestral SNP (Overview) or add a second tester.' };
    const missing = ts.filter(t => !carriesSNP(t, tgt) && num(t.snpCount) == null);
    if (missing.length) return { c: 'red', msg: `${missing.length} tester(s) do not carry ${tgt}.` };
  }
  if (ovr(a, 'gps') !== 'Y') {
    const rows = ts.map(t => genRow(a, t));
    if (rows.some(r => r.gpsOK === false)) return { c: 'amber', msg: `A GPS value falls outside ${S.settings.gpsMin}–${S.settings.gpsMax}.` };
    if (!rows.length || rows.some(r => r.gps == null)) return { c: 'amber', msg: 'Add generations for each tester to check GPS.' };
  }
  return { c: 'green', msg: tgt ? `Testers carry ${tgt}; GPS within the expected range.` : 'SNP evidence marked consistent.' };
}
function strStatus(a) {
  if (ovr(a, 'str') === 'N') return { c: 'red', msg: 'STR evidence marked inconsistent.' };
  if (ovr(a, 'str') === 'Y') return { c: 'green', msg: 'STR evidence marked consistent.' };
  if (!a.gdPairs.length) return { c: 'grey', msg: 'No genetic distance comparisons yet.' };
  const ev = a.gdPairs.map(p => pairEval(a, p));
  if (ev.some(e => e.within === false)) return { c: 'red', msg: 'A GD falls outside its expected range.' };
  if (ev.some(e => e.within == null)) return { c: 'amber', msg: 'Enter GD and expected range for every pair.' };
  return { c: 'green', msg: 'All GD values within expected ranges.' };
}
function genealogyStatus(a) {
  if (ovr(a, 'gen') === 'N') return { c: 'red', msg: 'Genealogy alignment marked inconsistent.' };
  if (ovr(a, 'date') === 'N') return { c: 'red', msg: 'SNP date vs birth year marked inconsistent.' };
  if (!a.documents.length && !a.testers.length) return { c: 'grey', msg: 'No documents or testers yet.' };
  if (!a.documents.length) return { c: 'amber', msg: 'No documents recorded for this ancestor.' };
  if (ovr(a, 'date') !== 'Y') {
    const rows = a.testers.filter(t => pathOf(t).length).map(t => genRow(a, t));
    if (rows.some(r => r.aligned === false)) return { c: 'red', msg: 'SNP formation date is more than one SNP interval from the documented birth year.' };
    if (num(a.birth) == null) return { c: 'amber', msg: 'Add the ancestor\'s birth year to test date alignment.' };
  }
  if (ovr(a, 'gen') !== 'Y') {
    if (a.testers.some(t => t.matches === 'N')) return { c: 'red', msg: 'A tester\'s genealogy does not match the DNA.' };
    if (!a.testers.length || a.testers.some(t => !t.matches)) return { c: 'amber', msg: 'Complete the Genealogy Alignment for every tester.' };
  }
  return { c: 'green', msg: 'Genealogy aligns with the DNA evidence.' };
}
function openConflicts(a) { return a.conflicts.filter(c => c.status !== 'Resolved').length; }
function verdict(a) {
  const st = [snpStatus(a), strStatus(a), genealogyStatus(a)];
  const open = openConflicts(a);
  if (st.some(s => s.c === 'red')) return { c: 'red', title: 'Conflict in the evidence', msg: 'Record and resolve the conflict before drawing a conclusion.' };
  if (st.every(s => s.c === 'green') && !open) return { c: 'green', title: 'Convergence achieved', msg: 'All three lines of evidence align. The conclusion should remain open to revision as new evidence emerges.' };
  if (open) return { c: 'amber', title: 'Unresolved conflicts', msg: `${open} conflict(s) still open on the Convergence tab.` };
  return { c: 'amber', title: 'Research in progress', msg: 'Not every line of evidence has been tested yet.' };
}
function nextStep(a) {
  if (!a.documents.length) return { tab: 'documents', text: 'Record historical documents for this ancestor.' };
  if (!a.testers.length) return { tab: 'testers', text: 'Add the Y-DNA testers who descend from this ancestor.' };
  if (!targetSNP(a)) return { tab: 'overview', text: 'Set the ancestral SNP you are testing.' };
  if (a.testers.some(t => num(t.generations) == null || num(t.birth) == null)) return { tab: 'testers', text: 'Add birth year and generations for every tester.' };
  if (a.testers.length > 1 && !a.gdPairs.length) return { tab: 'str', text: 'Compare testers with a Genetic Distance analysis.' };
  if (a.testers.some(t => !t.matches)) return { tab: 'alignment', text: 'Complete the Genealogy Alignment.' };
  const sn = snpStatus(a), sr = strStatus(a), sg = genealogyStatus(a);
  if (sn.c === 'red' || sr.c === 'red' || sg.c === 'red') return { tab: 'convergence', text: 'Record the conflict and work out a resolution path.' };
  if (sn.c === 'amber') return { tab: 'snp', text: sn.msg };
  if (sr.c === 'amber') return { tab: 'str', text: sr.msg };
  if (sg.c === 'amber') return { tab: 'alignment', text: sg.msg };
  if (openConflicts(a)) return { tab: 'convergence', text: 'Resolve the open conflicts.' };
  return { tab: 'report', text: 'Review and print the research report.' };
}

/* ---------- Generic editable table ---------- */
/* cols: { k, label, type: text|number|select|textarea|calc, opts, ph, render(row) } */
function editTable(coll, cols, rows, opts = {}) {
  const head = cols.map(c => `<th>${esc(c.label)}</th>`).join('') + (opts.noDelete ? '' : '<th></th>');
  const body = rows.length ? rows.map(r => {
    const cells = cols.map(c => {
      if (c.type === 'calc') return `<td class="calc">${c.render(r)}</td>`;
      const attrs = `data-coll="${coll}" data-id="${esc(r.id)}" data-k="${c.k}"`;
      const v = r[c.k] == null ? '' : r[c.k];
      if (c.type === 'select') {
        const o = (c.opts || []).map(op => {
          const val = typeof op === 'object' ? op.v : op, lab = typeof op === 'object' ? op.l : op;
          return `<option value="${esc(val)}"${String(v) === String(val) ? ' selected' : ''}>${esc(lab)}</option>`;
        }).join('');
        return `<td><select ${attrs}>${o}</select></td>`;
      }
      if (c.type === 'textarea') return `<td style="min-width:${c.w || 180}px"><textarea ${attrs} placeholder="${esc(c.ph || '')}">${esc(v)}</textarea></td>`;
      return `<td style="min-width:${c.w || 110}px"><input ${attrs} type="${c.type === 'number' ? 'number' : 'text'}" value="${esc(v)}" placeholder="${esc(c.ph || '')}"></td>`;
    }).join('');
    const del = opts.noDelete ? '' : `<td><button class="row-btn" data-act="del-row" data-coll="${coll}" data-id="${esc(r.id)}" title="Delete row">✕</button></td>`;
    return `<tr>${cells}${del}</tr>`;
  }).join('') : `<tr><td class="empty" colspan="${cols.length + 1}">${esc(opts.empty || 'Nothing added yet.')}</td></tr>`;
  const add = opts.addLabel ? `<div class="tbl-actions no-print"><button class="btn small" data-act="add-row" data-coll="${coll}">+ ${esc(opts.addLabel)}</button></div>` : '';
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${add}`;
}
function field(label, key, value, o = {}) {
  const attr = `${o.attr || 'data-anc'}="${key}"`;
  const input = o.type === 'textarea'
    ? `<textarea ${attr} placeholder="${esc(o.ph || '')}">${esc(value)}</textarea>`
    : `<input ${attr} type="${o.type || 'text'}" value="${esc(value)}" placeholder="${esc(o.ph || '')}">`;
  return `<div class="field${o.full ? ' full' : ''}"><label>${esc(label)}</label>${input}${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</div>`;
}
function pill(c, text) { return `<span class="pill ${c}">${esc(text)}</span>`; }
function ynPill(v) { return v === true ? pill('green', 'Yes') : v === false ? pill('red', 'No') : pill('', '—'); }

/* ---------- Render: sidebar ---------- */
function renderSidebar() {
  const q = searchText.trim().toLowerCase();
  const list = S.ancestors
    .filter(a => !q || (a.name || '').toLowerCase().includes(q))
    .sort((x, y) => (x.name || '').localeCompare(y.name || ''));
  document.getElementById('ancestor-list').innerHTML = list.length ? list.map(a => {
    const v = verdict(a);
    return `<div class="anc-item${view.page === 'ancestor' && view.id === a.id ? ' active' : ''}" data-act="open-ancestor" data-id="${a.id}">
      <span class="dot ${v.c === 'green' ? 'green' : v.c === 'red' ? 'red' : ''}"></span>
      <span class="anc-name">${esc(a.name || 'Unnamed ancestor')}</span>
      <span class="anc-years">${esc(lifeYears(a))}</span></div>`;
  }).join('') : `<div class="side-empty">${q ? 'No matches.' : 'No ancestors yet.'}</div>`;
  document.querySelectorAll('.side-nav a').forEach(el => el.classList.toggle('active', el.dataset.page === view.page || (view.page === 'project' && el.dataset.page === 'projects')));
}

/* ---------- Render: main ---------- */
const TABS = [
  ['checklist', 'Pre-Research'], ['overview', 'Overview'], ['documents', 'Documents'], ['testers', 'Testers & DNA'], ['snp', 'SNP Analysis'],
  ['str', 'STR Analysis'], ['alignment', 'Alignment'], ['convergence', 'Convergence'], ['report', 'Report']
];
function render() {
  const main = document.getElementById('main');
  const crumb = document.getElementById('crumb');
  if (view.page === 'ancestor' && !cur()) view = { page: 'home', id: null, tab: 'overview' };
  if (view.page === 'project' && !curProject()) view = { page: 'projects', id: null, tab: 'groups' };
  let html = '';
  if (view.page === 'ancestor') {
    const a = cur();
    crumb.innerHTML = `<a data-act="nav" data-page="home">Home</a> › ${esc(a.name || 'Unnamed ancestor')}`;
    html = renderAncestor(a);
  } else if (view.page === 'project') {
    const p = curProject();
    crumb.innerHTML = `<a data-act="nav" data-page="projects">Non-Tester Research</a> › ${esc(p.name || 'Unnamed research')}`;
    html = renderProject(p);
  } else if (view.page === 'projects') { crumb.textContent = 'Non-Tester Research'; html = renderProjects(); }
  else if (view.page === 'learn') { crumb.textContent = 'Learn'; html = renderLearn(); }
  else if (view.page === 'calcs') { crumb.textContent = 'Quick Calculators'; html = renderCalcs(); }
  else if (view.page === 'autosomal') { crumb.textContent = 'Autosomal DNA Tools'; html = renderAutosomal(); }
  else if (view.page === 'settings') { crumb.textContent = 'Settings & Backup'; html = renderSettings(); }
  else { crumb.textContent = 'Home'; html = renderHome(); }
  main.innerHTML = html;
  main.querySelectorAll('[data-calc]').forEach(runCalc);
  renderSidebar();
}

function renderHome() {
  const steps = [
    ['Record documents', 'Birth, marriage, census, probate, land, military and church records.'],
    ['Add testers', 'Each descendant\'s SNP path, birth year and generations.'],
    ['Analyze SNPs', 'Shared SNP, lineage map, GPS, YPS and formation dates.'],
    ['Analyze STRs', 'Genetic Distance between testers and expected ranges.'],
    ['Align genealogy', 'Does each documented line match the DNA?'],
    ['Test convergence', 'Do SNPs, STRs and genealogy agree?'],
    ['Resolve conflicts', 'Reassess the evidence where it does not align.'],
    ['Report', 'A printable summary of the case.']
  ];
  const cards = S.ancestors.map(a => {
    const v = verdict(a);
    return `<div class="anc-card" data-act="open-ancestor" data-id="${a.id}">
      <h3>${esc(a.name || 'Unnamed ancestor')}</h3>
      <div class="hint">${esc(lifeYears(a))}${a.place ? ' · ' + esc(a.place) : ''}</div>
      <div style="margin-top:10px">${pill(v.c === 'amber' ? 'amber' : v.c, v.title)}</div></div>`;
  }).join('');
  return `
  <div class="hero">
    <h1>Welcome to Convergence</h1>
    <p>Reconstruct patrilineal lineages by testing whether SNP data, STR markers and traditional genealogy converge. Each ancestor is a research case with its own workspace.</p>
    <button class="btn" data-act="add-ancestor" style="background:var(--bronze)">+ Create an ancestor</button>
  </div>
  <div class="card"><h3>The research workflow</h3><div class="steps">${steps.map(s => `<div class="step"><b>${s[0]}</b>${s[1]}</div>`).join('')}</div></div>
  <h2>Your ancestors</h2>
  ${S.ancestors.length ? `<div class="anc-cards">${cards}</div>` : '<p class="muted">No ancestors yet. Create your first ancestor to start a research case.</p>'}`;
}

function renderAncestor(a) {
  const st = [['SNP', snpStatus(a)], ['STR', strStatus(a)], ['Genealogy', genealogyStatus(a)]];
  const tabs = TABS.map((t, i) => `<button class="tab${view.tab === t[0] ? ' active' : ''}" data-act="tab" data-tab="${t[0]}"><span class="num">${i + 1}</span>${t[1]}</button>`).join('');
  const body = {
    checklist: tabChecklist, overview: tabOverview, documents: tabDocuments, testers: tabTesters, snp: tabSNP,
    str: tabSTR, alignment: tabAlignment, convergence: tabConvergence, report: tabReport
  }[view.tab] || tabOverview;
  return `
  <div class="anc-header">
    <div><h1>${esc(a.name || 'Unnamed ancestor')}</h1>
      <div class="anc-meta">${esc(lifeYears(a))}${a.place ? ' · ' + esc(a.place) : ''}</div></div>
    <div class="mini-lights">${st.map(s => `<span><i class="dot ${s[1].c}"></i>${s[0]}</span>`).join('')}</div>
  </div>
  <div class="tabs">${tabs}</div>
  ${body(a)}`;
}

/* ----- Tab 1: Overview ----- */
function tabOverview(a) {
  const st = [['SNP evidence', snpStatus(a)], ['STR evidence', strStatus(a)], ['Genealogical evidence', genealogyStatus(a)]];
  const v = verdict(a), ns = nextStep(a), shared = sharedSNP(a.testers);
  return `
  <div class="card">
    <div class="card-head"><h3>Convergence status</h3><span class="hint">${openConflicts(a)} open conflict(s)</span></div>
    <div class="lights">${st.map(s => `<div class="light"><div class="light-top"><i class="dot ${s[1].c}"></i>${s[0]}</div><p>${esc(s[1].msg)}</p></div>`).join('')}</div>
    <div class="verdict ${v.c}"><div><b>${esc(v.title)}</b><div class="hint">${esc(v.msg)}</div></div></div>
    <div class="next-step"><span class="muted">Next step:</span> ${esc(ns.text)} <button class="btn small ghost" data-act="tab" data-tab="${ns.tab}">Go →</button></div>
  </div>
  <div class="card">
    <h3>Ancestor details</h3>
    <div class="grid3">
      ${field('Name', 'name', a.name, { ph: 'e.g. Alexander Joyce' })}
      ${field('Birth year', 'birth', a.birth, { type: 'number', ph: 'e.g. 1720' })}
      ${field('Death year', 'death', a.death, { type: 'number', ph: 'e.g. 1778' })}
      ${field('Place', 'place', a.place, { ph: 'e.g. Lunenburg County, Virginia' })}
      ${field('Ancestral SNP being tested', 'targetSNP', a.targetSNP, { ph: shared ? `Shared SNP: ${shared}` : 'e.g. R-Y11201', hint: shared ? `Leave blank to use the lowest shared SNP (${esc(shared)}).` : 'The SNP you propose belongs to this ancestor.' })}
      ${field('Lineage Years Per Generation (YPG)', 'ypg', a.ypg, { type: 'number', ph: `Default ${S.settings.ypg}`, hint: 'Used for YPS and formation dates.' })}
      ${field('Research question & notes', 'notes', a.notes, { type: 'textarea', full: true, ph: 'What are you trying to prove about this ancestor?' })}
    </div>
    <div class="tbl-actions no-print"><button class="btn small danger" data-act="del-ancestor">Delete this ancestor</button></div>
  </div>`;
}

/* ----- Tab 2: Documents ----- */
const DOC_TYPES = ['Birth', 'Baptism', 'Marriage', 'Death / Burial', 'Census', 'Probate / Will', 'Land / Deed', 'Military', 'Church / Parish', 'Tax', 'Court', 'Other'];
function tabDocuments(a) {
  return `<div class="card">
    <div class="card-head"><h3>Historical documents</h3></div>
    <p class="hint">Record the traditional evidence for this ancestor: birth, marriage, death, census, probate, land, military and church records.</p>
    ${editTable('documents', [
      { k: 'type', label: 'Type', type: 'select', opts: DOC_TYPES },
      { k: 'date', label: 'Date', ph: 'e.g. 1752' },
      { k: 'place', label: 'Place', w: 160 },
      { k: 'source', label: 'Source / citation', type: 'textarea', w: 200 },
      { k: 'notes', label: 'What it shows', type: 'textarea', w: 200 }
    ], a.documents, { addLabel: 'Add document', empty: 'No documents yet.' })}
  </div>`;
}

/* ----- Tab 3: Testers & DNA ----- */
const TEST_TYPES = ['Big Y-700', 'Y-111', 'Y-67', 'Y-37', 'SNP pack', 'Other'];
function tabTesters(a) {
  return `<div class="card">
    <div class="card-head"><h3>Testers descending from ${esc(a.name || 'this ancestor')}</h3></div>
    <p class="hint">Enter each tester's SNP path starting with their terminal SNP and moving upstream, separated by commas (e.g. <span class="mono">FTB42619, MF109215, Y11201</span>). Generations = number of generations from the tester back to this ancestor.</p>
    ${editTable('testers', [
      { k: 'label', label: 'Tester', ph: 'e.g. Tester C' },
      { k: 'line', label: 'Earliest documented ancestor', w: 170 },
      { k: 'birth', label: 'Birth year', type: 'number', w: 90 },
      { k: 'generations', label: 'Generations', type: 'number', w: 90 },
      { k: 'test', label: 'Test', type: 'select', opts: TEST_TYPES },
      { k: 'path', label: 'SNP path (terminal → upstream)', type: 'textarea', w: 230 },
      { k: 'location', label: 'Location', w: 140 }
    ], a.testers, { addLabel: 'Add tester', empty: 'No testers yet.' })}
  </div>
  <div class="card">
    <h3>STR marker values (optional)</h3>
    <p class="hint">Paste each tester's STR values as <span class="mono">MARKER=value</span>, one per line or separated by commas (e.g. <span class="mono">DYS393=13, DYS390=24, DYS385=11-14</span>). Genetic Distance is then calculated automatically on the STR Analysis tab.</p>
    ${editTable('testers', [
      { k: 'label', label: 'Tester', type: 'calc', render: r => esc(testerLabel(r)) },
      { k: 'str', label: 'STR values', type: 'textarea', w: 420, ph: 'DYS393=13\nDYS390=24\nDYS19=14' },
      { k: 'strcount', label: 'Markers read', type: 'calc', render: r => String(parseSTR(r.str).size) }
    ], a.testers, { noDelete: true, empty: 'Add testers above first.' })}
  </div>`;
}

/* ----- Tab 4: SNP Analysis ----- */
function lineageTree(a) {
  const tgt = targetSNP(a);
  const root = { children: new Map(), testers: [] };
  a.testers.forEach(t => {
    const p = pathOf(t).slice().reverse();
    if (!p.length) return;
    let node = root;
    p.forEach(s => {
      const k = normSNP(s);
      if (!node.children.has(k)) node.children.set(k, { name: s, children: new Map(), testers: [] });
      node = node.children.get(k);
    });
    node.testers.push(testerLabel(t));
  });
  if (!root.children.size) return '<p class="muted">Add SNP paths on the Testers & DNA tab to draw the lineage map.</p>';
  const draw = node => `<ul>${[...node.children.values()].map(c =>
    `<li><span class="snp-node${tgt && normSNP(c.name) === normSNP(tgt) ? ' target' : ''}">${esc(c.name)}</span>${c.testers.map(x => `<span class="tester-tag">${esc(x)}</span>`).join('')}${c.children.size ? draw(c) : ''}</li>`).join('')}</ul>`;
  return `<div class="tree">${draw(root)}</div><p class="hint" style="margin-top:8px">Oldest SNP at the top. The highlighted SNP is the ancestral SNP being tested.</p>`;
}
function tabSNP(a) {
  const tgt = targetSNP(a), shared = sharedSNP(a.testers);
  const ts = a.testers;
  const rows = ts.map(t => genRow(a, t));
  return `
  <div class="card">
    <div class="card-head"><h3>SNP Structure Analysis</h3>${tgt ? pill('', 'Ancestral SNP: ' + tgt) : ''}</div>
    <p class="hint">Lowest SNP shared by all testers: <b>${esc(shared || '—')}</b>. Assign each SNP to a documented ancestor where the evidence supports it.</p>
    ${editTable('testers', [
      { k: 'l', label: 'Tester', type: 'calc', render: r => esc(testerLabel(r)) },
      { k: 'term', label: 'Terminal SNP', type: 'calc', render: r => esc(pathOf(r)[0] || '—') },
      { k: 'sh', label: 'Shared SNP', type: 'calc', render: r => shared ? esc(shared) : '—' },
      { k: 'up', label: 'Upstream SNP', type: 'calc', render: r => shared ? esc(upstreamOf(r, shared)) : '—' },
      { k: 'carries', label: `Carries ${tgt || 'ancestral SNP'}?`, type: 'calc', render: r => tgt ? ynPill(carriesSNP(r, tgt)) : '—' },
      { k: 'assigned', label: 'Assigned ancestor', w: 170, ph: 'Ancestor for terminal SNP' }
    ], ts, { noDelete: true, empty: 'Add testers on the Testers & DNA tab.' })}
  </div>
  <div class="card"><h3>SNP Lineage Map</h3>${lineageTree(a)}</div>
  <div class="card">
    <div class="card-head"><h3>Generational Estimation Analysis</h3><span class="hint">Lineage YPG: ${fmt(lineageYPG(a))}</span></div>
    <div class="formula">GPS = Generations ÷ SNPs · YPS = GPS × YPG · Years = Generations × YPG · SNP formation = Birth year − (SNPs × YPS)</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th>Tester</th><th>SNP count</th><th>Generations</th><th>GPS</th><th>YPG</th><th>Estimated years</th><th>YPS</th><th>Est. formation of ${esc(tgt || 'SNP')}</th><th>vs ancestor birth</th>
    </tr></thead><tbody>${rows.length ? rows.map(r => `<tr>
      <td style="white-space:nowrap">${esc(testerLabel(r.t))}</td>
      <td style="width:90px;min-width:80px"><input type="number" data-coll="testers" data-id="${esc(r.t.id)}" data-k="snpCount" value="${esc(r.t.snpCount || '')}" placeholder="${r.snps != null && num(r.t.snpCount) == null ? r.snps : 'auto'}"></td>
      <td class="calc">${r.gens == null ? '—' : r.gens}</td>
      <td class="calc">${fmt(r.gps)} ${r.gpsOK === false ? pill('amber', 'outside ' + S.settings.gpsMin + '–' + S.settings.gpsMax) : ''}</td>
      <td class="calc">${fmt(r.ypg)}</td>
      <td class="calc">${fmt(r.years, 0)}</td>
      <td class="calc">${fmt(r.yps, 0)}</td>
      <td class="calc">${yearFmt(r.formation)}</td>
      <td class="calc">${r.diff == null ? '—' : (r.diff > 0 ? '+' : '') + Math.round(r.diff) + ' yrs ' + (r.aligned ? pill('green', 'aligned') : pill('red', 'outside 1 SNP interval'))}</td>
    </tr>`).join('') : '<tr><td class="empty" colspan="9">Add testers first.</td></tr>'}</tbody></table></div>
    <p class="hint" style="margin-top:8px">SNP count is counted automatically from the tester's terminal SNP to the ancestral SNP (inclusive); type a number to override. Expected GPS range: ${S.settings.gpsMin}–${S.settings.gpsMax}. A formation date within one SNP interval (± YPS) of the documented birth year is treated as aligned.</p>
    ${rows.filter(r => r.yps != null && r.tb != null && r.snps).map(r => {
      const p = pathOf(r.t);
      const steps = [];
      for (let i = 0; i < r.snps; i++) steps.push(`<li><b>${esc(p[i] || 'SNP ' + (i + 1))}</b> ≈ ${Math.round(r.tb - (i + 1) * r.yps)}</li>`);
      return `<details style="margin-top:10px"><summary>SNP timeline for ${esc(testerLabel(r.t))}</summary><ol class="timeline">${steps.join('')}</ol></details>`;
    }).join('')}
  </div>`;
}

/* ----- Tab 5: STR Analysis ----- */
function tabSTR(a) {
  const opts = [{ v: '', l: '— choose —' }].concat(a.testers.map(t => ({ v: t.id, l: testerLabel(t) })));
  const rows = a.gdPairs.map(p => ({ p, e: pairEval(a, p) }));
  return `
  <div class="card">
    <h3>Genetic Distance Analysis</h3>
    <p class="hint">Choose two testers. If both have STR values entered, GD and markers compared are calculated automatically (one step per unit of difference). Type a GD to override — for example, to use the GD reported by FamilyTreeDNA.</p>
    ${editTable('gdPairs', [
      { k: 'a', label: 'Tester A', type: 'select', opts },
      { k: 'b', label: 'Tester B', type: 'select', opts },
      { k: 'markers', label: 'Markers', type: 'number', w: 80, ph: 'auto' },
      { k: 'gd', label: 'GD', type: 'number', w: 70, ph: 'auto' },
      { k: 'res', label: 'Calculated', type: 'calc', render: r => { const e = pairEval(a, r); return e.auto ? `GD ${e.auto.gd} / ${e.auto.compared}` : '—'; } },
      { k: 'expMin', label: 'Expected min', type: 'number', w: 80 },
      { k: 'expMax', label: 'Expected max', type: 'number', w: 80 },
      { k: 'within', label: 'Within range?', type: 'calc', render: r => ynPill(pairEval(a, r).within) },
      { k: 'interp', label: 'Interpretation', type: 'textarea', w: 220, ph: 'e.g. Close match; differences on fast markers' }
    ], a.gdPairs, { addLabel: 'Add comparison', empty: 'No comparisons yet.' })}
  </div>
  ${rows.filter(r => r.e.auto && r.e.auto.diffs.length).map(r => `
  <div class="card">
    <h3>Differing markers: ${esc(testerLabel(r.e.ta))} vs ${esc(testerLabel(r.e.tb))}</h3>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Marker</th><th>${esc(testerLabel(r.e.ta))}</th><th>${esc(testerLabel(r.e.tb))}</th><th>Difference</th></tr></thead>
    <tbody>${r.e.auto.diffs.map(d => `<tr><td class="mono">${esc(d.marker)}</td><td>${esc(d.a)}</td><td>${esc(d.b)}</td><td>${d.d}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint" style="margin-top:8px">Consider whether the differences fall on fast- or slow-mutating markers: differences on fast markers reflect recent variation, while differences on slow markers carry more genealogical weight.</p>
  </div>`).join('')}`;
}

/* ----- Tab 6: Alignment ----- */
function tabAlignment(a) {
  return `<div class="card">
    <h3>Genealogy Alignment Analysis</h3>
    <p class="hint">For each tester, does the documented genealogy match what the DNA shows?</p>
    ${editTable('testers', [
      { k: 'l', label: 'Tester', type: 'calc', render: r => esc(testerLabel(r)) },
      { k: 'line', label: 'Earliest ancestor', w: 170 },
      { k: 'location', label: 'Location', w: 150 },
      { k: 'matches', label: 'Matches DNA?', type: 'select', opts: [{ v: '', l: '—' }, { v: 'Y', l: 'Yes' }, { v: 'N', l: 'No' }] },
      { k: 'conflicts', label: 'Conflicts', type: 'textarea', w: 240, ph: 'Gaps, conflicting records, possible NPE…' }
    ], a.testers, { noDelete: true, empty: 'Add testers on the Testers & DNA tab.' })}
  </div>`;
}

/* ----- Tab 7: Convergence ----- */
const CONFLICT_TYPES = ['SNP mismatch', 'STR / GD outside range', 'Genetic match vs missing genealogy', 'Genealogical claim vs genetic rejection', 'Possible non-paternal event (NPE)', 'Incomplete STR panel', 'MRCA inconsistency', 'SNP date vs birth year', 'Geographic mismatch', 'Other'];
function autoEvidence(a) {
  const tgt = targetSNP(a);
  const ts = a.testers.filter(t => pathOf(t).length);
  const rows = ts.map(t => genRow(a, t));
  const pairs = a.gdPairs.map(p => pairEval(a, p));
  const carriers = ts.filter(t => carriesSNP(t, tgt)).length;
  const yn = arr => arr.length ? (arr.every(x => x === true) ? true : arr.some(x => x === false) ? false : null) : null;
  return [
    { key: 'snp', type: 'SNP inheritance', result: tgt ? `${carriers} of ${ts.length} tester(s) carry ${tgt}` : 'No ancestral SNP set', ok: tgt && ts.length ? carriers === ts.length : null },
    { key: 'gps', type: 'Generational consistency (GPS)', result: rows.filter(r => r.gps != null).map(r => `${testerLabel(r.t)}: ${fmt(r.gps)}`).join(', ') || '—', ok: yn(rows.map(r => r.gpsOK).filter(x => x != null)) },
    { key: 'date', type: 'SNP formation vs documented birth', result: rows.filter(r => r.diff != null).map(r => `${testerLabel(r.t)}: ${r.diff > 0 ? '+' : ''}${Math.round(r.diff)} yrs`).join(', ') || '—', ok: yn(rows.map(r => r.aligned).filter(x => x != null)) },
    { key: 'str', type: 'STR genetic distance', result: pairs.filter(e => e.gd != null).map(e => `${testerLabel(e.ta)}–${testerLabel(e.tb)}: GD ${e.gd}`).join(', ') || '—', ok: yn(pairs.map(e => e.within).filter(x => x != null)) },
    { key: 'gen', type: 'Genealogy alignment', result: a.testers.length ? `${a.testers.filter(t => t.matches === 'Y').length} of ${a.testers.length} match the DNA` : '—', ok: a.testers.length && a.testers.every(t => t.matches) ? a.testers.every(t => t.matches === 'Y') : (a.testers.some(t => t.matches === 'N') ? false : null) }
  ];
}
function tabConvergence(a) {
  const ev = autoEvidence(a), v = verdict(a);
  const ovOpts = [['', 'Auto'], ['Y', 'Yes'], ['N', 'No']];
  return `
  <div class="card">
    <h3>Convergence Analysis</h3>
    <p class="hint">Convergence is the alignment of SNP data, STR results and genealogy within expected ranges. Results are filled in from the other tabs; use “Consistent?” to override where your judgment differs.</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Evidence type</th><th>Result</th><th>Auto</th><th>Consistent?</th><th>Notes</th></tr></thead><tbody>
    ${ev.map(e => { const c = a.conv[e.key] || {}; return `<tr>
      <td><b>${esc(e.type)}</b></td><td>${esc(e.result)}</td><td class="calc">${ynPill(e.ok)}</td>
      <td><select data-conv="${e.key}" data-f="ov">${ovOpts.map(o => `<option value="${o[0]}"${(c.ov || '') === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></td>
      <td style="min-width:200px"><textarea data-conv="${e.key}" data-f="note">${esc(c.note || '')}</textarea></td></tr>`; }).join('')}
    </tbody></table></div>
    <h3 style="margin-top:18px">Additional evidence</h3>
    ${editTable('extraEvidence', [
      { k: 'type', label: 'Evidence type', ph: 'e.g. Geographic origin, historical context' , w: 180 },
      { k: 'result', label: 'Result', type: 'textarea', w: 240 },
      { k: 'ok', label: 'Consistent?', type: 'select', opts: [{ v: '', l: '—' }, { v: 'Y', l: 'Yes' }, { v: 'N', l: 'No' }] }
    ], a.extraEvidence, { addLabel: 'Add evidence', empty: 'Optional: geography, migration, historical context.' })}
    <div class="verdict ${v.c}"><div><b>${esc(v.title)}</b><div class="hint">${esc(v.msg)}</div></div></div>
  </div>
  <div class="card">
    <h3>Conflict Resolution Analysis</h3>
    <p class="hint">Where the evidence does not align, record the conflict and reassess SNPs, STRs and genealogy. SNP data serves as the foundation, STRs add supporting detail, and genealogy and historical context refine the conclusion.</p>
    ${editTable('conflicts', [
      { k: 'type', label: 'Conflict type', type: 'select', opts: CONFLICT_TYPES },
      { k: 'source', label: 'Source', type: 'textarea', w: 170 },
      { k: 'cause', label: 'Possible cause', type: 'textarea', w: 190 },
      { k: 'path', label: 'Resolution path', type: 'textarea', w: 210 },
      { k: 'status', label: 'Status', type: 'select', opts: ['Open', 'Resolved'] }
    ], a.conflicts, { addLabel: 'Add conflict', empty: 'No conflicts recorded.' })}
  </div>`;
}
/* ----- Tab 8: Report ----- */
function simpleTable(head, rows) {
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td class="empty" colspan="${head.length}">None recorded.</td></tr>`}</tbody></table></div>`;
}
function tabReport(a) {
  const v = verdict(a), tgt = targetSNP(a), shared = sharedSNP(a.testers);
  const rows = a.testers.map(t => genRow(a, t));
  const ev = autoEvidence(a);
  const today = new Date().toLocaleDateString();
  return `<div class="card report">
    <div class="card-head no-print"><span class="hint">A printable summary of this research case.</span><button class="btn small" data-act="print">Print / Save as PDF</button></div>
    <h1>${esc(a.name || 'Unnamed ancestor')}</h1>
    <p class="muted">${esc(lifeYears(a))}${a.place ? ' · ' + esc(a.place) : ''} · Report generated ${esc(today)}</p>
    ${a.notes ? `<p>${esc(a.notes)}</p>` : ''}
    <div class="verdict ${v.c}"><div><b>${esc(v.title)}</b><div class="hint">${esc(v.msg)}</div></div></div>
    <h2>Documents</h2>
    ${simpleTable(['Type', 'Date', 'Place', 'Source', 'What it shows'], a.documents.map(d => [esc(d.type), esc(d.date), esc(d.place), esc(d.source), esc(d.notes)]))}
    <h2>SNP Structure</h2>
    <p>Ancestral SNP tested: <b>${esc(tgt || '—')}</b> · Lowest shared SNP: <b>${esc(shared || '—')}</b></p>
    ${simpleTable(['Tester', 'Earliest ancestor', 'Terminal SNP', 'SNP path', 'Assigned ancestor'], a.testers.map(t => [esc(testerLabel(t)), esc(t.line), esc(pathOf(t)[0] || '—'), esc(pathOf(t).join(' › ')), esc(t.assigned)]))}
    <h2>Generational Estimation</h2>
    ${simpleTable(['Tester', 'SNPs', 'Generations', 'GPS', 'YPG', 'YPS', 'Est. formation', 'vs birth'], rows.map(r => [esc(testerLabel(r.t)), r.snps == null ? '—' : r.snps, r.gens == null ? '—' : r.gens, fmt(r.gps), fmt(r.ypg), fmt(r.yps, 0), yearFmt(r.formation), r.diff == null ? '—' : Math.round(r.diff) + ' yrs']))}
    <h2>Genetic Distance</h2>
    ${simpleTable(['Pair', 'Markers', 'GD', 'Expected range', 'Within?', 'Interpretation'], a.gdPairs.map(p => { const e = pairEval(a, p); return [esc(testerLabel(e.ta) + ' – ' + testerLabel(e.tb)), e.markers == null ? '—' : e.markers, e.gd == null ? '—' : e.gd, e.min != null && e.max != null ? `${e.min}–${e.max}` : '—', ynPill(e.within), esc(p.interp)]; }))}
    <h2>Genealogy Alignment</h2>
    ${simpleTable(['Tester', 'Earliest ancestor', 'Location', 'Matches DNA?', 'Conflicts'], a.testers.map(t => [esc(testerLabel(t)), esc(t.line), esc(t.location), t.matches === 'Y' ? 'Yes' : t.matches === 'N' ? 'No' : '—', esc(t.conflicts)]))}
    <h2>Convergence Analysis</h2>
    ${simpleTable(['Evidence type', 'Result', 'Consistent?', 'Notes'], ev.map(e => { const c = a.conv[e.key] || {}; const ok = c.ov === 'Y' ? true : c.ov === 'N' ? false : e.ok; return [esc(e.type), esc(e.result), ynPill(ok), esc(c.note)]; }).concat(a.extraEvidence.map(x => [esc(x.type), esc(x.result), x.ok === 'Y' ? ynPill(true) : x.ok === 'N' ? ynPill(false) : ynPill(null), ''])))}
    <h2>Conflicts</h2>
    ${simpleTable(['Type', 'Source', 'Possible cause', 'Resolution path', 'Status'], a.conflicts.map(c => [esc(c.type), esc(c.source), esc(c.cause), esc(c.path), esc(c.status || 'Open')]))}
    <p class="hint" style="margin-top:18px">All conclusions should be considered provisional pending new genetic or documentary evidence.</p>
  </div>`;
}

/* ---------- Quick Calculators ---------- */
function calcCard(id, title, formula, inputs, extra = '') {
  return `<div class="card" data-calc="${id}"><h3>${title}</h3><div class="formula">${formula}</div>
    <div class="grid2">${inputs.map(i => `<div class="field${i.full ? ' full' : ''}"><label>${i.label}</label>${i.type === 'textarea'
      ? `<textarea data-in="${i.k}" placeholder="${esc(i.ph || '')}"></textarea>`
      : `<input data-in="${i.k}" type="${i.type || 'number'}" placeholder="${esc(i.ph || '')}">`}</div>`).join('')}</div>
    ${extra}<div class="calc-out" data-out>—</div></div>`;
}
function renderCalcs() {
  return `<h1>Quick Calculators</h1>
  <p class="muted">The SNP and STR formulas from <i>Y-DNA Lineage Reconstruction</i>. Inside an ancestor's workspace these run automatically from your tester data.</p>
  <h2 style="margin-top:20px">Y-DNA (SNP)</h2>
  <div class="calc-grid">
    ${calcCard('ypg', 'Years Per Generation (YPG)', 'YPG = Total years ÷ Number of generations', [{ k: 'years', label: 'Total years', ph: '345' }, { k: 'gens', label: 'Generations', ph: '10' }])}
    ${calcCard('gps', 'Generations Per SNP (GPS)', 'GPS = Generations ÷ SNPs', [{ k: 'gens', label: 'Generations', ph: '10' }, { k: 'snps', label: 'SNPs', ph: '3' }])}
    ${calcCard('yps', 'Years Per SNP (YPS)', 'YPS = GPS × YPG', [{ k: 'gps', label: 'GPS', ph: '3.3' }, { k: 'ypg', label: 'YPG', ph: '34.5' }])}
    ${calcCard('birth', 'Estimated SNP Birth Year', 'Birth Year = Reference Year − (SNPs × YPS)', [{ k: 'ref', label: 'Reference year (tester\'s birth)', ph: '1954' }, { k: 'yps', label: 'YPS', ph: '115' }, { k: 'snps', label: 'SNPs back', ph: '3' }])}
    ${calcCard('gendist', 'Generational Distance from SNP', 'Generations = SNPs × GPS', [{ k: 'snps', label: 'SNPs', ph: '3' }, { k: 'gps', label: 'GPS', ph: '3.3' }])}
    ${calcCard('genyears', 'Years from Generations', 'Years = Generations × YPG', [{ k: 'gens', label: 'Generations', ph: '10' }, { k: 'ypg', label: 'YPG', ph: '34.5' }])}
    ${calcCard('align', 'SNP Date vs Documented Birth Year', 'Aligned when |SNP date − birth year| ≤ one SNP interval (YPS)', [{ k: 'snp', label: 'Estimated SNP date', ph: '1724' }, { k: 'birth', label: 'Documented birth year', ph: '1720' }, { k: 'yps', label: 'YPS', ph: '115' }])}
    ${calcCard('mrca', 'Lowest Shared SNP (MRCA)', 'The first SNP in Tester A\'s path that also appears in Tester B\'s path', [{ k: 'a', label: 'Tester A path (terminal → upstream)', type: 'textarea', full: true, ph: 'FTB42619, MF109215, Y11201' }, { k: 'b', label: 'Tester B path (terminal → upstream)', type: 'textarea', full: true, ph: 'Y43252, Y11201' }])}
  </div>
  <h2 style="margin-top:24px">STR markers</h2>
  <div class="calc-grid">
    ${calcCard('gd', 'Genetic Distance (GD)', 'GD = total differences across all compared STR markers', [{ k: 'a', label: 'Tester A markers', type: 'textarea', full: true, ph: 'DYS439=11\nDYS458=17' }, { k: 'b', label: 'Tester B markers', type: 'textarea', full: true, ph: 'DYS439=12\nDYS458=18' }])}
  </div>`;
}
function runCalc(card) {
  const id = card.dataset.calc;
  const g = k => { const el = card.querySelector(`[data-in="${k}"]`); return el ? el.value : ''; };
  const n = k => num(g(k));
  const out = card.querySelector('[data-out]');
  const big = v => `<div class="big">${v}</div>`;
  let html = '<span class="muted">Enter values above.</span>';
  const has = (...ks) => ks.every(k => n(k) != null);
  switch (id) {
    case 'ypg': if (has('years', 'gens') && n('gens')) html = big(fmt(n('years') / n('gens'), 2)) + 'years per generation'; break;
    case 'gps': if (has('gens', 'snps') && n('snps')) { const v = n('gens') / n('snps'); html = big(fmt(v, 2)) + `generations per SNP ${v >= S.settings.gpsMin && v <= S.settings.gpsMax ? pill('green', 'within expected ' + S.settings.gpsMin + '–' + S.settings.gpsMax) : pill('amber', 'outside expected ' + S.settings.gpsMin + '–' + S.settings.gpsMax)}`; } break;
    case 'yps': if (has('gps', 'ypg')) html = big(fmt(n('gps') * n('ypg'), 1)) + 'years per SNP'; break;
    case 'birth': if (has('ref', 'yps', 'snps')) {
      const steps = []; for (let i = 1; i <= Math.min(n('snps'), 50); i++) steps.push(`<li>SNP ${i} ≈ ${Math.round(n('ref') - i * n('yps'))}</li>`);
      html = big('c. ' + Math.round(n('ref') - n('snps') * n('yps'))) + `estimated formation year<ol class="timeline">${steps.join('')}</ol>`;
    } break;
    case 'gendist': if (has('snps', 'gps')) html = big(fmt(n('snps') * n('gps'), 1)) + 'generations'; break;
    case 'genyears': if (has('gens', 'ypg')) html = big(fmt(n('gens') * n('ypg'), 0)) + 'years'; break;
    case 'align': if (has('snp', 'birth', 'yps')) { const d = n('snp') - n('birth'); const ok = Math.abs(d) <= n('yps'); html = big((d > 0 ? '+' : '') + Math.round(d) + ' years') + (ok ? pill('green', 'Aligned — within one SNP interval') : pill('red', 'Not aligned — outside one SNP interval')); } break;
    case 'mrca': if (g('a').trim() && g('b').trim()) {
      const pa = pathOf({ path: g('a') }), pb = pathOf({ path: g('b') }).map(normSNP);
      const idx = pa.findIndex(s => pb.includes(normSNP(s)));
      if (idx < 0) html = pill('red', 'No shared SNP found in these paths');
      else { const ib = pb.indexOf(normSNP(pa[idx])); html = big(esc(pa[idx])) + `lowest shared SNP · ${idx + 1} SNP(s) back for Tester A, ${ib + 1} for Tester B`; }
    } break;
    case 'gd': if (g('a').trim() && g('b').trim()) {
      const r = strCompare(g('a'), g('b'));
      if (!r) html = '<span class="muted">Could not read markers. Use MARKER=value, one per line.</span>';
      else html = big('GD ' + r.gd) + `across ${r.compared} compared marker(s)` + (r.diffs.length ? `<ol class="timeline">${r.diffs.map(d => `<li><span class="mono">${esc(d.marker)}</span>: ${esc(d.a)} vs ${esc(d.b)} → ${d.d}</li>`).join('')}</ol>` : '');
    } break;
    /* Autosomal */
    case 'cm': if (has('cm')) html = cmRelationships(n('cm')); break;
    case 'contrib': if (has('gens') && n('gens') >= 1) { const g2 = n('gens'); const pct = 100 / Math.pow(2, g2); html = big(fmt(pct, pct < 1 ? 3 : 2) + '%') + `expected DNA from one ancestor ${g2} generation(s) back · about ${fmt(AUTO_CM * 2 * pct / 100, 0)} cM of the ~${AUTO_CM * 2} cM total`; } break;
    case 'survival': if (has('obs', 'gens') && n('gens') >= 1) { const exp = AUTO_CM * 2 / Math.pow(2, n('gens')); const ratio = n('obs') / exp; html = big(fmt(ratio, 2)) + `observed ÷ expected (${fmt(exp, 0)} cM expected) · ${ratio >= 1 ? 'more DNA survived than average' : 'less DNA survived than average'}`; } break;
    case 'segments': if (g('segs').trim()) html = segmentOverlaps(g('segs')); break;
  }
  out.innerHTML = html;
}

/* ---------- Autosomal tools ---------- */
const AUTO_CM = 3400; /* approximate cM per parental copy of the autosomes */
/* Approximate averages and ranges, based on the Shared cM Project. Verify at dnapainter.com/tools/sharedcmv4 */
const CM_TABLE = [
  ['Parent / Child', 3485, 2376, 3720], ['Full sibling', 2613, 1613, 3488], ['Grandparent / Half sibling / Aunt / Uncle', 1759, 1160, 2436],
  ['Great-grandparent', 887, 485, 1486], ['Great-aunt / uncle', 850, 330, 1467], ['1st cousin', 866, 396, 1397],
  ['Half 1st cousin', 449, 156, 979], ['1st cousin once removed', 433, 102, 980], ['Half 1st cousin once removed', 224, 57, 526],
  ['2nd cousin', 229, 41, 592], ['2nd cousin once removed', 122, 14, 353], ['Half 2nd cousin', 120, 9, 397],
  ['3rd cousin', 73, 0, 234], ['3rd cousin once removed', 48, 0, 192], ['4th cousin', 35, 0, 139]
];
function cmRelationships(cm) {
  const fits = CM_TABLE.filter(r => cm >= r[2] && cm <= r[3]).sort((x, y) => Math.abs(x[1] - cm) - Math.abs(y[1] - cm));
  if (!fits.length) return '<span class="muted">No relationship in the table covers this amount.</span>';
  return `<div class="big">${fits.length} possible relationship(s)</div><table class="tbl" style="margin-top:6px"><thead><tr><th>Relationship</th><th>Average</th><th>Range</th></tr></thead><tbody>${fits.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}–${r[3]}</td></tr>`).join('')}</tbody></table><div class="hint" style="margin-top:6px">Closest average listed first. Approximate figures based on the Shared cM Project.</div>`;
}
function segmentOverlaps(text) {
  const segs = [];
  text.split(/\n+/).forEach(line => {
    const p = line.split(/[,\t;]+/).map(s => s.trim());
    if (p.length < 3) return;
    const chr = p[0].toUpperCase().replace(/^CHR/, ''), start = num(p[1].replace(/,/g, '')), end = num(p[2].replace(/,/g, ''));
    if (start == null || end == null) return;
    segs.push({ chr, start: Math.min(start, end), end: Math.max(start, end), who: p[3] || `Match ${segs.length + 1}` });
  });
  if (segs.length < 2) return '<span class="muted">Enter at least two segments: chromosome, start, end, match name.</span>';
  const out = [];
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const a = segs[i], b = segs[j];
    if (a.chr !== b.chr) continue;
    const s = Math.max(a.start, b.start), e = Math.min(a.end, b.end);
    if (s < e) out.push(`<tr><td>${esc(a.chr)}</td><td>${esc(a.who)} + ${esc(b.who)}</td><td>${s.toLocaleString()}–${e.toLocaleString()}</td></tr>`);
  }
  if (!out.length) return pill('amber', 'No overlapping segments found');
  return `<div class="big">${out.length} overlap(s)</div><table class="tbl" style="margin-top:6px"><thead><tr><th>Chr</th><th>Matches</th><th>Overlap</th></tr></thead><tbody>${out.join('')}</tbody></table><div class="hint" style="margin-top:6px">Overlapping segments may descend from the same ancestor — confirm with triangulation.</div>`;
}
function renderAutosomal() {
  return `<h1>Autosomal DNA Tools</h1>
  <p class="muted">Supporting tools for autosomal DNA. Figures are approximate averages.</p>
  <div class="calc-grid" style="margin-top:16px">
    ${calcCard('cm', 'Shared cM Calculator', 'Possible relationships for an amount of shared DNA', [{ k: 'cm', label: 'Shared cM', ph: '850' }])}
    ${calcCard('contrib', 'Ancestral DNA Contribution', 'Expected share = 100% ÷ 2^generations', [{ k: 'gens', label: 'Generations back (parent = 1)', ph: '4' }])}
    ${calcCard('survival', 'Segment Survival Ratio', 'Ratio = observed cM ÷ expected cM from the ancestor', [{ k: 'obs', label: 'Observed cM from ancestor', ph: '300' }, { k: 'gens', label: 'Generations back (parent = 1)', ph: '4' }])}
    ${calcCard('segments', 'Ancestor Segment Alignment', 'Finds overlapping segments between matches', [{ k: 'segs', label: 'Segments: chromosome, start, end, match (one per line)', type: 'textarea', full: true, ph: '7, 12000000, 34000000, John\n7, 20000000, 40000000, Mary' }])}
  </div>`;
}

/* ---------- Settings ---------- */
function renderSettings() {
  const s = S.settings;
  return `<h1>Settings &amp; Backup</h1>
  <div class="card"><h3>Research defaults</h3>
    <div class="grid3">
      ${field('Default Years Per Generation (YPG)', 'ypg', s.ypg, { attr: 'data-set', type: 'number', hint: 'Used when an ancestor has no lineage YPG.' })}
      ${field('Expected GPS — minimum', 'gpsMin', s.gpsMin, { attr: 'data-set', type: 'number' })}
      ${field('Expected GPS — maximum', 'gpsMax', s.gpsMax, { attr: 'data-set', type: 'number' })}
    </div></div>
  <div class="card"><h3>Backup</h3>
    <p class="hint">Your research is saved in this browser on this device. Export a backup file regularly, and import it to move your research to another device.</p>
    <div class="tbl-actions">
      <button class="btn" data-act="export">Export backup</button>
      <button class="btn ghost" data-act="import">Import backup</button>
      <input type="file" id="import-file" accept=".json,application/json" hidden>
    </div></div>
  <div class="card"><h3>About</h3>
    <p class="hint">Convergence applies the methods of <i>Y-DNA Lineage Reconstruction: Theory and Application</i> by David C. Joyce. All conclusions should remain open to revision as new evidence emerges.</p></div>`;
}
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `convergence-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = normalizeData(JSON.parse(reader.result));
      if (!confirm(`Replace your current research with this backup (${d.ancestors.length} ancestor(s))?`)) return;
      S = d; saveData(); view = { page: 'home', id: null, tab: 'overview' }; render();
    } catch (e) { alert('That file is not a valid Convergence backup.'); }
  };
  reader.readAsText(file);
}

/* ---------- Events ---------- */
function newRow(coll) {
  const r = { id: uid() };
  if (coll === 'documents') r.type = DOC_TYPES[0];
  if (coll === 'testers') { r.label = 'Tester ' + String.fromCharCode(65 + (cur().testers.length % 26)); r.test = TEST_TYPES[0]; }
  if (coll === 'conflicts') { r.type = CONFLICT_TYPES[0]; r.status = 'Open'; }
  if (coll === 'limits') { r.type = LIMIT_TYPES[0]; }
  return r;
}
/* Remember which field had focus so it survives a re-render. */
function focusKey(el) {
  if (!el || !el.dataset) return null;
  const d = el.dataset;
  if (d.coll) return `[data-coll="${d.coll}"][data-id="${d.id}"][data-k="${d.k}"]`;
  if (d.anc) return `[data-anc="${d.anc}"]`;
  if (d.set) return `[data-set="${d.set}"]`;
  if (d.conv) return `[data-conv="${d.conv}"][data-f="${d.f}"]`;
  if (d.check) return `[data-check="${d.check}"]`;
  return null;
}
function rerenderKeepFocus() {
  setTimeout(() => {
    const key = focusKey(document.activeElement);
    const main = document.getElementById('main');
    const scroll = window.scrollY;
    render();
    window.scrollTo(0, scroll);
    if (key) { const el = main.querySelector(key); if (el) el.focus(); }
  }, 0);
}

document.addEventListener('change', e => {
  const el = e.target, d = el.dataset;
  const a = rec();
  if (d.check && a) {
    a.checks[d.check] = el.checked;
  } else if (d.coll && a) {
    const row = (a[d.coll] || []).find(r => r.id === d.id);
    if (!row) return;
    row[d.k] = el.value;
  } else if (d.anc && a) {
    a[d.anc] = el.value;
  } else if (d.conv && a) {
    a.conv[d.conv] = a.conv[d.conv] || {};
    a.conv[d.conv][d.f] = el.value;
  } else if (d.set) {
    const v = num(el.value);
    if (v != null) S.settings[d.set] = v;
  } else if (el.id === 'import-file') {
    if (el.files && el.files[0]) importData(el.files[0]);
    return;
  } else return;
  saveData();
  rerenderKeepFocus();
});

document.addEventListener('input', e => {
  if (e.target.id === 'q') { searchText = e.target.value; renderSidebar(); return; }
  const card = e.target.closest('[data-calc]');
  if (card) runCalc(card);
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, a = rec();
  const app = document.querySelector('.app');
  switch (act) {
    case 'nav': view = { page: el.dataset.page, id: null, tab: 'overview' }; app.classList.remove('menu-open'); render(); window.scrollTo(0, 0); break;
    case 'open-ancestor': view = { page: 'ancestor', id: el.dataset.id, tab: 'overview' }; app.classList.remove('menu-open'); render(); window.scrollTo(0, 0); break;
    case 'add-ancestor': {
      const anc = fixAncestor({ id: uid(), name: 'New ancestor' });
      S.ancestors.push(anc); saveData();
      view = { page: 'ancestor', id: anc.id, tab: 'overview' }; app.classList.remove('menu-open'); render();
      const nameInput = document.querySelector('[data-anc="name"]');
      if (nameInput) { nameInput.focus(); nameInput.select(); }
      break;
    }
    case 'del-ancestor':
      if (a && confirm(`Delete ${a.name || 'this ancestor'} and all of its research? This cannot be undone.`)) {
        S.ancestors = S.ancestors.filter(x => x.id !== a.id); saveData();
        view = { page: 'home', id: null, tab: 'overview' }; render();
      }
      break;
    case 'open-project': view = { page: 'project', id: el.dataset.id, tab: 'groups' }; app.classList.remove('menu-open'); render(); window.scrollTo(0, 0); break;
    case 'add-project': {
      const p = fixProject({ id: uid(), name: 'New non-tester research' });
      S.projects.push(p); saveData();
      view = { page: 'project', id: p.id, tab: 'groups' }; render();
      const nameInput = document.querySelector('[data-anc="name"]');
      if (nameInput) { nameInput.focus(); nameInput.select(); }
      break;
    }
    case 'del-project':
      if (a && confirm(`Delete ${a.name || 'this research'}? This cannot be undone.`)) {
        S.projects = S.projects.filter(x => x.id !== a.id); saveData();
        view = { page: 'projects', id: null, tab: 'groups' }; render();
      }
      break;
    case 'tab': view.tab = el.dataset.tab; render(); break;
    case 'add-row': if (a) { a[el.dataset.coll].push(newRow(el.dataset.coll)); saveData(); render(); } break;
    case 'del-row':
      if (a && confirm('Delete this row?')) {
        a[el.dataset.coll] = a[el.dataset.coll].filter(r => r.id !== el.dataset.id);
        if (el.dataset.coll === 'testers') a.gdPairs.forEach(p => { if (p.a === el.dataset.id) p.a = ''; if (p.b === el.dataset.id) p.b = ''; });
        saveData(); render();
      }
      break;
    case 'print': window.print(); break;
    case 'export': exportData(); break;
    case 'import': document.getElementById('import-file').click(); break;
    case 'open-menu': app.classList.add('menu-open'); break;
    case 'close-menu': app.classList.remove('menu-open'); break;
  }
});

render();