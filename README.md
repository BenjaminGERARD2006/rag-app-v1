# Atlas RAG App — V3

V3 adds three independently switchable retrieval methods: dense embeddings, BM25, and a Kestrel-only Concept Graph. Enabled retrievers are combined with Reciprocal Rank Fusion (RRF); results retain `foundBy` provenance with each retriever's rank.

## Requirements and setup

- Node.js 18+
- An LLM chat-completions provider for answer generation and graph extraction
- An embeddings provider for dense retrieval

```powershell
npm install
Copy-Item .env.example .env
notepad .env
npm test
npm start
```

Configure `.env` locally. Never commit or upload it:
- `LLM_API_KEY` and `LLM_MODEL` for chat and graph extraction.
- `LLM_BASE_URL` if using a non-default OpenAI-compatible chat endpoint.
- `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`, and `EMBEDDING_BASE_URL` for embeddings.
- Gemini native embeddings are supported when `EMBEDDING_MODEL` starts with `gemini`; the default base URL is Google's Generative Language API. Other providers use an OpenAI-compatible `/embeddings` endpoint.

## Build the Kestrel Concept Graph

The graph is built from the same Kestrel source documents and 180/35 word chunking as the V3 evaluator, so graph provenance IDs match the evaluation chunks.

```powershell
npm run build:graph
```

This writes `graph/kestrel-graph.json`. The build summary reports chunk count, triples, entities, relations, extraction errors, attempted LLM calls, elapsed time, and token usage when the provider returns usage metadata. A provider that omits usage metadata will leave token totals at zero; do not interpret that as zero tokens consumed.

Graph extraction is sequential and can take time or consume provider quota. Failed chunks are recorded in the graph file under `errors`.

## Run V3 evaluation

```powershell
npm run evaluate:v3
```

The script runs:
- Kestrel: dense only, dense + BM25, dense + BM25 + graph.
- Custom corpus: dense only and dense + BM25, only when actual documents exist in `data/documents.json`.

The script writes a timestamped JSON file under `results/`. It reports HitRate@k and evidence Recall@k for k=1, 3, 5, 10, overall and by question type. HitRate is the fraction of answerable questions with at least one evidence quote found; evidence Recall is the fraction of evidence quotes found across answerable questions. Unanswerable questions are excluded from these retrieval metrics.

The Kestrel question set retains its original ten questions and adds two `two_hop` questions (q11 and q12); q08 is also two-hop. Evidence quotes must be exact source text.

## UI

Open `http://localhost:3000`. The Evaluation tab contains:
- V2 chunking evaluation.
- V3 retriever checkboxes for dense, BM25, and graph.
- A graph-build action.
- Fused result passages with `foundBy` retriever/rank provenance and graph triples where available.

The `/bm25` route remains separate and is not linked from the main navigation. `/about` remains available at `/about`.

## Custom corpus is intentionally not fabricated

This archive does not contain a team-authored custom corpus: `data/documents.json` is absent, and `eval/custom.questions.jsonl` still contains ten placeholders. Add your own source documents and replace those placeholders with questions and exact evidence quotes from those documents before reporting custom-corpus results. The evaluator explicitly skips the custom runs when the corpus is absent rather than presenting misleading null scores as measured performance.

## What still requires human/provider evidence

The software cannot truthfully invent or complete:
- The actual custom corpus and its evidence-anchored questions.
- Manual no-context answer grades.
- Manual grading of ten actual extracted graph triples (correct / wrong / unsupported), plus a documented entity merge that is correct and one that is wrong or missed.
- Provider billing cost. The graph records LLM calls, elapsed build time, and token usage only when returned by the provider. Convert tokens to cost using the actual provider/model pricing at the time of the run.
- A final discussion of question-level regressions and graph contribution based on the newly generated result JSON.

See `REPORT.md`, `DECISION_LOG_V3.md`, and `CUSTOM_CORPUS_REQUIRED.md`.
