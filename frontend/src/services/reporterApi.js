import { getAuthToken } from "../utils/authStorage";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function getMyReports() {
  return request("/reporter/reports");
}

export function createMyReport(payload) {
  return request("/reporter/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function trackMyCase(caseId) {
  return request(`/reporter/reports/track/${encodeURIComponent(caseId)}`);
}

export function getMyNotifications() {
  return request("/reporter/notifications");
}

export function markNotificationRead(id) {
  return request(`/reporter/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsRead() {
  return request("/reporter/notifications/read-all", {
    method: "PATCH",
  });
}
