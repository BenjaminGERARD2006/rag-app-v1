# No-Context LLM Baseline

## Method

Each of the 10 evaluation questions was submitted to the configured language model without retrieved document chunks. Responses were compared with the expected answers and evidence defined in the question set.

## Results

| ID | Type | Assessment | Observation |
|---|---|---|---|
| q01 | exact_identifier | Correct — substantially | Correctly identified the missing allowlist entries and both IP addresses. |
| q02 | exact_identifier | Correct — substantially | Correctly explained the seat limit and the Admin/Owner actions. |
| q03 | split_answer | Partial | Used a 14-day grace period instead of 21 days and omitted suspension at day 60. |
| q04 | split_answer | Correct — substantially | Identified Business and Enterprise and described the SSO setup sequence. |
| q05 | vocabulary | Partial | Mentioned the Admin reset but omitted backup codes and the only-Admin/Owner recovery path. |
| q06 | versions | Correct — substantially | Identified the 2026 60-day refund window and pro-rated refund. |
| q07 | versions | Correct — substantially | Correctly stated the 20% annual discount but omitted the 2025 comparison. |
| q08 | two_hop | Partial | Identified postroom generally but omitted the exact Messaging team and on-call channel. |
| q09 | not_in_corpus | Correct abstention | Said there was insufficient information to determine whether an iPhone app exists. |
| q10 | not_in_corpus | Correct abstention | Did not invent a price and noted that the policies refer to the pricing page. |

## Observations

The baseline answered several questions without document retrieval, so not every question demonstrates a need for RAG. The most notable weaknesses were policy-version confusion in q03, incomplete account recovery guidance in q05, and missing cross-document contact details in q08. The model correctly abstained on q09 and q10 rather than inventing information.

## Limitation

These assessments are based on the responses recorded during this manual exercise. Additional answer-generation tests using the application's actual retrieval pipeline are needed to determine whether retrieval improves completeness and grounding.
