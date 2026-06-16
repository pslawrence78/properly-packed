export const DEPLOYMENT_BASE_PATH = "/properly-packed/";

export function getRouterBasename(baseUrl = import.meta.env.BASE_URL) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed === "" ? undefined : trimmed;
}
