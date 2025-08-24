import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP, verifyOTP, registerUser, faceLogin, updateFaceData, startCamera, captureFrame, stopCamera } from '../api/login';

const LoginForm = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [authMethod, setAuthMethod] = useState("mobile");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [pendingMobile, setPendingMobile] = useState("");
  const [userExists, setUserExists] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    name: '',
    email: '',
    dl_number: ''
  });
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedFaceImage, setCapturedFaceImage] = useState(null);
  const [faceSetupMode, setFaceSetupMode] = useState(false); // For registration face setup
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [authMethod, otpSent, showRegistration]);

  // Send OTP handler
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await sendOTP(mobile);
      
      if (response.status === 'success') {
        setOtpSent(true);
        setPendingMobile(mobile);
        setUserExists(response.user_exists);
        setSuccess(response.message);
        
        alert('OTP sent! Check browser console for OTP (Dev Mode)');
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP handler
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await verifyOTP(pendingMobile, otp);
      
      if (response.status === 'success') {
        if (response.user_exists) {
          // Existing user - redirect to dashboard with user_id
          setSuccess(response.message);
          localStorage.setItem('userData', JSON.stringify(response.user_data));
          localStorage.setItem('userToken', 'authenticated');
          
          setTimeout(() => {
            navigate(`/userdashboard/${response.user_data.user_id}`);
          }, 1000);
        } else {
          // New user - show registration form
          setSuccess(response.message);
          setShowRegistration(true);
        }
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration (without face initially)
  const handleRegistration = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const userData = {
        mobile_number: pendingMobile,
        name: registrationData.name,
        email: registrationData.email,
        dl_number: registrationData.dl_number,
        face_image: capturedFaceImage // Include captured face image
      };

      const response = await registerUser(userData);
      
      if (response.status === 'success') {
        setSuccess('Registration successful!');
        localStorage.setItem('userData', JSON.stringify(response.user_data));
        localStorage.setItem('userToken', 'authenticated');
        
        // If no face was captured, ask if user wants to setup face authentication
        if (!capturedFaceImage && window.confirm('Would you like to setup face authentication for faster login?')) {
          setFaceSetupMode(true);
          setShowFaceCapture(true);
          setIsLoading(false);
          return;
        }
        
        setTimeout(() => {
          navigate(`/userdashboard/${response.user_data.user_id}`);
        }, 1000);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start camera for face capture
  const startFaceCapture = async () => {
    try {
      const stream = await startCamera();
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setError('Could not access camera. Please check permissions.');
    }
  };

  // Capture face image
  const captureFaceImage = async () => {
    if (!videoRef.current || !cameraStream) return;

    try {
      const faceImage = await captureFrame(videoRef.current);
      
      if (authMethod === 'face') {
        // Face login
        setIsLoading(true);
        const response = await faceLogin(faceImage);
        
        if (response.status === 'success') {
          setSuccess(response.message);
          localStorage.setItem('userData', JSON.stringify(response.user_data));
          localStorage.setItem('userToken', 'authenticated');
          
          stopCamera(cameraStream);
          setCameraStream(null);
          
          setTimeout(() => {
            navigate(`/userdashboard/${response.user_data.user_id}`);
          }, 1000);
        } else {
          setError(response.message);
        }
        setIsLoading(false);
      } else if (faceSetupMode) {
        // Post-registration face setup
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData && userData.user_id) {
          setIsLoading(true);
          const response = await updateFaceData(userData.user_id, faceImage);
          
          if (response.status === 'success') {
            setSuccess('Face authentication setup successfully!');
            stopCamera(cameraStream);
            setCameraStream(null);
            setShowFaceCapture(false);
            setFaceSetupMode(false);
            
            setTimeout(() => {
              navigate(`/userdashboard/${userData.user_id}`);
            }, 1000);
          } else {
            setError(response.message);
          }
          setIsLoading(false);
        }
      } else {
        // Registration face capture
        setCapturedFaceImage(faceImage);
        setSuccess('Face captured successfully! You can now complete registration.');
        stopCamera(cameraStream);
        setCameraStream(null);
        setShowFaceCapture(false);
      }
    } catch (error) {
      setError('Failed to capture face image.');
    }
  };

  // Face login handler
  const handleFaceLogin = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);
    setShowFaceCapture(true);
    await startFaceCapture();
    setIsLoading(false);
  };

  // Start face capture for registration
  const handleRegistrationFaceCapture = async () => {
    setError("");
    setSuccess("");
    setShowFaceCapture(true);
    await startFaceCapture();
  };

  // Close camera
  const closeFaceCapture = () => {
    if (cameraStream) {
      stopCamera(cameraStream);
      setCameraStream(null);
    }
    setShowFaceCapture(false);
    if (!faceSetupMode) {
      setAuthMethod('mobile');
    }
  };

  // Reset form
  const resetForm = () => {
    setOtpSent(false);
    setOtp("");
    setError("");
    setSuccess("");
    setShowRegistration(false);
    setRegistrationData({ name: '', email: '', dl_number: '' });
    setCapturedFaceImage(null);
    setFaceSetupMode(false);
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center px-4"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
    >
      <div className="card border-0 shadow-lg" style={{ width: "100%", maxWidth: showFaceCapture ? "600px" : "420px" }}>
        <div className="card-header border-0 text-center py-4" style={{ background: "linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%)" }}>
          <div
            className={`mx-auto rounded-circle d-flex align-items-center justify-content-center mb-3 ${
              authMethod === "face" ? "bg-primary bg-opacity-10" : "bg-success bg-opacity-10"
            }`}
            style={{ width: "72px", height: "72px" }}
          >
            {authMethod === "face" ? (
              <i className="bi bi-person-circle text-primary" style={{ fontSize: "36px" }}></i>
            ) : otpSent ? (
              <i className="bi bi-phone-fill text-success" style={{ fontSize: "36px" }}></i>
            ) : (
              <i className="bi bi-shield-check text-success" style={{ fontSize: "36px" }}></i>
            )}
          </div>
          <h4 className="fw-bold mb-2 text-dark">SENTRA Citizen Portal</h4>
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
            {showFaceCapture
              ? faceSetupMode 
                ? "Setup face authentication for future logins"
                : "Position your face in the camera"
              : authMethod === "face"
              ? "Login using face authentication"
              : showRegistration
              ? "Complete your registration"
              : otpSent
              ? `Enter OTP sent to ${pendingMobile}`
              : "Login with your mobile number"}
          </p>
        </div>

        <div className="card-body p-4">
          {/* Error Message */}
          {error && (
            <div className="alert alert-danger py-2 d-flex align-items-center border-0 shadow-sm mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2 text-danger" style={{ fontSize: "18px" }}></i>
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="alert alert-success py-2 d-flex align-items-center border-0 shadow-sm mb-3">
              <i className="bi bi-check-circle-fill me-2 text-success" style={{ fontSize: "18px" }}></i>
              <span>{success}</span>
            </div>
          )}

          {/* Face Capture Interface */}
          {showFaceCapture && (
            <div className="text-center">
              <div className="mb-4">
                <div className="position-relative mx-auto" style={{ maxWidth: "400px" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    style={{
                      width: "100%",
                      height: "320px",
                      objectFit: "cover",
                      borderRadius: "16px",
                      border: "4px solid #e3f2fd"
                    }}
                  />
                  {/* Face detection overlay */}
                  <div className="position-absolute top-50 start-50 translate-middle">
                    <div 
                      className="border border-3 border-primary rounded-circle bg-transparent"
                      style={{ width: "200px", height: "200px", opacity: "0.3" }}
                    ></div>
                  </div>
                  {/* Status indicator */}
                  <div className="position-absolute top-0 end-0 m-3">
                    <span className="badge bg-success d-flex align-items-center px-3 py-2" style={{ borderRadius: "20px" }}>
                      <span className="bg-white rounded-circle me-2 pulse-dot"></span>
                      <i className="bi bi-camera-video me-2"></i>
                      LIVE
                    </span>
                  </div>
                </div>
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>
              <div className="d-flex gap-2 justify-content-center">
                <button
                  className="btn btn-success px-4 py-2 d-flex align-items-center"
                  onClick={captureFaceImage}
                  disabled={isLoading || !cameraStream}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <i className={`bi ${authMethod === 'face' ? 'bi-person-check' : faceSetupMode ? 'bi-shield-check' : 'bi-camera'} me-2`}></i>
                      <span>
                        {authMethod === 'face' ? "Capture & Login" :
                         faceSetupMode ? "Setup Face Auth" :
                         "Capture Face"}
                      </span>
                    </>
                  )}
                </button>
                <button
                  className="btn btn-outline-secondary px-4 py-2 d-flex align-items-center"
                  onClick={closeFaceCapture}
                >
                  <i className="bi bi-x-lg me-2"></i>
                  <span>{faceSetupMode ? "Skip" : "Cancel"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Registration Form */}
          {showRegistration && !showFaceCapture && (
            <form onSubmit={handleRegistration}>
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center">
                  <i className="bi bi-person me-2 text-primary"></i>
                  Full Name *
                </label>
                <input
                  type="text"
                  className="form-control shadow-sm"
                  placeholder="Enter your full name"
                  value={registrationData.name}
                  onChange={(e) => setRegistrationData({...registrationData, name: e.target.value})}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center">
                  <i className="bi bi-envelope me-2 text-primary"></i>
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-control shadow-sm"
                  placeholder="Enter your email"
                  value={registrationData.email}
                  onChange={(e) => setRegistrationData({...registrationData, email: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center">
                  <i className="bi bi-credit-card me-2 text-primary"></i>
                  Driving License Number
                </label>
                <input
                  type="text"
                  className="form-control shadow-sm"
                  placeholder="Enter your DL number"
                  value={registrationData.dl_number}
                  onChange={(e) => setRegistrationData({...registrationData, dl_number: e.target.value})}
                />
              </div>
              
              {/* Face Capture Section */}
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center">
                  <i className="bi bi-camera me-2 text-primary"></i>
                  Face Authentication (Optional)
                </label>
                <div className="card border-0 bg-light shadow-sm">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-semibold d-flex align-items-center">
                          {capturedFaceImage ? (
                            <>
                              <i className="bi bi-check-circle-fill text-success me-2"></i>
                              <span className="text-success">Face captured successfully!</span>
                            </>
                          ) : (
                            <>
                              <i className="bi bi-camera-fill text-muted me-2"></i>
                              <span className="text-muted">No face captured</span>
                            </>
                          )}
                        </div>
                        <small className="text-muted d-flex align-items-center mt-1">
                          <i className="bi bi-info-circle me-1"></i>
                          Capture your face for quick login in future
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm d-flex align-items-center"
                        onClick={handleRegistrationFaceCapture}
                      >
                        <i className="bi bi-camera me-1"></i>
                        {capturedFaceImage ? "Recapture" : "Capture Face"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="alert alert-info border-0 py-2 d-flex align-items-center">
                  <i className="bi bi-bank me-2 text-info" style={{ fontSize: "18px" }}></i>
                  <span style={{ fontSize: "14px" }}>
                    A bank account with ₹5,000 initial balance will be created automatically for penalty payments.
                  </span>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-success w-100 py-2 d-flex align-items-center justify-content-center"
                disabled={isLoading || !registrationData.name}
              >
                {isLoading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-plus me-2"></i>
                    <span>Complete Registration</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Mobile OTP Login */}
          {authMethod === "mobile" && !otpSent && !showRegistration && !showFaceCapture && (
            <form onSubmit={handleSendOTP}>
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center">
                  <i className="bi bi-phone me-2 text-primary"></i>
                  Mobile Number
                </label>
                <div className="input-group shadow-sm">
                  <span className="input-group-text bg-light border-end-0 d-flex align-items-center">
                    <i className="bi bi-flag me-1"></i>
                    +91
                  </span>
                  <input
                    type="tel"
                    className="form-control border-start-0"
                    placeholder="Enter 10-digit mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    pattern="[0-9]{10}"
                    required
                  />
                </div>
                <div className="form-text d-flex align-items-center mt-2">
                  <i className="bi bi-info-circle me-2 text-info"></i>
                  <span>OTP will be displayed in browser console</span>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-success w-100 py-2 d-flex align-items-center justify-content-center"
                disabled={isLoading || mobile.length !== 10}
              >
                {isLoading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i>
                    <span>Send OTP</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Verify OTP Form */}
          {authMethod === "mobile" && otpSent && !showRegistration && !showFaceCapture && (
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-3">
                <label className="form-label fw-semibold d-flex align-items-center">
                  <i className="bi bi-shield-lock me-2 text-primary"></i>
                  Enter OTP
                </label>
                <input
                  type="text"
                  className="form-control text-center shadow-sm"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength="6"
                  style={{ fontSize: "20px", letterSpacing: "6px", fontFamily: "monospace" }}
                  required
                />
                <div className="form-text d-flex align-items-center mt-2">
                  <i className="bi bi-terminal me-2 text-info"></i>
                  <span>Check browser console for OTP</span>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-success w-100 py-2 mb-2 d-flex align-items-center justify-content-center"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    <span>Verify OTP</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary w-100 py-2 d-flex align-items-center justify-content-center"
                onClick={resetForm}
              >
                <i className="bi bi-arrow-left me-2"></i>
                <span>Back to Mobile Number</span>
              </button>
            </form>
          )}

          {/* Face Authentication */}
          {authMethod === "face" && !showFaceCapture && (
            <div className="text-center">
              <div className="mb-4">
                <div className="bg-primary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: "100px", height: "100px" }}>
                  <i className="bi bi-person-bounding-box text-primary" style={{ fontSize: "48px" }}></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">Face Authentication</h5>
                <p className="text-muted mb-2">Use your face to login securely</p>
                <div className="alert alert-info border-0 py-2 d-flex align-items-start">
                  <i className="bi bi-lightbulb me-2 text-info mt-1"></i>
                  <small className="text-start">
                    <strong>Tips for better recognition:</strong><br/>
                    • Ensure good lighting on your face<br/>
                    • Look directly at the camera<br/>
                    • Remove glasses if possible
                  </small>
                </div>
              </div>
              <button
                className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center"
                onClick={handleFaceLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span>Starting Camera...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-camera-video me-2"></i>
                    <span>Start Face Authentication</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer - Auth Method Toggle */}
        {!showRegistration && !showFaceCapture && (
          <div className="card-footer border-0 text-center py-3" style={{ backgroundColor: "#f8f9fa" }}>
            {authMethod === "mobile" ? (
              <button
                className="btn btn-link text-decoration-none d-flex align-items-center justify-content-center mx-auto p-2"
                onClick={() => {
                  setAuthMethod("face");
                  resetForm();
                }}
                style={{ fontSize: "14px" }}
              >
                <i className="bi bi-person-circle me-2 text-primary"></i>
                <span>Login with Face Authentication</span>
              </button>
            ) : (
              <button
                className="btn btn-link text-decoration-none d-flex align-items-center justify-content-center mx-auto p-2"
                onClick={() => {
                  setAuthMethod("mobile");
                  resetForm();
                }}
                style={{ fontSize: "14px" }}
              >
                <i className="bi bi-phone me-2 text-success"></i>
                <span>Login with Mobile OTP</span>
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .pulse-dot {
          width: 8px;
          height: 8px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.5; 
            transform: scale(0.8);
          }
        }
        
        .form-control:focus {
          border-color: #198754;
          box-shadow: 0 0 0 0.2rem rgba(25, 135, 84, 0.25);
        }
        
        .btn-success {
          background: linear-gradient(45deg, #198754, #20c997);
          border: none;
          transition: all 0.3s ease;
        }
        
        .btn-success:hover {
          background: linear-gradient(45deg, #157347, #1aa87a);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(25, 135, 84, 0.3);
        }
        
        .btn-primary {
          background: linear-gradient(45deg, #0d6efd, #6610f2);
          border: none;
          transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
          background: linear-gradient(45deg, #0b5ed7, #5a0fc2);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(13, 110, 253, 0.3);
        }
        
        .btn-outline-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(13, 110, 253, 0.2);
        }
        
        .btn-outline-secondary:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(108, 117, 125, 0.2);
        }
        
        .card {
          transition: all 0.4s ease;
          border-radius: 20px;
          overflow: hidden;
        }
        
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
        }
        
        .input-group-text {
          background: #f8f9fa;
          border-right: none;
        }
        
        .form-control {
          transition: all 0.3s ease;
        }
        
        .form-control:focus {
          transform: translateY(-1px);
        }
        
        .alert {
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .alert:hover {
          transform: translateY(-1px);
        }
        
        .btn-link:hover {
          text-decoration: none !important;
          transform: scale(1.02);
        }
        
        .badge {
          font-weight: 500;
        }
        
        .card-header {
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        
        .card-footer {
          border-top: 1px solid rgba(0,0,0,0.05);
        }
        
        .shadow-sm {
          box-shadow: 0 .125rem .25rem rgba(0,0,0,.075) !important;
        }
        
        .shadow-lg {
          box-shadow: 0 1rem 3rem rgba(0,0,0,.175) !important;
        }
      `}</style>
    </div>
  );
};

export default LoginForm;