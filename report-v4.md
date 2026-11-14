
# RAG V4 — Final Project Report

**Course:** AI Systems Integration and Operations — BCS S5, EPITA  
**Project:** RAG V4 — Final Release  
**Team members:** Lok Pradeep Tonny and BenjaminGERARD  
**GitHub repository:** https://github.com/BenjaminGERARD2006/rag-app-v1  
**Release branch:** `v4`  
**Git tag:** `final`

---

## 1. Project Overview

RAG V4 is the final release of the team's Retrieval-Augmented Generation (RAG) application. It builds on the previous version's document ingestion and retrieval pipeline and adds:

- **Part A — Observability:** request and indexing traces.
- **Part B — New feature:** Conversation Mode.
- **Part C — Responsible AI:** Personal Data Redaction.

The application runs locally and connects to an OpenAI-compatible LLM API. Provider settings and the API key are configured through environment variables in a local `.env` file. The `.env` file is excluded from version control.

## 2. Part A — Observability and Tracing

### Trace creation

The server creates a trace for question requests and document indexing requests. Each trace has a unique ID, timestamps, a status, and a collection of spans. Spans record processing steps, their status, duration, and relevant metadata.

Traces are stored locally as JSON Lines:

`data/traces/traces.jsonl`

The question and indexing endpoints return a `traceId`. The application provides a trace-details endpoint:

`GET /api/traces/:id`

The frontend uses the trace ID to request and display the trace associated with an answer.

### Privacy and retention

Trace metadata is designed to avoid storing API keys, full source documents, or raw personal data. Document and chunk identifiers or limited metadata are used where possible.

Trace files remain on the local machine and are excluded from Git. The current implementation does not enforce an automatic retention period; local trace files remain until manually deleted. Anyone with access to the local project files can read them.

### Metrics

A separate metrics dashboard is not included. The V4 assignment identifies this dashboard as optional.

## 3. Part B — Conversation Mode

Conversation Mode supports follow-up questions that depend on earlier turns in the conversation.

The intended processing flow is:

1. Receive the current question and conversation history.
2. Rewrite a context-dependent follow-up into a standalone retrieval query.
3. Retrieve relevant document chunks using the rewritten query.
4. Generate an answer using the retrieved context.
5. Suggest relevant next questions to help the user continue.

Conversation processing is part of the question request flow. Its processing steps are recorded in the request trace. LLM usage information is recorded when it is available from the provider.

The application validates incoming questions and returns an error response for invalid requests. Empty or invalid LLM outputs should be treated as failures rather than displayed as successful answers.

## 4. Part C — Responsible AI: Personal Data Redaction

The project includes a personal-data redaction module:

`src/privacy.js`

The module uses rule- and pattern-based detection to identify supported personal-data formats and replace them with redaction placeholders.

Redaction is applied to user questions and document text before relevant content is sent to the LLM. Uploaded document content is also redacted before it is saved. Trace metadata records redaction counts and detected categories rather than the original personal values.

This approach helps reduce accidental disclosure of common personal identifiers, including email addresses and phone numbers. Pattern-based detection has limitations: unusual formats may not be detected, and false positives are possible. It does not guarantee detection of every person's name or every type of personal information.

## 5. Installation and Execution

### Requirements

- Node.js
- npm
- An API key for the configured LLM provider

### Installation

```bash
npm install
```

Create a local `.env` file using `.env.example` as a reference. Configure the required LLM provider settings and API key. Never commit or share the `.env` file.

### Start the application

```bash
npm start
```

Open the application in a browser:

`http://localhost:3000`

### Run automated tests

```bash
npm test
```

## 6. Testing and Results

### Automated tests

The automated test suite was run during development.

| Test area | Result |
|---|---|
| Complete automated test suite | **9 passed, 0 failed** |
| Personal-data redaction | Covered by automated tests |
| Unchanged normal text | Covered by automated tests |
| Chunking and retrieval | Covered by automated tests |
| Tokenization | Covered by automated tests |
| BM25 and reciprocal-rank fusion (RRF) | Covered by automated tests |
| Concept-graph schema | Covered by automated tests |

### Application smoke test

The application was started locally and accessed through `http://localhost:3000`. A question was submitted against the Kestrel knowledge base:

> What discount do customers receive for annual billing?

The application returned an answer identifying the 15% annual-billing discount from the retrieved Kestrel content. This confirmed that the local application, retrieval flow, and LLM answer generation were working in that test.

### Trace UI verification

The trace implementation and API endpoint are present in the project. During the earlier UI check, the **Trace Details** control appeared disabled after an answer. Therefore, opening a trace from the answer in the UI was not confirmed in that check. This is an important verification limitation because one-click access to an answer's trace is a required Part A deliverable.

### Conversation and redaction verification

The project contains Conversation Mode processing and the personal-data redaction module, and the automated test suite passed. The available test record does not establish that every manual acceptance scenario—especially multi-turn conversation behavior, suggested follow-up questions, and redaction at both the outgoing LLM boundary and trace storage—was separately exercised end to end.

## 7. Design Decisions and Limitations

- **Local JSONL traces:** chosen as a lightweight storage approach for a local application. A hosted tracing service would add external dependencies and send telemetry outside the local environment.
- **Local retention:** traces are retained until manually deleted; automatic expiry is not implemented.
- **Pattern-based redaction:** chosen as a simple, inspectable approach. It is useful for common formats but cannot guarantee complete personal-data detection.
- **No metrics dashboard:** omitted because it is optional for the V4 release.
- **Trace UI:** the trace endpoint and frontend control are implemented, but the earlier manual check showed the control disabled. This should be resolved or demonstrated successfully before claiming the UI trace-access requirement is fully verified.

## 8. Conclusion

RAG V4 extends the existing RAG application with observability, Conversation Mode, and Personal Data Redaction. The automated test suite passed with **9 tests and no failures**, and a local Kestrel question-and-answer smoke test succeeded.

The main verification caveat is the Trace Details UI: it appeared disabled during the earlier manual check, so the required one-click trace inspection should not be represented as successfully demonstrated until it is confirmed in the running release. The report distinguishes implemented functionality and automated test coverage from manual behavior that has not been conclusively verified.

## 9. Submission Information

Submit the team repository link and the Git tag `final` by email, with the teammate(s) copied:

- **Repository:** https://github.com/BenjaminGERARD2006/rag-app-v1
- **Branch:** `v4`
- **Tag:** `final`
- **Team:** Lok Pradeep Tonny and BenjaminGERARD

