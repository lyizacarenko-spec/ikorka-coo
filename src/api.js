// Standalone backend: ikorka-coo-backend on its own Railway service and
// database — nothing shared with task-dashboard-backend or the other
// panels. VITE_API_URL must be set at build time (GitHub Actions repo
// variable) once the Railway service exists; there is no fallback to
// another project's URL here on purpose.
const API_BASE = import.meta.env.VITE_API_URL;

function pin() {
  return sessionStorage.getItem("ikorka_coo_pin") || "";
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-pin": pin(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `request_failed_${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // COO_PIN, OWNER_PIN, EVGENIYA_PIN all resolve to full access here —
  // no restricted/read-only role on this panel.
  login: (candidatePin) =>
    fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: candidatePin }),
    }).then(async (res) => {
      if (!res.ok) throw new Error("invalid_pin");
      return res.json(); // { role }
    }),

  getDaily: () => request("/daily-tasks"),
  addDaily: (text) => request("/daily-tasks", { method: "POST", body: JSON.stringify({ text }) }),
  toggleDaily: (id, done) =>
    request(`/daily-tasks/${id}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  editDaily: (id, text) =>
    request(`/daily-tasks/${id}`, { method: "PATCH", body: JSON.stringify({ text }) }),
  setDailyCompletedAt: (id, completed_at) =>
    request(`/daily-tasks/${id}`, { method: "PATCH", body: JSON.stringify({ completed_at }) }),
  deleteDaily: (id) => request(`/daily-tasks/${id}`, { method: "DELETE" }),

  getAssigned: () => request("/assigned-tasks"),
  addAssigned: (title, from_user) =>
    request("/assigned-tasks", { method: "POST", body: JSON.stringify({ title, from_user }) }),
  setAssignedStatus: (id, status) =>
    request(`/assigned-tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  editAssigned: (id, patch) =>
    request(`/assigned-tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteAssigned: (id) => request(`/assigned-tasks/${id}`, { method: "DELETE" }),
};

export function setStoredPin(p) {
  sessionStorage.setItem("ikorka_coo_pin", p);
}
export function clearStoredPin() {
  sessionStorage.removeItem("ikorka_coo_pin");
}
export function getStoredRole() {
  return sessionStorage.getItem("ikorka_coo_role") || null;
}
export function setStoredRole(role) {
  sessionStorage.setItem("ikorka_coo_role", role);
}
export function clearStoredRole() {
  sessionStorage.removeItem("ikorka_coo_role");
}
