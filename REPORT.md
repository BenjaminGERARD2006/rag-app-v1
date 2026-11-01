# RAG App V1 — Report

## Team details
- Team / group: **[fill in]**
- Members: **[fill in names]**
- Contribution split: **[fill in who did ingestion, retrieval, UI, testing, evaluation, documentation]**

## Scope and pipeline
V1 accepts `.txt` and `.md` documents, stores their text locally, chunks them with configurable word-window size and overlap, ranks chunks with a BM25-style lexical retriever, and sends the top-k passages to a configured OpenAI-compatible chat-completions endpoint. The UI lets users add/remove documents, select which documents are in scope, tune chunk size/overlap/top-k, and inspect retrieved passages. Each source card can open the corresponding chunk.

## Decision log
| Decision | Options considered | V1 choice | Reason / trade-off |
|---|---|---|---|
| Input formats | PDF, TXT, Markdown | TXT and Markdown only | Matches the C6 V1 scope and avoids OCR/PDF extraction edge cases. |
| Retrieval | Keyword/BM25-style, dense embeddings + vector database | BM25-style lexical baseline | Keeps V1 simple and reproducible without a separate embedding service. Semantic paraphrases may be missed; this is a known gap versus a dense-embedding implementation. |
| Chunking | Fixed or configurable windows | Configurable word windows with overlap | Allows controlled comparison of chunk size and overlap. |
| Chat model | Provider-specific SDK or OpenAI-compatible API | OpenAI-compatible chat completions | Provider can be changed via environment variables. |
| Persistence | Database or local file | Local JSON file | Minimal baseline; not suitable for concurrent/multi-user production use. |
| Citations | Free-form citations or source metadata | Source labels plus document/chunk IDs | Gives the user a visible retrieval trace and a way to open the exact chunk. |
| Evaluation | Manual-only or repeatable question set | `data/evaluation-questions.json` and `/api/evaluation` | Provides a repeatable Recall@4 check for answerable questions. Replace the sample entries with corpus-specific questions before reporting results. |

**Important:** C6 discusses a separate embedding model and vector database. This V1 deliberately retains lexical retrieval and therefore does **not** satisfy a dense-embedding/vector-database implementation. If the instructor expects that architecture already in V1, replace the retriever and record the actual embedding model/vector store used; do not describe this version as vector search.

## Evaluation protocol
1. Upload the same corpus each time.
2. Replace the example cases in `data/evaluation-questions.json` with questions grounded in that corpus. Include answerable questions, hard/paraphrased questions, and at least one unanswerable question.
3. For each answerable case, fill `expectedSource` with the exact uploaded filename and `expectedContains` with a phrase expected in the correct passage.
4. Visit `/api/evaluation` to obtain Recall@4 over the answerable cases and inspect per-question retrieved passages.
5. Record the corpus, chunk settings, top-k, model, and date when comparing V1 to V2. The endpoint uses default chunking and top-k=4, so keep the same baseline configuration when comparing versions.

## Known failures and limitations
| Reproduction | Expected observation / limitation |
|---|---|
| Ask using a paraphrase that shares few words with the source | Lexical retrieval may miss the correct passage. |
| Ask a question absent from the corpus | The app may retrieve weakly related passages; the LLM may still answer incorrectly despite the grounding prompt. Verify abstention manually. |
| Upload a file other than `.txt` or `.md` | The API rejects it with HTTP 400. |
| Ask before configuring `LLM_API_KEY` and `LLM_MODEL` | The API returns HTTP 503 with setup instructions. |
| Use an invalid or unavailable model/API key | The provider error is returned as HTTP 502. |
| Return an empty or malformed chat response | The app rejects it before returning an answer to the UI. |
| Delete a document while viewing an old result | The source may no longer be available when clicked; the UI displays an error. |
| Run evaluation with untouched template questions | Results are not meaningful until filenames and expected phrases are replaced with entries matching the actual corpus. |

## Versioning checklist
- [ ] Fill in team members and actual contributions.
- [ ] Replace evaluation template cases with a corpus-specific question set.
- [ ] Run `npm test` and manually test upload, delete, selection, asking, and source opening.
- [ ] Record measured evaluation results and any observed failures above.
- [ ] Commit the project and tag the final V1 commit as `v1`.
