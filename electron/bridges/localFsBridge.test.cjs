const test = require("node:test");
const assert = require("node:assert/strict");

const { parseAttribOutput, listWindowsHiddenBasenames } = require("./localFsBridge.cjs");

test("parseAttribOutput returns an empty set for empty input", () => {
  assert.equal(parseAttribOutput("").size, 0);
  assert.equal(parseAttribOutput("\r\n\r\n").size, 0);
});

test("parseAttribOutput captures basenames of files with the H flag", () => {
  const stdout = [
    "A            C:\\Users\\foo\\public.txt",
    "     H       C:\\Users\\foo\\.secret",
    "A    H  R   C:\\Users\\foo\\hidden-readonly.exe",
    "A            C:\\Users\\foo\\another.log",
  ].join("\r\n");

  const hidden = parseAttribOutput(stdout);
  assert.deepEqual(
    [...hidden].sort(),
    [".secret", "hidden-readonly.exe"].sort(),
  );
});

test("parseAttribOutput ignores the trailing [DIR] marker on some Windows versions", () => {
  const stdout = [
    "     H       C:\\data\\node_modules                       [DIR]",
    "     H       C:\\data\\.git                               [DIR]",
    "A            C:\\data\\README.md",
  ].join("\r\n");

  const hidden = parseAttribOutput(stdout);
  assert.deepEqual([...hidden].sort(), [".git", "node_modules"].sort());
});

test("parseAttribOutput handles UNC paths", () => {
  const stdout = [
    "     H       \\\\fileserver\\share\\secret.cfg",
    "A            \\\\fileserver\\share\\public.cfg",
  ].join("\r\n");

  const hidden = parseAttribOutput(stdout);
  assert.deepEqual([...hidden], ["secret.cfg"]);
});

test("parseAttribOutput skips malformed lines", () => {
  const stdout = [
    "Parameter format not correct",
    "",
    "     H       C:\\good\\hidden.txt",
    "File not found",
    "     H       not-a-windows-path.txt",
  ].join("\r\n");

  const hidden = parseAttribOutput(stdout);
  assert.deepEqual([...hidden], ["hidden.txt"]);
});

test("listWindowsHiddenBasenames returns an empty set on non-Windows without spawning anything", async () => {
  // Running this test file is only meaningful on a non-Windows host for this
  // assertion. On Windows CI we skip the subprocess-free guarantee.
  if (process.platform === "win32") return;
  const result = await listWindowsHiddenBasenames("/tmp");
  assert.ok(result instanceof Set);
  assert.equal(result.size, 0);
});
