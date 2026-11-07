
const fs = require('fs');
const path = require('path');

const GRAPH_FILE = path.join(__dirname, '..', 'graph', 'kestrel-graph.json');

const TYPES = {
  entity: [
    'Product', 'ErrorCode', 'Team', 'Service',
    'Policy', 'Feature', 'Person', 'System'
  ],
  relation: [
    'CAUSES', 'RESOLVED_BY', 'OWNED_BY', 'ROUTES_TO',
    'REQUIRES', 'APPLIES_TO', 'PART_OF',
    'ESCALATES_TO', 'RELATED_TO'
  ]
};

function validateTriple(t) {
  return Boolean(
    t &&
    typeof t.subject === 'string' &&
    t.subject.trim() &&
    typeof t.relation === 'string' &&
    TYPES.relation.includes(t.relation) &&
    typeof t.object === 'string' &&
    t.object.trim() &&
    typeof t.chunkId === 'string' &&
    typeof t.source === 'string'
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractChunk(chunk) {
  const key =
    process.env.GRAPH_API_KEY ||
    process.env.EMBEDDING_API_KEY ||
    process.env.LLM_API_KEY;

  const base = (
    process.env.GRAPH_API_BASE_URL ||
    process.env.EMBEDDING_BASE_URL ||
    'https://generativelanguage.googleapis.com/v1beta'
  ).replace(/\/$/, '');

  const model = process.env.GRAPH_MODEL || 'gemini-2.5-flash';

  if (!key) {
    throw new Error(
      'Graph extraction requires GRAPH_API_KEY or EMBEDDING_API_KEY.'
    );
  }

  const prompt = `
Extract explicit factual relationships from the supplied document chunk.

Return JSON only, using this exact structure:
{
  "triples": [
    {
      "subject": "entity name",
      "relation": "RELATION",
      "object": "entity name",
      "subjectType": "Product",
      "objectType": "Service"
    }
  ]
}

Allowed entity types:
${TYPES.entity.join(', ')}

Allowed relations:
${TYPES.relation.join(', ')}

Rules:
- Extract only facts explicitly supported by the text.
- Do not invent or infer relationships.
- Preserve exact product names, error codes, teams and policy details.
- Use only the allowed relation types.
- If there are no supported relationships, return {"triples": []}.
- Do not include explanations outside the JSON.

DOCUMENT CHUNK:
${chunk.text}
`;

  const url =
    `${base}/models/${model}:generateContent`;

  let response;
  let data;

  for (let attempt = 0; attempt < 5; attempt++) {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json'
        }
      })
    });

    data = await response.json().catch(() => ({}));

    if (response.ok) break;

    if (
      response.status !== 429 &&
      response.status !== 500 &&
      response.status !== 503
    ) {
      throw new Error(
        data?.error?.message ||
        `Gemini graph API returned HTTP ${response.status}`
      );
    }

    if (attempt === 4) {
      throw new Error(
        data?.error?.message ||
        'Gemini graph extraction failed after retries.'
      );
    }

    const retryInfo = data?.error?.details?.find(
      detail => detail['@type']?.includes('RetryInfo')
    );

    const retrySeconds = Number(
      String(retryInfo?.retryDelay || '').replace('s', '')
    );

    const waitMs =
      Number.isFinite(retrySeconds) && retrySeconds > 0
        ? retrySeconds * 1000 + 1000
        : 15000 * (attempt + 1);

    console.log(
      `Gemini graph rate limit/server error. Waiting ${Math.ceil(waitMs / 1000)} seconds...`
    );

    await sleep(waitMs);
  }

  if (!response || !response.ok) {
    throw new Error('Gemini graph extraction failed.');
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('') || '';

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned invalid graph JSON.');
  }

  const triples = (
    Array.isArray(parsed.triples) ? parsed.triples : []
  )
    .map(triple => ({
      ...triple,
      chunkId: chunk.id,
      source: chunk.source
    }))
    .filter(validateTriple);

  return {
    triples,
    usage: data.usageMetadata || null
  };
}

async function buildGraph(chunks) {
  const started = Date.now();

  const triples = [];
  const errors = [];

  let llmCalls = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let usageReported = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      llmCalls++;

      console.log(
        `Extracting graph: ${i + 1}/${chunks.length} — ${chunk.source}`
      );

      const result = await extractChunk(chunk);

      triples.push(...result.triples);

      if (result.usage) {
        usageReported++;

        promptTokens += Number(
          result.usage.promptTokenCount || 0
        );

        completionTokens += Number(
          result.usage.candidatesTokenCount || 0
        );

        totalTokens += Number(
          result.usage.totalTokenCount || 0
        );
      }
    } catch (error) {
      errors.push({
        chunkId: chunk.id,
        error: error.message
      });

      console.error(
        `Graph extraction failed for ${chunk.id}: ${error.message}`
      );
    }
  }

  const entities = new Set(
    triples.flatMap(t => [t.subject, t.object])
  );

  const graph = {
    schema: TYPES,
    generatedAt: new Date().toISOString(),
    chunkCount: chunks.length,
    triples,
    errors,
    stats: {
      triples: triples.length,
      entities: entities.size,
      relations: new Set(triples.map(t => t.relation)).size,
      errors: errors.length,
      llmCalls,
      buildMs: Date.now() - started,
      usageReported,
      promptTokens,
      completionTokens,
      totalTokens
    }
  };

  fs.mkdirSync(path.dirname(GRAPH_FILE), {
    recursive: true
  });

  fs.writeFileSync(
    GRAPH_FILE,
    JSON.stringify(graph, null, 2)
  );

  return graph;
}

function loadGraph() {
  return JSON.parse(
    fs.readFileSync(GRAPH_FILE, 'utf8')
  );
}

function graphSearch(question, chunks, topK = 10) {
  if (!fs.existsSync(GRAPH_FILE)) {
    throw new Error('Concept graph has not been built.');
  }

  const graph = loadGraph();

  const terms = new Set(
    question.toLowerCase().match(/[\p{L}\p{N}-]+/gu) || []
  );

  const matched = graph.triples.filter(triple =>
    [triple.subject, triple.object, triple.relation]
      .some(value => terms.has(String(value).toLowerCase()))
  );

  const counts = new Map();

  for (const triple of matched) {
    counts.set(
      triple.chunkId,
      (counts.get(triple.chunkId) || 0) + 1
    );
  }

  return [...counts]
    .map(([id, score]) => {
      const chunk = chunks.find(item => item.id === id);

      return chunk
        ? {
            ...chunk,
            score,
            retriever: 'graph',
            matchedTriples: matched.filter(
              triple => triple.chunkId === id
            )
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = {
  buildGraph,
  loadGraph,
  graphSearch,
  validateTriple,
  TYPES,
  GRAPH_FILE
};
