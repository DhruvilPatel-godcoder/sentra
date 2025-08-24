const API_BASE = "http://127.0.0.1:8000/api/userdashboard";

async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchUserDashboardStats(userId) {
  try {
    const res = await fetch(`${API_BASE}/stats/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching user dashboard stats:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchRecentViolations(userId) {
  try {
    const res = await fetch(`${API_BASE}/violations/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching recent violations:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchUserVehicles(userId) {
  try {
    const res = await fetch(`${API_BASE}/vehicles/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching user vehicles:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchUserPayments(userId) {
  try {
    const res = await fetch(`${API_BASE}/payments/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching user payments:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchUserProfile(userId) {
  try {
    const res = await fetch(`${API_BASE}/profile/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { status: 'error', message: error.message };
  }
}