import { useCallback } from "react";
import { netcattyBridge } from "../../infrastructure/services/netcattyBridge";

export type ApplicationInfo = {
  name: string;
  version: string;
  platform: string;
};

export type SshAgentStatus = {
  running: boolean;
  startupType: string | null;
  error: string | null;
};

export const useApplicationBackend = () => {
  const openExternal = useCallback(async (url: string) => {
    const bridge = netcattyBridge.get();
    if (bridge?.openExternal) {
      const result = await bridge.openExternal(url);
      // The bridge returns a structured { success, error } result. Throw on
      // failure so callers can present a user-facing message (the OS will
      // return an error when there is no handler registered for the URL, e.g.
      // Windows with no default browser configured).
      if (result && result.success === false) {
        throw new Error(result.error || "Failed to open URL");
      }
      return;
    }
    // Fallback for non-Electron environments (tests, dev server, etc.).
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const getApplicationInfo = useCallback(async (): Promise<ApplicationInfo | null> => {
    const bridge = netcattyBridge.get();
    const info = await bridge?.getAppInfo?.();
    return info ?? null;
  }, []);

  const checkSshAgent = useCallback(async (): Promise<SshAgentStatus | null> => {
    const bridge = netcattyBridge.get();
    const status = await bridge?.checkSshAgent?.();
    return status ?? null;
  }, []);

  return { openExternal, getApplicationInfo, checkSshAgent };
};

