import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  fetchUserVehicleStats, 
  fetchUserVehiclesWithDocuments, 
  uploadVehicleDocument,
  downloadVehicleDocument,
  renewVehicleDocument,
  payFinesToUnblock,
  fileToBase64,
  getProgressValue,
  formatDate
} from '../api/userVehicles';

const UserVehicles = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [uploading, setUploading] = useState(false);

  // State for vehicle data
  const [user, setUser] = useState({
    name: "User",
    mobile: "+91 9876543210"
  });
  const [vehicleStats, setVehicleStats] = useState({
    total_vehicles: 0,
    total_violations: 0,
    pending_violations: 0,
    documents_expiring: 0,
    blocked_vehicles: 0,
    mobile_number: ""
  });
  const [vehicles, setVehicles] = useState([]);

  // Load vehicle data
  useEffect(() => {
    const loadVehicleData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user ID from localStorage if not in params
        const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
        
        if (!currentUserId) {
          navigate('/login');
          return;
        }

        // Fetch vehicle data in parallel
        const [statsRes, vehiclesRes] = await Promise.all([
          fetchUserVehicleStats(currentUserId),
          fetchUserVehiclesWithDocuments(currentUserId)
        ]);

        // Handle stats
        if (statsRes.status === 'success') {
          setVehicleStats(statsRes.data);
          setUser({
            name: statsRes.data.user_name || "User",
            mobile: statsRes.data.mobile_number || "+91 9876543210"
          });
        } else {
          console.error('Stats error:', statsRes.message);
        }

        // Handle vehicles
        if (vehiclesRes.status === 'success') {
          setVehicles(vehiclesRes.vehicles || []);
        } else {
          console.error('Vehicles error:', vehiclesRes.message);
        }

      } catch (error) {
        console.error('Vehicle data loading error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadVehicleData();
  }, [userId, navigate]);

  const getStatusColor = (status) => {
    switch (status) {
      case "valid":
        return "border-success bg-success bg-opacity-10";
      case "expired":
        return "border-danger bg-danger bg-opacity-10";
      case "expiring":
        return "border-warning bg-warning bg-opacity-10";
      case "blocked":
        return "border-danger bg-danger bg-opacity-10";
      default:
        return "border-secondary bg-secondary bg-opacity-10";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "valid":
        return <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '16px' }}></i>;
      case "expired":
      case "blocked":
        return <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '16px' }}></i>;
      case "expiring":
        return <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '16px' }}></i>;
      default:
        return <i className="bi bi-exclamation-triangle-fill text-secondary" style={{ fontSize: '16px' }}></i>;
    }
  };

  const getDocumentTitle = (type) => {
    switch (type) {
      case "registration":
        return "Registration Certificate";
      case "puc":
        return "PUC Certificate";
      case "insurance":
        return "Insurance Policy";
      default:
        return "Document";
    }
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case "registration":
        return <i className="bi bi-car-front-fill text-primary" style={{ fontSize: '20px' }}></i>;
      case "puc":
        return <i className="bi bi-shield-fill-check text-success" style={{ fontSize: '20px' }}></i>;
      case "insurance":
        return <i className="bi bi-file-earmark-text-fill text-info" style={{ fontSize: '20px' }}></i>;
      default:
        return <i className="bi bi-file-earmark-text-fill text-secondary" style={{ fontSize: '20px' }}></i>;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        setUploadFile(base64);
      } catch (error) {
        alert('Error processing file');
      }
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedVehicle || !selectedDocumentType || !documentNumber || !expiryDate) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setUploading(true);
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
      
      const documentData = {
        vehicle_id: selectedVehicle.vehicle_id,
        document_type: selectedDocumentType,
        document_number: documentNumber,
        expiry_date: expiryDate,
        document_file: uploadFile || ""
      };

      const result = await uploadVehicleDocument(currentUserId, documentData);
      
      if (result.status === 'success') {
        alert('Document uploaded successfully!');
        setShowUploadModal(false);
        setSelectedVehicle(null);
        setSelectedDocumentType("");
        setDocumentNumber("");
        setExpiryDate("");
        setUploadFile(null);
        
        // Refresh vehicles data
        const vehiclesRes = await fetchUserVehiclesWithDocuments(currentUserId);
        if (vehiclesRes.status === 'success') {
          setVehicles(vehiclesRes.vehicles || []);
        }
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error uploading document: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (vehicle, documentType) => {
    try {
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
      const result = await downloadVehicleDocument(currentUserId, vehicle.vehicle_id, documentType);
      
      if (result.status === 'success') {
        // In a real implementation, trigger file download
        alert(`Download initiated for ${documentType} document`);
        console.log('Download URL:', result.download_url);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error downloading document: ${error.message}`);
    }
  };

  const handleRenewDocument = async (vehicle, documentType) => {
    try {
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
      const result = await renewVehicleDocument(currentUserId, {
        vehicle_id: vehicle.vehicle_id,
        document_type: documentType
      });
      
      if (result.status === 'success') {
        alert(result.message);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error renewing document: ${error.message}`);
    }
  };

  const handlePayFines = async (vehicle) => {
    if (!window.confirm(`Pay ₹${vehicle.pending_fine_amount} to unblock services for ${vehicle.plate_number}?`)) {
      return;
    }

    try {
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
      const result = await payFinesToUnblock(currentUserId, {
        vehicle_id: vehicle.vehicle_id,
        payment_method: 'UPI'
      });
      
      if (result.status === 'success') {
        alert(result.message);
        
        // Refresh vehicles data
        const vehiclesRes = await fetchUserVehiclesWithDocuments(currentUserId);
        if (vehiclesRes.status === 'success') {
          setVehicles(vehiclesRes.vehicles || []);
        }
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error paying fines: ${error.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('userToken');
    navigate('/login');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Vehicles...</h5>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="alert alert-danger border-0 shadow-lg" style={{ maxWidth: '400px' }}>
            <i className="bi bi-exclamation-triangle-fill text-danger mb-3" style={{ fontSize: '48px' }}></i>
            <h5>Error Loading Vehicle Data</h5>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-outline-danger"
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-bottom">
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-between py-3 px-4">
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                <i className="bi bi-car-front-fill text-primary" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA Vehicle Portal</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Vehicle & Document Management</p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="text-end d-none d-md-block">
                <p className="fw-medium text-dark mb-0" style={{ fontSize: '14px' }}>{user.name}</p>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                  {vehicleStats.total_vehicles} vehicles • {user.mobile}
                </p>
              </div>
              <div className="dropdown">
                <button className="btn btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                  <i className="bi bi-person-circle" style={{ fontSize: '18px' }}></i>
                </button>
                <ul className="dropdown-menu">
                  <li><button className="dropdown-item" onClick={() => navigate(`/userdashboard/${userId}`)}>
                    <i className="bi bi-speedometer2 me-2"></i>Dashboard
                  </button></li>
                  <li><button className="dropdown-item">
                    <i className="bi bi-person me-2"></i>Profile
                  </button></li>
                  <li><button className="dropdown-item">
                    <i className="bi bi-gear me-2"></i>Settings
                  </button></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button className="dropdown-item text-danger" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>Logout
                  </button></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid py-4 px-4">
        {/* Navigation */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-2">
            <ul className="nav nav-pills nav-fill bg-light rounded-3 p-2">
              <li className="nav-item">
                <button 
                  className="nav-link"
                  onClick={() => navigate(`/userdashboard/${userId}`)}
                >
                  <i className="bi bi-house-door-fill me-2" style={{ fontSize: '16px' }}></i>
                  Dashboard
                </button>
              </li>
              <li className="nav-item">
                <button className="nav-link active">
                  <i className="bi bi-car-front-fill me-2" style={{ fontSize: '16px' }}></i>
                  My Vehicles
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className="nav-link"
                  onClick={() => navigate(`/userviolations/${userId}`)}
                >
                  <i className="bi bi-exclamation-triangle-fill me-2" style={{ fontSize: '16px' }}></i>
                  Violations
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className="nav-link"
                  onClick={() => navigate(`/userpayments/${userId}`)}
                >
                  <i className="bi bi-credit-card-fill me-2" style={{ fontSize: '16px' }}></i>
                  Payments
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className="nav-link"
                  onClick={() => navigate(`/userdisputes/${userId}`)}
                >
                  <i className="bi bi-scale me-2" style={{ fontSize: '16px' }}></i>
                  Disputes
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Vehicle Stats */}
        <div className="row g-4 mb-4">
          <div className="col-md col-lg-2">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-primary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-car-front-fill text-primary" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="fw-bold text-primary mb-1">{vehicleStats.total_vehicles}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>Total Vehicles</p>
              </div>
            </div>
          </div>

          <div className="col-md col-lg-2">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-warning bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="fw-bold text-warning mb-1">{vehicleStats.total_violations}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>Total Violations</p>
              </div>
            </div>
          </div>

          <div className="col-md col-lg-2">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-danger bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-clock-history text-danger" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="fw-bold text-danger mb-1">{vehicleStats.pending_violations}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>Pending Fines</p>
              </div>
            </div>
          </div>

          <div className="col-md col-lg-3">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-info bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-file-earmark-text-fill text-info" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="fw-bold text-info mb-1">{vehicleStats.documents_expiring}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>Documents Expiring</p>
              </div>
            </div>
          </div>

          <div className="col-md col-lg-3">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-danger bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '50px', height: '50px' }}>
                  <i className="bi bi-shield-x text-danger" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="fw-bold text-danger mb-1">{vehicleStats.blocked_vehicles}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>Blocked Vehicles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicles List */}
        <div className="row g-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="col-12">
              <div className="card border-0 shadow-sm">
                {/* Vehicle Header */}
                <div className="card-header bg-white border-0 py-4">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                        <i className="bi bi-car-front-fill text-primary" style={{ fontSize: '28px' }}></i>
                      </div>
                      <div>
                        <h2 className="h5 mb-1 fw-bold text-dark">{vehicle.plate_number}</h2>
                        <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                          <i className="bi bi-info-circle me-2" style={{ fontSize: '14px' }}></i>
                          {vehicle.make} {vehicle.model} ({vehicle.year}) • {vehicle.vehicle_type}
                        </p>
                        {vehicle.pending_fine_amount > 0 && (
                          <div className="alert alert-warning py-2 px-3 mt-2 mb-0" style={{ fontSize: '13px' }}>
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            ₹{vehicle.pending_fine_amount} pending fines - Pay to unblock services
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary btn-lg"
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setShowUploadModal(true);
                      }}
                    >
                      <i className="bi bi-cloud-upload-fill me-2" style={{ fontSize: '18px' }}></i>
                      Upload Document
                    </button>
                  </div>
                </div>

                {/* Document Cards */}
                <div className="card-body">
                  <div className="row g-4">
                    {vehicle.documents.map((doc, index) => (
                      <div key={index} className="col-lg-4">
                        <div className={`card border-2 h-100 ${getStatusColor(doc.status)}`}>
                          <div className="card-header bg-transparent border-0 pb-2">
                            <div className="d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center gap-2">
                                {getDocumentIcon(doc.type)}
                                <h6 className="card-title mb-0 fw-bold">{getDocumentTitle(doc.type)}</h6>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                {getStatusIcon(doc.status)}
                                <span className={`badge ${
                                  doc.status === "valid" ? "bg-success" :
                                  doc.status === "expired" || doc.status === "blocked" ? "bg-danger" :
                                  "bg-warning text-dark"
                                }`} style={{ fontSize: '11px' }}>
                                  {doc.status === "blocked" ? "BLOCKED" : doc.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="card-body pt-0">
                            {doc.status === "blocked" && doc.pending_fine && (
                              <div className="alert alert-danger py-2 mb-3 border-0">
                                <div className="d-flex align-items-center gap-2">
                                  <i className="bi bi-shield-x text-danger" style={{ fontSize: '16px' }}></i>
                                  <span style={{ fontSize: '13px' }}>
                                    Service blocked - ₹{doc.pending_fine} pending
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted d-flex align-items-center" style={{ fontSize: '13px' }}>
                                  <i className="bi bi-hash me-1" style={{ fontSize: '12px' }}></i>
                                  Number:
                                </span>
                                <span className="fw-medium" style={{ fontSize: '13px' }}>{doc.number || 'N/A'}</span>
                              </div>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted d-flex align-items-center" style={{ fontSize: '13px' }}>
                                  <i className="bi bi-calendar-event me-1" style={{ fontSize: '12px' }}></i>
                                  Expires:
                                </span>
                                <span className="fw-medium" style={{ fontSize: '13px' }}>{formatDate(doc.expiry_date)}</span>
                              </div>
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="text-muted d-flex align-items-center" style={{ fontSize: '13px' }}>
                                  <i className="bi bi-clock me-1" style={{ fontSize: '12px' }}></i>
                                  Days left:
                                </span>
                                <span className={`fw-medium ${
                                  doc.days_left < 0 ? "text-danger" : 
                                  doc.days_left < 30 ? "text-warning" : "text-success"
                                }`} style={{ fontSize: '13px' }}>
                                  {doc.days_left < 0 ? `${Math.abs(doc.days_left)} days overdue` : `${doc.days_left} days`}
                                </span>
                              </div>
                              {doc.days_left >= 0 && (
                                <div className="progress mb-3" style={{ height: '8px' }}>
                                  <div 
                                    className={`progress-bar ${
                                      doc.days_left < 30 ? "bg-warning" :
                                      doc.days_left < 90 ? "bg-info" : "bg-success"
                                    }`}
                                    style={{ width: `${getProgressValue(doc.days_left)}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>

                            <div className="d-flex gap-2">
                              {doc.status === "blocked" ? (
                                <button 
                                  className="btn btn-danger btn-sm flex-fill fw-medium"
                                  onClick={() => handlePayFines(vehicle)}
                                >
                                  <i className="bi bi-credit-card-fill me-2" style={{ fontSize: '14px' }}></i>
                                  Pay to Unblock
                                </button>
                              ) : doc.status === "expired" || doc.days_left < 30 ? (
                                <button 
                                  className="btn btn-primary btn-sm flex-fill fw-medium"
                                  onClick={() => handleRenewDocument(vehicle, doc.type)}
                                >
                                  <i className="bi bi-arrow-clockwise me-2" style={{ fontSize: '14px' }}></i>
                                  Renew Now
                                </button>
                              ) : (
                                <>
                                  <button 
                                    className="btn btn-outline-secondary btn-sm flex-fill"
                                    onClick={() => handleDownloadDocument(vehicle, doc.type)}
                                  >
                                    <i className="bi bi-download me-1" style={{ fontSize: '12px' }}></i>
                                    Download
                                  </button>
                                  <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => handleDownloadDocument(vehicle, doc.type)}
                                  >
                                    <i className="bi bi-eye-fill" style={{ fontSize: '12px' }}></i>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {vehicles.length === 0 && (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-car-front text-muted mb-3" style={{ fontSize: '64px' }}></i>
              <h5 className="text-muted">No Vehicles Found</h5>
              <p className="text-muted mb-0">No vehicles are registered under your account.</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white border-0">
                <h5 className="modal-title d-flex align-items-center">
                  <i className="bi bi-cloud-upload-fill me-2" style={{ fontSize: '20px' }}></i>
                  Upload Document
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowUploadModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-medium">
                      <i className="bi bi-car-front me-2"></i>Vehicle
                    </label>
                    <input 
                      type="text" 
                      className="form-control form-control-lg"
                      value={selectedVehicle ? `${selectedVehicle.plate_number} - ${selectedVehicle.make} ${selectedVehicle.model}` : ''}
                      disabled
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">
                      <i className="bi bi-file-earmark-text me-2"></i>Document Type
                    </label>
                    <select 
                      className="form-select form-select-lg"
                      value={selectedDocumentType}
                      onChange={(e) => setSelectedDocumentType(e.target.value)}
                    >
                      <option value="">Select document type</option>
                      <option value="registration">
                        <i className="bi bi-car-front me-2"></i>Registration Certificate
                      </option>
                      <option value="puc">
                        <i className="bi bi-shield-check me-2"></i>PUC Certificate
                      </option>
                      <option value="insurance">
                        <i className="bi bi-shield-check me-2"></i>Insurance Policy
                      </option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">
                      <i className="bi bi-hash me-2"></i>Document Number
                    </label>
                    <input 
                      type="text" 
                      className="form-control form-control-lg"
                      placeholder="Enter document number"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">
                      <i className="bi bi-calendar-event me-2"></i>Expiry Date
                    </label>
                    <input 
                      type="date" 
                      className="form-control form-control-lg"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium">
                      <i className="bi bi-file-earmark-arrow-up me-2"></i>Upload File
                    </label>
                    <input 
                      type="file" 
                      className="form-control form-control-lg"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    <small className="text-muted mt-1 d-block">
                      <i className="bi bi-info-circle me-1"></i>
                      PDF, JPG, PNG files only (Max 10MB)
                    </small>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 bg-light">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-lg"
                  onClick={() => setShowUploadModal(false)}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-lg"
                  onClick={handleUploadDocument}
                  disabled={uploading || !selectedDocumentType || !documentNumber || !expiryDate}
                >
                  {uploading ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cloud-upload-fill me-2"></i>
                      Upload Document
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .card:hover {
          transform: translateY(-2px);
          transition: all 0.3s ease;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
        }
        
        .btn {
          transition: all 0.3s ease;
        }
        
        .btn:hover {
          transform: translateY(-1px);
        }
        
        .nav-pills .nav-link {
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .nav-pills .nav-link:hover {
          background-color: rgba(13, 110, 253, 0.1);
        }
        
        .nav-pills .nav-link.active {
          background: linear-gradient(45deg, #0d6efd, #6f42c1);
          box-shadow: 0 4px 15px rgba(13, 110, 253, 0.3);
        }
        
        .progress {
          border-radius: 10px;
        }
        
        .progress-bar {
          border-radius: 10px;
        }
        
        .border {
          border-color: rgba(0,0,0,0.1) !important;
        }
        
        .badge {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default UserVehicles;