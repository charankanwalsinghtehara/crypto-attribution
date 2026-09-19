const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function normalizeBaseUrl(value) {
  return (value || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeBaseUrl(
  localStorage.getItem("crypto_attribution_api_url") ||
    import.meta.env.VITE_API_BASE_URL
);

const TOKEN_KEY = "crypto_attribution_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch {
      // Keep default error.
    }

    if (response.status === 401) {
      clearStoredToken();
      window.dispatchEvent(new Event("auth-expired"));
    }

    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function getHealth() {
  return request("/health");
}

export function getUsers() {
  return request("/users/");
}

export function getUser(userId) {
  return request(`/users/${userId}`);
}

export function getCurrentUser() {
  return request("/users/me");
}

export function registerUser(payload) {
  return request("/users/register", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  const data = await request("/users/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload),
  });
  setStoredToken(data.access_token);
  return data;
}

export function logoutUser() {
  clearStoredToken();
}

export function getCryptoStatus() {
  return request("/users/crypto/status");
}

export function getDocuments() {
  return request("/documents/");
}

export function getDocument(documentId) {
  return request(`/documents/${documentId}`);
}

export function getDocumentRecipients(documentId) {
  return request(`/documents/${documentId}/recipients`);
}

export async function uploadDocument({file, title, senderId, recipientIds = []}) {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("sender_id", String(senderId));
  formData.append("recipient_ids", recipientIds.join(","));
  formData.append("file", file);

  return request("/documents/upload", {method: "POST", body: formData});
}

export function getDecryptionEvents() {
  return request("/decrypt/events");
}

export function decryptDocument(documentId) {
  return request(`/decrypt/${documentId}`, {method: "POST"});
}

export function identifyLeakedDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/forensic/identify", {method: "POST", body: formData});
}

export function verifyLedger() {
  return request("/forensic/ledger/verify");
}

export function getLedgerBlocks() {
  return request("/forensic/ledger/blocks");
}

export async function downloadFile(path) {
  const token = getStoredToken();
  if (!token) throw new Error("Authentication required");

  const response = await fetch(getFileUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch {
      // Keep default error.
    }
    if (response.status === 401) {
      clearStoredToken();
      window.dispatchEvent(new Event("auth-expired"));
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return {
    blob,
    filename: match?.[1] || "download",
  };
}

export function getFileUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export { TOKEN_KEY };


export function getPasswordByteLength(password) {
  return new TextEncoder().encode(password).length;
}
