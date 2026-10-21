'use strict';
/* =========================================================
   Convergence — Y-DNA Lineage Reconstruction
   Based on "Y-DNA Lineage Reconstruction: Theory and Application"
   by David C. Joyce
   ========================================================= */

const STORE_KEY = 'convergence-data-v1';
const DEFAULT_DATA = { settings: { ypg: 33, gpsMin: 3, gpsMax: 5, rateCal: 0.55 }, ancestors: [] };

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
  if (!d.snpAssign || typeof d.snpAssign !== 'object') d.snpAssign = {};
  if (!d.snpDates || typeof d.snpDates !== 'object') d.snpDates = {};
  delete d.aio;
  return d;
}
function fixAncestor(a) {
  ['documents', 'testers', 'gdPairs', 'conflicts', 'extraEvidence', 'socGens', 'atMatches'].forEach(k => {
    if (!Array.isArray(a[k])) a[k] = [];
  });
  if (!a.conv || typeof a.conv !== 'object') a.conv = {};
  if (!a.checks || typeof a.checks !== 'object') a.checks = {};
  if (!a.pairMemory || typeof a.pairMemory !== 'object') a.pairMemory = {};
  /* The "his own SNP" question has been removed: the test type (Big Y-700 or markers) now decides whether SNPs are used. */
  delete a.ownSNP; delete a.snpHelpBig;
  /* Cases made before the test was asked first count as chosen; a new ancestor picks its test before anything else. */
  if (a.testChosen === undefined) a.testChosen = true;
  if (!a.id) a.id = uid();
  /* Each test is its own case; the cases of one ancestor share a person id. */
  if (!a.pid) a.pid = a.id;
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
/* Every ancestor except the built-in example, which is reached from Start here and kept out of the lists and the SNP tree. */
function realAncestors() { return S.ancestors.filter(a => !a.example); }
/* One ancestor can have a case for each test: SNP-first, STR-first and autosomal-first. */
function casesOfPid(pid) { return S.ancestors.filter(x => x.pid === pid).sort((x, y) => ['SNP', '', 'AUTO'].indexOf(x.method || '') - ['SNP', '', 'AUTO'].indexOf(y.method || '')); }
function casesOf(a) { return casesOfPid(a.pid); }
function peopleOf(list) { const seen = []; list.forEach(a => { if (!seen.includes(a.pid)) seen.push(a.pid); }); return seen.map(casesOfPid); }
function methodName(a) { return !a.testChosen ? 'Choose a test' : a.method === 'SNP' ? 'SNP-first' : a.method === 'AUTO' ? 'Autosomal-first' : 'STR-first'; }
function dnaStatus(a) { return a.method === 'SNP' ? snpStatus(a) : a.method === 'AUTO' ? autoStatus(a) : strStatus(a); }
function dotClass(v) { return v.c === 'green' ? 'green' : v.c === 'red' ? 'red' : ''; }
/* All of an ancestor's tests weighed together: the more tests that agree with the records, the stronger the conclusion. */
function personVerdict(cs) {
  const done = cs.filter(c => c.testChosen), vs = done.map(verdict), n = done.length;
  if (!n) return { c: 'amber', title: 'No test chosen yet', msg: 'Choose a test to begin.' };
  const names = list => list.map(c => methodName(c)).join(', ');
  if (vs.some(v => v.c === 'red')) return { c: 'red', title: 'Conflict in the evidence', msg: `The ${names(done.filter((c, i) => vs[i].c === 'red'))} research shows a conflict. Resolve it before drawing a conclusion.` };
  if (vs.every(v => v.c === 'green')) return { c: 'green', title: 'Convergence achieved', msg: n > 1 ? `All ${n} tests agree with the records: ${names(done)}. The conclusion should remain open to revision as new evidence emerges.` : vs[0].msg };
  const g = vs.filter(v => v.c === 'green').length;
  return { c: 'amber', title: 'Research in progress', msg: n > 1 ? `${g} of ${n} tests agree with the records so far.` : vs[0].msg };
}
function personSummaryHTML(cs) {
  const v = personVerdict(cs);
  const rows = cs.map(c => {
    if (!c.testChosen) return `<tr><td><a href="#" data-act="open-ancestor" data-id="${c.id}" style="color:var(--accent);font-weight:600;text-decoration:none">Choose a test</a></td><td colspan="3" class="muted">No test chosen yet.</td></tr>`;
    const s = dnaStatus(c), g = genealogyStatus(c), cv = verdict(c);
    return `<tr><td><a href="#" data-act="open-ancestor" data-id="${c.id}" style="color:var(--accent);font-weight:600;text-decoration:none">${methodName(c)}</a></td><td><i class="dot ${s.c}"></i> ${esc(s.msg)}</td><td><i class="dot ${g.c}"></i> ${esc(g.msg)}</td><td>${pill(cv.c, cv.title)}</td></tr>`;
  }).join('');
  return `<div class="verdict ${v.c}" style="display:block;margin:0 0 14px"><b>${v.title}</b><div class="hint" style="margin-top:4px">${v.msg}</div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Test</th><th>DNA evidence</th><th>Records</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
/* The ancestor's own page: every test for him, weighed together, and a way to add another. */
function renderPerson(cs) {
  const a = cs[0], used = cs.filter(c => c.testChosen).map(c => c.method || '');
  const missing = [['SNP', 'SNP-first', 'Big Y-700'], ['', 'STR-first', 'Y-37, Y-67 or Y-111'], ['AUTO', 'Autosomal-first', 'AncestryDNA, Family Finder, 23andMe or MyHeritage']].filter(m => !used.includes(m[0]));
  return `<div class="anc-header"><div><h1>${esc(a.name || 'Unnamed ancestor')}</h1>
      <div class="anc-meta">${esc(lifeYears(a))}${a.place ? ' · ' + esc(a.place) : ''}</div></div></div>
  <div class="card"><h3>All tests for this ancestor</h3>
    <p class="hint">Each test is its own case with its own steps. Here they are weighed together: the more tests that agree with the records, the stronger the conclusion. Click a test to open it.</p>
    ${personSummaryHTML(cs)}
    <div class="tbl-actions" style="margin-top:14px"><button class="btn" data-act="open-report" data-id="${a.id}">Open the ${cs.length > 1 ? 'combined ' : ''}report</button></div></div>
  ${missing.length ? `<div class="card"><h3>Add another test</h3>
    <p class="hint">Start a new case for this ancestor with another test. The name, dates and place are copied over and kept the same across all the tests.</p>
    <div class="tbl-actions">${missing.map(m => `<button class="btn ghost" data-act="add-case" data-pid="${esc(a.pid)}" data-m="${m[0]}">+ ${m[1]} <span class="muted" style="font-weight:normal">(${m[2]})</span></button>`).join('')}</div></div>` : ''}`;
}
/* Reports: every test for one ancestor in a single report, with the combined result first. */
function combinedReport(cs) {
  const a = cs[0];
  return `<div class="card report">
    <div class="card-head no-print"><span class="hint">A printable summary of all the tests for this ancestor.</span><div class="tbl-actions" style="margin:0"><button class="btn small ghost" data-act="download-report">Download (Word)</button><button class="btn small" data-act="print">Print</button></div></div>
    <h1>${esc(a.name || 'Unnamed ancestor')}</h1>
    <p class="muted">${[lifeYears(a), a.place, 'Report generated ' + new Date().toLocaleDateString()].filter(Boolean).map(esc).join(' · ')}</p>
    <h2>Combined Convergence</h2>
    ${personSummaryHTML(cs)}
    ${cs.map(c => `<div style="margin-top:30px;padding-top:6px;border-top:2px solid #ddc6a1">${tabReport(c, methodName(c) + ' research')}</div>`).join('')}
    <p class="hint" style="margin-top:18px">All conclusions should be considered provisional pending new genetic or documentary evidence.</p>
  </div>`;
}
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
  const tb = num(t.birth);
  const ab = num(a.birth);
  /* Each tester's own YPG = (tester birth year − ancestor birth year) ÷ generations.
     If it can't be calculated, the fallback YPG (Overview) or the default is used instead. */
  const docYPG = tb != null && ab != null && gens ? (tb - ab) / gens : null;
  const ypg = docYPG != null ? docYPG : lineageYPG(a);
  const ypgOwn = docYPG != null;
  const gps = snps && gens != null ? gens / snps : null;
  const yps = gps != null && ypg != null ? gps * ypg : null;
  const years = gens != null && ypg != null ? gens * ypg : null;
  /* The shared SNP is where the testers' lines meet. It formed in the ancestor or in one of his forefathers, so FTDNA's date
     for it should fall at or before his birth (allowing one SNP interval for the uncertainty in FTDNA's date).
     diff = FTDNA's date − his birth year: negative means the SNP is older than him. */
  const ftdna = num(a.ftdnaDate);
  const diff = ab != null && ftdna != null ? ftdna - ab : null;
  const aligned = diff != null ? diff <= (yps || 0) : null;
  const gensBefore = diff != null && ypg ? Math.round(-diff / ypg) : null;
  /* A tester whose terminal SNP is the shared SNP has no SNPs below it: that is not an error, so GPS is not judged. */
  /* A circa generation count is allowed one generation either way. */
  const gpsOK = gps != null && snps > 1 ? (t.circa ? [gens - 1, gens, gens + 1] : [gens]).some(g => g / snps >= num(S.settings.gpsMin) && g / snps <= num(S.settings.gpsMax)) : null;
  return { t, tgt, snps, gens, ypg, ypgOwn, gps, yps, years, tb, ftdna, diff, gensBefore, aligned, gpsOK, docYPG };
}

/* Shared SNP vs the ancestor, in words: "c. 1450, about 4 generations before his birth". */
function snpVsAncestor(r) {
  if (r.diff == null) return '—';
  const when = r.gensBefore >= 1 ? `about ${r.gensBefore} generation${r.gensBefore === 1 ? '' : 's'} before his birth` : r.diff <= 0 ? 'around his birth' : `${Math.round(r.diff)} years after his birth`;
  return `c. ${r.ftdna}, ${when}`;
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
/* The differing markers entered for a comparison (complete rows only; a marker entered twice counts once, the last one). */
function pairDiffs(p) {
  const m = {};
  (Array.isArray(p.diffs) ? p.diffs : []).forEach(r => { const name = r && canonMarker(r.m); if (name && num(r.a) != null && num(r.b) != null) m[name.toUpperCase()] = Object.assign({}, r, { m: name }); });
  return Object.values(m);
}
function pairEval(a, p) {
  const ta = testerById(a, p.a), tb = testerById(a, p.b);
  const rows = pairDiffs(p), typed = num(p.gd);
  /* With differing markers entered, the GD is added up from them; otherwise the GD typed in is used. */
  const fromRows = rows.length ? rows.reduce((t, r) => t + Math.round(Math.abs(num(r.a) - num(r.b))), 0) : null;
  const gd = fromRows != null ? fromRows : typed;
  const markers = num(p.markers);
  const group = gdGroup(gd);
  /* "Consistent with the lineage?" is the researcher's call. Older comparisons that used an expected range still count. */
  const min = num(p.expMin), max = num(p.expMax);
  const within = p.consistent === 'Y' ? true : p.consistent === 'N' ? false
    : (gd != null && min != null && max != null ? gd >= min && gd <= max : null);
  return { ta, tb, rows, typed, fromRows, gd, markers, group, within, suggestion: gdSuggestion(gd, markers, group) };
}
/* GD groups from the Pre-Research Checklist: 0–2, 3–4, 5+ */
function gdGroup(gd) {
  if (gd == null) return null;
  if (gd <= 2) return { key: 'close', label: 'Close match (GD 0–2)', c: 'green' };
  if (gd <= 4) return { key: 'mid', label: 'Intermediate match (GD 3–4)', c: 'amber' };
  return { key: 'distant', label: 'Distant match (GD 5+)', c: 'red' };
}
function gdSuggestion(gd, markers, group) {
  if (!group) return '';
  const across = markers ? ` across ${markers} markers` : '';
  let t = {
    close: `GD ${gd}${across} is a close match, consistent with a recent shared paternal ancestor.`,
    mid: `GD ${gd}${across} is an intermediate match, consistent with a shared paternal lineage over several generations. Confirm the relationship with SNP evidence.`,
    distant: `GD ${gd}${across} is a distant match. Unless it is supported by SNP evidence, it points to a deeper separation rather than a recent shared ancestor.`
  }[group.key];
  if (markers && markers < 37) t += ' At fewer than 37 markers a single mutation has a disproportionate effect; results at 67 or 111 markers are more reliable.';
  return t;
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
    if (!tgt) return { c: 'amber', msg: 'Add SNP paths for at least two testers so the shared SNP can be found.' };
    const missing = ts.filter(t => !carriesSNP(t, tgt) && num(t.snpCount) == null);
    if (missing.length) return { c: 'red', msg: `${missing.length} tester(s) do not carry ${tgt}.` };
  }
  if (ovr(a, 'gps') !== 'Y') {
    const rows = ts.map(t => genRow(a, t));
    if (rows.some(r => r.gpsOK === false)) return { c: 'amber', msg: `A GPS value falls outside ${S.settings.gpsMin}–${S.settings.gpsMax}.` };
    if (!rows.length || rows.some(r => r.gps == null)) return { c: 'amber', msg: 'Add generations for each tester to check GPS.' };
  }
  return { c: 'green', msg: tgt ? `All testers share ${tgt}; GPS within the expected range.` : 'SNP evidence marked consistent.' };
}
function strStatus(a) {
  if (ovr(a, 'str') === 'N') return { c: 'red', msg: 'STR evidence marked inconsistent.' };
  if (ovr(a, 'str') === 'Y') return { c: 'green', msg: 'STR evidence marked consistent.' };
  if (!a.gdPairs.length) return { c: 'grey', msg: 'No genetic distance comparisons yet.' };
  const ev = a.gdPairs.map(p => pairEval(a, p));
  if (ev.some(e => e.within === false)) return { c: 'red', msg: 'A comparison is marked not consistent with the lineage.' };
  if (ev.some(e => e.gd == null)) return { c: 'amber', msg: 'Enter or calculate the GD for every comparison.' };
  if (ev.some(e => e.within == null)) return { c: 'amber', msg: 'Answer "Consistent with the lineage?" for every comparison.' };
  return { c: 'green', msg: 'All STR comparisons are consistent with the lineage.' };
}
function genealogyStatus(a) {
  if (ovr(a, 'gen') === 'N') return { c: 'red', msg: 'Genealogical records marked inconsistent.' };
  if (snpUsed(a) && ovr(a, 'date') === 'N') return { c: 'red', msg: 'Shared SNP date marked inconsistent with the ancestor.' };
  /* Lost records (a burned courthouse, say): the records neither support nor contradict the line, unless a surviving document does. */
  if (a.recordsLost) return a.documents.some(d => d.supports === 'N') ? { c: 'red', msg: 'A document contradicts the lineage.' } : { c: 'grey', lost: true, msg: `Records lost${a.recordsLostNote ? ': ' + a.recordsLostNote : ''}. They are not counted for or against the line.` };
  if (!a.documents.length && !a.testers.length) return { c: 'grey', msg: 'No documents or testers yet.' };
  if (!a.documents.length) return { c: 'amber', msg: 'No documents recorded for this ancestor.' };
  if (snpUsed(a) && ovr(a, 'date') !== 'Y') {
    const rows = a.testers.filter(t => pathOf(t).length).map(t => genRow(a, t));
    if (rows.some(r => r.aligned === false)) return { c: 'red', msg: 'FTDNA dates the shared SNP after the ancestor\'s birth, so his descendants should not all share it.' };
    if (num(a.birth) == null) return { c: 'amber', msg: 'Add the ancestor\'s birth year so each tester\'s YPG can be calculated.' };
    if (num(a.ftdnaDate) == null) return { c: 'amber', msg: 'Add FTDNA\'s formation date for the shared SNP (SNP Analysis) to test date alignment.' };
  }
  /* Genealogical evidence comes from the documents: each one is marked as supporting or contradicting the lineage. */
  if (ovr(a, 'gen') !== 'Y') {
    if (a.documents.some(d => d.supports === 'N')) return { c: 'red', msg: 'A document contradicts the lineage.' };
    if (!a.documents.some(d => d.supports === 'Y')) return { c: 'amber', msg: 'Mark which documents support the lineage.' };
  }
  return { c: 'green', msg: 'Genealogy aligns with the DNA evidence.' };
}
function openConflicts(a) { return a.conflicts.filter(c => c.status !== 'Resolved').length; }
/* SNP evidence is left out when the ancestor has no SNP of his own (Overview). */
/* SNP evidence is used only for Big Y-700 testers (the SNP-first method). */
function snpUsed(a) { return a.method === 'SNP'; }
function verdict(a) {
  /* Each method has two lines of evidence: its own DNA evidence, and the genealogy. */
  const st = [snpFirst(a) ? snpStatus(a) : autoFirst(a) ? autoStatus(a) : strStatus(a), genealogyStatus(a)];
  const open = openConflicts(a);
  if (st.some(s => s.c === 'red')) return { c: 'red', title: 'Conflict in the evidence', msg: 'Record and resolve the conflict before drawing a conclusion.' };
  if (st[1].lost && st[0].c === 'green' && !open) return { c: 'green', title: 'DNA supports the line', msg: 'The records for this line are lost, so the conclusion rests on the DNA evidence. It should remain open to revision as new evidence emerges.' };
  if (st.every(s => s.c === 'green') && !open) return { c: 'green', title: 'Convergence achieved', msg: `${st.length === 3 ? 'All three' : 'Both'} lines of evidence align. The conclusion should remain open to revision as new evidence emerges.` };
  if (open) return { c: 'amber', title: 'Unresolved conflicts', msg: `${open} conflict(s) still open on the Convergence tab.` };
  return { c: 'amber', title: 'Research in progress', msg: 'Not every line of evidence has been tested yet.' };
}
function nextStep(a) {
  /* Steps follow the chosen research method: STR-first, SNP-first or autosomal-first. */
  if (autoFirst(a)) {
    const sa = autoStatus(a), sg = genealogyStatus(a);
    if (!a.atMatches.length) return { tab: 'matches', text: 'Add your autosomal DNA matches who descend from this ancestor.' };
    if (sa.c === 'red' || sg.c === 'red') return { tab: 'convergence', text: 'Record the conflict and work out a resolution path.' };
    if (sa.c === 'amber') return { tab: 'matches', text: sa.msg };
    if (!a.documents.length && !a.recordsLost) return { tab: 'documents', text: 'Record historical documents for this ancestor.' };
    if (sg.c === 'amber') return { tab: 'documents', text: sg.msg };
    if (openConflicts(a)) return { tab: 'convergence', text: 'Resolve the open conflicts.' };
    return { tab: 'report', text: 'Review and print the research report.' };
  }
  const needSNP = snpUsed(a) && !targetSNP(a) ? { tab: 'testers', text: 'Add the testers\' SNP paths so their SNP tree can be mapped.' } : null;
  const needSTR = !snpFirst(a) && a.testers.length > 1 && !a.gdPairs.length ? { tab: 'str', text: 'Compare testers with a Genetic Distance analysis.' } : null;
  if (!a.testers.length) return { tab: 'testers', text: 'Add the Y-DNA testers who descend from this ancestor.' };
  if (a.testers.some(t => num(t.generations) == null || num(t.birth) == null)) return { tab: 'testers', text: 'Add the tester birth year and generations for every tester.' };
  const first = snpFirst(a) ? needSNP : needSTR, second = snpFirst(a) ? needSTR : needSNP;
  if (first) return first;
  if (!a.documents.length && !a.recordsLost) return { tab: 'documents', text: 'Record historical documents for this ancestor.' };
  if (second) return second;
  const sn = snpUsed(a) ? snpStatus(a) : { c: 'green' }, sr = snpFirst(a) ? { c: 'green' } : strStatus(a), sg = genealogyStatus(a);
  if (sn.c === 'red' || sr.c === 'red' || sg.c === 'red') return { tab: 'convergence', text: 'Record the conflict and work out a resolution path.' };
  const amber = (snpFirst(a) ? [['snp', sn], ['documents', sg], ['str', sr]] : [['str', sr], ['documents', sg], ['snp', sn]]).find(x => x[1].c === 'amber');
  if (amber) return { tab: amber[0], text: amber[1].msg };
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
      if (c.type === 'check') return `<td style="text-align:center;min-width:${c.w || 60}px"><input type="checkbox" data-coll="${coll}" data-id="${esc(r.id)}" data-k="${c.k}"${r[c.k] ? ' checked' : ''}></td>`;
      const attrs = `data-coll="${coll}" data-id="${esc(r.id)}" data-k="${c.k}"`;
      /* c.def: a value filled in for the user until they type their own. */
      const v = r[c.k] == null || r[c.k] === '' ? (c.def ? c.def(r) : '') : r[c.k];
      if (c.type === 'select') {
        const o = (c.opts || []).map(op => {
          const val = typeof op === 'object' ? op.v : op, lab = typeof op === 'object' ? op.l : op;
          return `<option value="${esc(val)}"${String(v) === String(val) ? ' selected' : ''}>${esc(lab)}</option>`;
        }).join('');
        return `<td style="min-width:${c.w || 130}px"><select ${attrs}>${o}</select></td>`;
      }
      if (c.type === 'textarea') return `<td style="min-width:${c.w || 180}px"><textarea ${attrs} placeholder="${esc(c.ph || '')}">${esc(v)}</textarea></td>`;
      return `<td style="min-width:${c.w || 110}px"><input ${attrs} type="${c.type === 'number' ? 'number' : 'text'}" value="${esc(v)}" placeholder="${esc(c.ph || '')}"></td>`;
    }).join('');
    const del = opts.noDelete ? '' : `<td><button class="row-btn" data-act="del-row" data-coll="${coll}" data-id="${esc(r.id)}" title="Delete row">✕</button></td>`;
    return `<tr>${cells}${del}</tr>`;
  }).join('') : `<tr><td class="empty" colspan="${cols.length + 1}">${esc(opts.empty || 'Nothing added yet.')}</td></tr>`;
  const add = opts.addLabel ? `<div class="tbl-actions no-print"><button class="btn small" data-act="add-row" data-coll="${coll}">+ ${esc(opts.addLabel)}</button></div>` : '';
  return `<div class="tbl-wrap"><table class="tbl tbl-${coll}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${add}`;
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
/* Search: finds the words typed in names, places, testers, SNPs, documents and non-tester research, and says where. */
function searchHits(q) {
  const has = v => v != null && String(v).toLowerCase().includes(q), out = [];
  realAncestors().forEach(a => {
    const w = [], add = (label, tab) => { if (!w.some(x => x.label === label)) w.push({ label, tab }); };
    if (has(a.name)) add('Name', 'checklist');
    if (has(a.place)) add(`Place: ${a.place}`, 'overview');
    if (has(a.notes)) add('Research notes', 'overview');
    a.testers.forEach(t => {
      if (has(t.label)) add(`Tester: ${testerLabel(t)}`, 'testers');
      if (has(t.line)) add(`Earliest ancestor: ${t.line}`, 'testers');
      if (has(t.location)) add(`Location: ${t.location}`, 'testers');
      pathOf(t).filter(has).forEach(x => add(`SNP: ${x}`, snpUsed(a) ? 'snp' : 'testers'));
    });
    if (has(a.targetSNP)) add(`SNP: ${a.targetSNP}`, 'snp');
    a.documents.forEach(d => { if (['type', 'date', 'place', 'source', 'notes'].some(k => has(d[k]))) add(`Document: ${[d.type, d.date, d.place].filter(Boolean).join(', ')}`, 'documents'); });
    (a.socGens || []).forEach(g => { if (has(g.name) || has(g.spouse)) add(`Lineage society: ${g.name || g.spouse}`, 'society'); });
    if (w.length) out.push({ kind: 'ancestor', id: a.id, name: a.name || 'Unnamed ancestor', side: lifeYears(a), w });
  });
  (S.projects || []).forEach(p => {
    const w = [], add = (label, tab) => { if (!w.some(x => x.label === label)) w.push({ label, tab }); };
    if (has(p.name) || has(p.surname) || has(p.projectName)) add(`Research: ${p.name || p.surname}`, 'groups');
    if (has(p.earliest)) add(`Earliest ancestor: ${p.earliest}`, 'geo');
    if (has(p.locations)) add(`Place: ${p.locations}`, 'geo');
    p.groups.forEach(g => {
      if (has(g.name) || has(g.origin) || has(g.earliest) || has(g.region)) add(`Grouping: ${groupName(g)}`, 'groups');
      if (has(g.snps)) add(`SNP: ${g.snps}`, 'snpseg');
    });
    if (w.length) out.push({ kind: 'project', id: p.id, name: p.name || 'Unnamed research', side: 'Non-tester', w });
  });
  return out;
}
function renderSidebar() {
  const q = searchText.trim().toLowerCase(), box = document.getElementById('ancestor-list');
  if (q) {
    /* Each result names the case, shows where the words were found, and opens the case at that step. */
    const hits = searchHits(q);
    /* Matches of the same kind share one line (e.g. "SNP: R-FT1, R-FT2"), one kind per line. */
    const lines = w => { const g = []; w.forEach(x => { const i = x.label.indexOf(': '), k = i > 0 ? x.label.slice(0, i) : x.label, v = i > 0 ? x.label.slice(i + 2) : ''; const e = g.find(y => y.k === k); if (e) { if (v) e.v.push(v); } else g.push({ k, v: v ? [v] : [] }); }); return g.map(y => y.v.length ? `${y.k}: ${y.v.join(', ')}` : y.k); };
    box.innerHTML = hits.length ? hits.map(h => `<div class="anc-item search-hit" data-act="open-${h.kind}" data-id="${h.id}" data-tab="${h.w[0].tab}">
      <div class="sh-top"><span class="dot"></span><span class="anc-name">${esc(h.name)}</span><span class="anc-years">${esc(h.side)}</span></div>
      <div class="sh-where">${lines(h.w).slice(0, 3).map(x => `<div>${esc(x)}</div>`).join('')}</div></div>`).join('') : '<div class="side-empty">No matches.</div>';
  } else {
    /* Each ancestor once, with his tests listed underneath. */
    const groups = peopleOf(realAncestors()).sort((x, y) => (x[0].name || '').localeCompare(y[0].name || ''));
    box.innerHTML = groups.length ? groups.map(cs => {
      const a = cs[0], here = (view.page === 'person' && view.id === a.pid) || (view.page === 'ancestor' && cs.some(c => c.id === view.id));
      return `<div class="anc-item${view.page === 'person' && view.id === a.pid ? ' active' : ''}" data-act="open-person" data-id="${esc(a.pid)}">
      <span class="dot ${dotClass(personVerdict(cs))}"></span>
      <span class="anc-name">${esc(a.name || 'Unnamed ancestor')}</span>
      <span class="anc-years">${esc(lifeYears(a))}</span></div>
      <div class="anc-cases">${cs.map(c => `<div class="anc-item anc-case${view.page === 'ancestor' && view.id === c.id ? ' active' : ''}" data-act="open-ancestor" data-id="${c.id}"><span class="dot ${c.testChosen ? dotClass(verdict(c)) : ''}"></span><span class="anc-name">${methodName(c)}</span></div>`).join('')}${here && cs.length < 3 ? `<div class="anc-item anc-case anc-add" data-act="open-person" data-id="${esc(a.pid)}">+ Add another test</div>` : ''}</div>`;
    }).join('') : '<div class="side-empty">No ancestors yet.</div>';
  }
  document.querySelectorAll('.side-nav a').forEach(el => el.classList.toggle('active', el.dataset.page === view.page || (view.page === 'project' && el.dataset.page === 'projects')));
}

/* ---------- Render: main ---------- */
const TABS = [
  ['intro', 'Introduction'], ['checklist', 'Pre-Research'], ['overview', 'Overview'], ['testers', 'Testers & DNA'], ['matches', 'Matches'], ['auto', 'Autosomal Analysis'], ['str', 'STR Analysis'], ['documents', 'Documents'],
  ['snp', 'SNP Analysis'], ['convergence', 'Convergence'], ['society', 'Lineage Society'], ['report', 'Report']
];
/* Research method: STR-first (default) or SNP-first. The two swap the places of STR Analysis and SNP Analysis. */
const METHODS = [
  { v: '', l: 'STR-first — basic marker tests (Y-37, Y-67, Y-111)', best: 'For testers with the basic marker tests (Y-37, Y-67 or Y-111). Genetic Distance shows who is closely related and the records build the line. SNPs are not used.' },
  { v: 'SNP', l: 'SNP-first — Big Y-700 testers only', best: 'Only for testers who have taken the Big Y-700. Their SNP paths map out the testers\' SNP tree and show where their lines meet, and the records build the line.' },
  { v: 'AUTO', l: 'Autosomal-first — AncestryDNA, Family Finder, 23andMe or MyHeritage', best: '' }
];
function snpFirst(a) { return a.method === 'SNP'; }
/* SNP-first: SNP Analysis comes straight after the testers, before the documents. */
function methodOrder(a, list) { const i = list.indexOf('testers'); if (!snpFirst(a) || i < 0 || !list.includes('snp')) return list; const r = list.filter(k => k !== 'snp'); r.splice(i + 1, 0, 'snp'); return r; }
function tabsFor(a) { const t = TABS.filter(x => (x[0] !== 'snp' || snpUsed(a)) && (x[0] !== 'society' || wantsSociety(a)) && (autoFirst(a) ? !['testers', 'str', 'snp'].includes(x[0]) : !['matches', 'auto'].includes(x[0])) && (x[0] !== 'str' || !snpFirst(a))); return methodOrder(a, t.map(x => x[0])).map(k => t.find(x => x[0] === k)); }
/* The Lineage Society step only appears when the research question is about proving the line to a society. */
function wantsSociety(a) { const q = inquiryOf(a); return !!q && /society$/.test(q.v); }
function render() {
  const main = document.getElementById('main');
  const crumb = document.getElementById('crumb');
  if (view.page === 'ancestor' && !cur()) view = { page: 'home', id: null, tab: 'overview' };
  if (view.page === 'person' && !casesOfPid(view.id).length) view = { page: 'home', id: null, tab: 'overview' };
  if (view.page === 'project' && !curProject()) view = { page: 'projects', id: null, tab: 'groups' };
  let html = '';
  if (view.page === 'ancestor') {
    const a = cur();
    crumb.innerHTML = `<a data-act="nav" data-page="home">Home</a> › <a data-act="open-person" data-id="${esc(a.pid)}">${esc(a.name || 'Unnamed ancestor')}</a> › ${methodName(a)}`;
    html = renderAncestor(a);
  } else if (view.page === 'person') {
    const cs = casesOfPid(view.id);
    crumb.innerHTML = `<a data-act="nav" data-page="home">Home</a> › ${esc(cs[0].name || 'Unnamed ancestor')}`;
    html = renderPerson(cs);
  } else if (view.page === 'project') {
    const p = curProject();
    crumb.innerHTML = `<a data-act="nav" data-page="projects">Non-Tester Research</a> › ${esc(p.name || 'Unnamed research')}`;
    html = renderProject(p);
  } else if (view.page === 'projects') { crumb.textContent = 'Non-Tester Research'; html = renderProjects(); }
  else if (view.page === 'learn') { crumb.textContent = 'Learn'; html = renderLearn(); }
  else if (view.page === 'calcs') { crumb.textContent = 'Calculators'; html = renderCalcs(); }
  else if (view.page === 'snptree') { crumb.textContent = 'SNP Tree'; html = renderSnpTree(); }
  else if (view.page === 'reports') { crumb.textContent = 'Reports'; html = renderReports(); }
  else if (view.page === 'autosomal') { crumb.textContent = 'Autosomal DNA Tools'; html = renderAutosomal(); }
  else if (view.page === 'settings') { crumb.textContent = 'Settings & Backup'; html = renderSettings(); }
  else { crumb.textContent = 'Home'; html = renderHome(); }
  main.innerHTML = html;
  main.querySelectorAll('[data-calc]').forEach(runCalc);
  renderSidebar();
}

/* ----- Start here: two questions point a beginner to the right path, list what to gather, and start the first case ----- */
let startAns = {};
const START_PATHS = {
  snp: { title: 'Your path: SNP-first', why: 'Big Y-700 results show each tester\'s SNPs, which map the testers\' tree and show where their lines meet.',
    gather: ['Each tester\'s FamilyTreeDNA results, or the details he shares with you.', 'Each tester\'s SNP path: look up his terminal SNP in <a href="https://discover.familytreedna.com/" target="_blank" rel="noopener">FamilyTreeDNA Discover</a> and open Ancestral Path.', 'Each tester\'s birth year, and how many generations he is from the ancestor (his father is generation 1).', 'Your family tree back to the earliest known ancestor, with the records that support it.'] },
  str: { title: 'Your path: STR-first', why: 'Y-37, Y-67 and Y-111 results show how closely testers match on their markers (the Genetic Distance), which estimates how many generations back they connect.',
    gather: ['Each tester\'s Y-DNA Matches list from FamilyTreeDNA: who matches, the Genetic Distance (GD) and how many markers were compared.', 'Each tester\'s birth year, and how many generations he is from the ancestor (his father is generation 1).', 'Your family tree back to the earliest known ancestor, with the records that support it.', 'Optional: the marker values that differ between two testers, from the Y-STR results page, for a more exact estimate.'] },
  auto: { title: 'Your path: Autosomal-first', why: 'An autosomal test (AncestryDNA, FamilyTreeDNA Family Finder, 23andMe or MyHeritage) shows how much DNA you share with each match, which tests the recent generations of your line, about the last five or six, on any side of the family.',
    gather: ['Your DNA match list from your testing company.', 'For each match who descends from the ancestor: the shared cM and the longest segment the company shows.', 'How many generations you and each match are from the ancestor (a parent is generation 1), and which of the ancestor\'s children each match descends through.', 'Your family tree back to the ancestor, with the records that support it.'] },
  non: { title: 'Your path: Non-Tester Research', why: 'Without a Y-DNA test, you can still compare your documented line with the lineage groupings of a surname project and narrow down where it fits.',
    gather: ['Your documented line back to its earliest known ancestor, with the places the family lived.', 'The surname\'s Y-DNA project on FamilyTreeDNA and its Y-DNA Results page, which lists the project\'s groupings.', 'Optional: contact details for the project administrators, who can answer questions about the groupings.'] }
};
function startHereHTML() {
  const t = startAns.tested, k = startAns.test, key = t === 'N' ? 'non' : t === 'Y' && k ? k : null, P = key && START_PATHS[key];
  const sel = (name, opts) => `<select data-start="${name}"><option value="">— choose —</option>${opts.map(o => `<option value="${o[0]}"${startAns[name] === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>`;
  return `<div class="card">
    <h3>Start here</h3>
    <p class="hint">New to Y-DNA research? Answer two questions and the app will show you where to begin and what to gather first. Not sure yet? Look at a finished <a href="#" data-act="load-example">SNP example</a>, <a href="#" data-act="load-example" data-k="str">STR example</a> or <a href="#" data-act="load-example" data-k="auto">autosomal example</a> first.</p>
    <div class="grid2">
      <div class="field"><label>1. Have you, or a relative on the line you are researching, taken a DNA test?</label>${sel('tested', [['Y', 'Yes'], ['N', 'No, not yet']])}</div>
      ${t === 'Y' ? `<div class="field"><label>2. Which test?</label>${sel('test', [['snp', 'Big Y-700'], ['str', 'Y-37, Y-67 or Y-111'], ['auto', 'An autosomal test (AncestryDNA, Family Finder, 23andMe or MyHeritage)']])}</div>` : ''}
    </div>
    ${P ? `<div class="verdict" style="margin-top:14px;display:block"><b>${P.title}</b><div class="hint" style="margin:4px 0 10px">${P.why}</div>
      <b>Gather these first:</b><ul style="margin:6px 0 12px 18px">${P.gather.map(x => `<li>${x}</li>`).join('')}</ul>
      <div class="tbl-actions" style="margin:0">${key === 'non' ? '<button class="btn" data-act="start-project">Start my first research</button>' : `<button class="btn" data-act="start-case" data-m="${key === 'snp' ? 'SNP' : key === 'auto' ? 'AUTO' : ''}">Start my first case</button>`}<button class="btn ghost" data-act="load-example" data-k="${key === 'snp' ? '' : key}">Look at a finished example</button></div></div>` : ''}
  </div>`;
}
/* A finished example case for a made-up family, so a beginner can see what good entries look like at every step. */
function loadExample(kind) {
  if (kind === 'auto') return loadAutoExample();
  if (kind === 'str') return loadStrExample();
  let a = S.ancestors.find(x => x.example && x.method === 'SNP');
  if (!a) {
    const t = (id, label, birth, path, line, location) => ({ id, label, birth, generations: '10', test: 'Big Y-700', path, line, location });
    a = fixAncestor({ id: uid(), example: true, name: 'William Hartwell (example)', birth: '1580', death: '1642', place: 'Kent, England', method: 'SNP', inquiry: 'right',
      notes: 'John, Samuel and Peter Hartwell all believe they descend from William Hartwell of Kent.', ftdnaDate: '1450',
      testers: [t('ex1', 'John Hartwell', '1924', 'R-FT12345, R-Y98765', 'Thomas Hartwell (1702–1770)', 'Kent, England'),
        t('ex2', 'Samuel Hartwell', '1955', 'R-FT54321, R-Y98765', 'Richard Hartwell (1698–1761)', 'Virginia'),
        t('ex3', 'Peter Hartwell', '1950', 'R-FT54321, R-Y98765', 'Richard Hartwell (1698–1761)', 'Maryland')],
      documents: [
        { id: uid(), type: 'Baptism', date: '1580', place: 'Ashford, Kent', source: 'Ashford parish register', notes: 'Baptism of William, son of Robert Hartwell', supports: 'Y' },
        { id: uid(), type: 'Probate / Will', date: '1642', place: 'Ashford, Kent', source: 'Will of William Hartwell, Kent archives', notes: 'Names his sons Thomas and Richard', supports: 'Y' },
        { id: uid(), type: 'Land / Deed', date: '1735', place: 'Virginia', source: 'County deed book', notes: 'Richard Hartwell, late of Kent, buys land', supports: 'Y' }] });
    S.ancestors.push(a);
    saveData();
  }
  view = { page: 'ancestor', id: a.id, tab: 'testers' };
  render(); window.scrollTo(0, 0);
}
/* The STR-first example: Y-111 testers compared by Genetic Distance, with the generations each GD points to. */
function loadStrExample() {
  let a = S.ancestors.find(x => x.example && !x.method);
  if (!a) {
    const t = (id, label, birth, generations, line, location) => ({ id, label, birth, generations, test: 'Y-111', line, location });
    a = fixAncestor({ id: uid(), example: true, name: 'George Whitlock (example)', birth: '1702', death: '1771', place: 'Augusta County, Virginia', method: '', inquiry: 's-right',
      notes: 'Michael, Robert and Daniel Whitlock all believe they descend from George Whitlock of Augusta County through his sons Joseph and Thomas.',
      testers: [t('sx1', 'Michael Whitlock', '1948', '7', 'Joseph Whitlock (1735–1801)', 'Virginia'),
        t('sx2', 'Robert Whitlock', '1955', '7', 'Joseph Whitlock (1735–1801)', 'Tennessee'),
        t('sx3', 'Daniel Whitlock', '1961', '8', 'Thomas Whitlock (1738–1810)', 'Kentucky')],
      gdPairs: [{ id: uid(), a: 'sx1', b: 'sx2', markers: '111', gd: '2', consistent: 'Y', interp: 'Close match, as expected for two descendants of Joseph.' },
        { id: uid(), a: 'sx2', b: 'sx3', markers: '111', gd: '3', consistent: 'Y', interp: 'Further apart, as expected for lines that meet at George.' }],
      documents: [
        { id: uid(), type: 'Land / Deed', date: '1745', place: 'Augusta County, Virginia', source: 'Augusta County deed book', notes: 'George Whitlock buys 200 acres on the South River', supports: 'Y' },
        { id: uid(), type: 'Probate / Will', date: '1771', place: 'Augusta County, Virginia', source: 'Will of George Whitlock, Augusta County will book', notes: 'Names his sons Joseph and Thomas', supports: 'Y' },
        { id: uid(), type: 'Census', date: '1790', place: 'Augusta County, Virginia', source: 'Virginia tax lists (1790 census substitute)', notes: 'Joseph and Thomas Whitlock listed as neighbours', supports: 'Y' }] });
    S.ancestors.push(a);
    saveData();
  }
  view = { page: 'ancestor', id: a.id, tab: 'str' };
  render(); window.scrollTo(0, 0);
}
/* The autosomal example: made-up matches who descend from one ancestor, on her side of the family. */
function loadAutoExample() {
  let a = S.ancestors.find(x => x.example && x.method === 'AUTO');
  if (!a) {
    const m = (match, matchGens, cm, longest, through, company) => ({ id: uid(), tester: 'Ruth Calloway', testerGens: '4', match, matchGens, company, cm, longest, through });
    a = fixAncestor({ id: uid(), example: true, name: 'Martha Ellison (example)', birth: '1798', death: '1871', place: 'Wilkes County, North Carolina', method: 'AUTO', inquiry: 'a-child',
      notes: 'Ruth Calloway descends from Martha Ellison through her son William. Which of Martha\'s other children do Ruth\'s matches descend from?',
      atMatches: [m('Daniel Ellison', '4', '92', '31', 'her son James', 'AncestryDNA'),
        m('Carol Pruitt', '3', '141', '38', 'her daughter Sarah', 'AncestryDNA'),
        m('Henry Ellison', '5', '47', '19', 'her son James', 'MyHeritage'),
        m('Lois Barker', '4', '6', '6', 'her son James', '23andMe')],
      documents: [
        { id: uid(), type: 'Marriage', date: '1817', place: 'Wilkes County, North Carolina', source: 'Wilkes County marriage bonds', notes: 'Marriage of Martha Greer and Isaac Ellison', supports: 'Y' },
        { id: uid(), type: 'Census', date: '1850', place: 'Wilkes County, North Carolina', source: '1850 U.S. census', notes: 'Martha Ellison, 52, with sons James and William', supports: 'Y' },
        { id: uid(), type: 'Probate / Will', date: '1871', place: 'Wilkes County, North Carolina', source: 'Will of Martha Ellison, Wilkes County will book', notes: 'Names her children James, Sarah and William', supports: 'Y' }] });
    S.ancestors.push(a);
    saveData();
  }
  view = { page: 'ancestor', id: a.id, tab: 'matches' };
  render(); window.scrollTo(0, 0);
}
function renderHome() {
  const steps = [
    ['Choose your test', 'STR markers, Big Y-700 SNPs or an autosomal test. It decides which DNA evidence the case uses.'],
    ['Set your question', 'What you want to find out, such as whether the documented ancestor is the right man.'],
    ['Gather the DNA evidence', 'The testers\' markers or SNPs, or your autosomal matches and the DNA you share.'],
    ['Gather the paper evidence', 'Birth, marriage, census, probate, land, military and church records that build the line.'],
    ['Test each on its own', 'Does the DNA fit the generations the records show? Do the records hold up?'],
    ['Look for convergence', 'When the separate lines of evidence point to the same ancestor, they converge.'],
    ['Resolve conflicts', 'Where they disagree, find the cause: a gap in the records, an unknown parent, or the wrong line.'],
    ['Report', 'The answer to your question, how strongly the evidence agrees, and what is still open.']
  ];
  const cards = peopleOf(realAncestors()).map(cs => {
    const a = cs[0];
    return `<div class="anc-card" data-act="open-person" data-id="${esc(a.pid)}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><h3>${esc(a.name || 'Unnamed ancestor')}</h3><button class="btn small danger" data-act="del-card" data-id="${esc(a.pid)}">Delete</button></div>
      <div class="hint">${esc(lifeYears(a))}${a.place ? ' · ' + esc(a.place) : ''}</div>
      <div class="hint" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px 16px">${cs.map(c => `<span><i class="dot ${c.testChosen ? dotClass(verdict(c)) : ''}" style="margin-right:5px"></i>${methodName(c)}</span>`).join('')}</div></div>`;
  }).join('');
  return `
  <div class="hero">
    <h1>Welcome to Convergence</h1>
    <p>Reconstruct patrilineal lineages by testing whether SNP data, STR markers and traditional genealogy converge. Each ancestor is a research case with its own workspace.</p>
  </div>
  ${startHereHTML()}
  <div class="card"><h3>What is convergence?</h3><p class="hint" style="margin:0 0 14px">No single source proves a line. DNA can show two people are related but not who their shared ancestor was; records can name the ancestor but may be wrong or missing. <b>Convergence</b> is when separate, independent lines of evidence, the DNA and the records, all point to the same ancestor. The more lines that agree, the stronger the conclusion. Each case in the app follows these steps:</p><div class="steps">${steps.map(s => `<div class="step"><b>${s[0]}</b>${s[1]}</div>`).join('')}</div></div>
  <h2>Your ancestors</h2>
  ${realAncestors().length ? `<div class="anc-cards">${cards}</div>` : '<p class="muted">No ancestors yet. Use Start here above, or the + beside Ancestors in the menu.</p>'}`;
}

/* The first step of every test: what the test is and what this section does, in plain paragraphs (the text is in learn.js). */
function tabIntro(a) {
  const I = TEST_INTROS[a.method || ''] || TEST_INTROS[''];
  return `<div class="card intro-card"><h3>${esc(I.title)}</h3>
    <div class="help-h">What is this test?</div>${I.what.map(x => `<p>${esc(x)}</p>`).join('')}
    <div class="help-h">What this section does for you</div>${I.does.map(x => `<p>${esc(x)}</p>`).join('')}</div>`;
}
/* The first screen of a new ancestor: which DNA test, so the checklist and every step after it fit that test. */
function chooseTestHTML(a) {
  const opts = [
    ['', 'STR-first', 'Y-37, Y-67 or Y-111 from FamilyTreeDNA', 'You start with the testers\' marker matches and their Genetic Distance.'],
    ['SNP', 'SNP-first', 'Big Y-700 from FamilyTreeDNA', 'You start by mapping the testers\' SNP tree and where their lines meet.'],
    ['AUTO', 'Autosomal-first', 'AncestryDNA, FamilyTreeDNA Family Finder, 23andMe or MyHeritage', 'You start with your DNA matches and how much DNA you share.']
  ].filter(o => !casesOf(a).some(x => x.id !== a.id && x.testChosen && (x.method || '') === o[0]));
  return `<div class="anc-header"><div><h1>${esc(a.name || 'New ancestor')}</h1></div></div>
  <div class="wiz-head"><div class="wiz-step">Before you begin</div><h2 class="wiz-q">Which DNA test do you have?</h2><div class="wiz-help"><b>What to do:</b> Choose the test you, or the testers on this line, have taken. It sets the checklist and the steps that follow. You can change it later on the Overview step, under Goal → More options.</div></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px">${opts.map(o => `<div class="card" style="margin:0;display:flex;flex-direction:column;gap:10px">
    <h3 style="margin:0">${o[1]}</h3><div><b>${esc(o[2])}</b></div><p class="hint" style="margin:0;flex:1">${o[3]}</p>
    <div><button class="btn" data-act="choose-test" data-m="${o[0]}">Choose ${o[1]}</button></div></div>`).join('')}</div>
  <p class="hint" style="margin-top:18px">No DNA test yet? Use <b>Non-Tester Research</b> in the menu to compare your line with a surname project.</p>`;
}
function renderAncestor(a) {
  if (!a.testChosen) return chooseTestHTML(a);
  const st = autoFirst(a) ? [['Autosomal', autoStatus(a)], ['Genealogy', genealogyStatus(a)]] : snpFirst(a) ? [['SNP', snpStatus(a)], ['Genealogy', genealogyStatus(a)]] : [['STR', strStatus(a)], ['Genealogy', genealogyStatus(a)]];
  if (view.tab === 'snp' && !snpUsed(a)) view.tab = 'overview';
  if (view.tab === 'society' && !wantsSociety(a)) view.tab = 'overview';
  if (!tabsFor(a).some(t => t[0] === view.tab)) view.tab = 'overview';
  const list = tabsFor(a), idx = Math.max(0, list.findIndex(t => t[0] === view.tab));
  const tabs = list.map((t, i) => `<button class="tab${view.tab === t[0] ? ' active' : ''}${i < idx ? ' done' : ''}" data-act="tab" data-tab="${t[0]}"><span class="num">${i < idx ? '✓' : i + 1}</span>${t[1]}</button>`).join('');
  /* Every step explains what to do, then Back / Continue move through the steps in order. */
  const g = guideFor(a, view.tab), prev = list[idx - 1], next = list[idx + 1];
  const guide = g ? `<div class="wiz-head"><div class="wiz-step">Step ${idx + 1} of ${list.length}</div><h2 class="wiz-q">${g.q}</h2><div class="wiz-help"><b>What to do:</b> ${g.help}</div></div>` : '';
  const nav = view.tab === 'overview' ? '' : `<div class="wiz-nav no-print">${prev ? `<button class="btn ghost" data-act="tab" data-tab="${prev[0]}">← Back</button>` : '<button class="btn ghost" data-act="back-test">← Back</button>'}${next ? `<button class="btn" data-act="tab" data-tab="${next[0]}">Continue to ${esc(next[1])} →</button>` : ''}</div>`;
  const body = {
    intro: tabIntro, checklist: tabChecklist, overview: tabOverview, documents: tabDocuments, testers: tabTesters, snp: tabSNP,
    str: tabSTR, alignment: tabAlignment, convergence: tabConvergence, society: tabSociety, report: tabReport, matches: tabMatches, auto: tabAuto
  }[view.tab] || tabOverview;
  return `
  <div class="anc-header">
    <div><h1>${esc(a.name || 'Unnamed ancestor')}</h1>
      <div class="anc-meta">${esc(lifeYears(a))}${a.place ? ' · ' + esc(a.place) : ''}${lifeYears(a) || a.place ? ' · ' : ''}${methodName(a)}</div></div>
    <div class="mini-lights">${st.map(s => `<span><i class="dot ${s[1].c}"></i>${s[0]}</span>`).join('')}</div>
  </div>
  ${a.example ? '<div class="verdict amber no-print" style="display:block;margin-bottom:14px"><b>This is an example with made-up data.</b> <span class="hint">Click Back and Continue to see what a finished case looks like at every step. When you are done, delete it on the Overview step: Goal → More options → Delete this ancestor.</span></div>' : ''}${guide}${body(a)}${nav}`;
}
/* Report charts drawn to match the calculators' charts (same colours, rounded boxes, label and key), built as tables with
   inline styles so they look the same on screen, in print and in the Word download. */
const RC_KEEP = '-webkit-print-color-adjust:exact;print-color-adjust:exact;';
const RC_COL = { gen: ['#ecdcc2', '#1f2b33', '#ddc6a1'], anc: ['#15303c', '#ffffff', '#15303c'], est: ['#a8762f', '#ffffff', '#a8762f'], snp: ['#3f7a6a', '#ffffff', '#3f7a6a'], pre: ['#f6f0e6', '#6b7378', '#ddc6a1'] };
function rcCell(kind, text, extra = '') {
  const [bg, fg, bd] = RC_COL[kind];
  return `<td bgcolor="${bg}" ${extra}style="${RC_KEEP}background:${bg};color:${fg};border:1px solid ${bd};border-radius:${kind === 'snp' ? 4 : 5}px;text-align:center;padding:5px 4px;font-size:13px;line-height:1.25;font-weight:700">${text}</td>`;
}
function rcLabel(text) { return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7378;font-weight:600;margin:14px 0 4px">${text}</div>`; }
function rcTable(rows) { return `<table style="width:100%;border-collapse:separate;border-spacing:3px;table-layout:fixed;margin:0 -3px">${rows}</table>`; }
/* Colour key, the same as the calculators': a small rounded box beside each label. */
function reportKey(items) {
  return `<div style="margin-top:8px;font-size:13px;color:#1f2b33">${items.map(k => { const [bg, , bd] = RC_COL[k[0]];
    return `<span style="white-space:nowrap;margin-right:18px"><span style="${RC_KEEP}display:inline-block;width:12px;height:12px;line-height:12px;font-size:8px;border-radius:3px;background:${bg};border:1px solid ${bd};margin-right:6px;vertical-align:-1px">&nbsp;</span>${k[1]}</span>`; }).join('')}<span style="color:#6b7378">Generation 1 is the tester's father.</span></div>`;
}
/* Generation chart for one tester: generations back to the ancestor, with his SNPs laid along them, newest to oldest. */
function reportGenChart(a, r) {
  const L = snpLayout(a, r);
  if (!L) return '';
  const { G, T, before } = L;
  const gens = Array.from({ length: T }, (_, j) => rcCell(j + 1 === G ? 'anc' : j + 1 > G ? 'pre' : 'gen', j + 1)).join('');
  const snpRow = L.spans.length ? `<tr>${L.spans.map(sp => rcCell('snp', esc(sp.name) + (sp.year != null ? `<br><span style="font-size:11px;font-weight:400">c. ${sp.year}</span>` : ''), `colspan="${sp.len}" `)).join('')}</tr>` : '';
  return rcLabel(`${esc(testerLabel(r.t))} · ${genText(r.t, G)} generations back to ${esc(a.name || 'the ancestor')}${before ? ` · shared SNP about ${before} generation${before === 1 ? '' : 's'} before him` : ''}${r.gps != null ? ` · one SNP every ${fmt(r.gps, 1)} generations` : ''}`) + rcTable(`<tr>${gens}</tr>${snpRow}`);
}
/* GD chart for one STR comparison: generations back to the ancestor, with the GD estimate placed on them. */
/* GD generation chart, shared by the ancestor's comparisons and the GD calculator. A is the documented generations (0 if unknown).
   The chart runs to the ancestor, or further when the estimate falls beyond him, so the estimate always shows. */
function gdChart(q, A, label) {
  const G = Math.min(60, A ? Math.max(A, q.mid) : q.hi);
  /* When the estimate falls on the ancestor's own generation, the box is bronze with the ancestor's dark border, so both show. */
  const gens = Array.from({ length: G }, (_, j) => j + 1 === q.mid && j + 1 === A ? rcCell('est', j + 1).replace('border:1px solid #a8762f', 'border:3px solid #15303c') : rcCell(j + 1 === A ? 'anc' : j + 1 === q.mid ? 'est' : 'gen', j + 1)).join('');
  return rcLabel(label) + rcTable(`<tr>${gens}</tr>`);
}
function reportGDChart(a, e) {
  const q = pairGens(a, e);
  if (!q) return '';
  const A = Math.max(num(e.ta && e.ta.generations) || 0, num(e.tb && e.tb.generations) || 0);
  /* The differing markers, when they were entered, listed in the same order as the two testers in the title. */
  const diffs = e.rows.length ? `<div style="font-size:13px;color:#1f2b33;margin-top:4px"><b>Differing markers:</b> ${e.rows.map(r => `${esc(r.m)} ${esc(String(r.a))} vs ${esc(String(r.b))}`).join(' · ')}</div>` : '';
  return gdChart(q, A, `${esc(testerLabel(e.ta))} vs ${esc(testerLabel(e.tb))} · GD ${e.gd} on ${e.markers} markers · estimate ${q.mid} generations`) + diffs;
}
/* Reports (left menu): pick an ancestor and open his report to read, print or download. */
let reportPick = '';
function renderReports() {
  if (!S.ancestors.length) return '<h1>Reports</h1><p class="muted">No ancestors yet. Create an ancestor to see his report here.</p>';
  if (!cur()) view.id = (S.ancestors.find(x => x.id === reportPick) || S.ancestors[0]).id;
  /* One entry per ancestor; an ancestor with more than one test gets one combined report. */
  const cs = casesOf(cur()).filter(c => c.testChosen);
  return `<h1 class="no-print">Reports</h1>
  <div class="field no-print" style="max-width:420px;margin-bottom:16px"><label>Ancestor</label><select id="rep-pick">${peopleOf(S.ancestors).map(g => `<option value="${esc(g[0].id)}"${g.some(x => x.id === view.id) ? ' selected' : ''}>${esc(ancLabel(g[0]))}${g.length > 1 ? ` · ${g.length} tests` : ''}</option>`).join('')}</select></div>
  ${cs.length > 1 ? combinedReport(cs) : tabReport(cur())}`;
}
/* Plain-language instructions for each step. */
function guideFor(a, tab) {
  const G = {
    intro: { q: 'What this test does', help: 'Start here. This page explains in plain words what this test is, what the words mean, and what you will do at each step. Read it through, then click Continue.' },
    checklist: { q: 'Before you start', help: 'Work through this checklist before collecting evidence. It makes sure the case is workable: you know which line you are testing, which testers descend from it and what records exist. Tick each item as you go; you can come back to it at any time.' },
    testers: { q: 'Who are the testers?', help: 'Add each man who has taken a Y-DNA test and descends from this ancestor in the direct male line (father to son). For each one enter his own birth year, how many generations he is from the ancestor (his father is generation 1), the test he took and, if he has a Big Y-700, his SNP path from FamilyTreeDNA, starting with his terminal SNP and moving back in time. If you do not know a tester\'s birth year, use 1955, a typical birth year for today\'s Y-DNA testers.' },
    str: { q: 'How closely do the testers match on STRs?', help: 'STRs are the marker values in a Y-37, Y-67 or Y-111 test. Genetic Distance (GD) is how many steps apart two testers are on those markers: the smaller it is, the closer the relationship. Choose two testers, pick how many markers were compared and enter the GD from FamilyTreeDNA\'s Y-DNA Matches page. The app estimates how many generations back they connect. Add one comparison for each pair of testers.' },
    documents: { q: 'What do the records show?', help: 'Enter the paper trail for this ancestor and his line: births, baptisms, marriages, deaths, wills, deeds, census and church records. For each one, note where it came from and whether it supports or contradicts the lineage. The records build the family tree; the DNA tests it.' },
    alignment: { q: 'Does each tester\'s family tree match the DNA?', help: 'For each tester, compare his documented line with what the DNA shows. Enter his earliest documented ancestor and where the family lived. Choose <b>Yes</b> if the paper trail and the DNA agree, <b>No</b> if they do not, and note any gaps or conflicts, such as a missing generation or a possible non-paternal event (NPE).' },
    snp: { q: 'Map the testers\' SNP tree', help: 'Every Big Y-700 tester has an SNP path: his newest SNP first, then older SNPs he shares with other men. The tree below draws all the testers\' paths together, oldest SNP at the top, so you can see where their lines branch apart and where they meet. Type or choose the ancestor in whom each SNP formed, if you know him. Then enter the FTDNA date of the SNP where the lines meet, and the app checks it against the generations.' },
    convergence: { q: 'Does the evidence agree?', help: 'Here the STR, genealogy and SNP evidence are weighed together. The chart shows how much of it supports the lineage and how much contradicts it. Review each line of evidence, change it if you know better, and record any conflict with its likely cause and how you plan to resolve it.' },
    matches: { q: 'Who are your autosomal DNA matches?', help: 'Open your testing company\'s DNA match list (AncestryDNA, FamilyTreeDNA Family Finder, 23andMe or MyHeritage) and add each match who descends from this ancestor. Enter the shared cM and the longest segment the company shows, and how many generations you and the match are each from the ancestor (a parent is generation 1). Note which child of the ancestor the match descends through. The app works out the relationship your trees show.' },
    auto: { q: 'Does the shared DNA fit the relationships?', help: 'For each match, the app compares the shared cM with the usual range for the relationship your trees show, and estimates how far back the match connects. A consistent match supports the line; a match outside the usual range means the tree needs a second look. Small amounts of shared DNA (under 7 cM) and very distant cousins (beyond 6th cousins) can be shared by chance, so they are not relied on.' },
    society: { q: 'Proving the line to a lineage society', help: 'If you are applying to a lineage society (such as the DAR, SAR or the Mayflower Society), set out the proof one generation at a time, from the applicant up to the qualifying ancestor. For each generation give the birth, marriage and death with their sources, and the record that proves he or she was the child of the next generation. Where the records cannot prove a link, the DNA evidence from this case can support it. Each society sets its own rules for DNA, so check its current policy.' },
    report: { q: 'Your research report', help: 'This is the summary of the case, in the order you worked. Download it as a Word document or print it. Conclusions stay provisional: new records or test results can change them.' }
  };
  /* SNP-first: the step's advice also says what to look for, for the question the user chose. */
  const inq = inquiryOf(a);
  const qTab = wantsSociety(a) ? 'society' : snpFirst(a) ? 'snp' : autoFirst(a) ? 'auto' : 'str';
  if (tab === qTab && inq && G[qTab]) return { q: G[qTab].q, help: `${G[qTab].help}<br><b>For your question (${esc(inq.q)}):</b> ${inq.focus}` };
  return G[tab] || null;
}
/* SNP-first: the genealogical question the user wants to answer. It guides the SNP step and heads the report. */
const INQUIRIES = [
  { v: 'same', q: 'Do these testers descend from the same man?',
    needs: 'Two or more Big Y-700 testers who believe they share an ancestor.',
    focus: 'Look at where the testers\' SNP paths meet on the tree. A shared SNP close to the testers points to a recent common ancestor; one far back means they connect long before the shared genealogy.',
    answer: 'e.g. "Yes, they meet at R-Y86591, about 10 generations back."' },
  { v: 'right', q: 'Is this documented ancestor the right man?',
    needs: 'A paper trail to a named man (his birth year and the generations to each tester), plus testers who descend from him.',
    focus: 'Enter the FTDNA formation date of the shared SNP and check the "Shared SNP vs ancestor" column. It should fall at or before his birth; check each tester\'s generations and SNP count line up too.',
    answer: 'e.g. "Consistent: the shared SNP formed about 4 generations before him."' },
  { v: 'branch', q: 'Which branch of the family does a tester belong to?',
    needs: 'One tester whose line is unknown, plus testers whose branches are known.',
    focus: 'Find where the new tester\'s path joins the tree, and which known tester he shares his lowest SNP with. That tester\'s branch is most likely his.',
    answer: 'e.g. "He belongs to Fred\'s branch; they share R-Y91124."' },
  { v: 'when', q: 'How far back do these lines connect?',
    needs: 'Two or more testers with their birth years, and the FTDNA formation dates of their SNPs.',
    focus: 'Enter the year each SNP formed beside it on the tree. The generation charts then show how many generations back the shared SNP sits.',
    answer: 'e.g. "The lines connect about 14 generations back, around 1450."' },
  { v: 'brick', q: 'Who was the father of my brick-wall ancestor?',
    needs: 'A tester whose paper trail stops at a man, plus matches whose trees go further back.',
    focus: 'See which matches share the lowest SNP with the tester. Their family trees point to the family of the generation above the brick wall, and where to search the records.',
    answer: 'e.g. "His closest SNP matches all descend from the Lancashire Barrows."' },
  { v: 'bwall', q: 'Do these brick-wall lines connect to one family?',
    needs: 'Big Y-700 testers whose paper trails stop at different brick-wall ancestors, with each brick-wall ancestor\'s birth year.',
    focus: 'Find the SNP all the testers share and enter its FTDNA formation date. If it formed before the brick-wall ancestors were born, they all descend from one man living around that date. You do not need to know which man the SNP formed in.',
    answer: 'e.g. "Yes: all 4 testers share R-FT249997, formed c. 1640, before their brick-wall ancestors."' },
  { v: 'npe', q: 'Did a surname change or non-paternal event happen?',
    needs: 'A tester who expected to match a surname group but does not, or who matches a different surname.',
    focus: 'Find where his path leaves the surname group\'s tree, and when that SNP formed. An old split happened before the records; a recent one points to the last few generations.',
    answer: 'e.g. "He leaves the Barrow line before 1450, so the break is older than the records."' },
  { v: 'origin', q: 'Where did the family come from before immigrating?',
    needs: 'A tester with an immigrant ancestor, plus matches whose earliest ancestors are known in the old country.',
    focus: 'See which matches share the lowest SNP with the tester, and note where their earliest ancestors lived. That is where to search for the immigrant\'s origins.',
    answer: 'e.g. "His closest SNP matches trace to Lancashire, England."' },
  { v: 'groups', q: 'Are these surname families related to each other?',
    needs: 'Testers from separate family groups of the same surname, as in a surname project.',
    focus: 'Check whether the groups share an SNP on the tree, and the year it formed. A shared SNP within the surname era means one family; an older one means related only before surnames.',
    answer: 'e.g. "The two Barrow groups share R-Y86591 c. 1450: related, but before the records."' }
];
/* STR-first: the same kind of questions, answered with Genetic Distance (GD) and the generations estimate. */
const STR_INQUIRIES = [
  { v: 's-close', q: 'Are these testers closely related?',
    needs: 'Two or more testers compared on the same number of markers.',
    focus: 'Compare each pair\'s GD and generations estimate. A low GD on more markers means a closer relationship.',
    answer: 'e.g. "Yes, GD 1 on 67 markers: likely connected within about 5 generations."' },
  { v: 's-right', q: 'Is this documented ancestor the right man?',
    needs: 'A paper trail to a named man and the documented generations to each tester.',
    focus: 'Check that each comparison\'s generations estimate includes the documented generations.',
    answer: 'e.g. "Consistent: the estimate of about 10 generations matches the 10 documented."' },
  { v: 's-branch', q: 'Which family line does a new match belong to?',
    needs: 'One new match, plus testers whose lines are known.',
    focus: 'Compare the new match with each known tester. The one with the lowest GD is most likely his line.',
    answer: 'e.g. "Closest to John\'s line: GD 1, against GD 4 to the others."' },
  { v: 's-when', q: 'How far back do these lines connect?',
    needs: 'Two testers and their GD.',
    focus: 'Read the generations estimate for each comparison; the app converts it to years.',
    answer: 'e.g. "About 8 generations back, around the 1700s."' },
  { v: 's-brick', q: 'Who was the father of my brick-wall ancestor?',
    needs: 'A tester whose paper trail stops at a man, plus matches whose trees go further back.',
    focus: 'Compare the tester with each match. The matches with the lowest GD point to the family above the brick wall; search their trees.',
    answer: 'e.g. "Closest matches descend from the Hartwells of Kent; search there."' },
  { v: 's-bwall', q: 'Do these brick-wall lines connect to one family?',
    needs: 'Testers whose paper trails stop at different brick-wall ancestors, with how many generations each is from his brick wall, and a GD comparison for each pair.',
    focus: 'Each GD comparison estimates how many generations back two testers connect. If the estimate reaches past both testers\' brick walls, their lines can connect in one family above them, even with no records to show it.',
    answer: 'e.g. "Yes: every pair connects about 10 generations back, about 2 above their brick walls."' },
  { v: 's-npe', q: 'Did a surname change or non-paternal event happen?',
    needs: 'A tester who expected to match a surname group.',
    focus: 'Compare him with the group. A GD too high for a shared surname line (a distant match, GD 5+) points to a break in his line.',
    answer: 'e.g. "GD 9 on 67 markers: not related within the surname era; the break is in his line."' },
  { v: 's-groups', q: 'Are these surname families related to each other?',
    needs: 'Testers from separate groups of the same surname.',
    focus: 'Compare testers across the groups. Close or intermediate matches mean the groups are related; only distant matches mean they are not, in recent times.',
    answer: 'e.g. "GD 3 on 111: related, likely within the last 10 to 15 generations."' }
];
/* Both methods: proving the line to a lineage society, with this case's DNA as support. */
INQUIRIES.push({ v: 'society', q: 'Can I prove this line to a lineage society?',
  needs: 'The documented line from the applicant up to the qualifying ancestor, with sources for each generation, and the society\'s rules.',
  focus: 'On the Lineage Society step, prove each generation in turn. Where a link has no paper proof, the SNP evidence from this case can support it, if the society accepts DNA.',
  answer: 'e.g. "Ready to submit: all 9 generations are proven."' });
STR_INQUIRIES.push({ v: 's-society', q: 'Can I prove this line to a lineage society?',
  needs: 'The documented line from the applicant up to the qualifying ancestor, with sources for each generation, and the society\'s rules.',
  focus: 'On the Lineage Society step, prove each generation in turn. Where a link has no paper proof, the GD evidence from this case can support it, if the society accepts DNA.',
  answer: 'e.g. "Ready to submit: all 9 generations are proven."' });
function inquiryList(a) { return snpFirst(a) ? INQUIRIES : autoFirst(a) ? AUTO_INQUIRIES : STR_INQUIRIES; }
function inquiryOf(a) { return inquiryList(a).find(x => x.v === a.inquiry) || null; }
/* STR-first: whether the GD comparisons entered so far answer the chosen question. */
function strInquiryStatus(a, inq, need, done, lead, no) {
  const ypg = lineageYPG(a) || 33;
  const P = a.gdPairs.map(p => { const e = pairEval(a, p); return { e, q: e.ta && e.tb ? pairGens(a, e) : null }; }).filter(x => x.q);
  if (!P.length) return need('Add a GD comparison between two testers on the STR Analysis step, with the markers compared.');
  const nm = x => `${esc(testerLabel(x.e.ta))} vs ${esc(testerLabel(x.e.tb))}`;
  const desc = x => `${nm(x)}: GD ${x.e.gd} on ${x.e.markers} markers, about ${x.q.mid} generations (${x.q.lo}–${x.q.hi})`;
  const best = new Map();
  P.forEach(x => [[x.e.ta, x.e.tb], [x.e.tb, x.e.ta]].forEach(([t, o]) => { const b = best.get(t); if (!b || x.q.mid < b.x.q.mid) best.set(t, { o, x }); }));
  const close = [...best.entries()].map(([t, b]) => `${esc(testerLabel(t))} → ${esc(testerLabel(b.o))} (GD ${b.x.e.gd} on ${b.x.e.markers})`).join('; ');
  const far = P.filter(x => x.e.group.key === 'distant');
  switch (inq.v) {
    case 's-close':
      return far.length ? no(`Not all closely related: ${far.map(desc).join('; ')}.`) : done(`Yes: ${P.map(desc).join('; ')}.`);
    case 's-right': {
      const chk = P.map(x => { const g = [num(x.e.ta.generations), num(x.e.tb.generations)].filter(v => v != null), G = g.length ? Math.round(g.reduce((t, v) => t + v, 0) / g.length) : null, c = x.e.ta.circa || x.e.tb.circa ? 1 : 0; return { x, G, c, ok: G != null && G >= x.q.lo - c && G <= x.q.hi + c }; });
      if (chk.some(c => c.G == null)) return need('Add each tester\'s generations back to the ancestor on the Testers & DNA step.');
      return chk.every(c => c.ok) ? done(`Consistent: ${chk.map(c => `${nm(c.x)}, the estimate of ${c.x.q.lo}–${c.x.q.hi} generations includes the ${c.c ? 'c. ' : ''}${c.G} documented`).join('; ')}.`)
        : no(`Not consistent: ${chk.filter(c => !c.ok).map(c => `${nm(c.x)}, the estimate of ${c.x.q.lo}–${c.x.q.hi} generations does not include the ${c.c ? 'c. ' : ''}${c.G} documented`).join('; ')}.`);
    }
    case 's-branch':
      return done(`Each tester's closest line, by lowest GD: ${close}.`);
    case 's-when':
      return done(`${P.map(x => `${desc(x)}, about ${fmt(x.q.mid * ypg, 0)} years`).join('; ')}.`);
    case 's-bwall': {
      /* Each pair's estimate has to reach past both testers' brick walls for their lines to connect in one family above them. */
      if (far.length) return no(`No: ${far.map(desc).join('; ')}. That is a distant match, so these lines most likely connect long before the brick walls, if at all in the surname era.`);
      const W = P.map(x => ({ x, g: Math.max(num(x.e.ta.generations) || 0, num(x.e.tb.generations) || 0) }));
      if (W.some(w => !(num(w.x.e.ta.generations) >= 1) || !(num(w.x.e.tb.generations) >= 1))) return need('Enter how many generations each tester is from his own brick-wall ancestor (Generations back) on the Testers & DNA step.');
      const lee = w => w.x.e.ta.circa || w.x.e.tb.circa ? 1 : 0, gl = w => `${lee(w) ? 'c. ' : ''}${w.g}`;
      const short = W.filter(w => w.x.q.hi + lee(w) < w.g);
      if (short.length) return lead(`${short.map(w => `${nm(w.x)}: the estimate (${w.x.q.lo}–${w.x.q.hi} generations) does not reach their brick walls at ${gl(w)}`).join('; ')}. Recheck the generations entered and the GD.`);
      /* Every pair's likely range takes in the brick-wall generation, so the lines fit one family connecting at or above it.
         GD estimates are not exact, so the documented generation only needs to fall inside the range. */
      const at = w => [w.x.e.ta, w.x.e.tb].every(t => !t.line || t.line === caseAncestor(a)) && a.name ? `${esc(a.name)}'s generation (${gl(w)})` : `their brick walls (${gl(w)} generations)`;
      const pairs = W.map(w => `${nm(w.x)}: GD ${w.x.e.gd} on ${w.x.e.markers}, about ${w.x.q.mid} generations back (likely ${w.x.q.lo}–${w.x.q.hi}), which takes in ${at(w)}`).join('; ');
      return done(`Yes: every pair fits one family. ${pairs}.`);
    }
    case 's-brick':
      return lead(`Closest matches by GD: ${close}. Search these matches' family trees for the generation above the brick wall.`);
    case 's-npe':
      return far.length ? lead(`${far.map(desc).join('; ')}: too distant for a recent shared surname line. If they expected to match, the break is in one of these lines.`) : done('No break found: every comparison is a close or intermediate match.');
    case 's-groups':
      return far.length === P.length ? no(`Not related in recent times: ${P.map(desc).join('; ')}.`) : done(`Related: ${P.filter(x => x.e.group.key !== 'distant').map(desc).join('; ')}.`);
  }
  return null;
}
/* Whether the evidence entered so far answers the chosen question. */
function closestMatches(a) {
  /* For each tester with an SNP path: the other tester he shares his lowest (newest) SNP with. */
  const ts = a.testers.filter(t => pathOf(t).length);
  return ts.map(t => {
    let best = null;
    ts.forEach(o => { if (o === t) return; const op = pathOf(o).map(normSNP), i = pathOf(t).findIndex(x => op.includes(normSNP(x)));
      if (i >= 0 && (!best || i < best.i)) best = { o, i, snp: pathOf(t)[i] }; });
    return { t, best };
  });
}
function inquiryStatus(a) {
  const inq = inquiryOf(a);
  if (!inq) return null;
  const need = m => ({ c: 'amber', label: 'Not answered yet', msg: m }), done = m => ({ c: 'green', label: 'Answered', msg: m });
  const lead = m => ({ c: 'amber', label: 'Lead found', msg: m }), no = m => ({ c: 'red', label: 'Answered: no', msg: m });
  if (/society$/.test(inq.v)) { const r = societyReadiness(a); return r.c === 'green' ? done(r.msg) : r.c === 'amber' ? lead(r.msg) : need(r.msg); }
  if (autoFirst(a)) return autoInquiryStatus(a, inq, need, done, lead, no);
  if (!snpFirst(a)) return strInquiryStatus(a, inq, need, done, lead, no);
  const paths = a.testers.filter(t => pathOf(t).length), tgt = targetSNP(a), yr = num(a.ftdnaDate);
  const rows = a.testers.map(t => genRow(a, t)).filter(r => r.diff != null && r.gens != null);
  const cm = closestMatches(a).filter(x => x.best);
  const list = cm.map(x => `${esc(testerLabel(x.t))} → ${esc(testerLabel(x.best.o))} (${esc(x.best.snp)})`).join('; ');
  if (inq.v !== 'right' && inq.v !== 'when' && paths.length < 2) return need('Add the SNP paths of at least two testers on the Testers & DNA step.');
  switch (inq.v) {
    case 'same':
      return tgt ? done(`Yes: the testers' lines meet at ${esc(tgt)}${yr != null ? `, formed c. ${yr}` : ''}.`) : no('No SNP is shared in the paths entered. Check each path reaches back far enough; if it does, the testers do not descend from the same man in recent times.');
    case 'right':
      if (!tgt || yr == null || num(a.birth) == null || !rows.length) return need('Add the ancestor\'s birth year, the testers\' generations and SNP paths, and the FTDNA formation date of the shared SNP.');
      return rows.every(r => r.aligned) ? done(`Consistent: the shared SNP ${esc(tgt)} ${snpVsAncestor(rows[0]).replace(/^c\. \d+, /, 'formed ')}, as it should for the right man.`) : no(`Not consistent: the shared SNP ${esc(tgt)} formed c. ${yr}, after his birth, so he may not be the common ancestor.`);
    case 'when': {
      if (!tgt || yr == null || !rows.length) return need('Add the testers\' generations and SNP paths, the ancestor\'s birth year and the FTDNA formation date of the shared SNP.');
      const g = rows.map(r => r.gens + Math.max(0, r.gensBefore || 0)), lo = Math.min(...g), hi = Math.max(...g);
      return done(`The lines connect at ${esc(tgt)}, c. ${yr}: about ${lo === hi ? lo : lo + '–' + hi} generations back from the testers.`);
    }
    case 'branch':
      return cm.length ? done(`Each tester's closest branch, by the SNP he shares lowest: ${list}.`) : no('No two testers share an SNP in the paths entered.');
    case 'bwall': {
      /* The brick-wall lines connect if they share an SNP that formed before the brick-wall ancestors were born. */
      const nm = t => esc(testerLabel(t));
      if (!tgt) {
        const count = {}; paths.forEach(t => pathOf(t).forEach(x => { const k = normSNP(x); count[k] = (count[k] || 0) + 1; }));
        const top = Math.max(0, ...Object.values(count)), snp = top >= 2 ? pathOf(paths.find(t => pathOf(t).some(x => count[normSNP(x)] === top))).find(x => count[normSNP(x)] === top) : null;
        if (!snp) return no('No: the testers share no SNP in the paths entered. Check each path reaches back far enough.');
        const out = paths.filter(t => !carriesSNP(t, snp));
        return no(`No: ${out.map(nm).join(', ')} ${out.length === 1 ? 'does' : 'do'} not share ${esc(snp)} with the others, so ${out.length === 1 ? 'his line connects' : 'their lines connect'} further back.`);
      }
      const y = snpYear(tgt, a), walls = paths.map(t => num(t.lineBirth) != null ? num(t.lineBirth) : !t.line ? num(a.birth) : null).filter(x => x != null);
      if (y == null) return lead(`All ${paths.length} testers share ${esc(tgt)}. Enter its FTDNA formation date on the SNP Analysis step to see whether it formed before their brick-wall ancestors.`);
      if (!walls.length) return lead(`All ${paths.length} testers share ${esc(tgt)}, formed c. ${y}. Enter each brick-wall ancestor's birth year on the Testers & DNA step to date the connection.`);
      const lo = Math.min(...walls), hi = Math.max(...walls), born = lo === hi ? `born ${lo}` : `born ${lo}–${hi}`;
      if (y > lo) return lead(`All ${paths.length} testers share ${esc(tgt)}, but FTDNA dates it c. ${y}, after the earliest brick-wall ancestor was born (${lo}). FTDNA dates are estimates with wide ranges, so the lines most likely connect close to the brick-wall generation. Check the date range on FTDNA Discover.`);
      const g = Math.round((lo - y) / (lineageYPG(a) || 33));
      return done(`Yes: all ${paths.length} testers share ${esc(tgt)}, formed c. ${y}, before their brick-wall ancestors (${born}). Their lines connect in one family ${g >= 1 ? `about ${g} generation${g === 1 ? '' : 's'} above the brick walls` : 'at about the brick-wall generation'}.`);
    }
    case 'brick':
      return cm.length ? lead(`Closest SNP matches: ${list}. Search these matches' family trees for the generation above the brick wall.`) : need('No two testers share an SNP yet; add matches whose trees go further back.');
    case 'npe': {
      if (!cm.length) return no('No two testers share an SNP in the paths entered.');
      const far = cm.filter(x => tgt && normSNP(x.best.snp) === normSNP(tgt) && paths.length > 2);
      return far.length ? lead(`${far.map(x => esc(testerLabel(x.t))).join(', ')} only meet${far.length === 1 ? 's' : ''} the others at the shared SNP ${esc(tgt)}${yr != null ? ` (c. ${yr})` : ''}. If ${far.length === 1 ? 'he' : 'they'} expected a closer match, the break is in that line${yr != null && num(a.birth) != null && yr < num(a.birth) ? ', and it is older than the ancestor, before the records' : ''}.`) : done(`No break found: ${list}.`);
    }
    case 'origin': {
      const withLoc = cm.filter(x => x.best.o.location);
      return withLoc.length ? lead(`Closest SNP matches and where they come from: ${withLoc.map(x => `${esc(testerLabel(x.t))} → ${esc(testerLabel(x.best.o))}, ${esc(x.best.o.location)} (${esc(x.best.snp)})`).join('; ')}. Search there for the immigrant's origins.`) : need('Add each tester\'s location on the Testers & DNA step to see where his closest matches come from.');
    }
    case 'groups':
      if (!tgt) return no('The groups share no SNP in the paths entered, so they are separate families.');
      if (yr == null) return need(`The groups share ${esc(tgt)}. Add its FTDNA formation date to see whether they are related within the surname era.`);
      return done(yr >= 1300 ? `Related within the surname era: the groups share ${esc(tgt)}, formed c. ${yr}.` : `Related, but only before hereditary surnames (about 1300 in England): the groups share ${esc(tgt)}, formed c. ${yr}.`);
  }
  return null;
}
function inquiryCard(a) {
  const inq = inquiryOf(a), st = inquiryStatus(a);
  if (!inq || !st) return '';
  return `<div class="card"><div class="card-head"><h3>Your question</h3>${pill(st.c, st.label)}</div><p style="margin:0 0 6px"><b>${esc(inq.q)}</b></p><p class="hint" style="margin:0">${st.msg}</p></div>`;
}
/* The ancestor screen asks for the man the chosen question is about. */
function ancPrompt(a) {
  const P = {
    right: { q: 'Who is the documented ancestor?', help: 'Enter the man your paper trail leads to, as his name appears in the records, with his birth and death years (estimates are fine) and where he lived. The DNA will test whether he is the right man.' },
    bwall: { q: 'Who is the ancestor these lines are thought to share?', help: 'Enter the man the brick-wall lines are believed to descend from, such as the earliest man of the surname in the area, with estimated dates and where he lived. Each tester\'s own brick-wall ancestor goes on the Testers & DNA step.' },
    brick: { q: 'Who is your brick-wall ancestor?', help: 'Enter the earliest man you can document in the tester\'s line: the one whose father is unknown. Give his birth and death years (estimates are fine) and where he lived.' },
    branch: { q: 'Who is the ancestor of the family?', help: 'Enter the man the known branches all descend from, if you know him, with his birth and death years (estimates are fine) and where he lived.' },
    npe: { q: 'Who is the ancestor of the surname group?', help: 'Enter the earliest documented man of the surname group the tester expected to match, with his birth and death years (estimates are fine) and where he lived.' },
    origin: { q: 'Who is the immigrant ancestor?', help: 'Enter the man who came to the new country, as far back as the records go, with his birth and death years (estimates are fine) and where he settled.' },
    groups: { q: 'Who is the earliest ancestor you are comparing?', help: 'Enter the earliest documented man of one of the family groups, with his birth and death years (estimates are fine) and where he lived. Note the other group\'s ancestor in your notes.' },
    society: { q: 'Who is the qualifying ancestor?', help: 'Enter the ancestor the society application is based on (for example, the patriot or passenger), as his name appears in the records, with his birth and death years and where he lived.' }
  };
  const inq = inquiryOf(a);
  if (!(inq && P[inq.v.replace(/^[sa]-/, '')]) && autoFirst(a)) return { q: 'Who is the ancestor?', help: 'Enter the ancestor you and your matches believe you descend from, a man or a woman, as the name appears in the records, with birth and death years (estimates are fine) and where they lived.' };
  return (inq && P[inq.v.replace(/^[sa]-/, '')]) || { q: 'Who is the ancestor?', help: 'Enter the man you believe the testers descend from. Use his name as it appears in the records, his birth and death years (estimates are fine) and where he lived. His birth year is used to work out each tester\'s years per generation.' };
}

/* ----- Tab 1: Overview ----- */
function tabOverview(a) {
  const st = autoFirst(a) ? [['Autosomal evidence', autoStatus(a)], ['Genealogical evidence', genealogyStatus(a)]] : snpFirst(a) ? [['SNP evidence', snpStatus(a)], ['Genealogical evidence', genealogyStatus(a)]] : [['STR evidence', strStatus(a)], ['Genealogical evidence', genealogyStatus(a)]];
  const v = verdict(a), ns = nextStep(a), shared = sharedSNP(a.testers);
  return `
  ${(() => {
    /* Guided, one step per screen: each step explains what to do, then Back / Continue. */
    let k = Math.max(0, Math.min(2, view.ostep || 0));
    const steps = [
      { tab: 'Ancestor', q: ancPrompt(a).q,
        help: ancPrompt(a).help,
        body: `${field('Name', 'name', a.name, { ph: 'e.g. Alexander Joyce' })}
        ${field('Birth year', 'birth', a.birth, { type: 'number', ph: 'e.g. 1609' })}
        ${field('Death year', 'death', a.death, { type: 'number', ph: 'e.g. 1665' })}
        ${field('Place', 'place', a.place, { ph: 'e.g. Lunenburg County, Virginia' })}` },
      { tab: 'Tests', q: 'What DNA tests have been taken?',
        help: `Check which tests have been taken. If the testers have <b>Big Y-700</b> results, choose <b>SNP-first</b>: you will start by mapping their SNP tree. If they have the basic Y-DNA marker tests (<b>Y-37, Y-67 or Y-111</b>), choose <b>STR-first</b>: you will start with their marker matches. If you have an <b>autosomal test</b> (AncestryDNA, FamilyTreeDNA Family Finder, 23andMe or MyHeritage), choose <b>Autosomal-first</b>: you will start with your DNA matches. This sets the order of the steps that follow.`,
        body: `<div class="field" style="grid-column:span 2"><label>Tests</label><select data-anc="method">${METHODS.map(o => `<option value="${o.v}"${(a.method || '') === o.v ? ' selected' : ''}>${o.l}</option>`).join('')}</select></div>
        <div class="field full"><div class="hint">${(METHODS.find(o => o.v === (a.method || '')) || METHODS[0]).best ? (METHODS.find(o => o.v === (a.method || '')) || METHODS[0]).best + '<br>' : ''}<b>Your steps:</b> ${tabsFor(a).slice(2).map(t => t[1]).join(' → ')}</div></div>` },
      { tab: 'Goal', q: 'What do you want to find out?',
        help: `Choose the question you want the ${snpFirst(a) ? 'SNP' : autoFirst(a) ? 'autosomal DNA' : 'STR marker'} evidence to answer. It decides what to look for and appears at the top of the report, with whether it has been answered. You can add your own notes below.`,
        body: `<div class="field" style="grid-column:span 2"><label>Your question</label><select data-anc="inquiry"><option value="">— choose a question —</option>${inquiryList(a).map(o => `<option value="${o.v}"${a.inquiry === o.v ? ' selected' : ''}>${esc(o.q)}</option>`).join('')}</select></div>
        ${inquiryOf(a) ? `<div class="field full"><div class="hint"><b>You need:</b> ${inquiryOf(a).needs}<br><b>What to look for:</b> ${inquiryOf(a).focus}<br><b>The answer looks like:</b> ${esc(inquiryOf(a).answer)}</div></div>` : ''}
        ${field('Your notes (optional)', 'notes', a.notes, { type: 'textarea', full: true, ph: 'e.g. John and Samuel Hartwell both believe they descend from William Hartwell' })}
        <details class="gd-doc" style="grid-column:1 / -1"><summary>More options</summary><div class="grid3" style="margin-top:8px">
          <div class="field"><label>Change test</label><select data-anc="method">${METHODS.filter(o => o.v === (a.method || '') || !casesOf(a).some(x => x.id !== a.id && x.testChosen && (x.method || '') === o.v)).map(o => `<option value="${o.v}"${(a.method || '') === o.v ? ' selected' : ''}>${o.l}</option>`).join('')}</select></div>
          ${field('Fallback Years Per Generation (YPG)', 'ypg', a.ypg, { type: 'number', ph: `Default ${S.settings.ypg}`, hint: 'Only used for a tester whose own YPG can\'t be calculated.' })}
          <div class="field"><label>&nbsp;</label><button class="btn small danger" data-act="del-ancestor">Delete this ancestor</button></div>
        </div></details>` }
    ];
    /* Tests first, then the question, then the ancestor the question is about. */
    steps.push(steps.shift());
    /* The test is chosen before the checklist, so the Tests question is not asked again here. */
    steps.shift();
    k = Math.min(k, steps.length - 1);
    const s = steps[k], list = tabsFor(a), oi = list.findIndex(t => t[0] === 'overview'), prev = list[oi - 1], next = list[oi + 1];
    return `<div class="card wiz">
      <div class="wiz-prog">${steps.map((x, i) => `<button class="wiz-dot${i === k ? ' on' : i < k ? ' done' : ''}" data-act="ostep" data-n="${i}"><span class="od-num">${i < k ? '✓' : i + 1}</span>${x.tab}</button>`).join('')}</div>
      <div class="wiz-step">Step ${oi + 1} of ${list.length} · Part ${k + 1} of ${steps.length}</div>
      <h3 class="wiz-q">${s.q}</h3>
      <div class="wiz-help"><b>What to do:</b> ${s.help}</div>
      <div class="grid3">${s.body}</div>
      <div class="wiz-nav">${k ? `<button class="btn ghost" data-act="ostep" data-n="${k - 1}">← Back</button>` : `<button class="btn ghost" data-act="tab" data-tab="${prev[0]}">← Back</button>`}${k < steps.length - 1 ? `<button class="btn" data-act="ostep" data-n="${k + 1}">Continue →</button>` : `<button class="btn" data-act="tab" data-tab="${next[0]}">Continue to ${esc(next[1])} →</button>`}</div>
    </div>`;
  })()}`;
}

/* ----- Tab 2: Documents ----- */
const DOC_TYPES = ['Birth', 'Baptism', 'Marriage', 'Death / Burial', 'Census', 'Probate / Will', 'Land / Deed', 'Military', 'Church / Parish', 'Tax', 'Court', 'Other'];
function tabDocuments(a) {
  return `<div class="card">
    <div class="card-head"><h3>Historical documents</h3></div>
    <p class="hint">Record the traditional evidence for this ancestor: birth, marriage, death, census, probate, land, military and church records.</p>
    ${editTable('documents', [
      { k: 'type', label: 'Type', type: 'select', opts: DOC_TYPES, w: 150 },
      { k: 'date', label: 'Date', ph: 'e.g. 1752', w: 76 },
      { k: 'place', label: 'Place', type: 'textarea', w: 150 },
      { k: 'source', label: 'Source / citation', type: 'textarea', w: 200 },
      { k: 'notes', label: 'What it shows', type: 'textarea', w: 220 },
      { k: 'supports', label: 'Supports the lineage?', type: 'select', w: 120, opts: [{ v: '', l: '—' }, { v: 'Y', l: 'Supports' }, { v: 'N', l: 'Contradicts' }] }
    ], a.documents, { addLabel: 'Add document', empty: 'No documents yet.' })}
    <div class="lost-records" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line)">
      <label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" data-anc="recordsLost"${a.recordsLost ? ' checked' : ''} style="margin-top:3px"><span><b>Records for this line are lost</b> <span class="hint">(a burned courthouse, destroyed or missing records)</span><br><span class="hint">The records then count neither for nor against the line, and the conclusion rests on the DNA. Any documents you do have still count.</span></span></label>
      ${a.recordsLost ? `<div class="grid2" style="margin-top:10px">${field('What was lost', 'recordsLostNote', a.recordsLostNote || '', { ph: 'e.g. Bertie County courthouse fire, 1890' })}</div>` : ''}
    </div>
  </div>`;
}

/* ----- Tab 3: Testers & DNA ----- */
const TEST_TYPES = ['Big Y-700', 'Y-111', 'Y-67', 'Y-37', 'SNP pack', 'Other'];
/* The tests offered match the method: SNP-first is for Big Y-700 testers, STR-first for the basic marker tests. */
function testTypes(a) { return snpFirst(a) ? ['Big Y-700'] : ['Y-111', 'Y-67', 'Y-37']; }
function tabTesters(a) {
  return `<div class="card">
    <div class="card-head"><h3>Testers descending from ${esc(a.name || 'this ancestor')}</h3></div>
    <p class="hint"><b>Earliest documented ancestor</b> is filled in with the ancestor you entered on the Overview step. Change it only if a tester's paper trail stops at a later ancestor.${a.inquiry === 'bwall' ? ' For your question, enter each tester\'s own brick-wall ancestor and his birth year.' : a.inquiry === 's-bwall' ? ' For your question, enter each tester\'s own brick-wall ancestor, and in Generations back how many generations he is from that brick wall.' : ''}<br><b>Circa</b>: tick it when the generations back are a close estimate rather than proven. It shows as "c. 10", and the checks allow one generation either way.<br><b>Tester birth year</b>: if you do not know it, use 1955, a typical birth year for today's Y-DNA testers.</p>
    ${snpFirst(a) ? '<p class="hint"><b>SNP path</b>: enter the tester\'s terminal SNP, his newest one, in <a href="https://discover.familytreedna.com/" target="_blank" rel="noopener">FamilyTreeDNA Discover</a> and open <b>Ancestral Path</b>. Copy the SNPs from his terminal SNP back toward this ancestor, separated by commas.</p>' : ''}
    ${editTable('testers', [
      { k: 'label', label: 'Tester', ph: 'e.g. John Hartwell' },
      { k: 'line', label: 'Earliest documented ancestor', w: 170, ph: 'e.g. William Hartwell', def: () => caseAncestor(a) },
      ...(a.inquiry === 'bwall' ? [{ k: 'lineBirth', label: 'His birth year', type: 'number', w: 90, ph: 'e.g. 1715', def: r => r.line ? '' : (a.birth || '') }] : []),
      { k: 'birth', label: 'Tester birth year', type: 'number', w: 100, ph: 'e.g. 1954' },
      { k: 'generations', label: 'Generations back', type: 'number', w: 90, ph: 'e.g. 10' },
      { k: 'circa', label: 'Circa', type: 'check', w: 60 },
      { k: 'test', label: 'Test', type: 'select', opts: testTypes(a) },
      snpFirst(a) && { k: 'path', label: 'SNP path (newest → oldest)', type: 'textarea', w: 230, ph: 'e.g. R-FTB42619, R-MF109215, R-Y11201' },
      { k: 'location', label: 'Location', w: 140, ph: 'e.g. Texas' }
    ].filter(Boolean), a.testers, { addLabel: 'Add tester', empty: 'No testers yet.' })}
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
  /* No SNP of his own: the ancestor is drawn as his own step directly below the shared SNP. */
  const noOwn = a.ownSNP === 'N';
  const tags = c => c.testers.map(x => `<span class="tester-tag">${esc(x)}</span>`).join('');
  const draw = node => `<ul>${[...node.children.values()].map(c => {
    const isT = tgt && normSNP(c.name) === normSNP(tgt), snp = `<span class="snp-node${isT ? ' target' : ''}">${esc(c.name)}</span>`;
    if (isT && noOwn) return `<li>${snp}<ul><li><span class="anc-node">${esc(a.name || 'Ancestor')}</span>${tags(c)}${c.children.size ? draw(c) : ''}</li></ul></li>`;
    return `<li><div class="ut-row">${snp}<input class="ut-year" type="number" data-snpdate="${esc(normSNP(c.name))}" value="${esc(snpYear(c.name, a) == null ? '' : snpYear(c.name, a))}" placeholder="Year formed"><input class="ut-assign" data-snpassign="${esc(normSNP(c.name))}" list="anc-list" value="${esc(snpAssigned(c.name))}" placeholder="Assign an ancestor" autocomplete="off">${tags(c)}</div>${c.children.size ? draw(c) : ''}</li>`;
  }).join('')}</ul>`;
  return `<div class="tree utree">${draw(root)}</div><datalist id="anc-list">${realAncestors().map(x => `<option value="${esc(ancLabel(x))}">`).join('')}</datalist><p class="hint" style="margin-top:8px">Oldest SNP at the top. The highlighted SNP is where the testers' lines meet. Beside each SNP, enter the year it formed (from FamilyTreeDNA Discover); it shows on the generation charts. Type or choose the ancestor in whom each SNP formed, if you know him; the same SNP shows the same ancestor in every case and on the SNP Tree page.</p>`;
}
/* SNP Analysis when the ancestor has no SNP of his own: where he sits between SNPs, and what each tester carries. */
function tabSNPNoOwn(a) {
  const tgt = targetSNP(a), ab = num(a.birth), ftdna = num(a.ftdnaDate);
  const rows = a.testers.map(t => genRow(a, t)), check = rows.find(r => r.aligned != null);
  const below = t => { const p = pathOf(t), i = p.map(normSNP).indexOf(normSNP(tgt)); return i > 0 ? p.slice(0, i) : []; };
  const status = ab == null || ftdna == null ? pill('', 'Add the ancestor\'s birth year and the FTDNA date (Overview) to check')
    : check ? (check.aligned ? pill('green', `${tgt} formed ${Math.abs(Math.round(check.diff))} yrs ${check.diff <= 0 ? 'before' : 'after'} his birth — consistent`) : pill('red', `FTDNA dates ${tgt} after his birth — he cannot sit below it`)) : '';
  const timeline = r => {
    if (r.tb == null || ab == null || !r.snps) return '';
    const p = pathOf(r.t), steps = [];
    for (let i = 0; i < r.snps; i++) {
      const name = esc(p[i] || 'SNP ' + (i + 1));
      steps.push(i === r.snps - 1 ? `<li><b>${name}</b> — ${ftdna != null ? `FTDNA c. ${ftdna}, ` : ''}formed before ${esc(a.name || 'the ancestor')}</li>` : `<li><b>${name}</b> ≈ ${Math.round(r.tb - (i + 1) * (r.tb - ab) / r.snps)}</li>`);
    }
    return `<details style="margin-top:10px"><summary>SNP timeline for ${esc(testerLabel(r.t))}</summary><ol class="timeline">${steps.join('')}</ol></details>`;
  };
  return `
  <div class="card">
    <div class="card-head"><h3>Ancestor's place in the SNP tree</h3>${tgt ? pill('', 'No SNP of his own') : ''}</div>
    ${tgt ? `<div class="bracket">
      <div class="br-row"><span class="br-tag">Above him</span><span class="snp-node target">${esc(tgt)}</span><span class="hint">shared SNP · ${ftdna != null ? 'FTDNA c. ' + ftdna : 'FTDNA date not set'}</span></div>
      <div class="br-line"></div>
      <div class="br-row"><span class="br-tag">Ancestor</span><span class="anc-node">${esc(a.name || 'Ancestor')}</span><span class="hint">${ab != null ? 'born ' + ab : 'birth year not set'}</span></div>
      <div class="br-line"></div>
      <div class="br-row br-top"><span class="br-tag">Below him</span><div>${a.testers.length ? a.testers.map(t => { const l = below(t); return `<div class="br-below"><b>${esc(testerLabel(t))}:</b> ${l.length ? l.slice().reverse().map(x => `<span class="snp-node">${esc(x)}</span>`).join(' → ') : '<span class="muted">no SNPs below him yet</span>'}</div>`; }).join('') : '<span class="muted">Add testers first.</span>'}</div></div>
    </div>
    <div style="margin-top:12px">${status}</div>` : '<p class="muted">Set the shared SNP above the ancestor (Overview), or add SNP paths for at least two testers.</p>'}
  </div>
  <div class="card">
    <h3>Testers</h3>
    ${editTable('testers', [
      { k: 'l', label: 'Tester', type: 'calc', render: r => esc(testerLabel(r)) },
      { k: 'carries', label: `Carries ${tgt || 'shared SNP'}?`, type: 'calc', render: r => tgt ? ynPill(carriesSNP(r, tgt)) : '—' },
      { k: 'below', label: 'SNPs below the ancestor', type: 'calc', render: r => String(below(r).length) },
      { k: 'assigned', label: 'Assigned ancestor', w: 170, ph: 'Descendant for the SNP below him' }
    ], a.testers, { noDelete: true, empty: 'Add testers on the Testers & DNA tab.' })}
    ${rows.map(timeline).join('')}
  </div>
  <div class="card"><h3>SNP Lineage Map</h3>${lineageTree(a)}</div>`;
}
/* ----- SNP Tree: one tree built from every tester in every ancestor, with each SNP assigned to an ancestor ----- */
function ancLabel(x) { return `${x.name || 'Unnamed ancestor'}${lifeYears(x) ? ' (' + lifeYears(x) + ')' : ''}`; }
/* The case's ancestor as entered on the Overview step: the default earliest documented ancestor for each tester. */
/* A tester's generations back, marked "c." when they are a close estimate rather than proven. */
function genText(t, g = num(t.generations)) { return g == null ? '—' : `${t.circa ? 'c. ' : ''}${g}`; }
function caseAncestor(a) { return a.name && a.name !== 'New ancestor' ? ancLabel(a) : ''; }
/* The ancestors a SNP is assigned to: set in each ancestor's Overview (Ancestral SNP and FTDNA formation date). */
/* The year an SNP formed (FTDNA Discover), entered beside it on the tree; for the case's shared SNP this is the FTDNA formation date. */
function snpYear(snp, a) {
  const k = normSNP(snp);
  if (a && targetSNP(a) && normSNP(targetSNP(a)) === k && num(a.ftdnaDate) != null) return num(a.ftdnaDate);
  return num(S.snpDates && S.snpDates[k]);
}
/* An SNP's ancestor comes from either the shared SNP of an ancestor's case, or the ancestor typed or chosen beside the SNP on the tree. */
function snpOwners(snp) { const k = normSNP(snp), m = S.snpAssign && S.snpAssign[k]; return realAncestors().filter(x => (snpUsed(x) && targetSNP(x) && normSNP(targetSNP(x)) === k) || (m && m.id === x.id)); }
function snpAssigned(snp) { const m = S.snpAssign && S.snpAssign[normSNP(snp)], names = snpOwners(snp).map(ancLabel); if (m && m.name && !m.id && !names.includes(m.name)) names.unshift(m.name); return names.join(', '); }
let treePick = '';
function renderSnpTree() {
  const root = { children: new Map() };
  let count = 0;
  realAncestors().forEach(anc => anc.testers.forEach(t => {
    const p = pathOf(t).slice().reverse();
    if (!p.length) return;
    count++;
    let node = root;
    p.forEach(s => {
      const k = normSNP(s);
      if (!node.children.has(k)) node.children.set(k, { name: s, key: k, children: new Map(), testers: [] });
      node = node.children.get(k);
    });
    node.testers.push(`${testerLabel(t)} · ${anc.name || 'Unnamed ancestor'}`);
  }));
  /* Separate family trees (no SNP in common) are chosen one at a time from a pull-down. */
  const roots = [...root.children.values()];
  const testersIn = n => n.testers.length + [...n.children.values()].reduce((t, c) => t + testersIn(c), 0);
  const pick = treePick === '*' || roots.some(r => r.key === treePick) ? treePick : (roots[0] ? roots[0].key : '');
  const picker = roots.length > 1 ? `<div class="field" style="max-width:420px;margin-bottom:14px"><label>Family tree</label><select id="tree-pick">${roots.map(r => { const who = snpAssigned(r.name); return `<option value="${esc(r.key)}"${r.key === pick ? ' selected' : ''}>${esc(r.name)}${who ? ' — ' + esc(who) : ''} (${testersIn(r)} tester${testersIn(r) === 1 ? '' : 's'})</option>`; }).join('')}<option value="*"${pick === '*' ? ' selected' : ''}>Show all family trees</option></select></div>` : '';
  if (roots.length > 1 && pick !== '*') root.children = new Map(roots.filter(r => r.key === pick).map(r => [r.key, r]));
  const draw = node => `<ul>${[...node.children.values()].map(c => {
    const owners = snpOwners(c.name);
    return `<li><div class="ut-row"><span class="snp-node${owners.length ? ' target' : ''}">${esc(c.name)}</span>
      ${owners.map(x => `<span class="anc-node ut-link" data-act="open-ancestor" data-id="${esc(x.id)}">${esc(ancLabel(x))}</span>${num(x.ftdnaDate) != null ? `<span class="hint">born c. ${esc(x.ftdnaDate)}</span>` : ''}`).join('')}
      </div>${c.children.size ? draw(c) : ''}</li>`;
  }).join('')}</ul>`;
  return `<h1>SNP Tree</h1>
  <p class="muted">Every tester's SNP path from all your ancestors in one tree, oldest SNP at the top. Each ancestor appears beside the shared SNP where his testers' lines meet, with its FTDNA date, both set on his SNP Analysis step.</p>
  <div class="card">${picker}${count ? `<div class="tree utree">${draw(root)}</div>` : '<p class="muted">Add SNP paths for your testers (Testers &amp; DNA tab in each ancestor) to build the tree.</p>'}</div>`;
}
/* Generation chart for one tester: generation 1 (his father) back to the ancestor, with his SNPs laid along it, newest to oldest. */
/* GD estimates for one tester: every STR comparison he is part of, as a likely range and an estimate in generations. */
function pairGens(a, e, k = rateCal(a)) {
  if (e.gd == null || !Number.isInteger(e.gd) || e.gd < 0 || ![37, 67, 111].includes(e.markers)) return null;
  const names = STR_MARKERS.slice(0, e.markers), pr = panelRate(names, k);
  if (pr.missing.length || !(pr.R > 0)) return null;
  const inPanel = new Set(names.map(x => x.toUpperCase()));
  if (e.rows.some(r => !inPanel.has(r.m.toUpperCase()))) return null;
  const diffs = {}; e.rows.forEach(r => { diffs[r.m.toUpperCase()] = Math.round(Math.abs(num(r.a) - num(r.b))); });
  return wholeGens(sRange(e.gd, pr.R, null, e.rows.length ? markerLogLik(names, diffs, k) : null));
}
/* Where each SNP sits on the generation chart. Each SNP is placed at the generation its formation year points to
   (tester's birth year − year formed) ÷ YPG; SNPs with no year are spaced evenly between the dated ones.
   The shared SNP is placed at the ancestor, or before him when FTDNA dates it earlier, adding those generations to the chart. */
function snpLayout(a, r) {
  const G = r.gens, n = r.snps, p = pathOf(r.t);
  if (!Number.isInteger(G) || G < 1 || G > 60) return null;
  const before = r.gensBefore > 0 ? Math.min(r.gensBefore, 60 - G) : 0, T = G + before;
  if (!Number.isInteger(n) || n < 1 || n > T) return { G, T, before, spans: [] };
  /* f[i] = generation in which SNP i formed; the oldest (shared) SNP is fixed at T. */
  const f = Array.from({ length: n }, (_, i) => {
    if (i === n - 1) return T;
    const y = p[i] ? snpYear(p[i], a) : null;
    return y != null && r.tb != null && r.ypg ? Math.min(T - 1, Math.max(1, Math.round((r.tb - y) / r.ypg))) : null;
  });
  /* Undated SNPs: spread evenly between the dated ones on either side (generation 0 is the tester). */
  let last = -1;
  for (let i = 0; i < n; i++) if (f[i] != null) {
    const g0 = last < 0 ? 0 : f[last], steps = i - last;
    for (let k = last + 1; k < i; k++) f[k] = Math.round(g0 + (f[i] - g0) * (k - last) / steps);
    last = i;
  }
  /* Keep every SNP at least one generation wide, newest to oldest. */
  for (let i = 0; i < n; i++) f[i] = Math.max(f[i], i + 1, i ? f[i - 1] + 1 : 1);
  for (let i = n - 2; i >= 0; i--) f[i] = Math.min(f[i], f[i + 1] - 1);
  const spans = f.map((g, i) => { const start = i ? f[i - 1] + 1 : 1; return { i, name: p[i] || 'SNP ' + (i + 1), year: p[i] ? snpYear(p[i], a) : null, start, len: g - start + 1 }; });
  return { G, T, before, spans };
}
function genChart(a, r) {
  const L = snpLayout(a, r);
  if (!L) return '';
  const { G, T, before } = L;
  const cells = Array.from({ length: T }, (_, j) => `<div class="gdg${j + 1 === G ? ' aio-anc' : j + 1 > G ? ' gdg-pre' : ' gdg-in'}"><b>${j + 1}</b></div>`).join('');
  const snpRow = L.spans.map(sp => `<div class="gc-snp aio-snp" style="grid-row:2;grid-column:${sp.start} / span ${sp.len};min-width:0"><b>${esc(sp.name)}</b>${sp.year != null ? `<span>c. ${sp.year}</span>` : ''}</div>`).join('');
  return `<div class="gc"><div class="aio-lab">${esc(testerLabel(r.t))} · ${G} generations back to ${esc(a.name || 'the ancestor')}${before ? ` · shared SNP about ${before} generation${before === 1 ? '' : 's'} before him` : ''}${r.gps != null ? ` · one SNP every ${fmt(r.gps, 1)} generations` : ''}</div>
    <div class="lin-scroll"><div style="display:grid;grid-template-columns:repeat(${T},minmax(28px,1fr));gap:3px">${cells}${snpRow}</div></div></div>`;
}
function tabSNP(a) {
  const tgt = targetSNP(a), shared = sharedSNP(a.testers);
  const ts = a.testers;
  const rows = ts.map(t => genRow(a, t));
  return `
  ${inquiryCard(a)}
  <div class="card">
    <div class="card-head"><h3>1. The testers' SNP tree</h3></div>
    ${ts.some(t => pathOf(t).length) ? lineageTree(a) : '<p class="muted">Add each tester\'s SNP path on the Testers & DNA step to draw the tree.</p>'}
  </div>
  <div class="card">
    <div class="card-head"><h3>2. Where the lines meet</h3></div>
    <p class="hint">The lowest SNP that all the testers share is where their lines come together.${shared ? ` From the paths entered it is <b>${esc(shared)}</b>.` : ''} Look it up in <a href="https://discover.familytreedna.com/" target="_blank" rel="noopener">FamilyTreeDNA Discover</a> and enter its formation date.</p>
    <div class="grid3">${field('Shared SNP', 'targetSNP', a.targetSNP, { ph: shared || 'e.g. R-Y11201', hint: shared ? `Leave blank to use ${esc(shared)}.` : 'Worked out from the SNP paths.' })}${field('FTDNA formation date', 'ftdnaDate', a.ftdnaDate, { type: 'number', ph: 'e.g. 1601', hint: 'From FamilyTreeDNA Discover.' })}${field('Documented birth year of SNP', 'snpDocBirth', a.snpDocBirth, { type: 'number', ph: 'e.g. 1450', hint: 'Optional: the birth year of the documented man in whom the SNP formed, if records show him.' })}</div>
    ${(() => {
      /* Optional check: FTDNA's date against the documented birth of the man the SNP formed in (within one SNP interval). */
      const db = num(a.snpDocBirth), fd = num(a.ftdnaDate), tol = (rows.find(r => r.yps) || {}).yps;
      if (db == null || fd == null) return '';
      const d = fd - db, ok = tol ? Math.abs(d) <= tol : null;
      return `<p class="hint" style="margin-top:10px">FTDNA's date (c. ${fd}) is ${Math.abs(Math.round(d))} years ${d < 0 ? 'before' : 'after'} the documented birth year (${db}). ${ok == null ? '' : ok ? pill('green', 'consistent, within one SNP interval') : pill('amber', 'more than one SNP interval apart')}</p>`;
    })()}
  </div>
  <div class="card">
    <div class="card-head"><h3>3. SNPs and generations</h3><span class="hint">FTDNA formation date: ${num(a.ftdnaDate) != null ? esc(a.ftdnaDate) : 'not set yet'}</span></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th>Tester</th><th>Tester birth year</th><th>SNP count</th><th>Generations</th><th>GPS</th><th>YPG</th><th>Estimated years</th><th>YPS</th><th>Shared SNP vs ancestor</th>
    </tr></thead><tbody>${rows.length ? rows.map(r => `<tr>
      <td style="white-space:nowrap">${esc(testerLabel(r.t))}</td>
      <td class="calc">${r.tb == null ? '—' : r.tb}</td>
      <td style="width:90px;min-width:80px"><input type="number" data-coll="testers" data-id="${esc(r.t.id)}" data-k="snpCount" value="${esc(r.t.snpCount || '')}" placeholder="${r.snps != null && num(r.t.snpCount) == null ? r.snps : 'auto'}"></td>
      <td class="calc">${genText(r.t, r.gens)}</td>
      <td class="calc">${fmt(r.gps)} ${r.gpsOK === false ? pill('amber', 'outside ' + S.settings.gpsMin + '–' + S.settings.gpsMax) : ''}</td>
      <td class="calc">${fmt(r.ypg)}${r.ypgOwn ? '' : ' ' + pill('', 'fallback')}</td>
      <td class="calc">${fmt(r.years, 0)}</td>
      <td class="calc">${fmt(r.yps, 0)}</td>
      <td class="calc" style="white-space:normal;min-width:230px">${snpVsAncestor(r)}${r.aligned == null ? '' : ' ' + (r.aligned ? pill('green', 'consistent') : pill('red', 'formed after him'))}</td>
    </tr>`).join('') : '<tr><td class="empty" colspan="9">Add testers first.</td></tr>'}</tbody></table></div>
    <p class="hint" style="margin-top:8px">SNP count is counted automatically from each tester's terminal SNP up to the shared SNP (inclusive); type a number to override. Expected GPS range: ${S.settings.gpsMin}–${S.settings.gpsMax}. Each tester's YPG is calculated from his own birth year, the ancestor's birth year and the generations between them. The shared SNP formed in the ancestor or one of his forefathers, so <b>FTDNA's formation date</b> (above) should fall at or before <b>his birth year</b>; a date up to one SNP interval (YPS) after his birth is still treated as consistent, because FTDNA's dates are estimates.</p>
    <h3 style="margin-top:18px">Generation chart</h3>
    ${rows.map(r => genChart(a, r)).join('') || '<p class="muted">Add each tester\'s generations on the Testers & DNA step.</p>'}
    <div class="gdg-key"><span><i class="gdg-in"></i>Generation</span><span><i class="aio-anc"></i>Ancestor</span><span><i class="aio-snp"></i>SNP (newest to oldest)</span><span><i class="gdg-pre"></i>Before the ancestor</span><span class="muted">Generation 1 is the tester's father.</span></div>
  </div>`;
}

/* ----- Tab 5: STR Analysis ----- */
/* One card per comparison: the two testers, markers compared and GD (or the differing markers), the estimated
   generations to the common ancestor, a suggested interpretation and the researcher's verdict. */
function tabSTR(a) {
  const opts = [{ v: '', l: '— choose a tester —' }].concat(a.testers.map(t => ({ v: t.id, l: testerLabel(t) })));
  const sel = (p, k) => `<select class="pair-select" data-coll="gdPairs" data-id="${esc(p.id)}" data-k="${k}">${opts.map(o => `<option value="${esc(o.v)}"${String(p[k] || '') === String(o.v) ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
  const panelSel = p => `<select data-coll="gdPairs" data-id="${esc(p.id)}" data-k="markers"><option value="">— choose —</option>${GD_PANELS.map(o => `<option value="${o.v}"${String(p.markers || '') === o.v ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
  const cards = a.gdPairs.map((p, i) => {
    const e = pairEval(a, p);
    const list = Array.isArray(p.diffs) && p.diffs.length ? p.diffs : [{}];
    const diffs = `<details class="gd-doc" style="margin-top:4px"${Array.isArray(p.diffs) && p.diffs.length ? ' open' : ''}><summary>Enter the differing markers (optional)</summary>
      <table class="tbl gd-diff-tbl" style="margin-top:8px"><thead><tr><th>Marker</th><th>${esc(testerLabel(e.ta))}</th><th>${esc(testerLabel(e.tb))}</th><th></th></tr></thead>
      <tbody>${list.map((r, j) => pairDiffRowHTML(p, r, j)).join('')}</tbody></table>
      <div class="tbl-actions"><button type="button" class="btn small ghost" data-act="add-pdiff" data-id="${esc(p.id)}">+ Add a marker</button></div></details>`;
    const suggestion = e.suggestion ? `<div class="pair-suggest"><span class="hint">Suggested interpretation:</span> ${esc(e.suggestion)}
      ${p.interp !== e.suggestion ? `<button class="btn small ghost" data-act="use-interp" data-id="${esc(p.id)}">Use this</button>` : ''}</div>` : '';
    return `<div class="pair-card">
      <div class="pair-head">
        <span class="pair-num">Comparison ${i + 1}</span>
        <button class="row-btn" data-act="del-row" data-coll="gdPairs" data-id="${esc(p.id)}" title="Delete comparison">✕</button>
      </div>
      <div class="pair-testers">${sel(p, 'a')}<span class="pair-vs">vs</span>${sel(p, 'b')}</div>
      <div class="pair-grid">
        <div class="field"><label>Markers compared</label>${panelSel(p)}</div>
        <div class="field"><label>Genetic Distance (GD)</label><input type="number" data-coll="gdPairs" data-id="${esc(p.id)}" data-k="gd" value="${esc(p.gd == null ? '' : p.gd)}" placeholder="${e.fromRows != null ? e.fromRows : 'e.g. 2'}"></div>
        <div class="field"><label>GD group</label><div class="calc-box">${e.group ? pill(e.group.c, e.group.label) : '<span class="muted">Enter a GD</span>'}</div></div>
      </div>
      ${diffs}${pairEstimateHTML(a, e)}${pairGens(a, e) ? `<div style="margin-top:8px">${reportGDChart(a, e)}${reportKey([['anc', 'Ancestor'], ['est', 'GD estimate']])}</div>` : ''}${suggestion}
      <div class="pair-grid2">
        <div class="field"><label>Your interpretation</label><textarea data-coll="gdPairs" data-id="${esc(p.id)}" data-k="interp" placeholder="Type your own, or use the suggestion above">${esc(p.interp || '')}</textarea></div>
        <div class="field"><label>Consistent with the lineage?</label><select data-coll="gdPairs" data-id="${esc(p.id)}" data-k="consistent">${[['', '—'], ['Y', 'Yes'], ['N', 'No']].map(o => `<option value="${o[0]}"${(p.consistent || '') === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>
      </div>
    </div>`;
  }).join('');
  return `${snpFirst(a) ? '' : inquiryCard(a)}<div class="card">
    <h3>Genetic Distance Analysis</h3>
    <p class="hint">Compare two testers at a time. Enter the GD and markers compared from FamilyTreeDNA, or enter the differing markers.</p>
    ${cards || '<p class="muted">No comparisons yet.</p>'}
    <div class="tbl-actions no-print"><button class="btn small" data-act="add-row" data-coll="gdPairs">+ Add comparison</button>${a.testers.length > 2 ? '<button class="btn small ghost" data-act="add-all-pairs">+ Compare every pair of testers</button>' : ''}</div>
  </div>
  ${familyRateCard(a)}`;
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
  const snpRows = !snpUsed(a) ? [] : [
    { key: 'snp', type: 'SNP inheritance', result: tgt ? `${carriers} of ${ts.length} tester(s) share ${tgt}` : 'No shared SNP yet', ok: tgt && ts.length ? carriers === ts.length : null },
    { key: 'gps', type: 'Generational consistency (GPS)', result: rows.filter(r => r.gps != null).map(r => `${testerLabel(r.t)}: ${fmt(r.gps)}`).join(', ') || '—', ok: yn(rows.map(r => r.gpsOK).filter(x => x != null)) },
    { key: 'date', type: 'Shared SNP date vs ancestor', result: rows.find(r => r.diff != null) ? `${tgt} ${snpVsAncestor(rows.find(r => r.diff != null))}` : '—', ok: yn(rows.map(r => r.aligned).filter(x => x != null)) }
  ];
  const rest = [
    { key: 'str', type: 'STR genetic distance', result: pairs.filter(e => e.gd != null).map(e => `${testerLabel(e.ta)}–${testerLabel(e.tb)}: GD ${e.gd}`).join(', ') || '—', ok: yn(pairs.map(e => e.within).filter(x => x != null)) },
    { key: 'gen', type: 'Genealogical records', result: a.recordsLost ? `Records lost${a.recordsLostNote ? ': ' + a.recordsLostNote : ''}. Not counted for or against the line.` : a.documents.length ? `${a.documents.filter(d => d.supports === 'Y').length} of ${a.documents.length} document(s) support the lineage${a.documents.some(d => d.supports === 'N') ? `, ${a.documents.filter(d => d.supports === 'N').length} contradict it` : ''}` : '—', ok: a.documents.some(d => d.supports === 'N') ? false : a.documents.some(d => d.supports === 'Y') ? true : null }
  ];
  /* Listed in the order of the research method. */
  return autoFirst(a) ? [autoEvidenceRow(a), rest[1]] : snpFirst(a) ? snpRows.concat(rest.slice(1)) : rest;
}
/* Convergence chart: every line of evidence counted as supporting, contrary or not yet tested.
   Uses the "Consistent?" choice where one is set, otherwise the automatic result. */
function convergenceChart(a) {
  /* Each DNA connection is its own piece of evidence: every GD comparison, every tester carrying the shared SNP,
     every autosomal match. A "Consistent?" override on the Convergence step applies to all of that kind. */
  const tgt = targetSNP(a);
  const each = { str: () => a.gdPairs.map(p => pairEval(a, p).within),
    snp: () => a.testers.filter(t => pathOf(t).length).map(t => tgt ? carriesSNP(t, tgt) : null),
    auto: () => a.atMatches.map(autoEval).map(e => e.check ? e.check.ok : null) };
  const vals = autoEvidence(a).flatMap(e => {
    if (e.key === 'gen' && a.recordsLost) return [];
    const ov = (a.conv[e.key] || {}).ov, items = each[e.key] ? each[e.key]() : [e.ok], list = items.length ? items : [e.ok];
    return ov === 'Y' ? list.map(() => true) : ov === 'N' ? list.map(() => false) : list;
  }).concat(a.extraEvidence.map(x => x.ok === 'Y' ? true : x.ok === 'N' ? false : null))
    .concat(a.documents.map(d => d.supports === 'Y' ? true : d.supports === 'N' ? false : null))
    /* Lost records: what cannot be tested is left out, so only the evidence that can be weighed is shown. */
    .filter(v => !a.recordsLost || v != null);
  const parts = [
    { k: 'Supporting', n: vals.filter(v => v === true).length, c: 'var(--green)' },
    { k: 'Contrary', n: vals.filter(v => v === false).length, c: 'var(--red)' },
    { k: 'Not yet tested', n: vals.filter(v => v !== true && v !== false).length, c: 'var(--grey)' }
  ];
  const total = vals.length, r = 42, C = 2 * Math.PI * r, gap = parts.filter(p => p.n).length > 1 ? 2 : 0;
  let off = 0;
  const arcs = parts.filter(p => p.n).map(p => {
    const len = p.n / total * C, seg = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${p.c}" stroke-width="18" stroke-dasharray="${Math.max(len - gap, 0.5)} ${C}" stroke-dashoffset="${-off}"><title>${p.k}: ${p.n} of ${total}</title></circle>`;
    off += len; return seg;
  }).join('');
  /* The share of the tested evidence that supports the line; evidence not yet tested is shown but does not lower it. */
  const tested = parts[0].n + parts[1].n, pct = tested ? Math.round(parts[0].n / tested * 100) : 0;
  return `<div class="conv-chart">
    <svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label="${parts.map(p => `${p.k} ${p.n}`).join(', ')}">
      <g transform="rotate(-90 60 60)">${arcs}</g>
      <text x="60" y="58" text-anchor="middle" class="conv-pct">${pct}%</text>
      <text x="60" y="74" text-anchor="middle" class="conv-sub">supporting</text>
    </svg>
    <div class="conv-legend">${parts.map(p => `<div><i class="dot" style="background:${p.c}"></i>${p.k} <b>${p.n}</b></div>`).join('')}
      <div class="hint">${total} piece${total === 1 ? '' : 's'} of evidence</div></div>
  </div>`;
}
function tabConvergence(a) {
  const ev = autoEvidence(a), v = verdict(a);
  const ovOpts = [['', 'Auto'], ['Y', 'Yes'], ['N', 'No']];
  return `
  <div class="card">
    <h3>Convergence Analysis</h3>
    <p class="hint">Convergence is the alignment of ${snpFirst(a) ? 'SNP data' : autoFirst(a) ? 'autosomal DNA' : 'STR results'} and genealogy within expected ranges. Results are filled in from the other tabs; use “Consistent?” to override where your judgment differs.</p>
    <div class="conv-layout">
      <div class="conv-left">
        ${convergenceChart(a)}
      </div>
      <div class="conv-right">
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
      </div>
    </div>
  </div>
  <div class="card">
    <h3>Conflict Resolution Analysis</h3>
    <p class="hint">Where the evidence does not align, record the conflict and reassess the ${snpFirst(a) ? 'SNP data' : autoFirst(a) ? 'autosomal DNA' : 'STR results'} and the genealogy. The DNA serves as the foundation, and genealogy and historical context refine the conclusion.</p>
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
/* ----- Autosomal-first: matches, shared cM and the generations they point to ----- */
function autoFirst(a) { return a.method === 'AUTO'; }
const AUTO_COMPANIES = ['AncestryDNA', 'FamilyTreeDNA Family Finder', '23andMe', 'MyHeritage', 'Other'];
/* Average shared cM and its usual range, by the total generations between two relatives (each one's generations back to the
   shared ancestor, added together). Approximate figures after the Shared cM Project; beyond 6th cousins sharing is unreliable. */
const AT_CM = { 2: [2613, 1613, 3488], 3: [1741, 1201, 2282], 4: [866, 396, 1397], 5: [433, 102, 980], 6: [229, 41, 592], 7: [122, 14, 353], 8: [73, 0, 234], 9: [48, 0, 192], 10: [35, 0, 139], 11: [28, 0, 127], 12: [25, 0, 117], 13: [21, 0, 111], 14: [21, 0, 86] };
const AUTO_REL = { 2: 'siblings', 3: 'uncle or aunt', 4: '1st cousin', 5: '1st cousin once removed', 6: '2nd cousin', 7: '2nd cousin once removed', 8: '3rd cousin', 9: '3rd cousin once removed', 10: '4th cousin', 11: '4th cousin once removed', 12: '5th cousin', 13: '5th cousin once removed', 14: '6th cousin' };
/* The relationship two people's trees show, from their generations back to the shared ancestor (a parent is generation 1). */
function cousinName(g1, g2) {
  const lo = Math.min(g1, g2), hi = Math.max(g1, g2), d = hi - lo;
  if (lo === 1 && hi === 1) return 'Siblings';
  if (lo === 1) return `${'Great-'.repeat(Math.max(0, d - 1))}${d > 1 ? 'uncle or aunt' : 'Uncle or aunt'}`;
  const n = lo - 1, ord = n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
  return `${ord} cousin${d === 1 ? ' once removed' : d === 2 ? ' twice removed' : d > 2 ? ` ${d} times removed` : ''}`;
}
function autoEval(m) {
  const g1 = num(m.testerGens), g2 = num(m.matchGens), cm = num(m.cm), seg = num(m.longest), keys = Object.keys(AT_CM).map(Number);
  const M = g1 >= 1 && g2 >= 1 ? g1 + g2 : null, doc = M != null ? { name: cousinName(g1, g2), M, r: AT_CM[M] } : null;
  const fits = cm != null ? keys.filter(k => cm >= AT_CM[k][1] && cm <= AT_CM[k][2]) : [];
  let best = null;
  if (cm > 0) keys.forEach(k => { const d = Math.abs(Math.log(cm) - Math.log(AT_CM[k][0])); if (!best || d < best.d) best = { k, d }; });
  let check = null;
  if (cm != null && doc) {
    if (cm < 7 || (seg != null && seg < 7)) check = { c: 'amber', label: 'Too small to rely on', ok: null };
    else if (!doc.r) check = { c: 'amber', label: 'Too distant to rely on', ok: null };
    else if (cm >= doc.r[1] && cm <= doc.r[2]) check = { c: 'green', label: 'Consistent', ok: true };
    else check = { c: 'red', label: 'Outside the usual range', ok: false };
  }
  return { m, g1, g2, cm, seg, M, doc, fits, best: best ? best.k : null, check };
}
function autoStatus(a) {
  if (ovr(a, 'auto') === 'N') return { c: 'red', msg: 'Autosomal evidence marked inconsistent.' };
  if (ovr(a, 'auto') === 'Y') return { c: 'green', msg: 'Autosomal evidence marked consistent.' };
  const ev = a.atMatches.map(autoEval);
  if (!ev.length) return { c: 'grey', msg: 'No autosomal matches yet.' };
  if (ev.some(e => e.check && e.check.ok === false)) return { c: 'red', msg: 'A match shares an amount of DNA outside the usual range for the relationship the trees show.' };
  if (ev.some(e => !e.check)) return { c: 'amber', msg: 'Enter the shared cM and both generations for every match.' };
  if (!ev.some(e => e.check.ok)) return { c: 'amber', msg: 'The matches are too distant, or share too little DNA, to rely on.' };
  return { c: 'green', msg: 'The autosomal matches are consistent with the relationships the trees show.' };
}
function autoEvidenceRow(a) {
  const ev = a.atMatches.map(autoEval), ok = ev.filter(e => e.check && e.check.ok).length, bad = ev.filter(e => e.check && e.check.ok === false).length;
  return { key: 'auto', type: 'Autosomal DNA matches', result: ev.length ? `${ok} of ${ev.length} match(es) consistent with the documented relationship` : '—', ok: bad ? false : ok ? true : null };
}
/* Generation chart for one match: generations back from the match, with the documented ancestor and the estimate from the shared cM. */
function autoChart(e) {
  if (e.best == null || e.g1 == null || !e.fits.length || (e.check && e.check.ok === null)) return '';
  const est = e.best - e.g1, lo = Math.max(1, Math.min(...e.fits) - e.g1), hi = Math.max(...e.fits) - e.g1;
  if (est < 1 || hi < 1) return '';
  const A = e.g2 || 0, G = Math.min(30, Math.max(A, est));
  const gens = Array.from({ length: G }, (_, j) => j + 1 === est && j + 1 === A ? rcCell('est', j + 1).replace('border:1px solid #a8762f', 'border:3px solid #15303c') : rcCell(j + 1 === A ? 'anc' : j + 1 === est ? 'est' : 'gen', j + 1)).join('');
  return rcLabel(`${esc(e.m.match || 'Match')} · ${e.cm} cM shared with ${esc(e.m.tester || 'the tester')} · estimate ${est} generation${est === 1 ? '' : 's'} back${hi > lo ? ` (likely ${lo}–${hi})` : ''}`) + rcTable(`<tr>${gens}</tr>`);
}
function autoKey() { return reportKey([['anc', 'Ancestor (from the tree)'], ['est', 'Estimate from shared cM']]).replace("Generation 1 is the tester's father.", "Generation 1 is the match's parent."); }
function tabMatches(a) {
  return `<div class="card">
    <h3>Autosomal DNA matches</h3>
    <p class="hint">Add each match who descends from this ancestor. Generations count back from each person to the ancestor: a parent is generation 1, a grandparent generation 2. If you are adding your own matches, the Tester columns are you; they fill in automatically after the first row.</p>
    ${editTable('atMatches', [
      { k: 'tester', label: 'Tester', w: 140, ph: 'e.g. John Hartwell' },
      { k: 'testerGens', label: 'Tester\'s generations', type: 'number', w: 90, ph: 'e.g. 4' },
      { k: 'match', label: 'Match', w: 140, ph: 'e.g. Mary Ellison' },
      { k: 'matchGens', label: 'Match\'s generations', type: 'number', w: 90, ph: 'e.g. 4' },
      { k: 'company', label: 'Company', type: 'select', opts: AUTO_COMPANIES, w: 150 },
      { k: 'cm', label: 'Shared cM', type: 'number', w: 90, ph: 'e.g. 75' },
      { k: 'longest', label: 'Longest segment (cM)', type: 'number', w: 90, ph: 'e.g. 22' },
      { k: 'through', label: 'Through which child?', w: 150, ph: 'e.g. his son Thomas' },
      { k: 'rel', label: 'Relationship (from the trees)', type: 'calc', render: m => { const e = autoEval(m); return e.doc ? esc(e.doc.name) : '—'; } }
    ], a.atMatches, { addLabel: 'Add match', empty: 'No matches yet.' })}
  </div>`;
}
function tabAuto(a) {
  const ev = a.atMatches.map(autoEval);
  const fitText = e => e.best == null ? '—' : `Most likely ${AUTO_REL[e.best]}`;
  const charts = ev.map(autoChart).join('');
  return `${wantsSociety(a) ? '' : inquiryCard(a)}<div class="card">
    <h3>Shared DNA and relationships</h3>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Match</th><th>Shared cM</th><th>Relationship (from the trees)</th><th>Usual range for it</th><th>What the cM fits</th><th>Check</th></tr></thead><tbody>
    ${ev.length ? ev.map(e => `<tr><td>${esc(e.m.match || '—')}${e.m.through ? `<br><span class="muted">through ${esc(e.m.through)}</span>` : ''}</td><td class="calc">${e.cm == null ? '—' : e.cm}</td><td>${e.doc ? esc(e.doc.name) : '—'}</td><td class="calc">${e.doc && e.doc.r ? `${e.doc.r[1]}–${e.doc.r[2]} cM` : '—'}</td><td>${fitText(e)}</td><td>${e.check ? pill(e.check.c, e.check.label) : '<span class="muted">Add the cM and generations</span>'}</td></tr>`).join('') : '<tr><td class="empty" colspan="6">Add matches on the Matches step.</td></tr>'}
    </tbody></table></div>
    <p class="hint" style="margin-top:8px">Ranges are approximate, after the Shared cM Project. Matches sharing under 7 cM, and relatives beyond 6th cousins, can share DNA by chance, so they are not relied on.</p>
  </div>
  ${charts ? `<div class="card"><h3>Generation charts</h3>${charts}${autoKey()}</div>` : ''}`;
}
function autoReportHTML(a) {
  const ev = a.atMatches.map(autoEval), charts = ev.map(autoChart).join('');
  return `<h2>Autosomal DNA</h2>
    ${simpleTable(['Match', 'Shared cM', 'Longest segment', 'Relationship (from the trees)', 'Most likely from cM', 'Check'], ev.map(e => [`${esc(e.m.match)}${e.m.through ? '<br><span class="muted">through ' + esc(e.m.through) + '</span>' : ''}`, e.cm == null ? '—' : e.cm, e.seg == null ? '—' : e.seg, e.doc ? esc(e.doc.name) : '—', e.best != null ? AUTO_REL[e.best] : '—', e.check ? esc(e.check.label) : '—']))}
    ${charts ? `<h2>Generation Chart</h2>${charts}${autoKey()}` : ''}`;
}
/* Autosomal-first questions, answered from the matches. */
const AUTO_INQUIRIES = [
  { v: 'a-desc', q: 'Do these matches descend from this ancestor?',
    needs: 'DNA matches who believe they descend from the ancestor, with their trees.',
    focus: 'Check that each match shares the amount of DNA expected for the relationship your trees show. Consistent matches support descent from the ancestor.',
    answer: 'e.g. "Yes: 4 of 4 matches share the DNA expected for their relationships."' },
  { v: 'a-child', q: 'Which child\'s line does a match come through?',
    needs: 'Matches whose trees name the child of the ancestor they descend from.',
    focus: 'Enter the child each match descends through, then check the shared DNA fits. Several consistent matches through the same child support that line.',
    answer: 'e.g. "Through his son Thomas: Mary Ellison and Ann Price."' },
  { v: 'a-rel', q: 'Is the documented relationship right?',
    needs: 'A match whose relationship to you is worked out in your trees.',
    focus: 'Compare the shared cM with the usual range for that relationship. Outside the range, recheck the generations in the tree.',
    answer: 'e.g. "Yes: 75 cM fits 3rd cousins."' },
  { v: 'a-who', q: 'How closely related is a match?',
    needs: 'A match and the amount of DNA you share.',
    focus: 'Read what the shared cM fits on the Autosomal Analysis step, and how many generations back it points from the match.',
    answer: 'e.g. "Most likely a 2nd cousin, about 3 generations back from the match."' }
];
function autoInquiryStatus(a, inq, need, done, lead, no) {
  const ev = a.atMatches.map(autoEval), ok = ev.filter(e => e.check && e.check.ok), bad = ev.filter(e => e.check && e.check.ok === false);
  const nm = e => esc(e.m.match || 'A match');
  if (!ev.length) return need('Add your matches on the Matches step.');
  const checked = ev.some(e => e.check);
  switch (inq.v) {
    case 'a-desc':
      if (!checked) return need('Enter the shared cM and both generations for each match.');
      return bad.length ? no(`${bad.map(nm).join(', ')} share${bad.length === 1 ? 's' : ''} an amount of DNA outside the usual range for the relationship the trees show.`)
        : ok.length ? done(`Yes: ${ok.length} of ${ev.length} match${ev.length === 1 ? '' : 'es'} share the DNA expected for their relationship (${ok.map(nm).join(', ')}).`)
        : lead('The matches are too distant, or share too little DNA, to rely on.');
    case 'a-child': {
      const w = ok.filter(e => e.m.through);
      if (!w.length) return need('Enter which child of the ancestor each match descends through, and the shared cM and generations.');
      const groups = [];
      w.forEach(e => { const g = groups.find(x => x.t.toLowerCase() === e.m.through.toLowerCase()); if (g) g.list.push(e); else groups.push({ t: e.m.through, list: [e] }); });
      return done(`${groups.map(g => `Through ${esc(g.t)}: ${g.list.map(nm).join(', ')}`).join('; ')}.`);
    }
    case 'a-rel':
      if (!checked) return need('Enter the shared cM and both generations for each match.');
      return bad.length ? no(`Not for ${bad.map(e => `${nm(e)} (${e.cm} cM is outside the usual range for ${esc(e.doc.name.toLowerCase())})`).join('; ')}.`)
        : ok.length ? done(`Yes: ${ok.map(e => `${nm(e)}, ${e.cm} cM fits ${esc(e.doc.name.toLowerCase())}`).join('; ')}.`)
        : lead('The matches are too distant, or share too little DNA, to rely on.');
    case 'a-who': {
      const est = ev.filter(e => e.best != null);
      if (!est.length) return need('Enter the shared cM for each match.');
      return lead(`${est.map(e => `${nm(e)}: ${e.cm} cM, most likely ${AUTO_REL[e.best]}${e.g1 != null && e.best - e.g1 >= 1 ? `, about ${e.best - e.g1} generations back from the match` : ''}`).join('; ')}.`);
    }
  }
  return null;
}
/* ----- Lineage Society: proof of the line one generation at a time, with DNA support where the records fall short ----- */
const SOC_STATUS = ['Missing', 'Partly proven', 'Proven'];
function societyReadiness(a) {
  const g = a.socGens;
  if (!g.length) return { c: '', label: 'Not started', msg: 'Add each generation, from the applicant up to the qualifying ancestor.' };
  const gap = g.map((r, i) => ({ r, n: i + 1 })).filter(x => x.r.status !== 'Proven');
  const dnaOnly = gap.filter(x => x.r.status === 'Partly proven' && x.r.dna === 'Yes');
  if (!gap.length) return { c: 'green', label: 'Ready to submit', msg: `All ${g.length} generations are proven.` };
  if (gap.length === dnaOnly.length) return { c: 'amber', label: 'Ready if DNA is accepted', msg: `Generation${dnaOnly.length === 1 ? '' : 's'} ${dnaOnly.map(x => x.n).join(', ')} rely on DNA support. Check that the society accepts DNA for ${dnaOnly.length === 1 ? 'this link' : 'these links'}.` };
  return { c: 'red', label: 'Proof still needed', msg: `Still to prove: ${gap.filter(x => !dnaOnly.includes(x)).map(x => `generation ${x.n}${x.r.name ? ' (' + esc(x.r.name) + ')' : ''}`).join(', ')}.` };
}
function societyDNA(a) {
  /* The DNA evidence from this case that can support a link: the shared SNP and the GD comparisons. */
  const tgt = targetSNP(a), yr = num(a.ftdnaDate), out = [];
  if (snpUsed(a) && tgt) out.push(`Shared SNP <b>${esc(tgt)}</b>${yr != null ? ` (formed c. ${yr})` : ''}, carried by ${a.testers.filter(t => pathOf(t).some(x => normSNP(x) === normSNP(tgt))).map(t => esc(testerLabel(t))).join(', ') || 'the testers'}.`);
  if (!snpFirst(a)) a.gdPairs.forEach(p => { const e = pairEval(a, p), q = e.ta && e.tb ? pairGens(a, e) : null; if (q) out.push(`${esc(testerLabel(e.ta))} and ${esc(testerLabel(e.tb))}: GD ${e.gd} on ${e.markers} markers, about ${q.mid} generations (${q.lo}–${q.hi}).`); });
  return out;
}
function tabSociety(a) {
  const st = societyReadiness(a), dna = societyDNA(a), yn = v => v === 'Yes' ? 'Yes' : '—';
  const genLabel = r => `${a.socGens.indexOf(r) + 1}${a.socGens.indexOf(r) === 0 ? ' <span class="muted">(applicant)</span>' : ''}`;
  return `${inquiryCard(a)}<div class="card">
    <h3>The society</h3>
    <div class="grid3">${field('Lineage society', 'socName', a.socName, { ph: 'e.g. Sons of the American Revolution' })}${field('Qualifying ancestor', 'socQualifying', a.socQualifying, { ph: a.name || 'e.g. William Hartwell' })}${field('Member, ancestor or application numbers', 'socNumber', a.socNumber, { ph: 'e.g. Ancestor # A012345' })}</div>
  </div>
  <div class="card">
    <div class="card-head"><h3>Proof, one generation at a time</h3>${pill(st.c, st.label)}</div>
    <p class="hint">Generation 1 is the applicant; the last generation is the qualifying ancestor. For each one, give the date, place and source of each event, and the record that proves this person was the child of the next generation.</p>
    ${editTable('socGens', [
      { k: 'g', label: 'Generation', type: 'calc', render: genLabel },
      { k: 'name', label: 'Name', w: 160, ph: 'e.g. John Hartwell' },
      { k: 'spouse', label: 'Spouse', w: 150 },
      { k: 'birth', label: 'Birth (date, place, source)', type: 'textarea', w: 200, ph: 'e.g. 4 May 1802, Kent Co., Md.; baptism register' },
      { k: 'marriage', label: 'Marriage (date, place, source)', type: 'textarea', w: 200 },
      { k: 'death', label: 'Death (date, place, source)', type: 'textarea', w: 200 },
      { k: 'parentage', label: 'Proof of parentage', type: 'textarea', w: 220, ph: 'e.g. Father\'s will, 1840, names him as son' },
      { k: 'status', label: 'Status', type: 'select', opts: SOC_STATUS },
      { k: 'dna', label: 'DNA support?', type: 'select', opts: [{ v: '', l: 'No' }, { v: 'Yes', l: 'Yes' }] }
    ], a.socGens, { addLabel: 'Add generation', empty: 'No generations yet.' })}
    <p class="hint" style="margin-top:8px">${st.msg}</p>
  </div>
  <div class="card">
    <h3>DNA support</h3>
    <p class="hint">Where the records cannot fully prove a link, Y-DNA can support it. Many societies accept it only when a tester matches a descendant whose line the society has already verified, and only alongside the paper proof. Each society sets its own rules, so check its current DNA policy before relying on it.</p>
    ${dna.length ? `<ul class="hint" style="margin:6px 0 12px 18px">${dna.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p class="muted">No DNA evidence in this case yet. Add testers and comparisons on the earlier steps.</p>'}
    <div class="grid2">${field('Previously verified line', 'socVerified', a.socVerified, { type: 'textarea', ph: 'e.g. Matches a descendant of member # 123456, whose line the society verified in 1998' })}${field('Generations the DNA supports', 'socDnaNote', a.socDnaNote, { type: 'textarea', ph: 'e.g. Links generation 4 to generation 5, where no will survives' })}</div>
  </div>
  <div class="card report">
    <div class="card-head no-print"><span class="hint">An application worksheet, laid out generation by generation.</span><div class="tbl-actions" style="margin:0"><button class="btn small ghost" data-act="download-society">Download (Word)</button><button class="btn small" data-act="print">Print</button></div></div>
    <h1>${esc(a.socName || 'Lineage society')} application worksheet</h1>
    <p class="muted">Qualifying ancestor: <b>${esc(a.socQualifying || a.name || '—')}</b>${a.socNumber ? ' · ' + esc(a.socNumber) : ''}</p>
    <p><b>Status:</b> ${pill(st.c, st.label)} <span class="muted">${st.msg}</span></p>
    <h2>Lineage</h2>
    ${simpleTable(['Gen.', 'Name and spouse', 'Birth', 'Marriage', 'Death', 'Proof of parentage', 'Status', 'DNA'], a.socGens.map((r, i) => [String(i + 1), `${esc(r.name)}${r.spouse ? '<br><span class="muted">m. ' + esc(r.spouse) + '</span>' : ''}`, esc(r.birth), esc(r.marriage), esc(r.death), esc(r.parentage), esc(r.status), yn(r.dna)]))}
    ${dna.length || a.socVerified || a.socDnaNote ? `<h2>DNA support</h2>${dna.length ? `<ul>${dna.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}${a.socVerified ? `<p><b>Previously verified line:</b> ${esc(a.socVerified)}</p>` : ''}${a.socDnaNote ? `<p><b>Generations supported:</b> ${esc(a.socDnaNote)}</p>` : ''}` : ''}
    <p class="hint" style="margin-top:14px">DNA supports the documentary proof; it does not replace it. Check the society's current requirements before submitting.</p>
  </div>`;
}
function tabReport(a, sub) {
  const v = verdict(a), tgt = targetSNP(a), shared = sharedSNP(a.testers);
  const rows = a.testers.map(t => genRow(a, t));
  const ev = autoEvidence(a);
  const today = new Date().toLocaleDateString();
  /* sub: one test inside the combined report, under its own heading. */
  return `${sub ? '' : `<div class="card report">
    <div class="card-head no-print"><span class="hint">A printable summary of this research case.</span><div class="tbl-actions" style="margin:0"><button class="btn small ghost" data-act="download-report">Download (Word)</button><button class="btn small" data-act="print">Print</button></div></div>`}
    <h1>${esc(sub || a.name || 'Unnamed ancestor')}</h1>
    ${sub ? '' : `<p class="muted">${esc(lifeYears(a))}${a.place ? ' · ' + esc(a.place) : ''} · Report generated ${esc(today)}</p>`}
    ${inquiryOf(a) ? `<p><b>Question:</b> ${esc(inquiryOf(a).q)} ${pill(inquiryStatus(a).c, inquiryStatus(a).label)}<br><span class="muted">${inquiryStatus(a).msg}</span></p>` : ''}
    ${a.notes ? `<p>${esc(a.notes)}</p>` : ''}
    <h2>Convergence of Evidence</h2>
    ${convergenceChart(a)}
    ${(() => {
      /* Sections follow the research method: STR-first or SNP-first. */
      const docs = `
    <h2>Documents</h2>
    ${simpleTable(['Type', 'Date', 'Place', 'Source', 'What it shows'], a.documents.map(d => [esc(d.type), esc(d.date), esc(d.place), esc(d.source), esc(d.notes)]))}
    ${a.recordsLost ? `<p><b>Lost records:</b> ${esc((a.recordsLostNote || 'The records for this line are lost').replace(/[.\s]+$/, ''))}. The conclusion rests on the DNA evidence.</p>` : ''}`;
      const snp = snpUsed(a) ? `<h2>SNP Structure</h2>
    <p>Shared SNP, where the testers' lines meet: <b>${esc(tgt || '—')}</b>${num(a.ftdnaDate) != null ? ` · FTDNA formation c. ${esc(a.ftdnaDate)}` : ''}${num(a.snpDocBirth) != null ? ` · Documented birth year of SNP: ${esc(a.snpDocBirth)}` : ''}</p>
    ${(() => { const seen = new Set(), list = []; a.testers.forEach(t => pathOf(t).forEach(s => { const k = normSNP(s), who = snpAssigned(s); if (who && !seen.has(k)) { seen.add(k); list.push(`${esc(s)} → ${esc(who)}`); } })); return list.length ? `<p>SNPs assigned to ancestors: ${list.join(' · ')}</p>` : ''; })()}
    ${simpleTable(['Tester', 'Earliest ancestor', 'Terminal SNP', 'SNP path', 'Terminal SNP assigned to'], a.testers.map(t => [esc(testerLabel(t)), esc(t.line || caseAncestor(a)), esc(pathOf(t)[0] || '—'), esc(pathOf(t).join(' › ')), esc(snpAssigned(pathOf(t)[0] || '')) || '—']))}
    <h2>Generational Estimation</h2>
    ${simpleTable(['Tester', 'Tester birth year', 'SNPs', 'Generations', 'GPS', 'YPG', 'YPS', 'Shared SNP vs ancestor'], rows.map(r => [esc(testerLabel(r.t)), r.tb == null ? '—' : r.tb, r.snps == null ? '—' : r.snps, genText(r.t, r.gens), fmt(r.gps), fmt(r.ypg), fmt(r.yps, 0), snpVsAncestor(r)]))}
    ${rows.some(r => Number.isInteger(r.gens) && r.gens > 0) ? `<h2>Generation Chart</h2>${rows.map(r => reportGenChart(a, r)).join('')}
    ${reportKey([['anc', 'Ancestor'], ['snp', 'SNP (newest to oldest)'], ['pre', 'Before the ancestor']])}` : ''}` : '';
      const gd = `
    <h2>Genetic Distance</h2>
    ${simpleTable(['Pair', 'Markers', 'GD', 'GD group', 'Consistent?', 'Interpretation'], a.gdPairs.map(p => { const e = pairEval(a, p); return [esc(testerLabel(e.ta) + ' – ' + testerLabel(e.tb)), e.markers == null ? '—' : e.markers, e.gd == null ? '—' : e.gd, e.group ? esc(e.group.label) : '—', ynPill(e.within), esc(p.interp)]; }))}
    ${a.gdPairs.map(p => reportGDChart(a, pairEval(a, p))).join('')}${a.gdPairs.some(p => pairGens(a, pairEval(a, p))) ? reportKey([['anc', 'Ancestor'], ['est', 'GD estimate']]) : ''}`;
      return (autoFirst(a) ? [autoReportHTML(a), docs] : snpFirst(a) ? [snp, docs] : [gd, docs]).join('');
    })()}
    <h2>Convergence Analysis</h2>
    ${simpleTable(['Evidence type', 'Result', 'Consistent?', 'Notes'], ev.map(e => { const c = a.conv[e.key] || {}; const ok = c.ov === 'Y' ? true : c.ov === 'N' ? false : e.ok; return [esc(e.type), esc(e.result), ynPill(ok), esc(c.note)]; }).concat(a.extraEvidence.map(x => [esc(x.type), esc(x.result), x.ok === 'Y' ? ynPill(true) : x.ok === 'N' ? ynPill(false) : ynPill(null), ''])))}
    <h2>Conflicts</h2>
    ${simpleTable(['Type', 'Source', 'Possible cause', 'Resolution path', 'Status'], a.conflicts.map(c => [esc(c.type), esc(c.source), esc(c.cause), esc(c.path), esc(c.status || 'Open')]))}
    ${sub ? '' : `<p class="hint" style="margin-top:18px">All conclusions should be considered provisional pending new genetic or documentary evidence.</p>
  </div>`}`;
}

/* ---------- Quick Calculators ---------- */
/* ---------- GD calculator: GD and panel in, generations to the MRCA out ---------- */
/* The 111 FamilyTreeDNA markers in panel order (first 12 = Y-12, 25 = Y-25, 37 = Y-37, 67 = Y-67). Multi-copy markers are listed copy by copy. */
const STR_MARKERS = ['DYS393', 'DYS390', 'DYS19', 'DYS391', 'DYS385a', 'DYS385b', 'DYS426', 'DYS388', 'DYS439', 'DYS389I', 'DYS392', 'DYS389II',
  'DYS458', 'DYS459a', 'DYS459b', 'DYS455', 'DYS454', 'DYS447', 'DYS437', 'DYS448', 'DYS449', 'DYS464a', 'DYS464b', 'DYS464c', 'DYS464d',
  'DYS460', 'Y-GATA-H4', 'YCAIIa', 'YCAIIb', 'DYS456', 'DYS607', 'DYS576', 'DYS570', 'CDYa', 'CDYb', 'DYS442', 'DYS438',
  'DYS531', 'DYS578', 'DYF395S1a', 'DYF395S1b', 'DYS590', 'DYS537', 'DYS641', 'DYS472', 'DYF406S1', 'DYS511', 'DYS425', 'DYS413a', 'DYS413b',
  'DYS557', 'DYS594', 'DYS436', 'DYS490', 'DYS534', 'DYS450', 'DYS444', 'DYS481', 'DYS520', 'DYS446', 'DYS617', 'DYS568', 'DYS487', 'DYS572', 'DYS640', 'DYS492', 'DYS565',
  'DYS710', 'DYS485', 'DYS632', 'DYS495', 'DYS540', 'DYS714', 'DYS716', 'DYS717', 'DYS505', 'DYS556', 'DYS549', 'DYS589', 'DYS522', 'DYS494', 'DYS533',
  'DYS636', 'DYS575', 'DYS638', 'DYS462', 'DYS452', 'DYS445', 'Y-GATA-A10', 'DYS463', 'DYS441', 'Y-GGAAT-1B07', 'DYS525', 'DYS712', 'DYS593', 'DYS650',
  'DYS532', 'DYS715', 'DYS504', 'DYS513', 'DYS561', 'DYS552', 'DYS726', 'DYS635', 'DYS587', 'DYS643', 'DYS497', 'DYS510', 'DYS434', 'DYS461', 'DYS435'];
const GD_PANELS = [{ v: '37', l: 'Y-37 (37 markers)' }, { v: '67', l: 'Y-67 (67 markers)' }, { v: '111', l: 'Y-111 (111 markers)' }];
/* Convergence rates (Convergence Rate column, Consensus_STR_Mutation_Rates.csv): mutation rate per generation for each STR marker, used for the MRCA estimate. */
const STR_MUTATION_RATES = {
  'DYS393': 0.0015718575, 'DYS390': 0.001821496, 'DYS19': 0.0032784937, 'DYS391': 0.0029726277, 'DYS385A': 0.002645, 'DYS385B': 0.002645,
  'DYS426': 0.000398, 'DYS388': 0.0004213555, 'DYS439': 0.004658108, 'DYS389I': 0.0040197222, 'DYS392': 0.0007000846, 'DYS389II': 0.0034995349,
  'DYS458': 0.0076210533, 'DYS459A': 0.001024, 'DYS459B': 0.001024, 'DYS455': 0.000426, 'DYS454': 0.000475, 'DYS447': 0.0033396353,
  'DYS437': 0.0013062427, 'DYS448': 0.0010234463, 'DYS449': 0.0155850949, 'DYS464A': 0.00325775, 'DYS464B': 0.00325775, 'DYS464C': 0.00325775,
  'DYS464D': 0.00325775, 'DYS460': 0.005021315, 'Y-GATA-H4': 0.0022795, 'YCAIIA': 0.0008185, 'YCAIIB': 0.0008185, 'DYS456': 0.0047209004,
  'DYS607': 0.002660217, 'DYS576': 0.0152581081, 'DYS570': 0.0125063063, 'CDYA': 0.016403, 'CDYB': 0.016403, 'DYS442': 0.00978,
  'DYS438': 0.0006921557, 'DYS531': 0.001, 'DYS578': 0.000995, 'DYF395S1A': 0.000376, 'DYF395S1B': 0.000376, 'DYS590': 0.000391,
  'DYS537': 0.00238, 'DYS641': 0.00039, 'DYS472': 0.000446, 'DYF406S1': 0.00382, 'DYS511': 0.0020006948, 'DYS425': 0.00151,
  'DYS413A': 0.0019085, 'DYS413B': 0.0019085, 'DYS557': 0.0038, 'DYS594': 0.00103, 'DYS436': 0.000384, 'DYS490': 0.000395,
  'DYS534': 0.00651, 'DYS450': 0.00104, 'DYS444': 0.00545, 'DYS481': 0.0062070844, 'DYS520': 0.00266, 'DYS446': 0.0028547568,
  'DYS617': 0.000413, 'DYS568': 0.00108, 'DYS487': 0.0021256948, 'DYS572': 0.0022756948, 'DYS640': 0.0026803896, 'DYS492': 0.000392,
  'DYS565': 0.0035263896, 'DYS710': 0.018279, 'DYS485': 0.0014426948, 'DYS632': 0.000397, 'DYS495': 0.00209, 'DYS540': 0.0033,
  'DYS714': 0.007726, 'DYS716': 0.001002, 'DYS717': 0.00064516, 'DYS505': 0.00151, 'DYS556': 0.00159, 'DYS549': 0.0031759009,
  'DYS589': 0.0007529, 'DYS522': 0.00104, 'DYS494': 0.000389, 'DYS533': 0.0043068018, 'DYS636': 0.001357, 'DYS575': 0.0014361948,
  'DYS638': 0.0017606948, 'DYS462': 0.00265, 'DYS452': 0.00402, 'DYS445': 0.00216, 'Y-GATA-A10': 0.00373403, 'DYS463': 0.00151,
  'DYS441': 0.00118, 'Y-GGAAT-1B07': 0.00084, 'DYS525': 0.000978, 'DYS712': 0.016378, 'DYS593': 0.00151, 'DYS650': 0.007583,
  'DYS532': 0.00324, 'DYS715': 0.00387799, 'DYS504': 0.00324, 'DYS513': 0.00609, 'DYS561': 0.000941, 'DYS552': 0.00269,
  'DYS726': 0.000289585, 'DYS635': 0.0034719465, 'DYS587': 0.00262, 'DYS643': 0.0015, 'DYS497': 0.0019856948, 'DYS510': 0.00599,
  'DYS434': 0.000404, 'DYS461': 0.000989, 'DYS435': 0.001
};
/* Rates must be decimal probabilities per generation; a value written as a percentage (1 or more) is converted. */
function rateDecimal(r) { const v = Number(r); if (!isFinite(v) || v <= 0) return null; return v >= 1 ? v / 100 : v; }

/* ----- Matching marker names to the rate database ----- */
/* Names are compared without spaces, hyphens or case, so "Y-GATA-H4", "YGATAH4" and "GATA H4" all match. */
function markerNorm(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
const MARKER_ALIASES = { GATAH4: 'YGATAH4', GATAA10: 'YGATAA10', YGGAAT1B07: 'YGGAAT1B07', GGAAT1B07: 'YGGAAT1B07', DYS3891: 'DYS389I', DYS3892: 'DYS389II', DYS389A: 'DYS389I', DYS389B: 'DYS389II' };
const MARKER_INDEX = (() => { const m = {}; STR_MARKERS.forEach(name => { m[markerNorm(name)] = name; }); return m; })();
/* Returns the database name(s) for a marker: one name, or every copy of a multi-copy marker (DYS385 → DYS385a, DYS385b). */
function matchMarker(raw) {
  let k = markerNorm(raw);
  k = MARKER_ALIASES[k] || k;
  if (MARKER_INDEX[k]) return [MARKER_INDEX[k]];
  return ['A', 'B', 'C', 'D'].map(c => MARKER_INDEX[k + c]).filter(Boolean);
}
/* The database name for a typed marker (any case, spacing or common alias), or null if it is not a single known marker. */
function canonMarker(v) { const m = matchMarker(v); return m.length === 1 ? m[0] : null; }
function markerRate(name) { const m = matchMarker(name); return m.length === 1 ? rateDecimal(STR_MUTATION_RATES[m[0].toUpperCase()]) : null; }

/* ----- The estimate -----
   Mutations on the two lines of descent are random (Poisson) events. Over S total generations (Tester A's line +
   Tester B's line) the expected GD is R × S, where R is the total mutation rate of the panel. With no prior preference
   for any number of generations, an observed GD of k gives a gamma distribution for S; its median is the central
   estimate and its 5th–95th percentiles the 90% range. Generations per line = S ÷ 2. */
const DOC_CONF = [{ v: 'doc', l: 'Documented (records for every generation)' }, { v: 'prob', l: 'Probable (some generations inferred)' }, { v: 'unc', l: 'Uncertain (gaps in the records)' }];
const DOC_SD = { doc: 0.5, prob: 1.5, unc: 3 };
function poissonCdf(k, lam) { let term = Math.exp(-lam), sum = term; for (let i = 1; i <= k; i++) { term *= lam / i; sum += term; } return Math.min(1, sum); }
/* Central estimate and 90% range of total generations S, from a weight for every S (DNA alone, or DNA × documentation).
   ll, when given, is the marker-by-marker log-likelihood (used when the differing markers are entered). */
function sRange(gd, R, prior, ll) {
  const top = Math.max(prior ? prior.mean + 8 * prior.sd : 0, (gd + 1) / R * 5, 10), steps = 4000;
  const xs = [], lw = [];
  for (let i = 1; i <= steps; i++) {
    const S = top * i / steps;
    let v = ll ? ll(S) : gd * Math.log(R * S) - R * S;
    if (prior) v += -0.5 * ((S - prior.mean) / prior.sd) ** 2;
    xs.push(S); lw.push(v);
  }
  const mx = Math.max(...lw), w = lw.map(v => Math.exp(v - mx));
  const tot = w.reduce((a, b) => a + b, 0); let c = 0; const q = {};
  xs.forEach((x, i) => { c += w[i] / tot; [['lo', 0.05], ['mid', 0.5], ['hi', 0.95]].forEach(([k, p]) => { if (q[k] == null && c >= p) q[k] = x; }); });
  return q;
}
/* ----- Marker-by-marker model (when the differing markers are entered) -----
   Each marker mutates up or down one step at a time at its own rate. Over S generations a marker with rate μ has
   λ = μ × S mutations on average, and the chance its two values end d steps apart is e^−λ × I_d(λ)
   (I = modified Bessel function). This uses each marker's own rate and allows for back mutations. */
function besselI(d, x) {
  let term = Math.pow(x / 2, d), f = 1;
  for (let i = 2; i <= d; i++) f *= i;
  term /= f; let sum = term;
  for (let k = 1; k < 60; k++) { term *= (x / 2) ** 2 / (k * (k + d)); sum += term; if (term < sum * 1e-15) break; }
  return sum;
}
function markerLogLik(names, diffs, k = rateCal()) {
  const list = names.map(n => ({ mu: markerRate(n) * k, d: diffs[n.toUpperCase()] || 0 }));
  return S => list.reduce((t, m) => { const lam = m.mu * S; return t - lam + Math.log(besselI(m.d, lam) || 1e-300); }, 0);
}
function markerSpeed(r) { return r < 0.002 ? 'slow' : r < 0.005 ? 'medium' : 'fast'; }
/* Whole generations per line: the central estimate and top of the range rounded up, the bottom down (never below 1). */
function wholeGens(q) { return { mid: Math.ceil(q.mid / 2 - 1e-9), lo: Math.max(1, Math.floor(q.lo / 2 + 1e-9)), hi: Math.ceil(q.hi / 2 - 1e-9) }; }
/* Correction applied to every estimate: the dataset's rates are scaled so that GD 2 on Y-111 gives about
   8 generations per tester, matching documented lineages. This is the starting default; the user can change it
   in Settings, and set a different one for a family whose documented lines run faster or slower. */
const RATE_CORRECTION = 0.55;
function rateCal(a) {
  const own = num(a && a.rateCal), def = num(S.settings.rateCal);
  return own > 0 ? own : def > 0 ? def : RATE_CORRECTION;
}
function panelRate(names, k = rateCal()) {
  const missing = names.filter(m => markerRate(m) == null);
  return { missing, R: names.reduce((t, m) => t + (markerRate(m) || 0), 0) * k };
}
/* The setting that best fits a family's documented lines: the comparisons whose testers' generations are known.
   Tries settings from 0.30 to 1.50 and keeps the one whose estimates land closest to the documented generations. */
function familyFit(a) {
  const docs = a.gdPairs.map(p => pairEval(a, p)).filter(e => e.ta && e.tb && num(e.ta.generations) != null && num(e.tb.generations) != null && pairGens(a, e))
    .map(e => ({ e, G: Math.round((num(e.ta.generations) + num(e.tb.generations)) / 2) }));
  if (!docs.length) return { docs, best: null };
  let best = null;
  for (let i = 30; i <= 150; i += 5) {
    const k = i / 100, err = docs.reduce((t, d) => t + Math.abs(pairGens(a, d.e, k).mid - d.G), 0);
    if (!best || err < best.err || (err === best.err && Math.abs(k - rateCal(a)) < Math.abs(best.k - rateCal(a)))) best = { k, err };
  }
  return { docs, best };
}
/* STR Analysis: the mutation rate setting for this family, with the best fit from its documented lines. */
function familyRateCard(a) {
  const def = num(S.settings.rateCal) > 0 ? num(S.settings.rateCal) : RATE_CORRECTION, f = familyFit(a);
  const rows = f.docs.map(d => { const q = pairGens(a, d.e); return `<tr><td>${esc(testerLabel(d.e.ta))} vs ${esc(testerLabel(d.e.tb))}</td><td class="calc">GD ${d.e.gd} on ${d.e.markers}</td><td class="calc">${d.e.ta.circa || d.e.tb.circa ? 'c. ' : ''}${d.G}</td><td class="calc">${q.mid} (${q.lo}–${q.hi})</td></tr>`; }).join('');
  return `<div class="card">
    <h3>Mutation rate setting for this family</h3>
    <p class="hint">Every family mutates a little faster or slower than average. The estimates use a setting of <b>${def}</b> (from Settings) unless you set one for this family. A lower setting gives longer estimates; a higher one gives shorter estimates.</p>
    <div class="grid3"><div class="field"><label>Setting for this family</label><input data-anc="rateCal" type="number" step="0.05" min="0.1" value="${esc(a.rateCal || '')}" placeholder="Default ${def}"><div class="hint">Leave blank to use the default.</div></div>
      <div class="field" style="grid-column:span 2"><label>Best fit from your documented lines</label><div class="calc-box">${f.best ? `<b>${f.best.k}</b> <span class="muted">from ${f.docs.length} comparison${f.docs.length === 1 ? '' : 's'} with known generations</span>${String(f.best.k) !== String(rateCal(a)) ? ` <button class="btn small ghost" data-act="use-cal" data-v="${f.best.k}">Use this</button>` : ''}` : '<span class="muted">Add comparisons between testers whose generations are known to find the best fit.</span>'}</div></div></div>
    ${rows ? `<div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Comparison</th><th>GD</th><th>Documented generations</th><th>Estimate now</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="hint" style="margin-top:6px">With only one or two documented comparisons, chance has a big effect; the best fit is more reliable with several.</p>` : ''}
  </div>`;
}
const GD_NOTE = 'Generations per tester to the common ancestor, with a 90% range. Mutation rates are adjusted to match documented family lines. An estimate only.';

/* ----- Comparison with the documented genealogy (kept separate, so the two lines of evidence stay independent) ----- */
function gdDocHTML(gd, R, d, ll) {
  if (!['anc', 'bA', 'bB', 'gA', 'gB'].some(k => d[k] != null)) return '';
  const box = inner => `<div class="gd-doc-out"><b>Compared with the documented genealogy</b>${inner}</div>`;
  /* Only the documented generations are needed for the check; the birth years add the "Ancestor born" column. */
  if (d.gA == null || d.gB == null) return box('<div class="hint">Enter each tester\'s documented generations to the common ancestor.</div>');
  if (!(d.gA > 0 && d.gB > 0)) return box(`<div class="hint">${pill('red', 'Check the generations')} Each tester must be at least 1 generation from the ancestor.</div>`);
  const hasYears = d.anc != null && d.bA != null && d.bB != null;
  if (hasYears && (d.bA <= d.anc || d.bB <= d.anc)) return box(`<div class="hint">${pill('red', 'Check the dates')} Each tester must be born after the ancestor.</div>`);
  /* Total generations across both testers' lines (S) and generations per tester (S ÷ 2) are kept separate. */
  const Sdoc = d.gA + d.gB, sd = Math.sqrt(DOC_SD[d.cA] ** 2 + DOC_SD[d.cB] ** 2);
  const year = S => Math.round(((d.bA - (S / Sdoc) * (d.bA - d.anc)) + (d.bB - (S / Sdoc) * (d.bB - d.anc))) / 2);
  const yl = y => y < 1 ? `${1 - y} BCE` : String(y);
  /* If the documentation is right, the GD is a Poisson count with mean R × S (documented total generations). */
  const lam = R * Sdoc, tail = gd <= lam ? poissonCdf(gd, lam) : 1 - poissonCdf(gd - 1, lam);
  let gLo = 0; while (poissonCdf(gLo, lam) < 0.05) gLo++;
  let gHi = gLo; while (poissonCdf(gHi, lam) < 0.95) gHi++;
  const pct = tail * 100 < 1 ? 'less than a 1%' : `a ${Math.round(tail * 100)}%`;
  const v = tail >= 0.10 ? { c: 'green', t: 'Consistent', m: 'The DNA and the documentation agree.' }
    : tail >= 0.025 ? { c: 'amber', t: 'Borderline', m: `The DNA points to a ${gd < lam ? 'more recent' : 'older'} ancestor (a GD this ${gd < lam ? 'low' : 'high'} has ${pct} chance if the documentation is right).` }
    : { c: 'red', t: 'Not consistent', m: `A GD this ${gd < lam ? 'low' : 'high'} has ${pct} chance if the documentation is right. Check for a missing or extra generation, a different ancestor or a non-paternal event.` };
  const dna = wholeGens(sRange(gd, R, null, ll)), docG = { mid: Math.ceil(Sdoc / 2 - 1e-9), lo: Math.max(1, Math.floor((Sdoc - 1.645 * sd) / 2)), hi: Math.ceil((Sdoc + 1.645 * sd) / 2) };
  const comb = v.c === 'red' ? null : wholeGens(sRange(gd, R, { mean: Sdoc, sd }, ll));
  const perTester = Sdoc / 2, inside = perTester >= dna.lo && perTester <= dna.hi;
  const row = (label, g) => `<tr><td>${label}</td><td>${g.mid} <span class="muted">(${g.lo}–${g.hi})</span></td><td>${hasYears ? `c. ${yl(year(g.mid * 2))} <span class="muted">(${yl(year(g.hi * 2))}–${yl(year(g.lo * 2))})</span>` : '<span class="muted">add birth years</span>'}</td></tr>`;
  return box(` ${pill(v.c, v.t)}<div class="hint" style="margin:4px 0 8px">${v.m}</div>
    <table class="gd-doc-tbl" style="margin-bottom:8px"><tbody>
      <tr><td>Documented generations</td><td>Tester A ${fmt(d.gA, 0)} + Tester B ${fmt(d.gB, 0)} = <b>${fmt(Sdoc, 0)}</b> across both lines (${fmt(perTester, 1)} per tester)</td></tr>
      <tr><td>GD expected from the documentation</td><td>≈ ${fmt(lam, 1)} <span class="muted">(usually ${gLo} to ${gHi})</span> · observed <b>${gd}</b></td></tr>
      <tr><td>Documented generations vs DNA range</td><td>${fmt(perTester, 1)} per tester is <b>${inside ? 'inside' : 'outside'}</b> the DNA's 90% range (${dna.lo}–${dna.hi})</td></tr>
    </tbody></table>
    <table class="gd-doc-tbl"><thead><tr><th></th><th>Generations per tester</th><th>Ancestor born</th></tr></thead><tbody>
      ${row('DNA', dna)}${row('Documents', docG)}${comb ? row('<b>Combined</b>', comb) : ''}
    </tbody></table>`);
}

/* GD calculator: the generations from the tester's father outward, the estimate highlighted and the likely range marked beneath.
   Each generation can be given a name and birth year (optional), which are shown in its box. */
function gdGenChart(q, card) {
  const N = Math.min(q.hi, 80);
  if (!(N >= 1)) return '';
  const box = card.querySelector('.gd-names');
  let body = box && box.querySelector('tbody');
  if (box && !body) {
    box.innerHTML = '<div class="tbl-wrap"><table class="tbl lin-tbl"><thead><tr><th>Generation</th><th>Name</th><th>Born</th></tr></thead><tbody></tbody></table></div>';
    body = box.querySelector('tbody');
  }
  if (body) {
    while (body.children.length < N) { const i = body.children.length + 1; body.insertAdjacentHTML('beforeend', `<tr><td class="calc" style="white-space:nowrap">${i}${i === 1 ? ' <span class="muted">(father)</span>' : ''}</td><td><input data-gn-name placeholder="Name"></td><td style="width:110px"><input data-gn-born type="number" placeholder="e.g. 1880"></td></tr>`); }
    [...body.children].forEach((tr, j) => { tr.hidden = j >= N; });
  }
  const who = j => { const tr = body && body.children[j]; return tr ? { name: tr.querySelector('[data-gn-name]').value.trim(), born: num(tr.querySelector('[data-gn-born]').value) } : {}; };
  /* Ten generations to a row, so names have room and the chart stays short. Shading marks the likely range and the estimate. */
  const cells = Array.from({ length: N }, (_, j) => { const g = j + 1, w = who(j);
    return `<div class="gdg${g === q.mid ? ' gdg-est' : g >= q.lo ? ' gdg-in' : ''}"><b>${g}</b>${w.name ? `<span>${esc(w.name)}</span>` : ''}${w.born != null ? `<small>b. ${w.born}</small>` : ''}</div>`; }).join('');
  return `<div class="gc"><div class="gdg-grid">${cells}</div>
    <div class="gdg-key"><span><i class="gdg-in"></i>Likely range: ${q.lo}–${q.hi} generations</span><span><i class="gdg-est"></i>Estimate: ${q.mid} generations</span><span class="muted">Generation 1 is the tester's father.</span></div></div>`;
}
/* ----- Quick Calculator result ----- */
function gdCalcResult(card, n, g) {
  const names = STR_MARKERS.slice(0, Number(g('panel')) || 37);
  /* The same estimate as an ancestor's GD comparison: the mutation rate setting, the years, the GD group and the generation chart. */
  const k = n('rate') > 0 ? n('rate') : rateCal(), A = n('gens') >= 1 ? Math.round(n('gens')) : 0;
  const pr = panelRate(names, k), missing = pr.missing;
  if (missing.length || !(pr.R > 0)) return `${pill('red', 'No estimate')} <span class="muted">${missing.length ? 'No mutation rate for: ' + esc(missing.join(', ')) : 'The total mutation rate is zero.'}</span>`;
  const R = pr.R;
  /* Differing markers, if entered: they set the GD and switch to the marker-by-marker model. */
  const rows = [...card.querySelectorAll('.gd-diff-row')].map(r => ({ m: canonMarker(r.querySelector('[data-gd-m]').value), a: num(r.querySelector('[data-gd-a]').value), b: num(r.querySelector('[data-gd-b]').value) })).filter(r => r.m && r.a != null && r.b != null);
  const inPanel = new Set(names.map(x => x.toUpperCase())), diffs = {}, outside = [], dup = [];
  rows.forEach(r => { const k = r.m.toUpperCase(); if (!inPanel.has(k)) outside.push(r.m); else { if (diffs[k] != null) dup.push(r.m); diffs[k] = Math.round(Math.abs(r.a - r.b)); } });
  const typed = n('gd'), useRows = rows.length > 0 && !outside.length;
  const gd = useRows ? Object.values(diffs).reduce((t, d) => t + d, 0) : typed;
  if (outside.length) return `${pill('red', 'Check the markers')} <span class="muted">${esc(outside.join(', '))} ${outside.length > 1 ? 'are' : 'is'} not in the Y-${names.length} panel. Choose a larger panel or remove ${outside.length > 1 ? 'them' : 'it'}.</span>`;
  if (gd == null) return '<span class="muted">Enter the GD and choose the markers compared.</span>';
  if (!Number.isInteger(gd) || gd < 0) return '<span class="muted">The GD must be a whole number (0, 1, 2…).</span>';
  const ll = useRows ? markerLogLik(names, diffs, k) : null;
  const ypg = n('ypg') > 0 ? n('ypg') : 33;
  const q = wholeGens(sRange(gd, R, null, ll));
  let rowsNote = '';
  if (useRows) {
    const list = Object.entries(diffs).filter(([, d]) => d > 0).map(([k, d]) => { const name = names.find(x => x.toUpperCase() === k), r = markerRate(name); return `${esc(name)} (${d} step${d > 1 ? 's' : ''}, ${markerSpeed(r)})`; });
    const plain = wholeGens(sRange(gd, R));
    rowsNote = `<div class="hint" style="margin-top:4px">Using the differing markers entered: ${list.join(', ') || 'none'}. GD ${gd}${typed != null && typed !== gd ? ` <span style="color:var(--red)">(you typed ${typed}; the markers add up to ${gd})</span>` : ''}${dup.length ? ` · ${esc(dup.join(', '))} entered twice, the last one is used` : ''}. From the GD alone the estimate would be ${plain.mid} (${plain.lo} to ${plain.hi}).</div>`;
  }
  const grp = gdGroup(gd), fits = A ? (A >= q.lo && A <= q.hi) : null;
  return `<div class="big">≈ ${q.mid} generations</div>
    <div>Likely range ${q.lo} to ${q.hi} generations · ≈ ${fmt(q.mid * ypg, 0)} years (${fmt(q.lo * ypg, 0)} to ${fmt(q.hi * ypg, 0)})</div>${rowsNote}
    ${A ? `<div style="margin-top:6px">${pill(fits ? 'green' : 'red', fits ? 'Consistent' : 'Outside the range')} <span class="muted">The ${A} documented generations ${fits ? 'fall inside' : 'fall outside'} the likely range.</span></div>` : ''}
    ${gdChart(q, A, `GD ${gd} on ${names.length} markers · estimate ${q.mid} generations`)}${reportKey(A ? [['anc', 'Ancestor'], ['est', 'GD estimate']] : [['est', 'GD estimate']])}
    <div class="hint" style="margin-top:10px">${pill(grp.c, grp.label)} ${gdSuggestion(gd, names.length, grp)}</div>
    <div class="hint" style="margin-top:6px">${pill('amber', 'Estimate')} About 90% likely to fall in this range if the mutation rates are right. GD ${gd} on ${names.length} markers · mutation rate setting ${fmt(k, 2)} · corrected total rate ${R.toFixed(4)}.</div>
    <details class="pair-diffs"><summary>How this is calculated</summary><p class="hint">${GD_NOTE}${useRows ? ' Each differing marker uses its own mutation rate.' : ''}</p></details>`;
}
/* The optional differing-markers table. */
function gdValueSelect(side) {
  let o = '<option value="">—</option>';
  for (let v = 5; v <= 50; v++) o += `<option>${v}</option>`;
  return `<select data-gd-${side}>${o}</select>`;
}
function gdDiffRowHTML() {
  return `<tr class="gd-diff-row"><td><input data-gd-m list="str-markers" placeholder="Type or choose a marker" autocomplete="off"></td>
    <td>${gdValueSelect('a')}</td><td>${gdValueSelect('b')}</td>
    <td><button type="button" class="row-btn" data-gd-act="del" title="Remove">✕</button></td></tr>`;
}
function gdDiffRowsHTML() {
  return `<details class="gd-doc"><summary>Enter the differing markers (optional)</summary>
    <p class="hint" style="margin:8px 0">List only the markers where the two testers differ. The GD is then added up for you, and each marker's own mutation rate is used.</p>
    <table class="tbl gd-diff-tbl"><thead><tr><th>Marker</th><th>Tester A</th><th>Tester B</th><th></th></tr></thead><tbody>${gdDiffRowHTML()}</tbody></table>
    <div class="tbl-actions"><button type="button" class="btn small ghost" data-gd-act="add">+ Add a marker</button></div>
  </details>`;
}
/* The custom mutation rate: other matches in the same family whose generations are known from the records. */
function gdFitRowHTML() {
  return `<tr class="gd-fit-row"><td><input data-fit-gd type="number" min="0" placeholder="e.g. 2"></td>
    <td><select data-fit-m>${GD_PANELS.map(o => `<option value="${o.v}"${o.v === '111' ? ' selected' : ''}>Y-${o.v}</option>`).join('')}</select></td>
    <td><input data-fit-g type="number" min="1" placeholder="e.g. 8"></td>
    <td><button type="button" class="row-btn" data-gd-act="fit-del" title="Remove">✕</button></td></tr>`;
}
function gdFitRowsHTML() {
  return `<p class="hint" style="margin:0 0 8px">Every family mutates a little faster or slower than average. For each pair of testers whose common ancestor is documented, enter their GD, the markers compared and how many generations each is from that ancestor (a tester's father is generation 1). Several pairs give a more reliable result than one.</p>
    <table class="tbl gd-fit-tbl"><thead><tr><th>GD</th><th>Markers compared</th><th>Documented generations</th><th></th></tr></thead><tbody>${gdFitRowHTML()}</tbody></table>
    <div class="tbl-actions"><button type="button" class="btn small ghost" data-gd-act="fit-add">+ Add another known match</button></div>`;
}
/* Family Mutation Rate calculator: the best-fit setting, and what it does to each documented pair. */
function rateCalcResult(card) {
  const known = [...card.querySelectorAll('.gd-fit-row')].map(r => ({ gd: num(r.querySelector('[data-fit-gd]').value), m: Number(r.querySelector('[data-fit-m]').value), G: num(r.querySelector('[data-fit-g]').value) }))
    .filter(d => Number.isInteger(d.gd) && d.gd >= 0 && d.G >= 1);
  if (!known.length) return '<span class="muted">Enter the GD and documented generations for at least one pair of testers.</span>';
  const best = gdCustomFit(known), k0 = rateCal();
  const est = (d, k) => { const pr = panelRate(STR_MARKERS.slice(0, d.m), k); return pr.missing.length || !(pr.R > 0) ? null : wholeGens(sRange(d.gd, pr.R)); };
  const rows = known.map(d => { const a = est(d, k0), b = est(d, best.k); return `<tr><td class="calc">GD ${d.gd} on ${d.m}</td><td class="calc">${d.G}</td><td class="calc">${a ? `${a.mid} (${a.lo}–${a.hi})` : '—'}</td><td class="calc">${b ? `${b.mid} (${b.lo}–${b.hi})` : '—'}</td></tr>`; }).join('');
  const same = Math.abs(best.k - k0) < 0.001;
  return `<div class="big">${fmt(best.k, 2)}</div>
    <div>Best-fit setting from ${known.length} documented pair${known.length === 1 ? '' : 's'}${same ? ' · the same as your current setting' : ` · your current setting is ${fmt(k0, 2)}`}</div>
    <div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Pair</th><th>Documented generations</th><th>Estimate now (${fmt(k0, 2)})</th><th>Estimate at ${fmt(best.k, 2)}</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${known.length < 3 ? '<div class="hint" style="margin-top:8px">With only one or two pairs, chance has a big effect. Add more documented pairs for a more reliable setting.</div>' : ''}
    <div class="tbl-actions" style="margin-top:10px"><button type="button" class="btn small" data-gd-act="rate-to-gd" data-v="${best.k}">Use it in the GD calculator</button>${same ? '' : `<button type="button" class="btn small ghost" data-gd-act="rate-default" data-v="${best.k}">Make it my default</button>`}</div>
    <div class="hint" style="margin-top:6px">A lower setting gives longer estimates; a higher one gives shorter estimates. "Make it my default" changes the setting in Settings, which every ancestor uses unless it has its own. To set it for one family only, enter it on that ancestor's STR Analysis step.</div>`;
}
/* The setting (0.30 to 1.50) whose estimates come closest to the documented generations of the known matches. */
function gdCustomFit(list) {
  if (!list.length) return null;
  const mid = (d, k) => { const pr = panelRate(STR_MARKERS.slice(0, d.m), k); return pr.missing.length || !(pr.R > 0) ? null : wholeGens(sRange(d.gd, pr.R)).mid; };
  let best = null;
  for (let i = 30; i <= 150; i += 5) {
    const k = i / 100, err = list.reduce((t, d) => { const m = mid(d, k); return t + (m == null ? 0 : Math.abs(m - d.G)); }, 0);
    if (!best || err < best.err) best = { k, err };
  }
  return best;
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-gd-act]');
  if (!el) return;
  const card = el.closest('[data-calc]'), act = el.dataset.gdAct;
  if (act === 'rate-to-gd') {
    pickCalc('calcs', 'gd');
    const gdCard = document.querySelector('[data-calc="gd"]');
    if (gdCard) { gdCard.querySelector('[data-in="rate"]').value = el.dataset.v; runCalc(gdCard); }
    return;
  }
  if (act === 'rate-default') { S.settings.rateCal = Number(el.dataset.v); saveData(); runCalc(card); return; }
  const fit = act.startsWith('fit-'), body = card.querySelector(fit ? '.gd-fit-tbl tbody' : '.gd-diff-tbl tbody'), row = fit ? gdFitRowHTML : gdDiffRowHTML;
  if (act === 'add' || act === 'fit-add') body.insertAdjacentHTML('beforeend', row());
  else { el.closest('tr').remove(); if (!body.children.length) body.insertAdjacentHTML('beforeend', row()); }
  runCalc(card);
});

/* ----- STR Analysis tab: the differing-marker rows and the estimate for each comparison ----- */
function pairDiffRowHTML(p, r, i) {
  const opt = (v, cur) => `<option${String(cur) === String(v) ? ' selected' : ''}>${v}</option>`;
  const vals = cur => { let o = '<option value="">—</option>'; for (let v = 5; v <= 50; v++) o += opt(v, cur); return o; };
  const at = f => `data-pdiff="${esc(p.id)}" data-i="${i}" data-f="${f}"`;
  const bad = r.m && !canonMarker(r.m);
  return `<tr><td><input ${at('m')} list="str-markers" value="${esc(r.m || '')}" placeholder="Type or choose a marker" autocomplete="off"${bad ? ' style="border-color:var(--red)" title="Not a marker in the 111-marker list"' : ''}></td>
    <td><select ${at('a')}>${vals(r.a)}</select></td><td><select ${at('b')}>${vals(r.b)}</select></td>
    <td><button type="button" class="row-btn" data-act="del-pdiff" data-id="${esc(p.id)}" data-i="${i}" title="Remove">✕</button></td></tr>`;
}
function pairEstimateHTML(a, e) {
  if (e.gd == null || !Number.isInteger(e.gd) || e.gd < 0) return '';
  if (![37, 67, 111].includes(e.markers)) return '<div class="calc-out"><span class="muted">Choose the markers compared to estimate the generations.</span></div>';
  const names = STR_MARKERS.slice(0, e.markers), pr = panelRate(names, rateCal(a));
  if (pr.missing.length || !(pr.R > 0)) return '';
  const inPanel = new Set(names.map(x => x.toUpperCase())), outside = e.rows.filter(r => !inPanel.has(r.m.toUpperCase())).map(r => r.m);
  if (outside.length) return `<div class="calc-out">${pill('red', 'Check the markers')} <span class="muted">${esc(outside.join(', '))} ${outside.length > 1 ? 'are' : 'is'} not in the Y-${e.markers} panel.</span></div>`;
  const diffs = {}; e.rows.forEach(r => { diffs[r.m.toUpperCase()] = Math.round(Math.abs(num(r.a) - num(r.b))); });
  const ll = e.rows.length ? markerLogLik(names, diffs, rateCal(a)) : null;
  const q = wholeGens(sRange(e.gd, pr.R, null, ll)), ypg = lineageYPG(a) || 33;
  const typedNote = e.rows.length && e.typed != null && e.typed !== e.gd ? `<div class="hint" style="color:var(--red)">You typed GD ${e.typed}; the markers add up to ${e.gd}.</div>` : '';
  return `<div class="calc-out"><div class="big">≈ ${q.mid} generations</div>
    <div>Likely range ${q.lo} to ${q.hi} generations · ≈ ${fmt(q.mid * ypg, 0)} years (${fmt(q.lo * ypg, 0)} to ${fmt(q.hi * ypg, 0)})</div>${typedNote}
    <details class="pair-diffs"><summary>How this is calculated</summary><p class="hint">${GD_NOTE}${ll ? ' Each differing marker uses its own mutation rate.' : ''}</p></details></div>`;
}

function calcCard(id, title, formula, inputs, extra = '') {
  return `<div class="card" data-calc="${id}"><h3>${title}</h3><div class="formula">${formula}</div>
    <div class="grid2">${inputs.map(i => `<div class="field${i.full ? ' full' : ''}"><label>${i.label}</label>${i.type === 'textarea'
      ? `<textarea data-in="${i.k}" placeholder="${esc(i.ph || '')}"></textarea>`
      : i.type === 'diffrows' ? gdDiffRowsHTML()
      : i.type === 'fitrows' ? gdFitRowsHTML()
      : i.type === 'linrows' ? '<div class="lin-rows"></div>'
      : i.type === 'gdnames' ? '<details class="gd-doc"><summary>Name the generations (optional)</summary><div class="gd-names" style="margin-top:8px"><p class="hint">Enter a GD first.</p></div></details>'
      : i.type === 'select'
        ? `<select data-in="${i.k}">${i.opts.map(o => `<option value="${esc(o.v)}">${esc(o.l)}</option>`).join('')}</select>`
        : `<input data-in="${i.k}" type="${i.type || 'number'}" placeholder="${esc(i.ph || '')}">`}${i.hint ? `<div class="hint">${i.hint}</div>` : ''}</div>`).join('')}</div>
    ${extra}<div class="calc-out" data-out>—</div></div>`;
}
/* Each calculator: its name in the list, its group, and its card. Placeholders start with "e.g." so they read as examples. */
const CALC_DEFS = {
  ypg: { group: 'Y-DNA (SNP)', name: 'Years Per Generation (YPG)', card: () => calcCard('ypg', 'Years Per Generation (YPG)', 'YPG = Total years ÷ Number of generations', [{ k: 'years', label: 'Total years', ph: 'e.g. 345' }, { k: 'gens', label: 'Generations', ph: 'e.g. 10' }]) },
  lineage: { group: 'Y-DNA (SNP)', name: 'SNP Lineage Chart', card: () => calcCard('lineage', 'SNP Lineage Chart', 'Enter each generation from the tester\'s father back to the ancestor, and the SNP that formed in him', [
    { k: 'gens', label: 'Number of generations', type: 'select', opts: [{ v: '', l: '— choose —' }].concat(Array.from({ length: 40 }, (_, i) => ({ v: String(i + 1), l: String(i + 1) }))) },
    { k: 'rows', label: '', type: 'linrows', full: true }
  ]) },
  gps: { group: 'Y-DNA (SNP)', name: 'Generations Per SNP (GPS)', card: () => calcCard('gps', 'Generations Per SNP (GPS)', 'GPS = Generations ÷ SNPs', [{ k: 'gens', label: 'Generations', ph: 'e.g. 10' }, { k: 'snps', label: 'SNPs', ph: 'e.g. 3' }]) },
  yps: { group: 'Y-DNA (SNP)', name: 'Years Per SNP (YPS)', card: () => calcCard('yps', 'Years Per SNP (YPS)', 'YPS = GPS × YPG', [{ k: 'gps', label: 'GPS', ph: 'e.g. 3.3' }, { k: 'ypg', label: 'YPG', ph: 'e.g. 34.5' }]) },
  birth: { group: 'Y-DNA (SNP)', name: 'Estimated SNP Birth Year', card: () => calcCard('birth', 'Estimated SNP Birth Year', 'Birth Year = Reference Year − (SNPs × YPS)', [{ k: 'ref', label: 'Reference year (tester\'s birth)', ph: 'e.g. 1954' }, { k: 'yps', label: 'YPS', ph: 'e.g. 115' }, { k: 'snps', label: 'SNPs back', ph: 'e.g. 3' }]) },
  gendist: { group: 'Y-DNA (SNP)', name: 'Generational Distance from SNP', card: () => calcCard('gendist', 'Generational Distance from SNP', 'Generations = SNPs × GPS', [{ k: 'snps', label: 'SNPs', ph: 'e.g. 3' }, { k: 'gps', label: 'GPS', ph: 'e.g. 3.3' }]) },
  genyears: { group: 'Y-DNA (SNP)', name: 'Years from Generations', card: () => calcCard('genyears', 'Years from Generations', 'Years = Generations × YPG', [{ k: 'gens', label: 'Generations', ph: 'e.g. 10' }, { k: 'ypg', label: 'YPG', ph: 'e.g. 34.5' }]) },
  align: { group: 'Y-DNA (SNP)', name: 'SNP Date vs Documented Birth Year', card: () => calcCard('align', 'SNP Date vs Documented Birth Year', 'Aligned when |SNP date − birth year| ≤ one SNP interval (YPS)', [{ k: 'snp', label: 'Estimated SNP date', ph: 'e.g. 1724' }, { k: 'birth', label: 'Documented birth year', ph: 'e.g. 1720' }, { k: 'yps', label: 'YPS', ph: 'e.g. 115' }]) },
  mrca: { group: 'Y-DNA (SNP)', name: 'Lowest Shared SNP (MRCA)', card: () => calcCard('mrca', 'Lowest Shared SNP (MRCA)', 'The first SNP in Tester A\'s path that also appears in Tester B\'s path', [{ k: 'a', label: 'Tester A path (terminal → upstream)', type: 'textarea', full: true, ph: 'e.g. FTB42619, MF109215, Y11201' }, { k: 'b', label: 'Tester B path (terminal → upstream)', type: 'textarea', full: true, ph: 'e.g. Y43252, Y11201' }]) },
  gd: { group: 'STR markers', name: 'Genetic Distance (GD)', card: () => calcCard('gd', 'Generations to the MRCA from Genetic Distance', 'Enter the GD from FamilyTreeDNA and the number of markers compared.', [
    { k: 'gd', label: 'Genetic Distance (GD)', ph: 'e.g. 3' },
    { k: 'panel', label: 'Markers compared', type: 'select', opts: GD_PANELS },
    { k: 'gens', label: 'Documented generations (optional)', ph: 'e.g. 8', hint: 'From the records: how many generations each tester is from their common ancestor (a tester\'s father is generation 1).' },
    { k: 'ypg', label: 'Years per generation (optional)', ph: 'e.g. 33', hint: 'Used to turn generations into years. 33 if left blank.' },
    { k: 'rate', label: 'Mutation rate setting (optional)', ph: `Default ${fmt(rateCal(), 2)}`, hint: 'The same setting as an ancestor\'s STR step. Leave blank to use the one in Settings, or work out your family\'s own with the Family Mutation Rate calculator.' },
    { k: 'diffs', label: '', type: 'diffrows', full: true }
  ]) },
  rate: { group: 'STR markers', name: 'Family Mutation Rate', card: () => calcCard('rate', 'Family Mutation Rate', 'Finds the mutation rate setting that best fits your family\'s documented lines', [
    { k: 'fit', label: 'STR matches whose generations are known from the records', type: 'fitrows', full: true }
  ]) },
  cm: { group: 'Autosomal DNA', name: 'Shared cM Calculator', card: () => calcCard('cm', 'Shared cM Calculator', 'Possible relationships for an amount of shared DNA', [{ k: 'cm', label: 'Shared cM', ph: 'e.g. 850' }]) },
  contrib: { group: 'Autosomal DNA', name: 'Ancestral DNA Contribution', card: () => calcCard('contrib', 'Ancestral DNA Contribution', 'Expected share = 100% ÷ 2^generations', [{ k: 'gens', label: 'Generations back (parent = 1)', ph: 'e.g. 4' }]) },
  survival: { group: 'Autosomal DNA', name: 'Segment Survival Ratio', card: () => calcCard('survival', 'Segment Survival Ratio', 'Ratio = observed cM ÷ expected cM from the ancestor', [{ k: 'obs', label: 'Observed cM from ancestor', ph: 'e.g. 300' }, { k: 'gens', label: 'Generations back (parent = 1)', ph: 'e.g. 4' }]) },
  segments: { group: 'Autosomal DNA', name: 'Ancestor Segment Alignment', card: () => calcCard('segments', 'Ancestor Segment Alignment', 'Finds overlapping segments between matches', [{ k: 'segs', label: 'Segments: chromosome, start, end, match (one per line)', type: 'textarea', full: true, ph: 'e.g.\n7, 12000000, 34000000, John\n7, 20000000, 40000000, Mary' }]) }
};
const CALC_PAGES = {
  calcs: { title: 'Calculators', intro: 'The SNP and STR formulas from <i>Y-DNA Lineage Reconstruction</i>. Inside an ancestor\'s workspace these run automatically from your tester data.', ids: ['ypg', 'gps', 'lineage', 'yps', 'birth', 'gendist', 'genyears', 'align', 'mrca', 'gd', 'rate'] },
  autosomal: { title: 'Autosomal DNA Tools', intro: 'Supporting tools for autosomal DNA. Figures are approximate averages.', ids: ['cm', 'contrib', 'survival', 'segments'] }
};
/* Remembers the last calculator opened on each page (this device only). */
const CALC_PICK_KEY = 'convergence-calc-pick';
let calcPick = {};
try { calcPick = JSON.parse(localStorage.getItem(CALC_PICK_KEY)) || {}; } catch (e) { calcPick = {}; }
function pickCalc(page, id) {
  calcPick[page] = id;
  try { localStorage.setItem(CALC_PICK_KEY, JSON.stringify(calcPick)); } catch (e) { /* not saved */ }
  render();
}
/* One calculator at a time: a list of names on the left, the chosen calculator on the right. */
function renderCalcPage(page) {
  const cfg = CALC_PAGES[page];
  const sel = cfg.ids.includes(calcPick[page]) ? calcPick[page] : cfg.ids[0];
  const groups = [];
  cfg.ids.forEach(id => {
    const g = CALC_DEFS[id].group;
    let grp = groups.find(x => x.name === g);
    if (!grp) { grp = { name: g, ids: [] }; groups.push(grp); }
    grp.ids.push(id);
  });
  const multi = groups.length > 1;
  const list = groups.map(g => `${multi ? `<div class="calc-list-head">${esc(g.name)}</div>` : ''}${g.ids.map(id =>
    `<button class="calc-link${id === sel ? ' active' : ''}" data-act="pick-calc" data-id="${id}">${esc(CALC_DEFS[id].name)}</button>`).join('')}`).join('');
  const options = groups.map(g => `${multi ? `<optgroup label="${esc(g.name)}">` : ''}${g.ids.map(id =>
    `<option value="${id}"${id === sel ? ' selected' : ''}>${esc(CALC_DEFS[id].name)}</option>`).join('')}${multi ? '</optgroup>' : ''}`).join('');
  return `<h1>${cfg.title}</h1>
  <p class="muted">${cfg.intro}</p>
  <div class="calc-layout">
    <nav class="calc-list">${list}</nav>
    <select id="calc-pick" class="calc-select" aria-label="Choose a calculator">${options}</select>
    <div class="calc-main">${CALC_DEFS[sel].card()}</div>
  </div>`;
}
function renderCalcs() { return renderCalcPage('calcs'); }
/* GPS calculator: the generations from tester to ancestor, with the span each SNP covers drawn beneath them. */
function gpsChart(gens, snps) {
  if (!(gens >= 1 && gens <= 60 && Number.isInteger(snps) && snps >= 1 && snps <= 40)) return '';
  const g = Math.round(gens), gps = gens / snps;
  const cells = Array.from({ length: g }, (_, i) => `<div class="gc-gen">${i + 1}</div>`).join('');
  const blocks = Array.from({ length: snps }, (_, i) => `<div class="gc-snp" style="width:${100 / snps}%"><b>SNP ${i + 1}</b><span>${fmt(gps, 1)} generations</span></div>`).join('');
  return `<div class="gc"><div class="gc-head"><span>Tester</span><span>Generations</span><span>Ancestor</span></div>
    <div class="gc-row">${cells}</div><div class="gc-row gc-snps">${blocks}</div></div>`;
}
/* SNP Lineage Chart: one row per generation (1 = the tester's father) with the man's name, birth year and the SNP that
   formed in him; drawn as the generations with each SNP spanning the generations since the previous one. */
function linRowHTML(i) {
  return `<tr><td class="calc" style="white-space:nowrap">${i}${i === 1 ? ' <span class="muted">(father)</span>' : ''}</td>
    <td><input data-lin-name placeholder="Name"></td><td style="width:110px"><input data-lin-born type="number" placeholder="e.g. 1880"></td>
    <td><input data-lin-snp list="lin-snps" placeholder="e.g. R-Y11201" autocomplete="off"></td></tr>`;
}
function lineageCalc(card, n) {
  const N = n('gens'), box = card.querySelector('.lin-rows');
  if (!(N >= 1)) { box.innerHTML = ''; return '<span class="muted">Choose the number of generations.</span>'; }
  let body = box.querySelector('tbody');
  if (!body) {
    const snps = [...new Set([].concat(...S.ancestors.map(x => [].concat(...x.testers.map(pathOf)))))];
    box.innerHTML = `<datalist id="lin-snps">${snps.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <div class="tbl-wrap"><table class="tbl lin-tbl"><thead><tr><th>Generation</th><th>Ancestor</th><th>Born</th><th>SNP formed in him (optional)</th></tr></thead><tbody></tbody></table></div>`;
    body = box.querySelector('tbody');
  }
  while (body.children.length < N) body.insertAdjacentHTML('beforeend', linRowHTML(body.children.length + 1));
  while (body.children.length > N) body.lastElementChild.remove();
  const rows = [...body.children].map((tr, j) => ({ gen: j + 1, name: tr.querySelector('[data-lin-name]').value.trim(), born: num(tr.querySelector('[data-lin-born]').value), snp: tr.querySelector('[data-lin-snp]').value.trim() }));
  const marks = rows.filter(r => r.snp), grid = `display:grid;grid-template-columns:repeat(${N},minmax(62px,1fr));gap:2px`;
  const cells = rows.map(r => `<div class="gc-gen lin-gen"><b>${r.gen}</b>${r.name ? `<span>${esc(r.name)}</span>` : ''}${r.born != null ? `<small>b. ${r.born}</small>` : ''}</div>`).join('');
  let prev = 0;
  const blocks = marks.map(r => { const span = r.gen - prev; prev = r.gen; return `<div class="gc-snp" style="grid-column:span ${span}"><b>${esc(r.snp)}</b><span>${span} generation${span === 1 ? '' : 's'}</span></div>`; }).join('')
    + (prev < N ? `<div class="lin-gap" style="grid-column:span ${N - prev}">no SNP yet</div>` : '');
  const gps = marks.length ? N / marks.length : null, ok = gps != null && gps >= S.settings.gpsMin && gps <= S.settings.gpsMax;
  return `${gps != null ? `<div class="big">${fmt(gps, 2)}</div>generations per SNP · ${N} generations ÷ ${marks.length} SNP${marks.length === 1 ? '' : 's'} ${ok ? pill('green', 'within expected ' + S.settings.gpsMin + '–' + S.settings.gpsMax) : pill('amber', 'outside expected ' + S.settings.gpsMin + '–' + S.settings.gpsMax)}` : '<span class="muted">Enter the SNP that formed in a generation to place it on the chart.</span>'}
    <div class="gc"><div class="gc-head"><span>Tester's father</span><span>Generations</span><span>Ancestor</span></div>
    <div class="lin-scroll"><div style="${grid}">${cells}</div><div style="${grid};margin-top:6px">${blocks}</div></div></div>`;
}
/* Relationship name for a number of generations back: 1 father, 2 grandfather, 3 great-grandfather, 4 2nd great-grandfather … */
function relName(n) {
  if (!(n >= 1) || !Number.isInteger(n)) return '';
  if (n === 1) return 'father'; if (n === 2) return 'grandfather'; if (n === 3) return 'great-grandfather';
  const k = n - 2, sfx = k % 100 >= 11 && k % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[k % 10] || 'th');
  return `${k}${sfx} great-grandfather`;
}
/* All-in-One: a quick case for trying numbers without adding an ancestor. It uses the same steps and charts as an
   ancestor's workspace (testers, SNP tree, generation charts, GD comparisons), kept in its own scratch case. */
function aioCard() {
  const a = S.aio, m = snpFirst(a) ? 'SNP' : '';
  const gdCharts = a.gdPairs.map(p => reportGDChart(a, pairEval(a, p))).join('');
  const parts = { snp: snpUsed(a) ? tabSNP(a) : '', str: tabSTR(a) + (gdCharts ? `<div class="card"><h3>GD generation charts</h3>${gdCharts}${reportKey([['anc', 'Ancestor'], ['est', 'GD estimate']])}</div>` : '') };
  return `<div class="aio-case"><div class="card">
    <div class="card-head"><h3>All-in-One</h3><button class="btn small ghost" data-act="aio-clear">Clear all</button></div>
    <p class="hint">Try a case without adding an ancestor. Everything works the same as in an ancestor's workspace; it is kept here until you clear it.</p>
    <div class="grid3">${field('Ancestor', 'name', a.name, { ph: 'e.g. Thomas Joass' })}${field('Birth year', 'birth', a.birth, { type: 'number', ph: 'e.g. 1609' })}
      <div class="field"><label>Tests</label><select data-anc="method">${METHODS.map(o => `<option value="${o.v}"${m === o.v ? ' selected' : ''}>${o.l}</option>`).join('')}</select></div></div>
    <div class="hint">${METHODS.find(o => o.v === m).best}</div>
  </div>
  ${tabTesters(a)}
  ${methodOrder(a, ['str', 'snp']).map(k => parts[k]).join('')}</div>`;
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
    case 'lineage': html = lineageCalc(card, n); break;
    case 'gps': if (has('gens', 'snps') && n('snps')) { const v = n('gens') / n('snps'); html = big(fmt(v, 2)) + `generations per SNP ${v >= S.settings.gpsMin && v <= S.settings.gpsMax ? pill('green', 'within expected ' + S.settings.gpsMin + '–' + S.settings.gpsMax) : pill('amber', 'outside expected ' + S.settings.gpsMin + '–' + S.settings.gpsMax)}` + gpsChart(n('gens'), n('snps')); } break;
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
    case 'gd': html = gdCalcResult(card, n, g); break;
    case 'rate': html = rateCalcResult(card); break;
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
function renderAutosomal() { return renderCalcPage('autosomal'); }

/* ---------- Settings ---------- */
function renderSettings() {
  const s = S.settings;
  return `<h1>Settings &amp; Backup</h1>
  <div class="card"><h3>Research defaults</h3>
    <div class="grid3">
      ${field('Default Years Per Generation (YPG)', 'ypg', s.ypg, { attr: 'data-set', type: 'number', hint: 'Used when an ancestor has no lineage YPG.' })}
      ${field('Expected GPS — minimum', 'gpsMin', s.gpsMin, { attr: 'data-set', type: 'number' })}
      ${field('Expected GPS — maximum', 'gpsMax', s.gpsMax, { attr: 'data-set', type: 'number' })}
      <div class="field"><label>STR mutation rate setting</label><input data-set="rateCal" type="number" step="0.05" min="0.1" value="${esc(s.rateCal)}"><div class="hint">Scales every STR estimate. 0.55 fits the documented test lines; lower gives longer estimates, higher gives shorter. Each family can have its own on its STR Analysis step.</div></div>
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
/* Saves the report as a Word document (.doc) that opens in Word, LibreOffice or Google Docs. */
/* Turns the convergence chart into a picture (PNG) so it shows in Word. */
async function chartToPNG(svg) {
  const cs = getComputedStyle(document.documentElement);
  let src = new XMLSerializer().serializeToString(svg).replace(/var\((--[\w-]+)\)/g, (m, v) => cs.getPropertyValue(v).trim() || '#999');
  src = src.replace('class="conv-pct"', 'class="conv-pct" font-family="Georgia, serif" font-size="22" fill="#1f2b33"').replace('class="conv-sub"', 'class="conv-sub" font-family="Arial, sans-serif" font-size="9" fill="#6b7378"');
  if (!/xmlns=/.test(src)) src = src.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = 360;
  c.getContext('2d').drawImage(img, 0, 0, 360, 360);
  return c.toDataURL('image/png');
}
async function downloadReport(a, kind = 'report') {
  const el = document.querySelector('.report');
  if (!el) return;
  const copy = el.cloneNode(true);
  copy.querySelectorAll('.no-print').forEach(x => x.remove());
  /* Every convergence chart becomes a picture: the combined report has one for each test. */
  const live = [...el.querySelectorAll('.conv-chart svg')], charts = [...copy.querySelectorAll('.conv-chart svg')];
  for (let i = 0; i < charts.length; i++) {
    let png = null;
    try { png = await chartToPNG(live[i]); } catch (e) { /* the counts still show as text */ }
    if (png) charts[i].outerHTML = `<img src="${png}" width="170" height="170" alt="Convergence chart">`; else charts[i].remove();
  }
  const css = 'body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#222}h1{font-family:Georgia,serif;font-size:22pt;margin:0 0 4pt}h2{font-family:Georgia,serif;font-size:14pt;margin:16pt 0 6pt;border-bottom:1px solid #ccc}table{border-collapse:collapse;width:100%;margin-bottom:8pt}th,td{border:1px solid #ccc;padding:4pt 6pt;text-align:left;vertical-align:top;font-size:10pt}th{background:#f2efe8}.muted,.hint{color:#666}.verdict{border:1px solid #ccc;padding:6pt 10pt;margin:10pt 0}.pill{font-weight:bold}';
  const html = `<html><head><meta charset="utf-8"><title>${esc(a.name || 'Report')}</title><style>${css}</style></head><body>${copy.innerHTML.replace(/var\((--[\w-]+)\)/g, (m, v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#999')}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${(a.name || 'Convergence report').replace(/[\\/:*?"<>|]+/g, '').trim() || 'Convergence report'} - ${kind}.doc`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
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
/* Each pair of testers keeps its own markers, GD, differing markers and verdict, so choosing the same two testers
   again (in either order, or in a new comparison) brings them back. */
const PAIR_FIELDS = ['markers', 'gd', 'diffs', 'interp', 'consistent'];
function pairKey(p) { return p.a && p.b && p.a !== p.b ? [p.a, p.b].sort().join('|') : null; }
function rememberPair(a, p) {
  const key = pairKey(p);
  if (!key) return;
  if (!a.pairMemory) a.pairMemory = {};
  const m = { a: p.a };
  PAIR_FIELDS.forEach(f => { m[f] = f === 'diffs' ? (Array.isArray(p.diffs) ? p.diffs : []).map(r => Object.assign({}, r)) : p[f]; });
  a.pairMemory[key] = m;
}
function recallPair(a, p, oldKey) {
  const key = pairKey(p), m = key && a.pairMemory && a.pairMemory[key];
  if (m) {
    const flip = m.a !== p.a;
    PAIR_FIELDS.forEach(f => { p[f] = f === 'diffs' ? (m.diffs || []).map(r => flip ? { m: r.m, a: r.b, b: r.a } : Object.assign({}, r)) : m[f]; });
  } else if (oldKey) PAIR_FIELDS.forEach(f => { delete p[f]; });
}
function newRow(coll) {
  const r = { id: uid() };
  if (coll === 'documents') r.type = DOC_TYPES[0];
  if (coll === 'testers') { r.label = 'Tester ' + String.fromCharCode(65 + (rec().testers.length % 26)); r.test = testTypes(rec())[0]; }
  if (coll === 'conflicts') { r.type = CONFLICT_TYPES[0]; r.status = 'Open'; }
  if (coll === 'socGens') r.status = 'Missing';
  if (coll === 'atMatches') { const prev = rec().atMatches.slice(-1)[0]; r.company = prev ? prev.company : AUTO_COMPANIES[0]; if (prev) { r.tester = prev.tester; r.testerGens = prev.testerGens; } }
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
  if (d.pdiff) return `[data-pdiff="${d.pdiff}"][data-i="${d.i}"][data-f="${d.f}"]`;
  if (d.check) return `[data-check="${d.check}"]`;
  if (d.snpassign) return `[data-snpassign="${d.snpassign}"]`;
  if (d.snpdate) return `[data-snpdate="${d.snpdate}"]`;
  return null;
}
/* When typing in a box and then clicking a button, the box saves as the mouse goes down. Redrawing the page at that
   moment would swap the button out from under the mouse and lose the click, so the redraw waits until the click is done. */
let pointerIsDown = false, redrawWaiting = false;
document.addEventListener('pointerdown', () => { pointerIsDown = true; }, true);
document.addEventListener('pointerup', () => {
  pointerIsDown = false;
  if (redrawWaiting) setTimeout(() => { if (redrawWaiting) { redrawWaiting = false; rerenderKeepFocus(); } }, 0);
}, true);
function rerenderKeepFocus() {
  if (pointerIsDown) { redrawWaiting = true; return; }
  redrawWaiting = false;
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
    const oldKey = d.coll === 'gdPairs' ? pairKey(row) : null;
    if (d.coll === 'gdPairs') rememberPair(a, row);
    row[d.k] = el.type === 'checkbox' ? el.checked : el.value;
    if (d.coll === 'gdPairs') { if (pairKey(row) !== oldKey) recallPair(a, row, oldKey); rememberPair(a, row); }
  } else if (d.anc && a) {
    a[d.anc] = el.type === 'checkbox' ? el.checked : el.value;
    /* The name, dates and place stay the same across all of an ancestor's tests. */
    if (view.page === 'ancestor' && ['name', 'birth', 'death', 'place'].includes(d.anc)) casesOf(a).forEach(x => { x[d.anc] = el.value; });
  } else if (d.pdiff && a) {
    const pr = a.gdPairs.find(x => x.id === d.pdiff);
    if (!pr) return;
    if (!Array.isArray(pr.diffs)) pr.diffs = [];
    const i = Number(d.i);
    pr.diffs[i] = Object.assign({ m: '', a: '', b: '' }, pr.diffs[i]);
    pr.diffs[i][d.f] = d.f === 'm' ? (canonMarker(el.value) || el.value.trim()) : el.value;
    rememberPair(a, pr);
  } else if (d.conv && a) {
    a.conv[d.conv] = a.conv[d.conv] || {};
    a.conv[d.conv][d.f] = el.value;
  } else if (d.set) {
    const v = num(el.value);
    if (v != null) S.settings[d.set] = v;
  } else if (d.snpdate) {
    /* The year an SNP formed; for the case's shared SNP it is also its FTDNA formation date. */
    const v = el.value.trim(), a2 = rec();
    if (v) S.snpDates[d.snpdate] = v; else delete S.snpDates[d.snpdate];
    if (a2 && targetSNP(a2) && normSNP(targetSNP(a2)) === d.snpdate) a2.ftdnaDate = v;
  } else if (d.snpassign) {
    const text = el.value.trim(), x = S.ancestors.find(y => ancLabel(y) === text || (y.name || '') === text);
    if (!text) delete S.snpAssign[d.snpassign];
    else S.snpAssign[d.snpassign] = x ? { id: x.id, name: ancLabel(x) } : { name: text };
  } else if (d.start) {
    startAns[d.start] = el.value;
    if (d.start === 'tested' && el.value !== 'Y') delete startAns.test;
    render();
    return;
  } else if (el.id === 'rep-pick') {
    view.id = reportPick = el.value; render();
    return;
  } else if (el.id === 'tree-pick') {
    treePick = el.value; render();
    return;
  } else if (el.id === 'calc-pick') {
    pickCalc(view.page, el.value);
    return;
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
    case 'open-ancestor': view = { page: 'ancestor', id: el.dataset.id, tab: el.dataset.tab || 'checklist' }; reportPick = el.dataset.id; app.classList.remove('menu-open'); render(); window.scrollTo(0, 0); break;
    case 'add-ancestor': {
      const anc = fixAncestor({ id: uid(), name: 'New ancestor', testChosen: false });
      S.ancestors.push(anc); saveData();
      view = { page: 'ancestor', id: anc.id, tab: 'checklist' }; app.classList.remove('menu-open'); render();
      const nameInput = document.querySelector('[data-anc="name"]');
      if (nameInput) { nameInput.focus(); nameInput.select(); }
      break;
    }
    case 'del-card': {
      const cs = casesOfPid(el.dataset.id);
      if (cs.length && confirm(`Delete ${cs[0].name || 'this ancestor'} and ${cs.length > 1 ? `the research for its ${cs.length} tests` : 'all of its research'}? This cannot be undone.`)) {
        S.ancestors = S.ancestors.filter(y => y.pid !== el.dataset.id); saveData(); render();
      }
      break;
    }
    case 'open-person': e.preventDefault(); view = { page: 'person', id: el.dataset.id, tab: 'overview' }; app.classList.remove('menu-open'); render(); window.scrollTo(0, 0); break;
    case 'open-report': view = { page: 'reports', id: el.dataset.id, tab: 'overview' }; reportPick = el.dataset.id; render(); window.scrollTo(0, 0); break;
    case 'add-case': {
      const src = casesOfPid(el.dataset.pid)[0];
      if (!src) break;
      const c = fixAncestor({ id: uid(), pid: src.pid, name: src.name, birth: src.birth, death: src.death, place: src.place, method: el.dataset.m, testChosen: true });
      S.ancestors.push(c); saveData();
      view = { page: 'ancestor', id: c.id, tab: 'intro' }; render(); window.scrollTo(0, 0);
      break;
    }
    case 'back-test': { const t = cur(); t.testChosen = false; saveData(); render(); window.scrollTo(0, 0); break; }
    case 'del-ancestor': {
      /* With other tests for the same ancestor, only this test's research is deleted. */
      const others = a ? casesOf(a).filter(x => x.id !== a.id) : [];
      if (a && confirm(others.length ? `Delete the ${methodName(a)} research for ${a.name || 'this ancestor'}? The other tests are kept. This cannot be undone.` : `Delete ${a.name || 'this ancestor'} and all of its research? This cannot be undone.`)) {
        S.ancestors = S.ancestors.filter(x => x.id !== a.id); saveData();
        view = others.length ? { page: 'person', id: a.pid, tab: 'overview' } : { page: 'home', id: null, tab: 'overview' }; render();
      }
      break;
    }
    case 'open-project': view = { page: 'project', id: el.dataset.id, tab: el.dataset.tab || 'checklist' }; app.classList.remove('menu-open'); render(); window.scrollTo(0, 0); break;
    case 'add-project': {
      const p = fixProject({ id: uid(), name: 'New non-tester research' });
      S.projects.push(p); saveData();
      view = { page: 'project', id: p.id, tab: 'checklist' }; render();
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
    case 'pick-calc': pickCalc(view.page, el.dataset.id); break;
    case 'load-example': e.preventDefault(); loadExample(el.dataset.k); break;
    case 'start-case': {
      const anc = fixAncestor({ id: uid(), name: 'New ancestor', method: el.dataset.m || '', testChosen: true });
      S.ancestors.push(anc); saveData();
      view = { page: 'ancestor', id: anc.id, tab: 'intro' }; render(); window.scrollTo(0, 0);
      break;
    }
    case 'start-project': {
      const p = fixProject({ id: uid(), name: 'New non-tester research' });
      S.projects.push(p); saveData();
      view = { page: 'project', id: p.id, tab: 'checklist' }; render(); window.scrollTo(0, 0);
      break;
    }
    case 'aio-clear': if (confirm('Clear everything in the All-in-One?')) { S.aio = fixAncestor({}); saveData(); render(); } break;
    case 'use-cal': if (a) { a.rateCal = el.dataset.v; saveData(); render(); } break;
    case 'use-interp': {
      const pr = a && a.gdPairs.find(x => x.id === el.dataset.id);
      if (pr) { pr.interp = pairEval(a, pr).suggestion; saveData(); render(); }
      break;
    }
    case 'add-pdiff': case 'del-pdiff': {
      const pr = a && a.gdPairs.find(x => x.id === el.dataset.id);
      if (!pr) break;
      const list = Array.isArray(pr.diffs) && pr.diffs.length ? pr.diffs : [{ m: '', a: '', b: '' }];
      if (act === 'add-pdiff') list.push({ m: '', a: '', b: '' }); else list.splice(Number(el.dataset.i), 1);
      pr.diffs = list; rememberPair(a, pr); saveData(); render();
      break;
    }
    case 'tab': view.tab = el.dataset.tab; render(); window.scrollTo(0, 0); break;
    case 'ostep': view.ostep = Number(el.dataset.n); render(); window.scrollTo(0, 0); break;
    case 'choose-test': { const a = cur(); a.method = el.dataset.m; a.testChosen = true; saveData(); view.tab = 'intro'; render(); window.scrollTo(0, 0); break; }
    case 'add-row': if (a) { a[el.dataset.coll].push(newRow(el.dataset.coll)); saveData(); render(); } break;
    /* One comparison for every pair of testers not already compared; a pair compared before brings back its GD and markers. */
    case 'add-all-pairs': if (a) {
      const have = new Set(a.gdPairs.map(pairKey).filter(Boolean));
      a.testers.forEach((x, i) => a.testers.slice(i + 1).forEach(y => { const p = { id: uid(), a: x.id, b: y.id }, k = pairKey(p); if (k && !have.has(k)) { recallPair(a, p); a.gdPairs.push(p); have.add(k); } }));
      saveData(); render();
    } break;
    case 'del-row':
      if (a && confirm('Delete this row?')) {
        a[el.dataset.coll] = a[el.dataset.coll].filter(r => r.id !== el.dataset.id);
        if (el.dataset.coll === 'testers') a.gdPairs.forEach(p => { if (p.a === el.dataset.id) p.a = ''; if (p.b === el.dataset.id) p.b = ''; });
        saveData(); render();
      }
      break;
    case 'print': window.print(); break;
    case 'download-report': if (a) downloadReport(a); break;
    case 'download-society': if (a) downloadReport(a, 'society application'); break;
    case 'export': exportData(); break;
    case 'import': document.getElementById('import-file').click(); break;
    case 'open-menu': app.classList.add('menu-open'); break;
    case 'close-menu': app.classList.remove('menu-open'); break;
  }
});

/* The list of the 111 markers, used by every "Type or choose a marker" box. */
document.body.insertAdjacentHTML('beforeend', `<datalist id="str-markers">${STR_MARKERS.map(m => `<option value="${m}">`).join('')}</datalist>`);
/* Always open on the Home screen (your ancestors), at the top of the page. */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
view = { page: 'home', id: null, tab: 'overview' };
render();
window.scrollTo(0, 0);