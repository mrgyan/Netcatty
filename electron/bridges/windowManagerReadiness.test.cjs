const test = require("node:test");
const assert = require("node:assert/strict");

const { isWindowUsable } = require("./windowManager.cjs");

function createWindowStub({ destroyed = false, webContents } = {}) {
  return {
    isDestroyed() {
      return destroyed;
    },
    webContents,
  };
}

test("isWindowUsable returns false when webContents is crashed", () => {
  const win = createWindowStub({
    webContents: {
      isDestroyed() {
        return false;
      },
      isCrashed() {
        return true;
      },
    },
  });

  assert.equal(isWindowUsable(win), false);
});

test("isWindowUsable returns true for a healthy live window", () => {
  const win = createWindowStub({
    webContents: {
      isDestroyed() {
        return false;
      },
      isCrashed() {
        return false;
      },
    },
  });

  assert.equal(isWindowUsable(win), true);
});
