const API_BASE = "http://127.0.0.1:8000/api/userdisputes";

async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchUserDisputeStats(userId) {
  try {
    const res = await fetch(`${API_BASE}/stats/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching dispute stats:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchUserDisputesHistory(userId, searchTerm = '', statusFilter = 'all') {
  try {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    
    const url = `${API_BASE}/history/${userId}/?${params.toString()}`;
    const res = await fetch(url);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching disputes history:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchPendingViolationsForDispute(userId) {
  try {
    const res = await fetch(`${API_BASE}/pending-violations/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching pending violations:', error);
    return { status: 'error', message: error.message };
  }
}

export async function submitDispute(userId, disputeData) {
  try {
    const res = await fetch(`${API_BASE}/submit/${userId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(disputeData),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Error submitting dispute:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchDisputeDetails(userId, appealId) {
  try {
    const res = await fetch(`${API_BASE}/details/${userId}/${appealId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching dispute details:', error);
    return { status: 'error', message: error.message };
  }
}

export async function uploadEvidence(userId, appealId, evidenceFile) {
  try {
    const res = await fetch(`${API_BASE}/upload-evidence/${userId}/${appealId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ evidence_file: evidenceFile }),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Error uploading evidence:', error);
    return { status: 'error', message: error.message };
  }
}

// Helper function to convert file to base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}