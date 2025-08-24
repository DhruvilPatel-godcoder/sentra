const API_BASE = "http://127.0.0.1:8000/api/livedetection";

async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// Upload and process single image
export async function uploadImageForDetection(imageFile, cameraId = 'upload') {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('camera_id', cameraId);

    const res = await fetch(`${API_BASE}/process-image/`, {
      method: 'POST',
      body: formData,
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Upload image error:', error);
    return { status: 'error', message: error.message };
  }
}

// Get detection results
export async function getDetectionResults(params = {}) {
  try {
    const queryParams = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/detections/?${queryParams}`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Get detection results error:', error);
    return { status: 'error', message: error.message };
  }
}

// Get violation memos
export async function getViolationMemos(params = {}) {
  try {
    const queryParams = new URLSearchParams(params);
    const res = await fetch(`${API_BASE}/violations/?${queryParams}`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Get violation memos error:', error);
    return { status: 'error', message: error.message };
  }
}

// Get detection statistics
export async function getDetectionStats(timeRange = '24h') {
  try {
    const res = await fetch(`${API_BASE}/stats/?range=${timeRange}`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Get detection stats error:', error);
    return { status: 'error', message: error.message };
  }
}

// Train model with current dataset
export async function trainHelmetModel() {
  try {
    const res = await fetch(`${API_BASE}/train-model/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Train model error:', error);
    return { status: 'error', message: error.message };
  }
}

// Get training status
export async function getTrainingStatus() {
  try {
    const res = await fetch(`${API_BASE}/training-status/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Get training status error:', error);
    return { status: 'error', message: error.message };
  }
}

// Get user info by plate number
export async function getUserByPlate(plateNumber) {
  try {
    const res = await fetch(`${API_BASE}/user-by-plate/?plate=${plateNumber}`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Get user by plate error:', error);
    return { status: 'error', message: error.message };
  }
}

// Process violation and generate memo
export async function processViolation(violationData) {
  try {
    const res = await fetch(`${API_BASE}/process-violation/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(violationData),
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Process violation error:', error);
    return { status: 'error', message: error.message };
  }
}

// Get camera list
export async function getCameraList() {
  try {
    const res = await fetch(`${API_BASE}/cameras/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Get camera list error:', error);
    return { status: 'error', message: error.message };
  }
}