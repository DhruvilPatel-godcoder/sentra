import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, isAuthenticated } from '../api/login';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // First check static credentials
      if (formData.username === 'Sentra159' && formData.password === 'Sentra@159') {
        // Static login success - store data locally
        const adminData = {
          admin_id: 'Sentra159',
          name: 'SENTRA Admin',
          department: 'Traffic Control Department',
          role: 'System Administrator',
          login_time: new Date().toISOString()
        };

        localStorage.setItem('adminToken', 'admin_token_sentra159');
        localStorage.setItem('adminData', JSON.stringify(adminData));
        
        // Navigate to dashboard
        navigate('/dashboard');
        return;
      }

      // If static credentials don't match, try API call
      const result = await adminLogin(formData);

      if (result.status === 'success') {
        // Store authentication data
        localStorage.setItem('adminToken', result.token);
        localStorage.setItem('adminData', JSON.stringify(result.user));
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError(result.message || 'Invalid credentials. Please use Sentra159 / Sentra@159');
      }
    } catch (error) {
      // Fallback: check credentials again if network fails
      if (formData.username === 'Sentra159' && formData.password === 'Sentra@159') {
        const adminData = {
          admin_id: 'Sentra159',
          name: 'SENTRA Admin',
          department: 'Traffic Control Department',
          role: 'System Administrator',
          login_time: new Date().toISOString()
        };

        localStorage.setItem('adminToken', 'admin_token_sentra159');
        localStorage.setItem('adminData', JSON.stringify(adminData));
        navigate('/dashboard');
      } else {
        setError('Invalid credentials. Please use Sentra159 / Sentra@159');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" 
         style={{ 
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
         }}>
      
      {/* Background Pattern */}
      <div className="position-absolute w-100 h-100" 
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
             backgroundSize: '60px 60px'
           }}>
      </div>

      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8 col-xl-6">
            
            {/* Login Card */}
            <div className="card border-0 shadow-lg" style={{ borderRadius: '20px' }}>
              <div className="card-body p-4">
                
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle p-3 mb-3"
                       style={{ width: '80px', height: '80px' }}>
                    <i className="bi bi-shield-check text-primary" style={{ fontSize: '40px' }}></i>
                  </div>
                  <h2 className="fw-bold text-dark mb-1">SENTRA Admin</h2>
                  <p className="text-muted mb-0">Traffic Management System</p>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger border-0 rounded-3 d-flex align-items-center mb-4" 
                       style={{ backgroundColor: '#fee2e2' }}>
                    <i className="bi bi-exclamation-circle text-danger me-2" style={{ fontSize: '18px' }}></i>
                    <span className="text-danger fw-medium">{error}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Username Field */}
                  <div className="mb-1">
                    <label htmlFor="username" className="form-label text-dark fw-medium">
                      Admin ID
                    </label>
                    <div className="input-group">
                      <span className="input-group-text border-end-0 bg-light">
                        <i className="bi bi-person text-muted" style={{ fontSize: '18px' }}></i>
                      </span>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        className="form-control border-start-0 bg-light"
                        placeholder="Enter your admin ID"
                        value={formData.username}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        style={{ 
                          borderRadius: '0 12px 12px 0',
                          paddingLeft: '0'
                        }}
                      />
                    </div>
                    {/* <small className="text-muted">Use: Sentra159</small> */}
                  </div>

                  {/* Password Field */}
                  <div className="mb-1">
                    <label htmlFor="password" className="form-label text-dark fw-medium">
                      Password
                    </label>
                    <div className="input-group">
                      <span className="input-group-text border-end-0 bg-light">
                        <i className="bi bi-lock text-muted" style={{ fontSize: '18px' }}></i>
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        className="form-control border-start-0 border-end-0 bg-light"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        disabled={loading}
                        style={{ paddingLeft: '0', paddingRight: '0' }}
                      />
                      <button
                        type="button"
                        className="btn bg-light border-start-0"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        style={{ borderRadius: '0 12px 12px 0' }}
                      >
                        <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"} text-muted`} 
                           style={{ fontSize: '18px' }}>
                        </i>
                      </button>
                    </div>
                    {/* <small className="text-muted">Use: Sentra@159</small> */}
                  </div>

                  {/* Login Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-100 py-3 fw-semibold"
                    style={{ 
                      borderRadius: '12px',
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      border: 'none'
                    }}
                  >
                    {loading ? (
                      <div className="d-flex align-items-center justify-content-center">
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Signing in...
                      </div>
                    ) : (
                      <div className="d-flex align-items-center justify-content-center">
                        <i className="bi bi-box-arrow-in-right me-2" style={{ fontSize: '18px' }}></i>
                        Sign In
                      </div>
                    )}
                  </button>

                </form>

                {/* Demo Credentials */}
                {/* <div className="mt-1 p-3 bg-light rounded-3">
                  <h6 className="text-muted mb-2 d-flex align-items-center">
                    <i className="bi bi-info-circle me-2" style={{ fontSize: '16px' }}></i>
                    Demo Credentials
                  </h6>
                  <div className="small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Admin ID:</span>
                      <code className="bg-white px-2 py-1 rounded">Sentra159</code>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Password:</span>
                      <code className="bg-white px-2 py-1 rounded">Sentra@159</code>
                    </div>
                  </div>
                </div> */}

                {/* Footer */}
                <div className="text-center mt-4">
                  <p className="text-muted small mb-0">
                    &copy; 2025 SENTRA Traffic Management System
                  </p>
                </div>

              </div>
            </div>

            {/* Additional Info Card */}
            <div className="card border-0 bg-white bg-opacity-90 mt-3" style={{ borderRadius: '16px' }}>
              <div className="card-body p-4 text-center">
                <div className="row g-3">
                  <div className="col-4">
                    <i className="bi bi-shield-lock text-primary mb-2" style={{ fontSize: '24px' }}></i>
                    <div className="small text-muted">Secure</div>
                  </div>
                  <div className="col-4">
                    <i className="bi bi-clock text-success mb-2" style={{ fontSize: '24px' }}></i>
                    <div className="small text-muted">24/7 Access</div>
                  </div>
                  <div className="col-4">
                    <i className="bi bi-people text-info mb-2" style={{ fontSize: '24px' }}></i>
                    <div className="small text-muted">Multi-User</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        .form-control:focus {
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
          border-color: #667eea;
        }
        
        .input-group-text {
          border-radius: 12px 0 0 12px;
        }
        
        .btn:hover {
          transform: translateY(-1px);
          transition: all 0.3s ease;
        }
        
        .card {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95);
        }
        
        .space-y-4 > * + * {
          margin-top: 1rem;
        }
        
        code {
          font-size: 12px;
          border-radius: 4px;
        }
        
        .alert {
          animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;