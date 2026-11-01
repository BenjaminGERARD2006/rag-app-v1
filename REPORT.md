# RAG App V1 — Project Report

## 1. Project Overview

### Objective

The objective of this project is to develop a web application that allows users to ask questions about a collection of documents and receive answers grounded in the available information.

The application provides a document management interface, a question-answering workflow, configurable retrieval settings, and references to relevant document passages.

Version 1 establishes a functional baseline that can be evaluated and improved in subsequent versions.

### Scope

The V1 implementation focuses on:
- Uploading and managing supported text documents.
- Splitting documents into smaller chunks for retrieval.
- Retrieving relevant passages based on a user's question.
- Generating answers using an LLM.
- Displaying supporting references.
- Providing configurable retrieval parameters.
- Handling common input and application errors.
- Establishing a baseline for testing and future improvements.

## 3. System Architecture

The application follows a retrieval-augmented generation (RAG) workflow.

### 3.1 Document ingestion

Users upload documents through the web interface. The application extracts their text and makes the content available for processing.

### 3.2 Text chunking

Documents are divided into smaller text chunks. Chunking allows the retrieval system to identify relevant portions of a document instead of passing an entire document to the language model.

The chunking implementation supports overlapping chunks so that information near chunk boundaries is less likely to be lost.

### 3.3 Retrieval

When a user asks a question, the application searches the available chunks and ranks them according to their relevance.

The current implementation uses BM25-style keyword retrieval. It does not yet use dense vector embeddings or a dedicated vector database.

### 3.4 Answer generation

The retrieved passages are used as context for the language model. The model is asked to produce an answer based on the available information.

The quality of the answer depends on both the relevance of the retrieved passages and the model's ability to follow the instructions.

### 3.5 References

Retrieved passages are presented as references so that users can inspect the supporting text and check whether an answer is justified by the source material.

### 3.6 High-level workflow

1. The user uploads and selects documents.
2. The application extracts and chunks the document text.
3. The user submits a question.
4. The retrieval system ranks relevant chunks.
5. The application sends the question and retrieved context to the LLM.
6. The response is processed and displayed with supporting references.

## 4. Technology Choices and Decision Log

The following decisions describe the current implementation. Any additional team decisions should be recorded based on what was actually discussed and implemented.

### 4.1 Web application

**Decision:** Use a web interface connected to a Node.js server.

**Rationale:** This provides a straightforward way to manage documents, submit questions, configure retrieval parameters, and display answers in one application.

### 4.2 Document storage

**Decision:** Store document information and extracted content locally.

**Rationale:** Local storage keeps the V1 architecture simple and suitable for a small coursework prototype.

**Trade-off:** This approach is not intended to provide the scalability, concurrency, or operational reliability of a production document platform.

### 4.3 Chunking

**Decision:** Split documents into overlapping text chunks.

**Rationale:** Smaller passages make retrieval more focused and help limit the amount of context passed to the language model.

**Trade-off:** Fixed chunking strategies can split related information across boundaries or produce chunks that lack sufficient context.

### 4.4 Retrieval

**Decision:** Use BM25-style keyword retrieval for V1.

**Rationale:** Keyword retrieval provides a relatively simple baseline that can be tested and improved without introducing an embedding model or vector database.

**Trade-off:** Keyword retrieval may fail to identify semantically relevant passages when a question uses synonyms, paraphrases, or terminology that differs from the source document.

Dense embeddings and vector-based retrieval are potential improvements for a later version.

### 4.5 Language model

**Decision:** Use an LLM through an API configured using environment variables.

**Rationale:** An external language model provides natural-language answer generation without requiring the team to run a large generative model locally.

**Trade-off:** The application depends on network availability, provider availability, valid credentials, and any applicable API limits or costs.

### 4.6 User interface

**Decision:** Provide a web interface for document management, question submission, retrieval configuration, and reference inspection.

**Rationale:** A graphical interface makes the application easier to demonstrate and evaluate than a command-line workflow alone.

## 5. Evaluation Strategy

The purpose of evaluation is to establish a repeatable baseline for comparing future versions of the application.

### 5.1 Evaluation questions

The evaluation dataset should contain questions based on the selected document corpus.

It should include:
- Questions with clearly stated answers.
- Questions requiring information from specific passages.
- Questions using paraphrased wording.
- Questions requiring information from multiple passages, where appropriate.
- Questions whose answers are absent from the corpus.

Each evaluation question should record its expected answer and the source document or passage containing the relevant information. Unanswerable questions should be explicitly identified.

### 5.2 Retrieval evaluation

The main retrieval objective is to determine whether the system retrieves the passage containing the expected answer.

