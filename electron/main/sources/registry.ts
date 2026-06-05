import type { SourceAdapter } from './adapter';
import type { SourceCapabilities } from './adapter';
import type { AuthStatus } from './types';

export interface SourceRegistration {
  id: string;
  name: string;
  capabilities: SourceCapabilities;
  enabled: boolean;
  authenticated: boolean;
}

const registry = new Map<string, SourceAdapter>();

export function registerSource(source: SourceAdapter): void {
  if (registry.has(source.id)) {
    console.warn(`[sources] Source '${source.id}' is already registered. Skipping.`);
    return;
  }
  registry.set(source.id, source);
}

export function unregisterSource(id: string): void {
  registry.delete(id);
}

export function getSource(id: string): SourceAdapter | undefined {
  return registry.get(id);
}

export function getAllSources(): SourceAdapter[] {
  return Array.from(registry.values());
}

export function getEnabledSources(): SourceAdapter[] {
  return Array.from(registry.values()).filter((s) => s.isEnabled());
}

export function listRegistrations(): SourceRegistration[] {
  return Array.from(registry.values()).map((s) => ({
    id: s.id,
    name: s.name,
    capabilities: s.capabilities,
    enabled: s.isEnabled(),
    authenticated: false,
  }));
}

export async function initializeAllSources(): Promise<void> {
  await Promise.all(
    Array.from(registry.values()).map(async (source) => {
      try {
        await source.initialize();
        console.info(`[sources] Initialized '${source.id}'`);
      } catch (err) {
        console.error(`[sources] Failed to initialize '${source.id}':`, err);
      }
    }),
  );
}

export async function shutdownAllSources(): Promise<void> {
  await Promise.all(
    Array.from(registry.values()).map(async (source) => {
      try {
        await source.shutdown();
      } catch (err) {
        console.error(`[sources] Failed to shutdown '${source.id}':`, err);
      }
    }),
  );
}

export async function getAllAuthStatuses(): Promise<AuthStatus[]> {
  return Promise.all(
    Array.from(registry.values()).map((s) => s.getAuthStatus()),
  );
}
