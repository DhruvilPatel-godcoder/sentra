const API_BASE = "http://127.0.0.1:8000/api/userpayments";

async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchUserPaymentStats(userId) {
  try {
    const res = await fetch(`${API_BASE}/stats/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchUserPaymentHistory(userId, searchTerm = '') {
  try {
    const url = searchTerm 
      ? `${API_BASE}/history/${userId}/?search=${encodeURIComponent(searchTerm)}`
      : `${API_BASE}/history/${userId}/`;
    const res = await fetch(url);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return { status: 'error', message: error.message };
  }
}

export async function retryFailedPayment(userId, paymentId) {
  try {
    const res = await fetch(`${API_BASE}/retry/${userId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_id: paymentId }),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Error retrying payment:', error);
    return { status: 'error', message: error.message };
  }
}

export async function downloadPaymentReceipt(userId, paymentId) {
  try {
    const res = await fetch(`${API_BASE}/receipt/${userId}/${paymentId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error downloading receipt:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchPendingViolations(userId) {
  try {
    const res = await fetch(`${API_BASE}/pending/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching pending violations:', error);
    return { status: 'error', message: error.message };
  }
}

export async function processBulkPayment(userId, violationIds, paymentMethod = 'UPI') {
  try {
    const res = await fetch(`${API_BASE}/bulk-pay/${userId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        violation_ids: violationIds,
        payment_method: paymentMethod 
      }),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Error processing bulk payment:', error);
    return { status: 'error', message: error.message };
  }
}