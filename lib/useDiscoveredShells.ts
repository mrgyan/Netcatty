import { useEffect, useState } from "react";
import { netcattyBridge } from "../infrastructure/services/netcattyBridge";

let shellCache: DiscoveredShell[] | null = null;
let shellPromise: Promise<DiscoveredShell[]> | null = null;

export function useDiscoveredShells(): DiscoveredShell[] {
  const [shells, setShells] = useState<DiscoveredShell[]>(shellCache ?? []);

  useEffect(() => {
    if (shellCache) {
      setShells(shellCache);
      return;
    }

    const bridge = netcattyBridge.get();
    if (!bridge?.discoverShells) return;

    if (!shellPromise) {
      shellPromise = bridge.discoverShells();
    }

    shellPromise.then((result) => {
      shellCache = result;
      setShells(result);
    }).catch((err) => {
      console.warn("Failed to discover shells:", err);
      // Clear the failed promise so the next mount can retry
      shellPromise = null;
    });
  }, []);

  return shells;
}

/**
 * Check whether a localShell value looks like a file path (custom entry)
 * rather than a discovered shell ID. Paths contain slashes or backslashes,
 * or end with common executable extensions.
 */
function looksLikePath(value: string): boolean {
  return /[/\\]/.test(value) || /\.\w+$/.test(value);
}

/**
 * Resolve a localShell setting value to shell command and args.
 * The value can be a discovered shell id (e.g., "wsl-ubuntu", "pwsh")
 * or a custom path (e.g., "/usr/local/bin/fish").
 * Returns { command, args } or null if unresolved / discovery not ready.
 */
export function resolveShellSetting(
  localShell: string,
  discoveredShells: DiscoveredShell[]
): { command: string; args?: string[] } | null {
  if (!localShell) return null;

  // Try to match as a discovered shell id
  const shell = discoveredShells.find(s => s.id === localShell);
  if (shell) {
    return { command: shell.command, args: shell.args };
  }

  // If it looks like a file path, treat as custom shell (backward compat)
  if (looksLikePath(localShell)) {
    return { command: localShell };
  }

  // Value looks like a shell ID but discovery hasn't loaded yet or no match.
  // Return null so the caller falls back to the system default shell,
  // rather than trying to execute an ID string like "wsl-ubuntu" as a command.
  return null;
}

const DISTRO_ICONS = new Set([
  "ubuntu", "debian", "kali", "alpine", "opensuse",
  "fedora", "arch", "oracle", "linux",
]);

export function getShellIconPath(iconId: string): string {
  if (DISTRO_ICONS.has(iconId)) {
    return `/distro/${iconId}.svg`;
  }
  return `/shells/${iconId}.svg`;
}
