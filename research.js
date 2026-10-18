'use strict';
/* =========================================================
   Convergence — Pre-Research Checklists, Non-Tester Research and Learn
   Uses the helpers in app.js and the content in learn.js
   ========================================================= */

/* ---------- Pre-Research Checklists ---------- */
function checklistHTML(kind, record) {
  const cl = CHECKLISTS[kind];
  const checks = record.checks || {};
  let total = 0, done = 0;
  const sections = cl.sections.map((s, si) => `<div class="check-sec"><h3>${esc(s[0])}</h3>${s[1].map((it, ii) => {
    const key = `${si}.${ii}`;
    total++;
    if (checks[key]) done++;
    return `<label class="check-item"><input type="checkbox" data-check="${key}"${checks[key] ? ' checked' : ''}><span><b>${esc(it[0])}</b>${it[1] ? `<small>${esc(it[1])}</small>` : ''}</span></label>`;
  }).join('')}</div>`).join('');
  const pct = total ? Math.round(done / total * 100) : 0;
  return `<div class="card">
    <div class="card-head"><h3>${esc(cl.title)}</h3>${pill(done === total ? 'green' : 'amber', `${done} of ${total} complete`)}</div>
    <p class="hint">${esc(cl.purpose)}</p>
    <div class="progress"><span style="width:${pct}%"></span></div>
    <div class="check-grid">${sections}</div>
  </div>`;
}
function tabChecklist(a) { return checklistHTML('tester', a); }

/* ---------- Non-Tester Research (projects) ---------- */
function fixProject(p) {
  ['groups', 'limits'].forEach(k => { if (!Array.isArray(p[k])) p[k] = []; });
  if (!p.checks || typeof p.checks !== 'object') p.checks = {};
  if (!p.id) p.id = uid();
  return p;
}
function curProject() { return (S.projects || []).find(p => p.id === view.id); }
function groupName(g) { return g.name || 'Unnamed grouping'; }

function projectOutcome(p) {
  const g = p.groups;
  if (!g.length) return { c: 'grey', title: 'No groupings yet', msg: 'Add the project\'s lineage groupings to begin the comparison.' };
  const remaining = g.filter(x => x.eliminated !== 'Y');
  const unreviewed = g.filter(x => x.eliminated !== 'Y' && x.eliminated !== 'N');
  if (!remaining.length) return { c: 'red', title: 'All groupings eliminated', msg: 'No grouping fits the documented genealogy. Revisit the evidence, or contact the project administrators — the lineage may not yet be represented.' };
  if (unreviewed.length) return { c: 'amber', title: 'Elimination in progress', msg: `${unreviewed.length} grouping(s) not yet reviewed on the Elimination tab.` };
  if (remaining.length === 1) return { c: 'green', title: `Narrowed to ${groupName(remaining[0])}`, msg: 'This is a narrowed placement, not a confirmed one. Y-DNA testing of a descendant can confirm placement within the lineage.' };
  return { c: 'amber', title: `Unresolved — ${remaining.length} groupings remain`, msg: 'Narrowing does not always resolve. Accept the unresolved outcome, or seek more data from the project administrators or a potential test candidate.' };
}

const PTABS = [
  ['checklist', 'Pre-Research'], ['groups', 'Project & Groupings'], ['geo', 'Geographic Alignment'], ['snpseg', 'SNP Segments'],
  ['elim', 'Elimination'], ['narrow', 'Lineage Narrowing'], ['limits', 'Limitations'], ['report', 'Report']
];
const YN = [{ v: '', l: '—' }, { v: 'Y', l: 'Yes' }, { v: 'N', l: 'No' }];
const STRENGTH = [{ v: '', l: '—' }, { v: 'Strong', l: 'Strong' }, { v: 'Moderate', l: 'Moderate' }, { v: 'Weak', l: 'Weak' }];
const SUPPORT = [{ v: '', l: '—' }, { v: 'Supports', l: 'Supports' }, { v: 'Partial', l: 'Partial' }, { v: 'Conflicts', l: 'Conflicts' }, { v: 'No data', l: 'No data' }];
const LIMIT_TYPES = ['Incomplete project coverage', 'No direct Y-DNA testing', 'Limited documentation', 'Overlapping groupings', 'Surname-only grouping', 'Few testers in grouping', 'Other'];