A useful metric is **Recall@k**, defined as the proportion of answerable evaluation questions for which at least one relevant passage appears among the top *k* retrieved passages.

For example, Recall@5 measures how often a relevant passage appears in the five highest-ranked results.

\[
\text{Recall@k} =
\frac{\text{Questions with a relevant passage in top k}}
{\text{Total answerable evaluation questions}}
\]

The value of *k* should be recorded and kept consistent when comparing versions.

### 5.3 Answer quality

Retrieval success does not guarantee a correct answer. Answers should also be checked for:
- Factual consistency with the source passages.
- Whether important information is omitted.
- Whether the references support the claims made.
- Whether the application handles unanswerable questions appropriately.

### 5.4 Results

Record actual measurements after running the evaluation. Do not report estimated or assumed results as measured performance.

| Metric | Result |
|---|---|
| Number of evaluation questions | [Measured value] |
| Number of answerable questions | [Measured value] |
| Retrieval metric and k | [For example, Recall@5] |
| Retrieval score | [Measured value] |
| Unanswerable questions tested | [Measured value] |
| Evaluation date | [Date] |

**Evaluation observations:** [Summarize the actual results, representative successes, and failures.]

## 6. Testing

The project includes automated tests for core retrieval behavior.

The current test suite covers:
- Overlapping chunks produced by the chunking function.
- Ranking relevant chunks above unrelated chunks.
- Safe handling of empty or stopword-only input.

The reported baseline test run completed with three passing tests and zero failures.

These tests validate selected core behaviors. They do not establish that the complete application works under every condition or that the generated answers are always correct.

Additional testing should cover:
- Document upload and deletion.
- Empty, malformed, or unsupported inputs.
- Questions with no relevant passages.
- LLM API failures and invalid credentials.
- Missing or malformed model responses.
- Correctness of displayed references.
- Repeatability of the evaluation dataset.

## 7. Known Failures and Limitations

V1 is a baseline implementation and has several limitations that should be considered when interpreting its results.

### 7.1 Keyword-based retrieval

**Scenario:** A document contains the phrase "vehicle speed," but the user asks about "how fast the car was travelling."

**Potential observation:** The retrieval system may fail to identify the relevant passage if there is insufficient keyword overlap.

**Reason:** BM25-style retrieval relies substantially on term overlap and does not inherently represent semantic similarity.

### 7.2 Chunk boundaries

**Scenario:** A fact and its explanation are separated into different chunks.

**Potential observation:** The retrieved chunk may not contain enough context to answer the question completely.

**Reason:** Fixed chunking and overlap cannot guarantee that all related information stays together.

### 7.3 Missing information

**Scenario:** A user asks a question whose answer does not appear in the selected documents.

**Expected behavior:** The application should avoid presenting unsupported claims as document-grounded facts.

**Limitation:** This behavior must be verified through actual tests, particularly because a retrieval system can return passages even when none is sufficiently relevant.

### 7.4 External LLM dependency

**Scenario:** The API key is invalid, the provider is unavailable, or a request fails.

**Potential observation:** The application may be unable to generate an answer.

**Improvement needed:** Ensure errors are presented clearly to the user and do not cause the server to crash.

### 7.5 Evaluation coverage

Three passing unit tests provide only limited coverage of the application. A larger, representative evaluation dataset is needed to measure retrieval quality and compare subsequent versions reliably.

## 8. Future Improvements

The following improvements are potential directions for later versions and should not be interpreted as features already implemented in V1.

### V2 — Improved retrieval

- Introduce a dense embedding model.
- Use the same embedding model for documents and questions.
- Store and search embeddings in a vector database.
- Compare semantic retrieval with the V1 keyword-based baseline.
- Evaluate retrieval performance on the same question set.

Changing the embedding model would require re-indexing the documents.

### V3 — Safer and measured answers

- Strengthen response schema validation.
- Improve handling of malformed model responses and provider failures.
- Test abstention when evidence is missing or insufficient.
- Expand the evaluation dataset and measure retrieval and answer quality.
- Improve logging to make failures reproducible.

### V4 — Additional features

- Improve document discovery and management.
- Add further search and filtering options.
- Improve the presentation of evidence and source passages.
- Add additional usability features based on user feedback.

## 9. Conclusion

RAG App V1 establishes a starting point for a document-based question-answering application. It combines document management, text chunking, keyword-based retrieval, LLM answer generation, and source references in a web interface.

The current implementation provides a baseline for experimentation rather than a production-ready RAG system. Its main limitations include keyword-based retrieval, dependence on an external language model, and the need for broader evaluation.

The next stage should focus on measuring the current baseline with a repeatable evaluation dataset and using those results to justify improvements in retrieval quality, answer grounding, and error handling.
