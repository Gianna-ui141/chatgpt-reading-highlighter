const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = process.env.CGRH_TEST_BASELINE
  ? require('node:child_process').execFileSync('git', ['show', '6e351ab:src/content.js'], { encoding: 'utf8' })
  : fs.readFileSync(path.join(__dirname, '../src/content.js'), 'utf8');
function fixture(html, saved = []) {
  const dom = new JSDOM(`<main>${html}</main>`, {
    url: 'https://chatgpt.com/c/regression', runScripts: 'outside-only'
  });
  const w = dom.window;
  let stored = saved;
  w.chrome = { storage: { local: {
    get: async () => ({ cgrh_annotations_v1: stored }),
    set: async (value) => { stored = structuredClone(value.cgrh_annotations_v1); }
  } } };
  w.ChatGPTReadingAnchor = require('../src/anchor.js');
  w.ChatGPTReadingI18n = require('../src/i18n.js');
  w.CSS = { highlights: new Map() };
  w.Highlight = class extends Set { constructor(...ranges) { super(ranges); } };
  w.Range.prototype.getClientRects = () => [{ left: 50, bottom: 100, width: 200, height: 20 }];
  w.eval(source.replace(/  init\(\)\.catch\([^\n]+\);/, `
    globalThis.api = { load, createUi, onSelection, addAnnotation,
      resolvedRange, renderHighlights, state, commonReadableRoot };
  `));
  const api = w.api;
  api.createUi();
  function select(first = '#a', last = '#d') {
    const range = w.document.createRange();
    const a = w.document.querySelector(first).firstChild;
    const d = w.document.querySelector(last).firstChild;
    range.setStart(a, 0);
    range.setEnd(d, d.length);
    w.getSelection().removeAllRanges();
    w.getSelection().addRange(range);
    api.onSelection();
    return range.toString();
  }
  return { w, api, select, stored: () => stored, close: () => w.close() };
}

const list = '<ol><li id="a">a. 第一项</li><li>b. 第二项</li><li>c. 第三项</li><li id="d">d. 第四项</li></ol>';
const layouts = {
  'semantic fallback list': `<div>${list}</div>`,
  'list directly inside main': list,
  'explicit assistant': `<div data-message-author-role="assistant">${list}</div>`,
  'multiple markdown blocks': '<article data-testid="conversation-turn-1"><div class="markdown"><p id="a">first</p></div><div class="markdown"><p id="d">last</p></div></article>',
  'fallback paragraphs': '<section><p id="a">first paragraph</p><p>middle</p><p id="d">last paragraph</p></section>',
  'nested list': '<div><ol><li id="a">start<ul><li>nested</li></ul></li><li id="d">end</li></ol></div>'
};
for (const [name, html] of Object.entries(layouts)) {
  test(`multi-block highlight is saved and restored: ${name}`, async () => {
    const f = fixture(html);
    try {
      const quote = f.select();
      assert.ok(f.api.state.currentRange, 'selection recognized');
      await f.api.addAnnotation('yellow', 'one note for all points');
      assert.equal(f.stored().length, 1, 'one annotation for the entire selection');
      assert.equal(f.stored()[0].quote, quote);
      assert.equal(f.w.CSS.highlights.get('cgrh-yellow').size, 1, 'visible immediately');
      const restored = fixture(html, f.stored());
      try {
        await restored.api.load();
        restored.api.renderHighlights();
        assert.equal(restored.w.CSS.highlights.get('cgrh-yellow').size, 1);
        assert.equal(restored.api.resolvedRange(restored.api.state.annotations[0]).range.toString(), quote);
      } finally { restored.close(); }
    } finally { f.close(); }
  });
}
test('existing single-item annotations remain resolvable', async () => {
  const f = fixture(`<div>${list}</div>`);
  try {
    const quote = f.select('#a', '#a');
    await f.api.addAnnotation('blue', '');
    assert.equal(f.api.resolvedRange(f.stored()[0]).range.toString(), quote);
  } finally { f.close(); }
});
for (const [name, html] of Object.entries({
  'different turns': '<div><article data-turn="assistant"><p id="a">first</p></article><article data-turn="assistant"><p id="d">second</p></article></div>',
  'user message': '<div><p id="a">answer</p><div data-message-author-role="user"><p id="d">user</p></div></div>',
  'intervening input': '<div><p id="a">first</p><form><textarea>private input</textarea></form><p id="d">last</p></div>'
})) {
  test(`reject unsafe multi-block selection: ${name}`, () => {
    const f = fixture(html);
    try { f.select(); assert.equal(f.api.state.currentRange, null); }
    finally { f.close(); }
  });
}
