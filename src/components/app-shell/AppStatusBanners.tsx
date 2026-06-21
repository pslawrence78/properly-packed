import { RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function AppStatusBanners() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    const showUpdate = () => setUpdateReady(true);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("properly-packed:update-ready", showUpdate);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .getRegistration()
        .then((registration) => setUpdateReady(Boolean(registration?.waiting)))
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("properly-packed:update-ready", showUpdate);
    };
  }, []);

  async function applyUpdate() {
    if (!("serviceWorker" in navigator)) return;

    setUpdating(true);
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) {
      setUpdateReady(false);
      setUpdating(false);
      return;
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      { once: true },
    );
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  if (isOnline && !updateReady) return null;

  return (
    <div className="sticky top-0 z-40 space-y-2 px-4 pt-2 sm:px-6 lg:px-8" role="status">
      {!isOnline ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber/40 bg-amberSoft px-4 py-3 text-sm font-semibold text-charcoal shadow-soft">
          <WifiOff aria-hidden="true" className="h-4 w-4 shrink-0" />
          Offline mode: saved trips remain available on this device.
        </div>
      ) : null}
      {updateReady ? (
        <div className="flex flex-col gap-3 rounded-xl border border-teal/30 bg-tealSoft px-4 py-3 text-sm text-charcoal shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <span>A new Properly Packed version is ready. Apply it when you have finished editing.</span>
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-teal px-4 font-semibold text-white disabled:opacity-60"
            disabled={updating}
            onClick={() => void applyUpdate()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            {updating ? "Updating..." : "Update app"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
