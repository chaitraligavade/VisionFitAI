
export const API_BASE_URL = "http://127.0.0.1:8000";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || `API request failed: ${response.status}`
    );
  }

  return data;
}

export function checkBackend() {
  return apiRequest("/api/health");
}

export function fetchClothes() {
  return apiRequest("/api/clothes");
}

export function getAssetUrl(path) {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function startTryOn(index = 0) {
  return apiRequest("/api/tryon/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ index }),
  });
}

export function stopTryOn() {
  return apiRequest("/api/tryon/stop", {
    method: "POST",
  });
}

export function getTryOnStreamUrl() {
  return `${API_BASE_URL}/api/tryon/stream`;
}
