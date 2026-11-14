# Atlas RAG App — V4

V4 builds on the V3 hybrid retrieval project and adds the three required final-release elements:

- **A — Observability:** every `/api/ask` request and every successful/handled document indexing attempt creates a local trace. The answer UI has a **View trace details** control.
- **B — Conversation Mode:** follow-up questions are rewritten into standalone retrieval questions using recent conversation turns. The app suggests up to three next questions grounded in retrieved passages. Use **New conversation** to clear the browser-session history.
- **C — Personal Data Redaction:** email addresses, phone-like number strings, and recognisable full names (including titles such as Dr/Ms) are replaced before uploaded text is stored, before questions/context/history are sent to the LLM, and before any trace is written.

## Requirements

- Node.js 18 or newer
- An OpenAI-compatible chat-completions provider and API key

## Install and run (macOS)

1. Open Terminal and go to the project folder:

   ```bash
   cd ~/Downloads/RAG_App_V3
   ```

   If you extracted the ZIP somewhere else, change this path to that folder.

2. Install packages:

   ```bash
   npm install
   ```

3. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

4. Open `.env` in VS Code and set your provider values:

   ```dotenv
   LLM_API_KEY=your_real_key
   LLM_MODEL=your_provider_model
   LLM_BASE_URL=https://api.groq.com/openai/v1
   ```

   Use the base URL supplied by your provider. Do not include `/chat/completions` at the end. Keep `.env` private; never commit it.

5. Check syntax and run tests:

   ```bash
   node --check server.js
   node --check public/app.js
   npm test
   ```

6. Start the app:

   ```bash
   npm start
   ```

7. Open `http://localhost:3000` in your browser. Stop the server with `Control+C`.

## How to use V4

1. Select the Kestrel knowledge base or your custom corpus.
2. Add TXT or Markdown files (maximum 8 MB per file) to the custom corpus.
3. Ask a question. Ask a follow-up such as “And what about the Business plan?” to exercise Conversation Mode.
4. Click **View trace details** below the answer to inspect the request's spans, retrieval chunk IDs, token usage, model and latency.
5. Click one of the suggested follow-up questions, or press **New conversation** to start fresh.

Conversation history is held in browser memory only. It is not persisted to disk. The backend receives the most recent turns needed for follow-up rewriting.

## Redaction method and limitations

The privacy layer uses local regular expressions; no third-party PII service is called. It detects email addresses, phone-like number sequences, and personal names matching common two-word capitalised-name patterns or honorific-prefixed names. Replacements use labels such as `[REDACTED_EMAIL_1]`. Redaction occurs on uploaded custom documents before saving, on question/history/context before the LLM request, and trace records contain only operational metadata and chunk IDs.

This is a practical baseline, not a guarantee of complete anonymisation. It can miss unusual names, non-Latin names, addresses, dates of birth, account identifiers, or obfuscated data, and may occasionally redact ordinary capitalised phrases. Review sensitive corpora before using an external LLM. Existing documents already stored before V4 should be re-uploaded if you need the new at-rest redaction applied to them.

## Traces and privacy

Traces are appended as JSON Lines to `data/traces/traces.jsonl`. They remain on this machine until manually deleted. The app has no authentication; anyone with access to the running local app can read traces through `/api/traces/:id`. Traces do not contain raw questions, answers, source text, API keys, or whole documents. They include timing, outcomes, model/token metadata, redaction counts/types, and retrieved chunk IDs. LLM requests still leave the machine and are sent to the configured provider after redaction.

If token rates are known, set optional rates in `.env` (USD per million tokens) to calculate estimated call cost in traces:

```dotenv
LLM_INPUT_COST_PER_1M=0
LLM_OUTPUT_COST_PER_1M=0
```

Use the provider's actual current rates. If omitted, estimated cost is `null`, not zero.

## Existing V2/V3 functionality

The V2 evaluation, words analytics, BM25 and V3 hybrid retrieval / concept graph routes remain in the project. The V3 graph can be rebuilt with:

```bash
npm run build:graph
```

The V3 evaluation can be run with:

```bash
npm run evaluate:v3
```

The custom-corpus evaluation still requires team-authored documents and evidence questions; do not report placeholder evaluation data as results.

## Submission checklist

- [ ] Configure `.env` locally and keep it out of Git.
- [ ] Run `npm test` and the manual checks listed in `V4_TEST_REPORT.md`.
- [ ] Confirm the trace button works after a question and after a document upload (the upload response includes a trace ID).
- [ ] Commit the finished project and create/push the Git tag `final`.
- [ ] Email the team GitHub repository link and tag `final` before the deadline; CC the teammate(s).
