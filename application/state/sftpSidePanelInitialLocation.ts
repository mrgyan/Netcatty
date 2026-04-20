export interface SidePanelInitialLocationRequest {
  hostId: string;
  path: string;
}

export interface SidePanelInitialLocationConnection {
  hostId: string;
  isLocal: boolean;
  status: string;
  currentPath: string;
}

export type SidePanelInitialLocationDecision =
  | { kind: "none" }
  | { kind: "consume" }
  | { kind: "navigate"; path: string };

export const getSidePanelInitialLocationRequestKey = (
  initialLocation: SidePanelInitialLocationRequest | null | undefined,
): string | null => {
  if (!initialLocation?.hostId || !initialLocation.path) {
    return null;
  }
  return `${initialLocation.hostId}:${initialLocation.path}`;
};

interface ResolveSidePanelInitialLocationParams {
  pendingRequestKey: string | null;
  initialLocation: SidePanelInitialLocationRequest | null | undefined;
  activeHostId: string | null | undefined;
  connection: SidePanelInitialLocationConnection | null | undefined;
}

export const resolveSidePanelInitialLocation = ({
  pendingRequestKey,
  initialLocation,
  activeHostId,
  connection,
}: ResolveSidePanelInitialLocationParams): SidePanelInitialLocationDecision => {
  const requestKey = getSidePanelInitialLocationRequestKey(initialLocation);

  if (!pendingRequestKey || !requestKey || pendingRequestKey !== requestKey) {
    return { kind: "none" };
  }

  if (
    !activeHostId
    || !connection
    || connection.isLocal
    || connection.status !== "connected"
    || initialLocation.hostId !== activeHostId
    || connection.hostId !== activeHostId
  ) {
    return { kind: "none" };
  }

  if (connection.currentPath === initialLocation.path) {
    return { kind: "consume" };
  }

  return { kind: "navigate", path: initialLocation.path };
};
