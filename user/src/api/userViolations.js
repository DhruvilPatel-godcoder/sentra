const API_BASE = "http://127.0.0.1:8000/api/userviolations";

async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchUserViolationStats(userId) {
  try {
    const res = await fetch(`${API_BASE}/stats/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching violation stats:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchUserViolationsHistory(userId, searchTerm = '', statusFilter = 'all') {
  try {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    
    const url = `${API_BASE}/history/${userId}/${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching violations history:', error);
    return { status: 'error', message: error.message };
  }
}

export async function payViolation(userId, violationId, paymentMethod = 'UPI') {
  try {
    const res = await fetch(`${API_BASE}/pay/${userId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        violation_id: violationId,
        payment_method: paymentMethod 
      }),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Error processing payment:', error);
    return { status: 'error', message: error.message };
  }
}

export async function submitDispute(userId, violationId, description) {
  try {
    const res = await fetch(`${API_BASE}/dispute/${userId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        violation_id: violationId,
        description: description 
      }),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Error submitting dispute:', error);
    return { status: 'error', message: error.message };
  }
}

export async function downloadEvidence(userId, violationId) {
  try {
    const res = await fetch(`${API_BASE}/evidence/${userId}/${violationId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error downloading evidence:', error);
    return { status: 'error', message: error.message };
  }
}

export async function getViolationDetails(userId, violationId) {
  try {
    const res = await fetch(`${API_BASE}/details/${userId}/${violationId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching violation details:', error);
    return { status: 'error', message: error.message };
  }
}