function renderProjects() {
  const list = S.projects || [];
  const cards = list.map(p => {
    const o = projectOutcome(p);
    return `<div class="anc-card" data-act="open-project" data-id="${p.id}">
      <h3>${esc(p.name || 'Unnamed research')}</h3>
      <div class="hint">${esc(p.surname || '')}${p.projectName ? ' · ' + esc(p.projectName) : ''}</div>
      <div style="margin-top:10px">${pill(o.c === 'grey' ? '' : o.c, o.title)}</div></div>`;
  }).join('');
  return `<h1>Non-Tester Research</h1>
  <p class="muted">For researchers without Y-DNA results: compare your documented genealogy against the lineage groupings of a surname project, eliminate what does not fit, and narrow the possibilities.</p>
  <div class="tbl-actions" style="margin-bottom:18px"><button class="btn" data-act="add-project">+ New non-tester research</button></div>
  ${list.length ? `<div class="anc-cards">${cards}</div>` : '<p class="muted">No non-tester research yet.</p>'}`;
}

/* One step per screen, like an ancestor's workspace: what to do at each step, then Back / Continue. */
function projectGuide(tab) {
  return {
    checklist: { q: 'Before you start', help: 'Work through this checklist before you compare anything. It makes sure the research is workable: you know which line you are placing, how far back your records go, and which surname project to use. Tick each item as you go; you can come back to it at any time.' },
    groups: { q: 'Which surname project and groupings?', help: 'Give your research a name and the surname. Find the surname\'s Y-DNA project on FamilyTreeDNA and open its Y-DNA Results page. Enter each lineage grouping the project lists, with its defining SNP, where it comes from and its earliest known ancestor. Each grouping is a separate paternal branch.' },
    geo: { q: 'Does your line fit each grouping\'s geography?', help: 'Enter your earliest documented ancestor and where the family lived. Then, for each grouping, note its region and choose <b>Yes</b> if your family\'s locations fall within it or <b>No</b> if they do not. Judge the overall pattern, not a single place.' },
    snpseg: { q: 'What SNPs define each grouping?', help: 'For each grouping, record the SNP above its defining SNP (upstream) and the SNPs below it (downstream), from the project page or FamilyTreeDNA Discover. Choose <b>Yes</b> if the testers in the grouping share a consistent SNP structure. A grouping with no SNP support (surname only) is weaker evidence.' },
    elim: { q: 'Which groupings can you rule out?', help: 'Go through each grouping and choose <b>Yes</b> under Eliminated if it conflicts with your documented genealogy: names, places or known family connections that cannot fit. Give the reason. Choose <b>No</b> for groupings that still fit.' },
    narrow: { q: 'Which grouping fits best?', help: 'Only the groupings you did not eliminate are shown. For each one, rate how well the SNP, geographic and genealogical evidence supports your line, and note any conflicts. If one grouping remains, your line most likely belongs to it.' },
    limits: { q: 'What limits your conclusion?', help: 'Record anything that could weaken the result: a project that does not cover every line, no direct Y-DNA test, thin records, groupings that overlap, or groupings based on surname only. Not finding your line does not mean it does not exist; it may not be represented yet.' },
    report: { q: 'Your research report', help: 'This is the summary of your research, in the order you worked. Print it or save it as a PDF. A narrowed lineage is not a confirmed one: a Y-DNA test of a male-line descendant can confirm the placement.' }
  }[tab] || null;
}
function renderProject(p) {
  const o = projectOutcome(p);
  const idx = Math.max(0, PTABS.findIndex(t => t[0] === view.tab)), prev = PTABS[idx - 1], next = PTABS[idx + 1], g = projectGuide(PTABS[idx][0]);
  if (view.tab !== PTABS[idx][0]) view.tab = PTABS[idx][0];
  const guide = g ? `<div class="wiz-head"><div class="wiz-step">Step ${idx + 1} of ${PTABS.length} · ${esc(PTABS[idx][1])}</div><h2 class="wiz-q">${g.q}</h2><div class="wiz-help"><b>What to do:</b> ${g.help}</div></div>` : '';
  const nav = `<div class="wiz-nav no-print">${prev ? `<button class="btn ghost" data-act="tab" data-tab="${prev[0]}">← Back</button>` : '<span></span>'}${next ? `<button class="btn" data-act="tab" data-tab="${next[0]}">Continue to ${esc(next[1])} →</button>` : ''}</div>`;
  const body = {
    checklist: () => checklistHTML('nontester', p), groups: ptGroups, geo: ptGeo, snpseg: ptSnpSeg,
    elim: ptElim, narrow: ptNarrow, limits: ptLimits, report: ptReport
  }[view.tab] || ptGroups;
  return `
  <div class="anc-header">
    <div><h1>${esc(p.name || 'Unnamed research')}</h1>
      <div class="anc-meta">${esc(p.surname || 'No surname set')}${p.projectName ? ' · ' + esc(p.projectName) : ''}</div></div>
    <div>${pill(o.c === 'grey' ? '' : o.c, o.title)}</div>
  </div>
  ${guide}${body(p)}${nav}`;
}

