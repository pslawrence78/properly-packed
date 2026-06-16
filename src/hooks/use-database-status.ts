import { useEffect, useState } from "react";
import { ensureDatabaseReady } from "../db";
import type { DatabaseStatus } from "../db/repositories/app-settings-repository";

type DatabaseStatusState =
  | { state: "loading"; status?: undefined; error?: undefined }
  | { state: "ready"; status: DatabaseStatus; error?: undefined }
  | { state: "error"; status?: undefined; error: string };

export function useDatabaseStatus(): DatabaseStatusState {
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatusState>({
    state: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    async function initialiseDatabase() {
      try {
        const status = await ensureDatabaseReady();

        if (!cancelled) {
          setDatabaseStatus({ state: "ready", status });
        }
      } catch (error) {
        if (!cancelled) {
          setDatabaseStatus({
            state: "error",
            error:
              error instanceof Error
                ? error.message
                : "Database initialisation failed.",
          });
        }
      }
    }

    initialiseDatabase();

    return () => {
      cancelled = true;
    };
  }, []);

  return databaseStatus;
}
