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
 * Resolve a localShell setting value to shell command and args.
 * The value can be a discovered shell id (e.g., "wsl-ubuntu", "pwsh")
 * or a custom path/command (e.g., "/usr/local/bin/fish" or "fish").
 * Returns { command, args } or null when discovery hasn't loaded yet
 * and the value might be a shell ID that can't be resolved yet.
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

  // If discovery has loaded (non-empty list) and no ID matched,
  // this is a custom value — pass it through as-is.
  if (discoveredShells.length > 0) {
    return { command: localShell };
  }

  // Discovery hasn't loaded yet. If the value looks like a path or bare
  // executable (no hyphens — shell IDs like "wsl-ubuntu" always have hyphens),
  // pass through. Otherwise return null to use the system default.
  if (/[/\\]/.test(localShell) || !/-/.test(localShell)) {
    return { command: localShell };
  }

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

/** Distro icons are monochrome black and need `dark:invert` in dark mode */
export function isMonochromeShellIcon(iconId: string): boolean {
  return DISTRO_ICONS.has(iconId);
}
