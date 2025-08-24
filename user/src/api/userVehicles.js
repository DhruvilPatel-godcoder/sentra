const API_BASE = "http://127.0.0.1:8000/api/uservehicles";

async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchUserVehicleStats(userId) {
  try {
    const res = await fetch(`${API_BASE}/stats/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching vehicle stats:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchUserVehiclesWithDocuments(userId) {
  try {
    const res = await fetch(`${API_BASE}/list/${userId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching vehicles with documents:', error);
    return { status: 'error', message: error.message };
  }
}

export async function uploadVehicleDocument(userId, documentData) {
  try {
    const res = await fetch(`${API_BASE}/upload-document/${userId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(documentData),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Error uploading document:', error);
    return { status: 'error', message: error.message };
  }
}

export async function downloadVehicleDocument(userId, vehicleId, documentType) {
  try {
    const res = await fetch(`${API_BASE}/download-document/${userId}/${vehicleId}/${documentType}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    return { status: 'error', message: error.message };
  }
}

export async function renewVehicleDocument(userId, renewalData) {
  try {
    const res = await fetch(`${API_BASE}/renew-document/${userId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(renewalData),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Error renewing document:', error);
    return { status: 'error', message: error.message };
  }
}

export async function payFinesToUnblock(userId, paymentData) {
  try {
    const res = await fetch(`${API_BASE}/pay-fines/${userId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Error paying fines:', error);
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

// Helper function to calculate progress value
export function getProgressValue(daysLeft, maxDays = 365) {
  if (daysLeft < 0) return 0;
  return Math.min((daysLeft / maxDays) * 100, 100);
}

// Helper function to format date
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-IN');
  } catch {
    return 'Invalid Date';
  }
}