const API_BASE = "http://127.0.0.1:8000/api/livefeed";

async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchCameras() {
  try {
    const res = await fetch(`${API_BASE}/cameras/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching cameras:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchLiveDetections(cameraId = null) {
  try {
    const url = cameraId 
      ? `${API_BASE}/detections/?camera_id=${cameraId}`
      : `${API_BASE}/detections/`;
    const res = await fetch(url);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching live detections:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchCameraStream(cameraId) {
  try {
    const res = await fetch(`${API_BASE}/stream/${cameraId}/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching camera stream:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchCameraStatus(cameraId) {
  try {
    const res = await fetch(`${API_BASE}/cameras/${cameraId}/status/`);
    return await handleResponse(res);
  } catch (error) {
    console.error('Error fetching camera status:', error);
    return { status: 'error', message: error.message };
  }
}

export async function updateCameraStatus(cameraId, status) {
  try {
    const res = await fetch(`${API_BASE}/cameras/${cameraId}/status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    });
    return await handleResponse(res);
  } catch (error) {
    console.error('Error updating camera status:', error);
    return { status: 'error', message: error.message };
  }
}