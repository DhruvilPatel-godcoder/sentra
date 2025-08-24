const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const sendOTP = async (mobileNumber) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/userlogin/send-otp/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile_number: mobileNumber
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Enhanced console display with browser console formatting
    if (data.status === 'success' && data.otp) {
      console.clear(); // Clear console for better visibility
      
      console.log('%c' + '='.repeat(60), 'color: #2196F3; font-weight: bold;');
      console.log('%c🔐 SENTRA OTP VERIFICATION', 'color: #4CAF50; font-size: 18px; font-weight: bold;');
      console.log('%c' + '='.repeat(60), 'color: #2196F3; font-weight: bold;');
      console.log('%c📱 Mobile Number: %c' + mobileNumber, 'color: #FF9800; font-weight: bold;', 'color: #333; font-weight: bold;');
      console.log('%c🔢 OTP Code: %c' + data.otp, 'color: #E91E63; font-weight: bold;', 'color: #E91E63; font-size: 24px; font-weight: bold; background: #ffeb3b; padding: 5px;');
      console.log('%c⏰ Generated: %c' + new Date().toLocaleString(), 'color: #9C27B0; font-weight: bold;', 'color: #333;');
      console.log('%c🕐 Expires: %c' + new Date(Date.now() + 5 * 60 * 1000).toLocaleString(), 'color: #F44336; font-weight: bold;', 'color: #333;');
      console.log('%c👤 User Exists: %c' + (data.user_exists ? 'Yes' : 'No (New Registration)'), 'color: #795548; font-weight: bold;', 'color: #333;');
      console.log('%c' + '='.repeat(60), 'color: #2196F3; font-weight: bold;');
      console.log('%c💡 Copy the OTP above and paste it in the login form', 'color: #607D8B; font-style: italic;');
      console.log('%c⚠️  This OTP is valid for 5 minutes only', 'color: #FF5722; font-weight: bold;');
      console.log('%c' + '='.repeat(60), 'color: #2196F3; font-weight: bold;');
    }
    
    return data;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      status: 'error',
      message: error.message || 'Failed to send OTP'
    };
  }
};

export const verifyOTP = async (mobileNumber, otp) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/userlogin/verify-otp/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile_number: mobileNumber,
        otp: otp
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Console feedback for verification
    if (data.status === 'success') {
      console.log('%c✅ OTP VERIFICATION SUCCESSFUL!', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
      if (data.user_exists) {
        console.log('%c🎉 Welcome back, ' + (data.user_data?.name || 'User') + '!', 'color: #2196F3; font-weight: bold;');
      } else {
        console.log('%c📝 Please complete your registration', 'color: #FF9800; font-weight: bold;');
      }
    } else {
      console.log('%c❌ OTP Verification Failed: ' + data.message, 'color: #F44336; font-weight: bold;');
    }
    
    return data;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      status: 'error',
      message: error.message || 'Failed to verify OTP'
    };
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/userlogin/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Console feedback for registration
    if (data.status === 'success') {
      console.log('%c🎊 REGISTRATION SUCCESSFUL!', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
      console.log('%c👤 User ID: ' + data.user_data.user_id, 'color: #2196F3; font-weight: bold;');
      console.log('%c💰 Bank Account: ' + data.user_data.bank_account_number + ' (₹5000 initial balance)', 'color: #4CAF50; font-weight: bold;');
      console.log('%c🎭 Face Authentication: ' + (data.user_data.has_face_data ? 'Enabled' : 'Not Set'), 'color: #9C27B0; font-weight: bold;');
    }
    
    return data;
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      status: 'error',
      message: error.message || 'Failed to register user'
    };
  }
};

// ...rest of the existing code...

export const faceLogin = async (faceImage) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/userlogin/face-login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        face_image: faceImage
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Console feedback for face login
    if (data.status === 'success') {
      console.log('%c👤 FACE LOGIN SUCCESSFUL!', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
      console.log('%c🎉 Welcome, ' + data.user_data.name + '!', 'color: #2196F3; font-weight: bold;');
    } else {
      console.log('%c❌ Face Recognition Failed: ' + data.message, 'color: #F44336; font-weight: bold;');
    }
    
    return data;
  } catch (error) {
    console.error('Error in face login:', error);
    return {
      status: 'error',
      message: error.message || 'Face authentication failed'
    };
  }
};

export const updateFaceData = async (userId, faceImage) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/userlogin/update-face/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        face_image: faceImage
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating face data:', error);
    return {
      status: 'error',
      message: error.message || 'Failed to update face data'
    };
  }
};

// Camera utilities
export const startCamera = () => {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 640, 
        height: 480,
        facingMode: 'user'
      } 
    })
    .then(stream => {
      console.log('📸 Camera started successfully');
      resolve(stream);
    })
    .catch(error => {
      console.error('❌ Error accessing camera:', error);
      reject(error);
    });
  });
};

export const captureFrame = (videoElement) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    context.drawImage(videoElement, 0, 0);
    
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    console.log('📷 Frame captured for face recognition');
    resolve(dataURL);
  });
};

export const stopCamera = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    console.log('📸 Camera stopped');
  }
};

// Debug function to check OTP storage (development only)
export const debugOTPStorage = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/userlogin/debug-otp/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.table(data.active_otps);
    return data;
  } catch (error) {
    console.error('Error fetching OTP debug info:', error);
    return null;
  }
};
// ...existing code...

