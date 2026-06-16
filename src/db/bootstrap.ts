import { getDatabaseStatus } from "./repositories/app-settings-repository";
import { applyInitialSeed } from "./seed";

let databaseReadyPromise: ReturnType<typeof getDatabaseStatus> | undefined;

export function ensureDatabaseReady() {
  databaseReadyPromise ??= applyInitialSeed().then(() => getDatabaseStatus());
  return databaseReadyPromise;
}

export function resetDatabaseReadyCache() {
  databaseReadyPromise = undefined;
}
