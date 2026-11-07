# Custom corpus work still required

The uploaded project archive does not include the student's custom corpus. `data/documents.json` is absent, and `eval/custom.questions.jsonl` contains ten `REPLACE_...` templates.

Do not use the Kestrel corpus as a substitute and do not invent a custom-corpus evaluation. To complete this requirement:

1. Upload at least one appropriate team-selected TXT/Markdown document in the app (or provide the original corpus files).
2. Create at least ten questions grounded in those documents.
3. For every answerable question, record the exact filename and a short verbatim evidence quote.
4. Include suitable question types and any unanswerable questions with `answerable: false` and empty evidence.
5. Run `npm run evaluate:v3` and retain the generated JSON results.

Until this is done, custom-corpus metrics are intentionally reported as skipped.
