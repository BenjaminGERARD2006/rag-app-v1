# RAG App V1

A first-version document-grounded question-answering web app. It supports `.txt` and `.md` files, configurable chunking, document selection, BM25-style lexical retrieval, and answers generated from retrieved context through an OpenAI-compatible chat-completions API.

## Features
- Add and remove `.txt` and `.md` documents (8 MB maximum per file).
- Select the documents included in each question.
- Configure chunk size (40–500 words), overlap, and top-k (1–8) in the UI.
- Inspect the retrieved sources and click a source card to open the exact chunk.
- Validate the LLM response shape before returning it to the UI; anticipated errors return readable messages.
- Run a repeatable retrieval evaluation using `data/evaluation-questions.json` and `GET /api/evaluation`.
- Store document text locally in `data/documents.json`.

## Requirements and setup
- Node.js 18 or newer.
- An API key and model name for an OpenAI-compatible chat-completions provider.

Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
notepad .env
npm test
npm start
```

Configure `.env` with your actual provider values:

```dotenv
LLM_API_KEY=your_real_api_key
LLM_MODEL=your_provider_model_name
LLM_BASE_URL=https://api.groq.com/openai/v1
PORT=3000
```

Open http://localhost:3000. Never commit `.env` or upload confidential documents to an unapproved provider.

## Architecture
1. **Ingestion:** validate and read `.txt` / `.md` files.
2. **Chunking:** split documents into overlapping word windows; size and overlap can be changed per question.
3. **Retrieval:** BM25-style lexical ranking selects up to top-k chunks from selected documents.
4. **Augmentation and generation:** retrieved text is supplied to the configured chat model with instructions to answer from context only and cite source labels.
5. **Validation and presentation:** validate that the provider returned a non-empty bounded string, then display the answer, retrieval scores, source excerpts, and clickable chunk references.
6. **Evaluation:** `/api/evaluation` compares retrieved top-4 chunks with expected source filename and optional expected phrase from `data/evaluation-questions.json`.

## Evaluation setup
Edit `data/evaluation-questions.json` before using the metric. Use questions that match your own uploaded corpus, include hard/paraphrased questions and unanswerable questions, and specify the exact source filename and an expected phrase for each answerable case. The endpoint reports Recall@4 for answerable cases; unanswerable questions are listed separately and are not included in that metric. This is retrieval evaluation, not a full answer-quality score.

## Important V1 limitation
This implementation uses **BM25-style lexical retrieval**, not dense embeddings or a vector database. It may miss semantic paraphrases, and retrieval may return weakly related passages for questions with no answer in the corpus. C6 describes embeddings/vector search as a design topic; if the assignment requires those components in V1, the retrieval layer must be replaced and the actual embedding model and vector store documented.

See [`REPORT.md`](REPORT.md) for the decision log, evaluation protocol, known failures, and submission checklist.