function outcomeBox(p) {
  const o = projectOutcome(p);
  return `<div class="verdict ${o.c === 'grey' ? '' : o.c}"><div><b>${esc(o.title)}</b><div class="hint">${esc(o.msg)}</div></div></div>`;
}

function ptGroups(p) {
  return `<div class="card">
    <h3>Project and Group Identification Analysis</h3>
    <div class="grid3">
      ${field('Research name', 'name', p.name, { ph: 'e.g. Origins of Michael Joyce of Tuam' })}
      ${field('Surname', 'surname', p.surname, { ph: 'e.g. Joyce' })}
      ${field('Project name', 'projectName', p.projectName, { ph: 'e.g. Joyce Surname DNA Project' })}
      ${field('Project link', 'projectLink', p.projectLink, { ph: 'https://www.familytreedna.com/…' })}
      <div class="field"><label>Number of groupings</label><div class="calc-box">${p.groups.length}</div></div>
      ${field('Project administrators / contact notes', 'adminNotes', p.adminNotes, { ph: 'Who to contact and what you asked' })}
    </div>
    <div class="tbl-actions no-print"><button class="btn small danger" data-act="del-project">Delete this research</button></div>
  </div>
  <div class="card">
    <h3>Grouping Matrix</h3>
    <p class="hint">Enter each lineage grouping in the project. Each grouping is defined by a shared SNP, which represents a distinct paternal branch.</p>
    ${editTable('groups', [
      { k: 'name', label: 'Group name', ph: 'e.g. Group 3 – Joyce Country' },
      { k: 'snps', label: 'Defining SNP(s)', ph: 'e.g. R-YP6007' },
      { k: 'origin', label: 'Geographic origin', w: 160 },
      { k: 'earliest', label: 'Earliest ancestor', w: 170 }
    ], p.groups, { addLabel: 'Add grouping', empty: 'No groupings yet.' })}
  </div>`;
}

function ptGeo(p) {
  return `<div class="card">
    <h3>Geographic Alignment Analysis — your data</h3>
    <div class="grid2">
      ${field('Your earliest documented ancestor', 'earliest', p.earliest, { ph: 'e.g. Michael Joyce (1830–1856)' })}
      ${field('Primary location(s)', 'locations', p.locations, { ph: 'e.g. Tuam, County Galway' })}
    </div>
  </div>
  <div class="card">
    <h3>Geographic Comparison Matrix</h3>
    <p class="hint">Does your documented lineage fall within the established geographic range of each grouping? This is judged on the overall pattern, not a single location.</p>
    ${editTable('groups', [
      { k: 'n', label: 'Group', type: 'calc', render: g => esc(groupName(g)) },
      { k: 'region', label: 'Region', w: 160, ph: 'Region of the grouping' },
      { k: 'geoMatch', label: 'Match?', type: 'select', opts: YN },
      { k: 'geoNotes', label: 'Conflict notes', type: 'textarea', w: 220 },
      { k: 'geoStrength', label: 'Strength', type: 'select', opts: STRENGTH }
    ], p.groups, { noDelete: true, empty: 'Add groupings on the Project & Groupings tab.' })}
  </div>`;
}

function ptSnpSeg(p) {
  return `<div class="card">
    <h3>SNP Segment Analysis</h3>
    <p class="hint">For each grouping, record its defining SNP with the upstream and downstream SNPs, and whether the testers in the grouping share a consistent SNP structure. Distinguish SNP-supported groupings from surname-only groupings.</p>
    ${editTable('groups', [
      { k: 'n', label: 'Group', type: 'calc', render: g => esc(groupName(g)) },
      { k: 's', label: 'Defining SNP(s)', type: 'calc', render: g => esc(g.snps || '—') },
      { k: 'upstream', label: 'Upstream SNP', w: 130 },
      { k: 'downstream', label: 'Downstream SNP(s)', w: 170 },
      { k: 'segOk', label: 'Consistent?', type: 'select', opts: YN }
    ], p.groups, { noDelete: true, empty: 'Add groupings on the Project & Groupings tab.' })}
  </div>`;
}

