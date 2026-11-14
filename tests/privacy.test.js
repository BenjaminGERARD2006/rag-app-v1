const test = require('node:test');
const assert = require('node:assert/strict');
const { redactPersonalData } = require('../src/privacy');

test('redacts email addresses, phone numbers and titled personal names', () => {
  const result = redactPersonalData('Contact Jane Smith at jane@example.com or +1 415 555 0134.');
  assert.doesNotMatch(result.text, /jane@example.com|415 555 0134|Jane Smith/);
  assert.equal(result.count, 3);
  assert.deepEqual(result.types.sort(), ['EMAIL', 'PERSON', 'PHONE']);
});

test('leaves ordinary text unchanged when no supported PII pattern is found', () => {
  const result = redactPersonalData('The billing plan includes analytics.');
  assert.equal(result.text, 'The billing plan includes analytics.');
  assert.equal(result.count, 0);
});
