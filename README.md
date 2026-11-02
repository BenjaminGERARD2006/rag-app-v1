# Atlas RAG App V2

V2 builds on the V1 keyword-retrieval baseline and adds the provided Kestrel corpus, retrieval evaluation at k=1/3/5/10, configurable chunking comparisons, and Words Analytics. Retrieval remains BM25-style keyword search; this version does not claim to implement dense embeddings or a vector database.

## Setup (Node.js 18+)

```powershell
npm install
Copy-Item .env.example .env
notepad .env
npm test
npm start
```

Open http://localhost:3000. Configure `LLM_API_KEY`, `LLM_MODEL`, and optionally `LLM_BASE_URL` in `.env`. Never commit `.env`.

## Corpora

- **Kestrel KB** is included under `corpora/kestrel/docs/`; it is read-only and available from the corpus selector. Its 10 starter questions are in `eval/kestrel.questions.jsonl`.
- **Custom corpus** is included under `corpora/custom/docs/` and preloaded into `data/documents.json` for repeatable evaluation. The 12 custom questions are in `eval/custom.questions.jsonl`. To evaluate a different corpus, update the custom documents and question evidence together. Each answerable question should include the exact source filename and a short exact quote. Unanswerable questions use `"answerable": false` and an empty evidence list.

## Evaluation

From the frontend, open **Evaluation** and run two chunking configurations. Results are saved under `results/`. From the terminal, run:

```powershell
npm run evaluate
```

The evaluation computes Recall@1, @3, @5 and @10, overall and per question type. Unanswerable questions are excluded from retrieval recall. Keep question sets fixed when comparing configurations. The included custom question set is populated and can be used directly. If you change the custom corpus, review and update its evidence quotes before interpreting the results.

This automated metric checks whether a retrieved chunk matches the expected evidence source and contains the exact evidence quote. It is not an answer-quality score. The assignment also requires a no-context LLM test and manual answer grades (`correct`, `partial`, `wrong`, `unsupported`); record these in the saved results/report rather than inventing scores.

## Words Analytics

Select **Words Analytics** to inspect corpus vocabulary, occurrence counts, chunk counts, and word locations. Question mode checks which meaningful words in a question appear in the corpus and lists their source locations.

## Extra assignment route

The `/about` page displays the exact text requested by the assignment and is intentionally not linked from the frontend.

## Limitations

- Retrieval uses BM25-style keyword matching, so paraphrases and vocabulary mismatch can be missed.
- Word analytics tokenizes text and removes common stopwords; results are lexical, not semantic.
- Answer grading and no-context tests require actual human/provider runs.
- Evaluation results must be run locally and reviewed; no performance numbers are claimed in advance.