function ptElim(p) {
  return `<div class="card">
    <h3>Elimination Matrix</h3>
    <p class="hint">Work through each grouping and remove those that conflict with your documented genealogy — names, locations and known family connections.</p>
    ${editTable('groups', [
      { k: 'n', label: 'Group', type: 'calc', render: g => esc(groupName(g)) },
      { k: 'eliminated', label: 'Eliminated?', type: 'select', opts: YN },
      { k: 'elimReason', label: 'Reason', type: 'textarea', w: 220 },
      { k: 'elimNotes', label: 'Notes', type: 'textarea', w: 200 }
    ], p.groups, { noDelete: true, empty: 'Add groupings on the Project & Groupings tab.' })}
    ${outcomeBox(p)}
  </div>`;
}

function ptNarrow(p) {
  const remaining = p.groups.filter(g => g.eliminated !== 'Y');
  return `<div class="card">
    <h3>Lineage Narrowing Analysis</h3>
    <p class="hint">Only groupings that have not been eliminated are shown. A lineage fits when names, locations and known family connections align without contradiction.</p>
    ${editTable('groups', [
      { k: 'n', label: 'Group', type: 'calc', render: g => esc(groupName(g)) },
      { k: 'snpSupport', label: 'SNP support', type: 'select', opts: SUPPORT },
      { k: 'geoSupport', label: 'Geographic support', type: 'select', opts: SUPPORT },
      { k: 'genSupport', label: 'Genealogical support', type: 'select', opts: SUPPORT },
      { k: 'narrowConflicts', label: 'Conflicts', type: 'textarea', w: 220 }
    ], remaining, { noDelete: true, empty: p.groups.length ? 'Every grouping has been eliminated.' : 'Add groupings on the Project & Groupings tab.' })}
    ${outcomeBox(p)}
  </div>`;
}

function ptLimits(p) {
  return `<div class="card">
    <h3>Limitations Analysis</h3>
    <p class="hint">Not every project includes all documented lineages. The absence of a matching lineage does not mean it does not exist — only that it may not yet be represented.</p>
    ${editTable('limits', [
      { k: 'type', label: 'Limitation type', type: 'select', opts: LIMIT_TYPES },
      { k: 'present', label: 'Present?', type: 'select', opts: YN },
      { k: 'impact', label: 'Impact', type: 'textarea', w: 220 },
      { k: 'notes', label: 'Notes', type: 'textarea', w: 200 }
    ], p.limits, { addLabel: 'Add limitation', empty: 'No limitations recorded.' })}
    <div style="margin-top:16px">${field('General observations', 'observations', p.observations, { type: 'textarea', full: true })}</div>
  </div>`;
}

