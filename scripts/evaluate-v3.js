require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { chunkText } = require('../src-rag-v2');
const { bm25Search, rrfFuse, denseSearch } = require('../src/retrievers');
const { graphSearch } = require('../src/concept-graph');

const root = path.join(__dirname, '..');
const KS = [1, 3, 5, 10];

function docs(corpus) {
  if (corpus === 'kestrel') {
    const dir = path.join(root, 'corpora/kestrel/docs');
    return fs.readdirSync(dir).filter(x => /\.(md|txt)$/i.test(x)).sort()
      .map((name, i) => ({ id: `kestrel_${i + 1}`, name, text: fs.readFileSync(path.join(dir, name), 'utf8') }));
  }
  const file = path.join(root, 'data/documents.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
}

function questions(corpus) {
  const file = path.join(root, 'eval', `${corpus}.questions.jsonl`);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)
    .filter(q => q.question && !/^REPLACE_/i.test(q.question) &&
      !(q.evidence || []).some(e => /^REPLACE_/i.test(String(e.source || '') + String(e.quote || ''))));
}

function evidenceHits(result, k) {
  const evidence = result.evidence || [];
  const top = result.retrieved.slice(0, k);
  const matched = evidence.filter(e => top.some(r =>
    r.source === e.source && r.text.toLowerCase().includes(String(e.quote).toLowerCase())
  ));
  return { matched: matched.length, total: evidence.length, hit: matched.length > 0 };
}

async function run(corpus, mode) {
  const documents = docs(corpus);
  const chunks = documents.flatMap(d => chunkText(d.text, 180, 35).map((text, i) => ({
    id: `${d.id}-chunk-${i + 1}`, source: d.name, index: i, text
  })));
  const qs = questions(corpus);
  const results = [];

  for (const q of qs) {
    const lists = [];
    if (mode.includes('dense')) lists.push({ name: 'dense', results: await denseSearch(q.question, chunks, 10) });
    if (mode.includes('bm25')) lists.push({ name: 'bm25', results: bm25Search(q.question, chunks, 10) });
    if (mode.includes('graph')) {
      if (corpus !== 'kestrel') continue;
      lists.push({ name: 'graph', results: graphSearch(q.question, chunks, 10) });
    }
    const retrieved = lists.length === 1 ? lists[0].results : rrfFuse(lists, 10);
    results.push({
      id: q.id, type: q.type || 'other', question: q.question,
      answerable: q.answerable !== false, evidence: q.evidence || [],
      retrieved: retrieved.map(x => ({
        id: x.id, source: x.source, chunk: x.index + 1, text: x.text,
        score: x.score ?? x.rrfScore, foundBy: x.foundBy || [{ retriever: x.retriever || mode, rank: x.rank || null }]
      }))
    });
  }

  const summary = {};
  for (const k of KS) {
    const answerable = results.filter(r => r.answerable);
    const hitCount = answerable.filter(r => evidenceHits(r, k).hit).length;
    const evidenceTotal = answerable.reduce((n, r) => n + evidenceHits(r, k).total, 0);
    const evidenceMatched = answerable.reduce((n, r) => n + evidenceHits(r, k).matched, 0);
    summary[`HitRate@${k}`] = answerable.length ? hitCount / answerable.length : null;
    summary[`Recall@${k}`] = evidenceTotal ? evidenceMatched / evidenceTotal : null;
  }

  const byType = {};
  for (const type of [...new Set(results.map(r => r.type))]) {
    const subset = results.filter(r => r.type === type && r.answerable);
    byType[type] = {};
    for (const k of KS) {
      const matched = subset.reduce((n, r) => n + evidenceHits(r, k).matched, 0);
      const total = subset.reduce((n, r) => n + evidenceHits(r, k).total, 0);
      byType[type][`HitRate@${k}`] = subset.length ? subset.filter(r => evidenceHits(r, k).hit).length / subset.length : null;
      byType[type][`Recall@${k}`] = total ? matched / total : null;
    }
  }
  return { corpus, mode, questionCount: results.length, answerable: results.filter(r => r.answerable).length,
    unanswerable: results.filter(r => !r.answerable).length, summary, byType, results };
}

(async () => {
  const modes = ['dense', 'dense_bm25', 'dense_bm25_graph'];
  const runs = [];
  for (const corpus of ['kestrel', 'custom']) {
    for (const mode of modes) {
      if (mode.includes('graph') && corpus !== 'kestrel') continue;
      if (corpus === 'custom' && !docs('custom').length) {
        runs.push({ corpus, mode, questionCount: 0, answerable: 0, unanswerable: 0,
          skipped: 'No custom documents found in data/documents.json. Upload/provide the actual custom corpus before evaluating.' });
        continue;
      }
      if (mode.includes('graph') && !fs.existsSync(path.join(root, 'graph/kestrel-graph.json'))) {
        throw new Error('Concept graph has not been built. Run npm run build:graph first.');
      }
      runs.push(await run(corpus, mode));
    }
  }
  const dest = path.join(root, 'results', `v3-evaluation-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify({ generatedAt: new Date().toISOString(), metricDefinitions: {
    hitRate: 'Fraction of answerable questions with at least one matching evidence quote in top-k.',
    recall: 'Fraction of all answer evidence quotes matched in top-k across answerable questions.'
  }, runs }, null, 2));
  console.log(JSON.stringify({ savedTo: path.relative(root, dest), runs: runs.map(r => ({
    corpus: r.corpus, mode: r.mode, questionCount: r.questionCount, summary: r.summary, skipped: r.skipped
  })) }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
