const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const fetchAIDetectionData = async () => {
  try {
    console.log('Fetching AI detection data from:', `${API_BASE_URL}/api/aidetection/data/`);
    
    const response = await fetch(`${API_BASE_URL}/api/aidetection/data/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Received data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching AI detection data:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const fetchViolationDetails = async (violationId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/aidetection/violation/${violationId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching violation details:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const updateViolationStatus = async (violationId, status) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/aidetection/update-status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify({
        violation_id: violationId,
        status: status
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating violation status:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const addLiveDetection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/aidetection/add-live-detection/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding live detection:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

// Test API connection
export const testAPIConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/aidetection/test/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error testing API:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};