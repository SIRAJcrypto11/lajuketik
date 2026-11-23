import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../js/input-routing.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "js/input-routing.js" });
const { classifyKey } = sandbox.window.TypeFlowInput;

test("space advances to the next word instead of becoming a character", () => {
  assert.equal(classifyKey(" "), "space");
});

test("ordinary characters remain character input", () => {
  assert.equal(classifyKey("a"), "character");
});
