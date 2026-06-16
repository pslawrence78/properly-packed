import { useEffect, useState, type DependencyList } from "react";

type AsyncData<T> =
  | { state: "loading"; data?: undefined; error?: undefined }
  | { state: "ready"; data: T; error?: undefined }
  | { state: "error"; data?: undefined; error: string };

export function useAsyncData<T>(
  load: () => Promise<T>,
  dependencies: DependencyList,
): AsyncData<T> {
  const [asyncData, setAsyncData] = useState<AsyncData<T>>({
    state: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    setAsyncData({ state: "loading" });
    load()
      .then((data) => {
        if (!cancelled) {
          setAsyncData({ state: "ready", data });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAsyncData({
            state: "error",
            error: error instanceof Error ? error.message : "Unable to load data.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return asyncData;
}
