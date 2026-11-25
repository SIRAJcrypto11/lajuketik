import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../js/input-routing.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "js/input-routing.js" });
const { classifyKey } = sandbox.window.LajuKetikInput;

test("space advances to the next word instead of becoming a character", () => {
  assert.equal(classifyKey(" "), "space");
});

test("ordinary characters remain character input", () => {
  assert.equal(classifyKey("a"), "character");
});

test("Tab only starts a session while the typing board owns focus", () => {
  assert.equal(sandbox.window.LajuKetikInput.shouldStartFromTab("Tab", true, false), true);
  assert.equal(sandbox.window.LajuKetikInput.shouldStartFromTab("Tab", false, false), false);
  assert.equal(sandbox.window.LajuKetikInput.shouldStartFromTab("Tab", true, true), false);
});

test("skipped characters count as errors instead of disappearing from accuracy", () => {
  const typedWord = { chars: [], errors: 0 };
  const events = [];
  const added = sandbox.window.LajuKetikInput.recordSkippedCharacters(typedWord, 3, events, () => 1);
  assert.equal(added, 3);
  assert.equal(typedWord.errors, 3);
  assert.equal(events.length, 3);
  assert.equal(events.every((event) => event.correct === false), true);
});

test("word mode completes on the final character without an extra space", () => {
  const { shouldFinishWordsMode } = sandbox.window.LajuKetikInput;
  assert.equal(shouldFinishWordsMode("words", 2, 3, 4, 4), true);
  assert.equal(shouldFinishWordsMode("words", 2, 3, 3, 4), false);
  assert.equal(shouldFinishWordsMode("time", 2, 3, 4, 4), false);
});
