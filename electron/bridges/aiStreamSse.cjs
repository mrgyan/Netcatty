const DEFAULT_SSE_EVENT_NAME = "message";

function shouldForwardSseEvent(eventName) {
  return !eventName || eventName === DEFAULT_SSE_EVENT_NAME;
}

function dispatchPendingEvent(state, onData) {
  if (state.dataLines.length === 0) {
    state.eventName = DEFAULT_SSE_EVENT_NAME;
    return;
  }

  if (shouldForwardSseEvent(state.eventName)) {
    onData(state.dataLines.join("\n"));
  }

  state.dataLines = [];
  state.eventName = DEFAULT_SSE_EVENT_NAME;
}

function processLine(state, rawLine, onData) {
  const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

  if (line === "") {
    dispatchPendingEvent(state, onData);
    return;
  }

  if (line.startsWith(":")) {
    return;
  }

  if (line.startsWith("event:")) {
    state.eventName = line.slice(6).trimStart() || DEFAULT_SSE_EVENT_NAME;
    return;
  }

  if (line.startsWith("data:")) {
    const value = line.slice(5);
    state.dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
  }
}

function createFilteredSseForwarder(onData) {
  const state = {
    buffer: "",
    eventName: DEFAULT_SSE_EVENT_NAME,
    dataLines: [],
  };

  return {
    processChunk(chunk) {
      state.buffer += chunk;
      const lines = state.buffer.split("\n");
      state.buffer = lines.pop() || "";

      for (const line of lines) {
        processLine(state, line, onData);
      }
    },

    flush() {
      if (state.buffer) {
        processLine(state, state.buffer, onData);
        state.buffer = "";
      }
      dispatchPendingEvent(state, onData);
    },
  };
}

module.exports = {
  createFilteredSseForwarder,
  shouldForwardSseEvent,
};
