export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : `http://${window.location.hostname}:4000/api`);

// Convenience for cases where we need the origin (e.g. /health, Socket.io URL)
export const API_ORIGIN_URL =
  API_BASE_URL === "" ? window.location.origin : API_BASE_URL.replace(/\/api$/, "");
