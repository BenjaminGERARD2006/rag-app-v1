# V3 Decision Log

| Decision | Current implementation | Rationale and trade-off |
|---|---|---|
| Dense retrieval | Gemini native embedding API when `EMBEDDING_MODEL` starts with `gemini`; OpenAI-compatible endpoint otherwise | Supports the configured provider. Document vectors are cached in memory for the lifetime of one process; no persistent vector index. |
| BM25 | Separate BM25 implementation in `src/retrievers.js` | Independently switchable lexical retriever; sensitive to vocabulary mismatch and tokenization. |
| Fusion | Reciprocal Rank Fusion, c=60 | Combines rank lists without mixing raw score scales; `foundBy` records each contributing retriever and its rank. |
| Graph schema | Fixed entity and relation vocabularies in `src/concept-graph.js` | Validation rejects unsupported relation labels and triples without provenance; schema can omit useful relations. |
| Graph provenance | Every accepted triple includes `source` and `chunkId` | Enables source auditing and chunk-level retrieval. |
| Entity resolution | Conservative exact-name overlap; no fuzzy alias merge implementation | Avoids speculative merges but misses spelling variants and aliases. |
| Graph build | One LLM extraction call per Kestrel chunk, sequentially | Easy to audit; can be slow and consume quota. Build stats record calls/time and provider token usage if returned. |
| Evaluation | Fixed Kestrel questions plus two new two-hop questions; HitRate and evidence Recall at k=1,3,5,10 | HitRate is question-level; evidence Recall is quote-level. Neither measures generated answer correctness. |

## Observed evidence from the student's earlier run

The earlier reported Kestrel results (before q11/q12 and before the updated metric definitions) were:

- Dense only: Recall@1 87.5%, @3 87.5%, @5 100%, @10 100%.
- Dense + BM25: 62.5%, 87.5%, 100%, 100%.
- Dense + BM25 + graph: 62.5%, 87.5%, 100%, 100%.

Dense-only was strongest at rank 1 in that run. Graph did not change the aggregate dense+BM25 scores. Rerun the final packaged evaluator before using final submission tables.

## Known limitations / outstanding human work

- The supplied archive contains no custom corpus file (`data/documents.json`) and the ten custom questions are placeholders. Custom evaluation is skipped until the student's actual corpus/questions are supplied.
- Graph extraction and evaluation require the user's local provider credentials; `.env` is intentionally excluded.
- Manually grade ten actual extracted graph triples as correct, wrong, or unsupported. Include a correct and incorrect/missed entity-resolution example based on actual observed data.
- Record no-context LLM test and manual answer grades.
- Determine actual monetary cost from returned usage and the provider's current pricing. If usage metadata is absent, token cost is unavailable.
- Review final per-question JSON to identify regressions and count graph-attributed chunks after fusion.
- The graph retriever is lexical matching over graph triple terms, not a full multi-hop graph traversal.
