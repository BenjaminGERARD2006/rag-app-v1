# RAG Project V3 — Report (working draft)

> Complete the team/member and human-assessment sections in your own words before submission. Measured values below are taken from the V3 evaluation output pasted by the student in this conversation. They are not a substitute for rerunning the final packaged code and retaining its JSON output.

## Team Members and Contributions

| Benjamin Gérard | Project coordination, RAG pipeline integration, dense retrieval and BM25 implementation, hybrid retrieval, Git management, and final project delivery. |
| Lok Pradeep Tonny | Concept Graph implementation, entity and relation extraction, and graph retrieval integration. |
| Hetvi Fadadu | Evaluation and testing, retrieval performance analysis, documentation, and report preparation. |

## Implementation

V3 contains:
- Dense retrieval through an embeddings API. Gemini native `batchEmbedContents` is supported for models whose name begins with `gemini`; other providers use an OpenAI-compatible `/embeddings` endpoint.
- A separate BM25 retriever.
- Reciprocal Rank Fusion (RRF), default constant c=60, with per-result `foundBy` retriever and rank information.
- A Kestrel Concept Graph with a fixed entity/relation schema, JSON output validation, and source/chunk provenance.
- A graph build command (`npm run build:graph`) and V3 evaluation command (`npm run evaluate:v3`).
- UI retriever switches and a graph-build action in the Evaluation tab.

## Evaluation protocol and metric definitions

Chunking for V3's Kestrel evaluation is 180 words with 35 words overlap. The Kestrel set contains the original q01–q10 and adds q11–q12 as two-hop questions; q08 is also two-hop. The evaluator uses exact evidence-quote containment in retrieved chunks.

- HitRate@k: fraction of answerable questions for which at least one evidence quote appears in the top k.
- Evidence Recall@k: fraction of all answer evidence quotes found in the top k, aggregated over answerable questions.
- Unanswerable questions are excluded from these retrieval metrics.

The evaluator records results overall and by question type. The two metrics are not answer-generation accuracy.

## Kestrel results previously observed

The student reported the following output from `npm run evaluate:v3` before the latest evaluator/report refinements. That run contained eight answerable Kestrel questions (q01–q08) and two unanswerable questions (q09–q10). The output labelled its metric Recall@k and used question-level evidence-hit scoring.

| Configuration | Recall@1 | Recall@3 | Recall@5 | Recall@10 |
|---|---:|---:|---:|---:|
| Dense only | 87.5% | 87.5% | 100% | 100% |
| Dense + BM25 | 62.5% | 87.5% | 100% | 100% |
| Dense + BM25 + Graph | 62.5% | 87.5% | 100% | 100% |

Interpretation of that run: dense-only performed best at rank 1. Adding BM25 reduced Recall@1 by 25 percentage points; adding graph did not change the dense+BM25 aggregate scores. All configurations reached 100% by rank 5. This does not show a measurable aggregate gain from BM25 or graph in that run. It does not establish whether graph chunks entered the fused top-k; inspect the new per-result `foundBy` output to answer that.

**Important comparability note:** q11 and q12 were added after the reported run. The final evaluator also separates HitRate from evidence-level Recall. Rerun the packaged code after building the graph; use that new result file for final V3 tables and do not mix its metrics with the earlier eight-question result.

## Custom corpus

No custom corpus documents were present in the supplied project ZIP (`data/documents.json` was absent), and the ten custom question entries were placeholders. Therefore custom corpus results are not available and are deliberately marked skipped. Add the team's own corpus and ten evidence-grounded questions, then rerun evaluation. Do not claim custom performance until those measurements exist.

## Concept Graph extraction and quality

The graph builder processes the same Kestrel 180/35 chunks as evaluation. It validates relation types and requires each accepted triple to include `chunkId` and `source`. Per-chunk extraction errors are retained.

The graph JSON build stats record attempted LLM calls, build elapsed milliseconds, entities, distinct relations, triples, and token usage when returned by the provider. The current provider adapter requests JSON output; actual provider usage metadata may be absent. If token usage is not returned, report it as unavailable rather than zero cost.

- Actual graph build stats: [run `npm run build:graph` and copy stats]
- Ten manually graded triples (correct / wrong / unsupported): [inspect graph/kestrel-graph.json and grade ten sampled triples]
- Correct entity resolution example: [complete from actual graph]
- Incorrect or missed entity resolution example: [complete from actual graph]
- Provider/model, token usage, latency and monetary cost: [record actual run and provider pricing]

The current implementation performs conservative exact-name matching; it does not implement fuzzy alias merging. Do not claim a fuzzy entity-resolution merge feature.

## Question-level analysis and misses

The earlier aggregate output suggests a rank-1 regression when BM25 is added. Identify the affected question IDs by comparing the detailed retrieval outputs from the final run. For each regression, inspect the expected quote, retrieved passages and `foundBy` ranks. A graph contribution claim must be supported by graph-attributed chunks in the fused results.

- Question worsened by BM25: [identify from final JSON]
- Explanation: [ground in retrieved ranks and text]
- Graph-attributed chunks in top 1/3/5/10: [measure from final JSON]

## No-context answer test and answer grading

These are human/provider-dependent checks and were not included in the uploaded archive:
- No-context test results: [run the same questions without retrieved context and record correct / partial / wrong / abstained]
- Manual answer grades for the selected best configuration: [correct / partial / wrong / unsupported, with question IDs]

Do not invent these grades.

## Limitations and known failures

- Custom corpus and custom questions are not present in the supplied archive.
- The earlier evaluation predates q11 and q12 and must be rerun for final results.
- Dense retrieval requires an external embedding provider and can be rate-limited; document vectors are cached in memory for a single Node process, not persisted between runs.
- Graph extraction depends on LLM structured output. Failed chunks are recorded, and graph quality still needs manual grading.
- Exact evidence quote matching is sensitive to quote length and chunk boundaries; it measures evidence retrieval, not answer correctness.
- Graph retrieval uses lexical token overlap with entity/relation strings; it is a simple baseline, not a multi-hop graph traversal engine.

## Final conclusion

In the earlier observed Kestrel run, dense-only was the strongest rank-1 configuration and all configurations reached full evidence-hit coverage by rank 5. The addition of BM25 and the graph did not improve aggregate results in that run. The final conclusion must be updated after rerunning with q11 and q12 and reviewing per-question provenance, graph quality and custom-corpus results.
