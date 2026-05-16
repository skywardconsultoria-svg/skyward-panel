// Helpers de comunicación con el backend.
// Sin dependencias de React ni del árbol de componentes.

export const API = import.meta.env.VITE_API_URL || "https://api.edgecrm.net";

export function tok() {
  return localStorage.getItem("edge_token") || "";
}
export function setTok(t) { localStorage.setItem("edge_token", t); }
export function setRefreshTok(t) { localStorage.setItem("edge_refresh_token", t); }
export function getRefreshTok() { return localStorage.getItem("edge_refresh_token") || ""; }
export function clearTokens() {
  localStorage.removeItem("edge_token");
  localStorage.removeItem("edge_refresh_token");
}

export function aH() {
  return { "Authorization": `Bearer ${tok()}` };
}

export function jH() {
  return { "Content-Type": "application/json", ...aH() };
}

// ── Fetch with automatic JWT refresh ────────────────────────────
// Wraps fetch(); on 401 attempts one refresh, retries, then throws.
// Usage identical to fetch() — pass URL and init as usual.
let _isRefreshing = false;
let _refreshQueue = [];

function processQueue(error, token = null) {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  _refreshQueue = [];
}

export async function apiFetch(url, init = {}) {
  // Inject auth header
  const headers = {
    ...(init.headers || {}),
    Authorization: `Bearer ${tok()}`,
  };
  const resp = await fetch(url, { ...init, headers });

  if (resp.status !== 401) return resp;

  // ── Token expired — attempt refresh ────────────────────────
  const refreshToken = getRefreshTok();
  if (!refreshToken) {
    // No refresh token — force logout
    clearTokens();
    window.location.href = "/";
    return resp;
  }

  if (_isRefreshing) {
    // Queue this request until refresh completes
    return new Promise((resolve, reject) => {
      _refreshQueue.push({ resolve, reject });
    }).then(newToken => {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      return fetch(url, { ...init, headers: retryHeaders });
    });
  }

  _isRefreshing = true;

  try {
    const refreshResp = await fetch(`${API}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!refreshResp.ok) {
      clearTokens();
      processQueue(new Error("Sesión vencida"), null);
      window.location.href = "/";
      return resp;
    }

    const data = await refreshResp.json();
    setTok(data.token);
    if (data.refresh_token) setRefreshTok(data.refresh_token);

    processQueue(null, data.token);

    // Retry original request with new token
    const retryHeaders = { ...headers, Authorization: `Bearer ${data.token}` };
    return fetch(url, { ...init, headers: retryHeaders });
  } catch (err) {
    processQueue(err, null);
    clearTokens();
    window.location.href = "/";
    return resp;
  } finally {
    _isRefreshing = false;
  }
}
