// Проверка версий (COMMITS + BRANCHES) в index.html без браузера.
// Запуск: node .claude/skills/add-version/scripts/check-versions.js [путь к html]
// Применяет правки каждого коммита по цепочке от корня и сообщает о проблемах:
// формат и дубли id, неизвестный parent, циклы, неверные head, коммиты вне веток,
// облака/темы, которых нет, повторные add.
const fs = require('fs');
const file = process.argv[2] || 'index.html';
const html = fs.readFileSync(file, 'utf8');
const js = html.split('<script>').map(p => p.split('</script>')[0]).find(p => p.includes('const A =')) || '';
const from = js.indexOf('const A ='), to = js.indexOf('const CMAP=');
if (from < 0 || to < 0) { console.error('Не нашёл блок DATA/BRANCHES/COMMITS (const A = … const CMAP=)'); process.exit(2); }
const { DATA, BRANCHES, COMMITS } = new Function(js.slice(from, to) + ';return {DATA,BRANCHES,COMMITS}')();

const errors = [], warns = [];
const CMAP = {};
for (const c of COMMITS) {
  if (!/^[0-9a-f]{7}$/.test(c.id)) errors.push(`id '${c.id}': нужен короткий хеш — 7 символов 0-9a-f`);
  if (CMAP[c.id]) errors.push(`дубль id ${c.id}`);
  CMAP[c.id] = c;
}
const roots = COMMITS.filter(c => !c.parent);
if (roots.length !== 1) errors.push(`корневой коммит (parent:null) должен быть ровно один, сейчас ${roots.length}`);
for (const c of COMMITS) {
  if (c.parent && !CMAP[c.parent]) errors.push(`${c.id}: parent '${c.parent}' не существует`);
  if (!BRANCHES[c.branch]) errors.push(`${c.id}: ветки '${c.branch}' нет в BRANCHES`);
  if (c.parent && !c.src) warns.push(`${c.id}: нет src (ссылки на источник)`);
  if (!c.title) warns.push(`${c.id}: нет title (сообщения коммита)`);
}

// ветки: head существует, принадлежит ветке; коммиты ветки идут цепочкой до head
const onBranchChain = new Set();
for (const [b, { head, color }] of Object.entries(BRANCHES)) {
  if (!color) warns.push(`ветка '${b}': нет color`);
  const h = CMAP[head];
  if (!h) { errors.push(`ветка '${b}': head '${head}' не существует`); continue; }
  if (h.branch !== b) errors.push(`ветка '${b}': head ${head} сделан в ветке '${h.branch}' — у head должен быть branch:'${b}'`);
  for (let c = h; c && c.branch === b; c = CMAP[c.parent]) onBranchChain.add(c.id);
}
for (const c of COMMITS) if (!onBranchChain.has(c.id))
  errors.push(`${c.id} (ветка '${c.branch}') не лежит на цепочке от head своей ветки — забыл обновить head или указал не тот branch`);

const recs = Object.entries(BRANCHES).filter(([, b]) => b.recommended).map(([n]) => n);
if (recs.length !== 1) errors.push(`recommended:true должен быть ровно у одной ветки, сейчас: ${recs.join(', ') || 'ни у одной'}`);
for (const c of COMMITS) if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(c.date || '')) warns.push(`${c.id}: date должен быть 'ГГГГ-ММ-ДД ЧЧ:ММ' — по нему сортируется меню`);

// симуляция: применяем цепочку каждого коммита
const clone = () => DATA.map(c => ({ t: c.t, k: c.k.map(k => k.adv ? { t: k.t } : { t: k[0] }) }));
for (const v of COMMITS) {
  const chain = [], seen = new Set();
  for (let x = v; x; x = CMAP[x.parent]) {
    if (seen.has(x.id)) { errors.push(`${v.id}: цикл в цепочке parent`); break; }
    seen.add(x.id); chain.unshift(x);
  }
  const data = clone();
  for (const x of chain) for (const ch of x.changes || []) {
    const where = `${x.id} (в истории ${v.id})`;
    if (!['add', 'mod', 'del', 'cloud'].includes(ch.op)) { errors.push(`${where}: неизвестный op '${ch.op}'`); continue; }
    if (ch.op === 'cloud') {
      if (data.some(c => c.t === ch.t)) errors.push(`${where}: облако '${ch.t}' уже есть`);
      data.push({ t: ch.t, k: [] }); continue;
    }
    const c = data.find(c => c.t === ch.cloud);
    if (!c) { errors.push(`${where}: нет облака '${ch.cloud}'`); continue; }
    const i = c.k.findIndex(k => k.t === ch.t);
    if (ch.op === 'add') {
      if (i >= 0) errors.push(`${where}: тема '${ch.t}' в '${ch.cloud}' уже есть`);
      if (!ch.adv && !ch.x) errors.push(`${where}: add без текста x (или поставь adv:true)`);
      c.k.push({ t: ch.t });
    } else if (i < 0) errors.push(`${where}: в '${ch.cloud}' нет темы '${ch.t}'`);
    else if (ch.op === 'mod') c.k[i].t = ch.nt || ch.t;
    else if (ch.op === 'del') c.k.splice(i, 1);
  }
}

const uniq = a => [...new Set(a)];
uniq(warns).forEach(w => console.log('предупреждение: ' + w));
uniq(errors).forEach(e => console.log('ОШИБКА: ' + e));
console.log(errors.length ? `\n${uniq(errors).length} ошибок`
  : `OK: ${COMMITS.length} коммитов, ${Object.keys(BRANCHES).length} веток, ошибок нет`);
process.exit(errors.length ? 1 : 0);
