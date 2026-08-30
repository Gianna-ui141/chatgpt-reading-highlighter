(function (root) {
  "use strict";

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function hashText(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function locateQuote(fullText, annotation) {
    const quote = annotation.quote || "";
    if (!quote) return null;

    const expectedStart = Number.isInteger(annotation.start) ? annotation.start : -1;
    if (
      expectedStart >= 0 &&
      fullText.slice(expectedStart, expectedStart + quote.length) === quote
    ) {
      return { start: expectedStart, end: expectedStart + quote.length, strategy: "offset" };
    }

    const candidates = [];
    let cursor = fullText.indexOf(quote);
    while (cursor !== -1) {
      candidates.push(cursor);
      cursor = fullText.indexOf(quote, cursor + 1);
    }
    if (!candidates.length) return null;

    const prefix = annotation.prefix || "";
    const suffix = annotation.suffix || "";
    const scored = candidates.map((start) => {
      const before = fullText.slice(Math.max(0, start - prefix.length), start);
      const after = fullText.slice(start + quote.length, start + quote.length + suffix.length);
      let score = 0;
      if (prefix && before === prefix) score += 4;
      if (suffix && after === suffix) score += 4;
      if (expectedStart >= 0) score -= Math.min(3, Math.abs(start - expectedStart) / 1000);
      return { start, score };
    });
    scored.sort((left, right) => right.score - left.score);
    return {
      start: scored[0].start,
      end: scored[0].start + quote.length,
      strategy: candidates.length === 1 ? "exact" : "context"
    };
  }

  const api = { normalizeText, hashText, locateQuote };
  root.ChatGPTReadingAnchor = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
