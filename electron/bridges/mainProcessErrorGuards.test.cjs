const test = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyProcessError,
  isNonFatalNetworkError,
} = require("./processErrorGuards.cjs");

test("treats Chromium ERR_NETWORK_CHANGED as non-fatal", () => {
  assert.equal(
    isNonFatalNetworkError(new Error("net::ERR_NETWORK_CHANGED")),
    true,
  );
});

test("treats other Chromium net::ERR_* failures as non-fatal network errors", () => {
  assert.equal(
    isNonFatalNetworkError(new Error("net::ERR_INTERNET_DISCONNECTED")),
    true,
  );
  assert.equal(
    isNonFatalNetworkError(new Error("net::ERR_NAME_NOT_RESOLVED")),
    true,
  );
});

test("keeps non-network errors fatal", () => {
  assert.equal(
    isNonFatalNetworkError(new Error("Something else broke")),
    false,
  );
});

test("generic startup exceptions stay fatal before the app is up", () => {
  const result = classifyProcessError(new Error("boom"), {
    runtimeStarted: false,
  });

  assert.equal(result.action, "fatal");
});

test("generic runtime exceptions are suppressed after startup", () => {
  const result = classifyProcessError(new Error("boom"), {
    runtimeStarted: true,
  });

  assert.equal(result.action, "suppress");
  assert.match(result.reason, /runtime/i);
});

test("generic runtime promise rejections are also suppressed after startup", () => {
  const result = classifyProcessError(new Error("promise boom"), {
    runtimeStarted: true,
    origin: "unhandledRejection",
  });

  assert.equal(result.action, "suppress");
  assert.match(result.reason, /runtime/i);
});
