/**
 * Normalizes the backend API base URL across development and cloud deployments (e.g. Render).
 *
 * Supports:
 * - Direct Render Service URL: "https://e-waste-backend.onrender.com" -> "https://e-waste-backend.onrender.com/api"
 * - Explicit API URL: "https://e-waste-backend.onrender.com/api" -> "https://e-waste-backend.onrender.com/api"
 * - Trailing slashes: "https://e-waste-backend.onrender.com/api/" -> "https://e-waste-backend.onrender.com/api"
 * - Default / local proxy: "/api"
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) return '/api';

  const trimmed = envUrl.trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '/api') return '/api';
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

export const API_BASE = getApiBaseUrl();

export default API_BASE;
