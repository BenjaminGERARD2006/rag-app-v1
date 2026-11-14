# V4 Decision Log — Atlas RAG

## Team and selected features

Team: Lok Pradeep Tonny and Hetvi Fadadu.

- Part A: local JSON Lines traces.
- Part B: Conversation Mode.
- Part C: Personal Data Redaction.

## A — Observability decisions

**What is traced?** Each `/api/ask` request has a trace with spans for validation/privacy redaction, document loading, conversation rewriting (or an explicit skipped span on the first turn), retrieval, answer generation, and follow-up suggestions. Each document indexing attempt that reaches the upload handler records validation, normalization/redaction, save, and chunking spans. Spans include status, duration, relevant counts, model, token usage, cost estimate when configured, and retrieved chunk IDs.

**What is deliberately excluded?** API keys, raw questions, raw answers, whole documents, and chunk text. Trace records include chunk IDs and aggregate redaction metadata only. Error messages from the provider are stored as a short error description; inspect this before sharing logs externally.

**Storage and retention.** Traces are appended to `data/traces/traces.jsonl` on the local machine. Retention is indefinite until the operator deletes the file. No hosted observability service is used.

**Access and data location.** The trace file is local. The `/api/traces/:id` endpoint is unauthenticated and intended for a single-user local application; anyone who can access the local app can request trace details. The traces themselves do not leave the machine through this application. Questions and retrieved context are sent to the configured LLM provider after local redaction.

**Metrics.** No separate metrics dashboard is implemented; it is optional in the assignment. Durations and token counts are stored on spans and can be aggregated from JSONL. Estimated cost is calculated only when `LLM_INPUT_COST_PER_1M` and `LLM_OUTPUT_COST_PER_1M` are configured, using provider prices supplied by the operator. Without rates, cost is `null`.

**Alternatives considered.** Langfuse/Phoenix would provide richer hosted or self-hosted dashboards, but were rejected to avoid extra services, credentials, network dependencies, and setup risk for a single-user laptop app. SQLite was considered; JSONL was selected because it is simple to inspect, append, back up, and delete.

## B — Conversation Mode decisions

The browser keeps the last few user/assistant turns in memory for the current page session. When a follow-up arrives, the backend makes an additional LLM call to rewrite it as a standalone search question before retrieval. The answer is generated using that rewritten question and retrieved context. A further LLM call proposes up to three follow-up questions based on retrieved context. The trace records rewrite, answer, and suggestion calls separately, including available token usage and latency. If suggestions fail or return invalid JSON, the answer is still returned and the suggestions area remains empty. Starting a new conversation clears the browser history.

## C — Personal Data Redaction decisions

Detection is local and rule-based. Regular expressions detect email addresses, phone-like number strings, and common full-name patterns (including honorific-prefixed names). Detected values are replaced with typed numbered placeholders before custom uploads are saved, before question/history/context is sent to the LLM, and before data can be represented in traces. This avoids sending detected values to the provider and avoids retaining them in trace records.

This is not perfect anonymisation. Names in unusual formats, non-Latin names, addresses, dates of birth, and other identifiers may be missed; ordinary capitalised phrases may be false positives. Existing previously uploaded custom documents are not retroactively rewritten; re-upload them to apply at-rest redaction. This limitation is disclosed in the README.

## Known limitations

- Conversation history exists only in the current browser page session; refreshing the page starts a new conversation.
- Regex redaction is intentionally lightweight and does not guarantee detection of every personal-data category.
- The local trace endpoint has no authentication; use only on a trusted local machine.
- Provider usage metadata may be absent. Cost is not guessed when actual rates are not configured.
