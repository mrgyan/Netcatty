function isNonFatalNetworkError(err) {
  if (!err) return false;
  // Any error with an ssh2 `level` property is a connection/auth-level error,
  // never a reason to kill the entire multi-session app.
  if (err.level) return true;

  const candidates = [err, err.cause].filter(Boolean);
  for (const candidate of candidates) {
    const code = candidate.code;
    // Common TCP/DNS/routing errors that can surface from Node.js sockets
    // without an ssh2 `level` (e.g. proxy sockets, raw net.connect calls).
    switch (code) {
      case "ECONNRESET":
      case "ECONNREFUSED":
      case "ECONNABORTED":
      case "ETIMEDOUT":
      case "ENOTFOUND":
      case "EHOSTUNREACH":
      case "EHOSTDOWN":
      case "ENETUNREACH":
      case "ENETDOWN":
      case "EADDRNOTAVAIL":
      case "EPROTO":
      case "EPERM":
        return true;
      default:
        break;
    }

    // Chromium/Electron networking often rejects with a message like
    // "net::ERR_NETWORK_CHANGED" but without a useful `code` property.
    // These are transport failures for background fetch/update/sync work,
    // not reasons to kill the whole app.
    const message = String(candidate.message || "");
    if (/net::ERR_(?:NETWORK_[A-Z_]+|INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|CONNECTION_[A-Z_]+|ADDRESS_[A-Z_]+|SSL_[A-Z_]+|CERT_[A-Z_]+|PROXY_[A-Z_]+|TUNNEL_[A-Z_]+|SOCKS_[A-Z_]+)/.test(message)) {
      return true;
    }
  }

  return false;
}

function isBenignStreamError(err) {
  const code = err?.code;
  return code === "EPIPE" || code === "ERR_STREAM_DESTROYED";
}

function classifyProcessError(err, options = {}) {
  const runtimeStarted = options.runtimeStarted === true;

  if (isBenignStreamError(err)) {
    return {
      action: "ignore",
      reason: "benign stream teardown",
    };
  }

  if (isNonFatalNetworkError(err)) {
    return {
      action: "suppress",
      reason: "non-fatal network error",
    };
  }

  if (runtimeStarted) {
    return {
      action: "suppress",
      reason: "runtime error after startup",
    };
  }

  return {
    action: "fatal",
    reason: "startup error before app became usable",
  };
}

module.exports = {
  classifyProcessError,
  isBenignStreamError,
  isNonFatalNetworkError,
};
