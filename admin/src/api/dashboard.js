const API_BASE = "http://127.0.0.1:8000/api/dashboard";

async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchDashboardStats() {
  try {
    const res = await fetch(`${API_BASE}/stats/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchRecentViolations() {
  try {
    const res = await fetch(`${API_BASE}/recent-violations/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching recent violations:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchViolationTrends() {
  try {
    const res = await fetch(`${API_BASE}/violation-trends/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching violation trends:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchTopLocations() {
  try {
    const res = await fetch(`${API_BASE}/top-locations/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching top locations:', error);
    return { status: 'error', message: error.message };
  }
}