import test from "node:test";
import assert from "node:assert/strict";

import {
  getSidePanelInitialLocationRequestKey,
  resolveSidePanelInitialLocation,
  type SidePanelInitialLocationConnection,
  type SidePanelInitialLocationRequest,
} from "./sftpSidePanelInitialLocation.ts";

const makeRequest = (path: string): SidePanelInitialLocationRequest => ({
  hostId: "host-1",
  path,
});

const makeConnection = (
  overrides: Partial<SidePanelInitialLocationConnection> = {},
): SidePanelInitialLocationConnection => ({
  hostId: "host-1",
  isLocal: false,
  status: "connected",
  currentPath: "/home/demo",
  ...overrides,
});

test("navigates once when a pending initial-location request points at a different remote path", () => {
  const initialLocation = makeRequest("/srv/app/config");

  assert.deepEqual(
    resolveSidePanelInitialLocation({
      pendingRequestKey: getSidePanelInitialLocationRequestKey(initialLocation),
      initialLocation,
      activeHostId: "host-1",
      connection: makeConnection(),
    }),
    { kind: "navigate", path: "/srv/app/config" },
  );
});

test("consumes the pending request when the connection is already at the requested path", () => {
  const initialLocation = makeRequest("/srv/app/config");

  assert.deepEqual(
    resolveSidePanelInitialLocation({
      pendingRequestKey: getSidePanelInitialLocationRequestKey(initialLocation),
      initialLocation,
      activeHostId: "host-1",
      connection: makeConnection({ currentPath: "/srv/app/config" }),
    }),
    { kind: "consume" },
  );
});

test("does not replay a consumed request after unrelated connection churn", () => {
  const initialLocation = makeRequest("/srv/app/config");

  assert.deepEqual(
    resolveSidePanelInitialLocation({
      pendingRequestKey: null,
      initialLocation,
      activeHostId: "host-1",
      connection: makeConnection({ currentPath: "/home/demo" }),
    }),
    { kind: "none" },
  );
});

test("ignores pending requests for other hosts or local panes", () => {
  const initialLocation = makeRequest("/srv/app/config");
  const pendingRequestKey = getSidePanelInitialLocationRequestKey(initialLocation);

  assert.deepEqual(
    resolveSidePanelInitialLocation({
      pendingRequestKey,
      initialLocation,
      activeHostId: "host-2",
      connection: makeConnection(),
    }),
    { kind: "none" },
  );

  assert.deepEqual(
    resolveSidePanelInitialLocation({
      pendingRequestKey,
      initialLocation,
      activeHostId: "host-1",
      connection: makeConnection({ isLocal: true, hostId: "local" }),
    }),
    { kind: "none" },
  );
});
