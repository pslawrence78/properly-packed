import { useEffect } from "react";
import { ensureDatabaseReady } from "../db";

export function useDatabaseBootstrap() {
  useEffect(() => {
    ensureDatabaseReady().catch(() => {
      // Settings exposes database status; startup stays quiet if storage is blocked.
    });
  }, []);
}
