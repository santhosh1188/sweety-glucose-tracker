const TOKEN_KEY = 'sweety_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Expired session: clear it and go to login (not for login/register failures)
    if (res.status === 401 && token && !path.startsWith('/auth')) {
      setToken(null);
      localStorage.removeItem('sweety_user');
      window.location.href = '/login';
    }
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}