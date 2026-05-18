const TOKEN_KEY = "childwatch_token";
const PROFILE_KEY = "childwatch_profile";
const ROLE_KEY = "childwatch_role";

export function saveAuthSession(token, profile, role = "user") {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(ROLE_KEY, role);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function getAuthRole() {
  return localStorage.getItem(ROLE_KEY);
}

export function getAuthProfile() {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
