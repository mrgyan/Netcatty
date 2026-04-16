const test = require("node:test");
const assert = require("node:assert/strict");

const { createFilteredSseForwarder } = require("./aiStreamSse.cjs");

test("forwards standard message events", () => {
  const seen = [];
  const forwarder = createFilteredSseForwarder((data) => {
    seen.push(data);
  });

  forwarder.processChunk('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n');

  assert.deepEqual(seen, ['{"choices":[{"delta":{"content":"hi"}}]}']);
});

test("ignores Hermes tool progress events", () => {
  const seen = [];
  const forwarder = createFilteredSseForwarder((data) => {
    seen.push(data);
  });

  forwarder.processChunk("event: hermes.tool.progress\n");
  forwarder.processChunk('data: {"tool":"terminal","emoji":"💻","label":"ls -la /root"}\n\n');
  forwarder.processChunk('data: {"choices":[{"delta":{"content":"done"}}]}\n\n');

  assert.deepEqual(seen, ['{"choices":[{"delta":{"content":"done"}}]}']);
});

test("joins multi-line data payloads for forwarded events", () => {
  const seen = [];
  const forwarder = createFilteredSseForwarder((data) => {
    seen.push(data);
  });

  forwarder.processChunk("data: first line\n");
  forwarder.processChunk("data: second line\n\n");

  assert.deepEqual(seen, ["first line\nsecond line"]);
});

test("flushes trailing message events on stream end", () => {
  const seen = [];
  const forwarder = createFilteredSseForwarder((data) => {
    seen.push(data);
  });

  forwarder.processChunk('data: {"choices":[{"delta":{"content":"tail"}}]}');
  forwarder.flush();

  assert.deepEqual(seen, ['{"choices":[{"delta":{"content":"tail"}}]}']);
});
