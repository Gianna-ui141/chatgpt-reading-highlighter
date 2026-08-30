const test = require("node:test");
const assert = require("node:assert/strict");
const { hashText, locateQuote, normalizeText } = require("../src/anchor.js");

test("normalizes whitespace", () => {
  assert.equal(normalizeText("  one\n  two  "), "one two");
});

test("hash is deterministic", () => {
  assert.equal(hashText("climate risk"), hashText("climate risk"));
  assert.notEqual(hashText("climate risk"), hashText("climate risks"));
});

test("restores an unchanged quote by offset", () => {
  assert.deepEqual(locateQuote("alpha beta gamma", { quote: "beta", start: 6 }), {
    start: 6, end: 10, strategy: "offset"
  });
});

test("uses context after surrounding content changes", () => {
  const result = locateQuote("intro risk and later risk conclusion", {
    quote: "risk", start: 0, prefix: "later ", suffix: " conclusion"
  });
  assert.equal(result.start, 21);
  assert.equal(result.strategy, "context");
});

test("returns null when quote disappeared", () => {
  assert.equal(locateQuote("alpha gamma", { quote: "beta", start: 6 }), null);
});
