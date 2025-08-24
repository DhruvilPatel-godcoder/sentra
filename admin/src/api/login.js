const API_BASE = "http://127.0.0.1:8000/api/authentication";

async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function adminLogin(credentials) {
  try {
    const res = await fetch(`${API_BASE}/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Login error:', error);
    return { status: 'error', message: error.message };
  }
}

export async function adminLogout() {
  try {
    const res = await fetch(`${API_BASE}/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Logout error:', error);
    return { status: 'error', message: error.message };
  }
}

// Helper function to check if user is authenticated
export function isAuthenticated() {
  const token = localStorage.getItem('adminToken');
  const adminData = localStorage.getItem('adminData');
  return !!(token && adminData);
}

// Helper function to get admin data
export function getAdminData() {
  const adminData = localStorage.getItem('adminData');
  try {
    return adminData ? JSON.parse(adminData) : null;
  } catch {
    return null;
  }
}

// Helper function to clear authentication data
export function clearAuthData() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminData');
}