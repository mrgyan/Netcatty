const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const {
  classifyProcessError,
  createProcessErrorController,
  installProcessErrorHandlers,
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

test("controller keeps startup strict until the main window is actually shown", () => {
  const controller = createProcessErrorController();

  controller.beginMainWindowStartup();
  assert.equal(controller.isRuntimeProtectionActive(), false);

  controller.completeMainWindowStartup({ windowShown: true });
  assert.equal(controller.isRuntimeProtectionActive(), true);
});

test("controller becomes strict again while recreating a missing main window", () => {
  const controller = createProcessErrorController();

  controller.beginMainWindowStartup();
  controller.completeMainWindowStartup({ windowShown: true });
  assert.equal(controller.isRuntimeProtectionActive(), true);

  controller.beginMainWindowStartup();
  assert.equal(controller.isRuntimeProtectionActive(), false);

  controller.completeMainWindowStartup({ windowShown: false });
  assert.equal(controller.isRuntimeProtectionActive(), true);
});

test("installed handlers suppress runtime failures but fatal startup failures", () => {
  const fakeProcess = new EventEmitter();
  const captured = [];
  const fatals = [];
  const errors = [];
  const warnings = [];
  const controller = createProcessErrorController({
    captureError(source, err) {
      captured.push([source, err.message]);
    },
    onFatalError(err) {
      fatals.push(err.message);
    },
    logError(...args) {
      errors.push(args.map(String).join(" "));
    },
    logWarn(...args) {
      warnings.push(args.map(String).join(" "));
    },
  });

  installProcessErrorHandlers(fakeProcess, controller);

  fakeProcess.emit("uncaughtException", new Error("startup boom"));
  assert.deepEqual(fatals, ["startup boom"]);
  assert.deepEqual(captured, [["uncaughtException", "startup boom"]]);

  controller.beginMainWindowStartup();
  controller.completeMainWindowStartup({ windowShown: true });

  fakeProcess.emit("uncaughtException", new Error("runtime boom"));
  assert.deepEqual(fatals, ["startup boom"]);
  assert.deepEqual(captured, [
    ["uncaughtException", "startup boom"],
    ["uncaughtException", "runtime boom"],
  ]);
  assert.equal(errors.some((line) => line.includes("runtime error after startup")), true);
  assert.equal(warnings.length, 0);
});

test("unhandled rejection marks the forwarded error so uncaught follow-up is not double-captured", () => {
  const captured = [];
  const fatals = [];
  const controller = createProcessErrorController({
    captureError(source, err) {
      captured.push([source, err.message]);
    },
    onFatalError(err) {
      fatals.push(err);
    },
    logError() {},
    logWarn() {},
  });

  controller.handleUnhandledRejection(new Error("startup rejection"));
  assert.equal(fatals.length, 1);
  assert.equal(fatals[0].__fromUnhandledRejection, true);
  assert.deepEqual(captured, [["unhandledRejection", "startup rejection"]]);

  controller.handleUncaughtException(fatals[0]);
  assert.deepEqual(captured, [["unhandledRejection", "startup rejection"]]);
});

test("benign stream teardown errors are ignored by the installed handlers", () => {
  const fakeProcess = new EventEmitter();
  let captureCount = 0;
  let fatalCount = 0;
  const controller = createProcessErrorController({
    captureError() {
      captureCount += 1;
    },
    onFatalError() {
      fatalCount += 1;
    },
    logError() {},
    logWarn() {},
  });

  installProcessErrorHandlers(fakeProcess, controller);
  const err = new Error("broken pipe");
  err.code = "EPIPE";
  fakeProcess.emit("uncaughtException", err);

  assert.equal(captureCount, 0);
  assert.equal(fatalCount, 0);
});

test("controller suppresses wrapped network errors from err.cause", () => {
  const controller = createProcessErrorController({
    captureError() {},
    onFatalError() {
      throw new Error("should not be fatal");
    },
    logError() {},
    logWarn() {},
  });
  controller.beginMainWindowStartup();
  controller.completeMainWindowStartup({ windowShown: true });

  const err = new Error("request failed");
  err.cause = new Error("net::ERR_NETWORK_CHANGED");

  assert.doesNotThrow(() => controller.handleUnhandledRejection(err));
});

test("controller suppresses ssh-style errors with a level property", () => {
  const controller = createProcessErrorController({
    captureError() {},
    onFatalError() {
      throw new Error("should not be fatal");
    },
    logError() {},
    logWarn() {},
  });
  controller.beginMainWindowStartup();
  controller.completeMainWindowStartup({ windowShown: true });

  const err = new Error("connection lost before handshake");
  err.level = "client-socket";

  assert.doesNotThrow(() => controller.handleUncaughtException(err));
});
