import { useEffect, useState } from "react";

export type PwaStatus = {
  isOnline: boolean;
  hasManifest: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerState: "unsupported" | "unregistered" | "installing" | "waiting" | "active";
  updateWaiting: boolean;
};

export function usePwaStatus(): PwaStatus {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [serviceWorkerState, setServiceWorkerState] =
    useState<PwaStatus["serviceWorkerState"]>("unsupported");
  const [updateWaiting, setUpdateWaiting] = useState(false);

  const serviceWorkerSupported =
    typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const hasManifest =
    typeof document !== "undefined" &&
    Boolean(document.querySelector('link[rel="manifest"]'));

  useEffect(() => {
    function updateOnlineState() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!serviceWorkerSupported) {
      setServiceWorkerState("unsupported");
      return;
    }

    let cancelled = false;

    async function readRegistration() {
      const registration = await navigator.serviceWorker.getRegistration();

      if (cancelled) {
        return;
      }

      if (!registration) {
        setServiceWorkerState("unregistered");
        return;
      }

      if (registration.waiting) {
        setServiceWorkerState("waiting");
        setUpdateWaiting(true);
        return;
      }

      if (registration.installing) {
        setServiceWorkerState("installing");
        return;
      }

      setServiceWorkerState("active");
    }

    readRegistration().catch(() => setServiceWorkerState("unregistered"));

    navigator.serviceWorker.addEventListener("controllerchange", readRegistration);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        readRegistration,
      );
    };
  }, [serviceWorkerSupported]);

  return {
    isOnline,
    hasManifest,
    serviceWorkerSupported,
    serviceWorkerState,
    updateWaiting,
  };
}
