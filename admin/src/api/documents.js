const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const searchVehicleDocuments = async (plateNumber) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/search/?plate_number=${encodeURIComponent(plateNumber)}`, {
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
    console.error('Error searching vehicle documents:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const getDocumentStatistics = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/statistics/`, {
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
    console.error('Error fetching document statistics:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const sendDocumentNotice = async (vehicleId, noticeType = 'sms', documentType = 'all') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/send-notice/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify({
        vehicle_id: vehicleId,
        notice_type: noticeType,
        document_type: documentType
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending document notice:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const flagVehicle = async (vehicleId, reason = 'expired_documents') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/flag-vehicle/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify({
        vehicle_id: vehicleId,
        reason: reason
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error flagging vehicle:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const generateDocumentReport = async (vehicleId, reportType = 'complete') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/generate-report/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify({
        vehicle_id: vehicleId,
        report_type: reportType
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating report:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};