/**
 * Returns the base URL for plugin HTTP API requests.
 *
 * - Plugin mode (build:plugin): uses VITE_PLUGIN_ROUTE_PREFIX injected at build time
 * - Dev mode (yarn dev): uses VITE_PLUGIN_API_URL + VITE_PLUGIN_API_PORT
 */
export function getApiBaseUrl(): string {
  if (__IS_PLUGIN__) {
    const routePrefix = import.meta.env.VITE_PLUGIN_ROUTE_PREFIX;
    return `${routePrefix}/api`;
  }
  const base_url = import.meta.env.VITE_PLUGIN_API_URL || "http://localhost";
  const port = import.meta.env.VITE_PLUGIN_API_PORT || "8082";
  return `${base_url}:${port}/api`;
}

/**
 * Returns the base URL for plugin WebSocket connections.
 *
 * - Plugin mode (build:plugin): derives ws(s) URL from current page host + route prefix
 * - Dev mode (yarn dev): uses VITE_PLUGIN_API_URL hostname + VITE_PLUGIN_API_PORT
 */
export function getWsBaseUrl(): string {
  if (__IS_PLUGIN__) {
    const routePrefix = import.meta.env.VITE_PLUGIN_ROUTE_PREFIX;
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${location.host}${routePrefix}/ws`;
  }
  const base_url = import.meta.env.VITE_PLUGIN_API_URL || "http://localhost";
  const port = import.meta.env.VITE_PLUGIN_API_PORT || "8082";
  const { hostname } = new URL(base_url);
  return `ws://${hostname}:${port}/ws`;
}