function ptReport(p) {
  const today = new Date().toLocaleDateString();
  const yn = v => v === 'Y' ? 'Yes' : v === 'N' ? 'No' : '—';
  return `<div class="card report">
    <div class="card-head no-print"><span class="hint">A printable summary of this non-tester research.</span><div class="tbl-actions" style="margin:0"><button class="btn small ghost" data-act="download-report">Download (Word)</button><button class="btn small" data-act="print">Print</button></div></div>
    <h1>${esc(p.name || 'Unnamed research')}</h1>
    <p class="muted">${esc(p.surname || '')}${p.projectName ? ' · ' + esc(p.projectName) : ''} · Report generated ${esc(today)}</p>
    <p>Earliest documented ancestor: <b>${esc(p.earliest || '—')}</b> · Primary location(s): <b>${esc(p.locations || '—')}</b></p>
    ${outcomeBox(p)}
    <h2>Groupings</h2>
    ${simpleTable(['Group', 'Defining SNP(s)', 'Origin', 'Earliest ancestor'], p.groups.map(g => [esc(groupName(g)), esc(g.snps), esc(g.origin), esc(g.earliest)]))}
    <h2>Geographic Alignment</h2>
    ${simpleTable(['Group', 'Region', 'Match?', 'Conflict notes', 'Strength'], p.groups.map(g => [esc(groupName(g)), esc(g.region), yn(g.geoMatch), esc(g.geoNotes), esc(g.geoStrength)]))}
    <h2>SNP Segments</h2>
    ${simpleTable(['Group', 'Defining SNP(s)', 'Upstream', 'Downstream', 'Consistent?'], p.groups.map(g => [esc(groupName(g)), esc(g.snps), esc(g.upstream), esc(g.downstream), yn(g.segOk)]))}
    <h2>Elimination</h2>
    ${simpleTable(['Group', 'Eliminated?', 'Reason', 'Notes'], p.groups.map(g => [esc(groupName(g)), yn(g.eliminated), esc(g.elimReason), esc(g.elimNotes)]))}
    <h2>Lineage Narrowing</h2>
    ${simpleTable(['Group', 'SNP', 'Geographic', 'Genealogical', 'Conflicts'], p.groups.filter(g => g.eliminated !== 'Y').map(g => [esc(groupName(g)), esc(g.snpSupport), esc(g.geoSupport), esc(g.genSupport), esc(g.narrowConflicts)]))}
    <h2>Limitations</h2>
    ${simpleTable(['Limitation', 'Present?', 'Impact', 'Notes'], p.limits.map(l => [esc(l.type), yn(l.present), esc(l.impact), esc(l.notes)]))}
    ${p.observations ? `<h2>General Observations</h2><p>${esc(p.observations)}</p>` : ''}
    <p class="hint" style="margin-top:18px">Non-tester conclusions are based on comparison and elimination, not direct testing. A narrowed lineage should not be treated as confirmed.</p>
  </div>`;
}

/* ---------- Learn ---------- */
function renderLearn() {
  const nav = EDU_SECTIONS.map((s, i) => `<a href="#learn-${i}">${esc(s.title)}</a>`).join('') + '<a href="#learn-terms">Formulas and Terms</a><a href="#learn-check">Pre-Research Checklists</a>';
  const sections = EDU_SECTIONS.map((s, i) => `<section class="learn-sec" id="learn-${i}"><h2>${esc(s.title)}</h2>
    ${s.topics.map(t => `<details class="topic"><summary>${esc(t[0])}</summary><p>${esc(t[1])}</p></details>`).join('')}</section>`).join('');
  const terms = `<section class="learn-sec" id="learn-terms"><h2>Formulas and Terms</h2>
    <div class="tbl-wrap"><table class="tbl"><tbody>${GLOSSARY.map(g => `<tr class="topic"><td><b>${esc(g[0])}</b></td><td style="white-space:normal">${esc(g[1])}${g[2] ? `<div class="formula" style="margin:4px 0 0">${esc(g[2])}</div>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
  const checks = `<section class="learn-sec" id="learn-check"><h2>Pre-Research Checklists</h2>
    <p class="hint">Interactive versions are on the Pre-Research tab of each ancestor and each non-tester research case.</p>
    ${['tester', 'nontester'].map(k => { const c = CHECKLISTS[k]; return `<details class="topic"><summary>${esc(c.title)}</summary>${c.sections.map(s => `<h3 style="margin-top:12px">${esc(s[0])}</h3><ul>${s[1].map(it => `<li><b>${esc(it[0])}</b>${it[1] ? ' — ' + esc(it[1]) : ''}</li>`).join('')}</ul>`).join('')}<p class="hint">${esc(c.purpose)}</p></details>`; }).join('')}</section>`;
  return `<h1>Learn</h1>
  <p class="muted">The theory and methods of <i>Y-DNA Lineage Reconstruction: Theory and Application</i>.</p>
  <input id="learn-q" class="learn-search" type="search" placeholder="Search topics and terms">
  <div class="learn-layout"><nav class="learn-nav">${nav}</nav><div>${sections}${terms}${checks}</div></div>`;
}

/* Learn search: hides topics that do not match, opens those that do. */
document.addEventListener('input', e => {
  if (e.target.id !== 'learn-q') return;
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.learn-sec').forEach(sec => {
    let any = false;
    sec.querySelectorAll('.topic').forEach(t => {
      const hit = !q || t.textContent.toLowerCase().includes(q);
      t.style.display = hit ? '' : 'none';
      if (t.tagName === 'DETAILS') t.open = !!q && hit;
      if (hit) any = true;
    });
    sec.style.display = any ? '' : 'none';
  });
});