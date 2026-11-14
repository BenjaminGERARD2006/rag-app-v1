function redactPersonalData(value) {
  let text = String(value ?? '');
  const replacements = [];
  const rules = [
    ['EMAIL', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
    ['PHONE', /(?<!\w)(?:\+?\d[\d ().-]{7,}\d)(?!\w)/g],
    ['PERSON', /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b|\b[A-Z][a-z]{1,25}\s+[A-Z][a-z]{1,25}\b/g]
  ];
  for (const [label, pattern] of rules) {
    text = text.replace(pattern, () => {
      const token = `[REDACTED_${label}_${replacements.length + 1}]`;
      replacements.push({ type: label, token });
      return token;
    });
  }
  return { text, count: replacements.length, types: [...new Set(replacements.map(x => x.type))] };
}
module.exports = { redactPersonalData };
