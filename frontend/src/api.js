import { supabase } from './supabaseClient';

// Central base URL for the NovaWare backend.
// All API calls in this web app hit the backend through this URL.
// Defaults to local backend when on localhost, or deployed backend when in production.
// Override at build time by setting REACT_APP_API_URL.
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE =
  process.env.REACT_APP_API_URL ||
  (isLocalhost ? 'http://localhost:8000' : 'https://react-native-app-dun.vercel.app');

export async function getAuthHeaders(user = null) {
  const headers = {};

  // Attach authentic Supabase JWT Bearer token if session exists
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    // Session retrieval error
  }

  // Pass user email for development / test fallback
  if (user?.email) {
    headers['X-User-Email'] = user.email;
  }

  return headers;
}

export async function apiFetch(path, options = {}, user = null) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const authHeaders = await getAuthHeaders(user);
  
  const mergedHeaders = {
    ...authHeaders,
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
}

export default API_BASE;
