# V4 Test Report

## Automated tests

Environment used for this archive check: Node.js 22.16.0.

| Check | Result |
|---|---|
| `node --check server.js` | PASS |
| `node --check public/app.js` | PASS |
| `node --check src/privacy.js` | PASS |
| `npm test` | PASS — 9 tests (existing RAG/retriever tests plus 2 privacy tests) |

## Privacy unit cases

1. Input containing `Jane Smith`, `jane@example.com`, and `+1 415 555 0134` is checked to ensure all three supported patterns are replaced.
2. Ordinary text without supported PII patterns is checked to remain unchanged.

## Manual acceptance checks — run with your own `.env`

These checks require a valid LLM provider key and must be run by the team on its machine:

1. Upload a TXT/Markdown file containing a test email, phone number and titled name. Confirm upload succeeds and returns a trace ID. Inspect the stored document to confirm the detected values were replaced.
2. Ask a question about the uploaded document. Confirm an answer and sources appear, then click **View trace details**. Confirm spans appear for redaction, loading, retrieval, LLM answer and suggestions.
3. Ask a contextual follow-up such as “And what about the second option?” Confirm the trace includes `conversation_rewrite` and the answer uses the prior turn.
4. Confirm suggested next questions appear and clicking one places it in the question box.
5. Click **New conversation**, ask a follow-up without context, and confirm it is treated as a new first turn.
6. Try an empty/too-short question and a corpus with no relevant content. Confirm the app gives a clear error or abstention rather than fabricating evidence.
7. Check `data/traces/traces.jsonl` and verify it contains no raw question, answer, chunk text, API key, or original personal-data test values.
8. Restart the app and confirm existing documents remain available and trace files remain local.

## Evidence not claimed

No live provider call, provider billing amount, or manual browser acceptance result is claimed by this report. Record the outcomes of the manual checks above before submission. If the provider does not return token usage, report it as unavailable rather than zero.
