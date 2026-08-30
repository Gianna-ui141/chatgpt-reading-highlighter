const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveLanguage, translate } = require("../src/i18n.js");

test("uses Chinese for Chinese browser locales", () => {
  assert.equal(resolveLanguage("zh-CN"), "zh");
  assert.equal(resolveLanguage("zh_HK"), "zh");
});

test("uses English as the default language", () => {
  assert.equal(resolveLanguage("en-US"), "en");
  assert.equal(resolveLanguage("fr-FR"), "en");
  assert.equal(resolveLanguage(""), "en");
});

test("translates labels and interpolates counts", () => {
  assert.equal(translate("en", "addNote"), "+ Note");
  assert.equal(translate("zh", "itemCount", { count: 5 }), "5 条");
  assert.equal(translate("en", "itemCount", { count: 5 }), "5 items");
});
