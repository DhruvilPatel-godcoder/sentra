const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const fetchPenaltyData = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams({
      search: params.search || '',
      status: params.status || 'all',
      page: params.page || 1,
      limit: params.limit || 10
    });

    const response = await fetch(`${API_BASE_URL}/api/penalty/data/?${queryParams}`, {
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
    console.error('Error fetching penalty data:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const fetchPenaltyDetails = async (penaltyId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/penalty/details/${penaltyId}/`, {
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
    console.error('Error fetching penalty details:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const sendPenaltyNotice = async (penaltyId, noticeType = 'sms') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/penalty/send-notice/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify({
        penalty_id: penaltyId,
        notice_type: noticeType
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending penalty notice:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const updatePenaltyStatus = async (penaltyId, status) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/penalty/update-status/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify({
        penalty_id: penaltyId,
        status: status
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating penalty status:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};

export const processPayment = async (penaltyId, paymentMethod = 'manual', autoDeduct = false) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/penalty/process-payment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      },
      body: JSON.stringify({
        penalty_id: penaltyId,
        payment_method: paymentMethod,
        auto_deduct: autoDeduct
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error processing payment:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
};