
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { chunkText } = require('../src-rag-v2');
const { buildGraph } = require('../src/concept-graph');

const root = path.join(__dirname, '..');

async function main() {
  const docsDir = path.join(
    root,
    'corpora',
    'kestrel',
    'docs'
  );

  if (!fs.existsSync(docsDir)) {
    throw new Error(`Kestrel documents folder not found: ${docsDir}`);
  }

  const files = fs.readdirSync(docsDir)
    .filter(name => /\.(md|txt)$/i.test(name))
    .sort();

  if (!files.length) {
    throw new Error('No Kestrel Markdown/text documents found.');
  }

  const key =
    process.env.GRAPH_API_KEY ||
    process.env.EMBEDDING_API_KEY;

  if (!key) {
    throw new Error(
      'Set GRAPH_API_KEY or EMBEDDING_API_KEY in .env.'
    );
  }

  const docs = files.map((name, i) => ({
    id: `kestrel_${i + 1}`,
    name,
    text: fs.readFileSync(
      path.join(docsDir, name),
      'utf8'
    )
  }));

  const chunks = docs.flatMap(doc =>
    chunkText(doc.text, 180, 35).map((text, i) => ({
      id: `${doc.id}-chunk-${i + 1}`,
      source: doc.name,
      index: i,
      text
    }))
  );

  console.log(`Documents: ${docs.length}`);
  console.log(`Chunks: ${chunks.length}`);
  console.log(`Graph model: ${process.env.GRAPH_MODEL || 'gemini-2.5-flash'}`);

  const graph = await buildGraph(chunks);

  console.log('\nGraph build summary:');

  console.log(JSON.stringify({
    chunks: graph.chunkCount,
    triples: graph.stats.triples,
    entities: graph.stats.entities,
    relations: graph.stats.relations,
    errors: graph.stats.errors,
    llmCalls: graph.stats.llmCalls,
    promptTokens: graph.stats.promptTokens,
    completionTokens: graph.stats.completionTokens,
    totalTokens: graph.stats.totalTokens,
    buildMs: graph.stats.buildMs,
    output: 'graph/kestrel-graph.json'
  }, null, 2));

  if (graph.stats.errors > 0) {
    console.log('\nSome chunks failed. Inspect graph/kestrel-graph.json.');
  }
}

main().catch(error => {
  console.error('Graph build failed:', error.message);
  process.exit(1);
});
