import React, { useState, useEffect } from 'react';
import { searchVehicleDocuments, getDocumentStatistics, sendDocumentNotice, flagVehicle, generateDocumentReport } from '../api/documents';

const Documents = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [searchPlate, setSearchPlate] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useState({ name: 'Admin User', department: 'Traffic Control' });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getDocumentStatistics();
      
      if (response.status === 'success') {
        setStatistics(response.statistics);
      } else {
        setError(response.message || 'Failed to fetch document statistics');
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Failed to fetch statistics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchPlate.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await searchVehicleDocuments(searchPlate.trim());
      
      if (response.status === 'success') {
        setSearchResult(response.vehicle);
      } else {
        setSearchResult(null);
        setError(response.message || 'Vehicle not found');
      }
    } catch (error) {
      console.error('Error searching vehicle:', error);
      setSearchResult(null);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendNotice = async (vehicleId, noticeType, documentType) => {
    try {
      const response = await sendDocumentNotice(vehicleId, noticeType, documentType);
      if (response.status === 'success') {
        alert('Notice sent successfully!');
      } else {
        alert('Failed to send notice: ' + response.message);
      }
    } catch (error) {
      console.error('Error sending notice:', error);
      alert('Failed to send notice');
    }
  };

  const handleFlagVehicle = async (vehicleId, reason) => {
    try {
      const response = await flagVehicle(vehicleId, reason);
      if (response.status === 'success') {
        alert('Vehicle flagged successfully!');
        // Refresh statistics
        fetchStatistics();
      } else {
        alert('Failed to flag vehicle: ' + response.message);
      }
    } catch (error) {
      console.error('Error flagging vehicle:', error);
      alert('Failed to flag vehicle');
    }
  };

  const handleGenerateReport = async (vehicleId, reportType) => {
    try {
      const response = await generateDocumentReport(vehicleId, reportType);
      if (response.status === 'success') {
        alert('Report generated successfully!');
        // You can implement download functionality here
      } else {
        alert('Failed to generate report: ' + response.message);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/';
  };

  const navigateToTab = (tabKey) => {
    switch (tabKey) {
      case 'overview':
        window.location.href = '/dashboard';
        break;
      case 'live-feed':
        window.location.href = '/livefeed';
        break;
      case 'ai-detection':
        window.location.href = '/aidetection';
        break;
      case 'penalties':
        window.location.href = '/penalties';
        break;
      case 'documents':
        setActiveTab(tabKey);
        break;
      case 'live-camera':
        window.location.href = '/livedetection';
        break;
      case 'analytics':
        setActiveTab(tabKey);
        break;
      default:
        setActiveTab(tabKey);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "valid":
        return "bg-success text-white";
      case "expired":
        return "bg-danger text-white";
      case "expiring_soon":
        return "bg-warning text-dark";
      case "missing":
        return "bg-secondary text-white";
      default:
        return "bg-secondary text-white";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "valid":
        return <i className="bi bi-check-circle-fill" style={{ fontSize: '10px' }}></i>;
      case "expired":
        return <i className="bi bi-x-circle-fill" style={{ fontSize: '10px' }}></i>;
      case "expiring_soon":
        return <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '10px' }}></i>;
      case "missing":
        return <i className="bi bi-question-circle-fill" style={{ fontSize: '10px' }}></i>;
      default:
        return <i className="bi bi-question-circle-fill" style={{ fontSize: '10px' }}></i>;
    }
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Document System...</h5>
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
                <i className="bi bi-file-earmark-check text-primary" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA Document Verification</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Vehicle Document Management System</p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="text-end d-none d-md-block">
                <p className="fw-medium text-dark mb-0" style={{ fontSize: '14px' }}>{user.name}</p>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>{user.department}</p>
              </div>
              
                  <button className="btn btn-outline-secondary btn-sm d-flex align-items-center" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>Logout
                  </button>
                
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid py-4 px-4">
        {/* Navigation Tabs */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-2">
            <ul className="nav nav-pills nav-fill bg-light rounded-3 p-2" role="tablist">
              {[
                { key: 'overview', label: 'Overview', icon: 'bi-speedometer2' },
                { key: 'live-feed', label: 'Live Feed', icon: 'bi-camera-video-fill' },
                { key: 'live-camera', label: 'Live Camera', icon: 'bi-camera-fill' },
                { key: 'ai-detection', label: 'AI Detection', icon: 'bi-robot' },
                { key: 'penalties', label: 'Penalties', icon: 'bi-file-earmark-text-fill' },
                { key: 'documents', label: 'Documents', icon: 'bi-folder-fill' },
                { key: 'analytics', label: 'Analytics', icon: 'bi-bar-chart-fill' }
              ].map(tab => (
                <li className="nav-item" key={tab.key}>
                  <button 
                    className={`nav-link ${activeTab === tab.key ? 'active' : ''} fw-medium`}
                    onClick={() => navigateToTab(tab.key)}
                    style={{ fontSize: '14px' }}
                  >
                    <i className={`${tab.icon} me-2`} style={{ fontSize: '16px' }}></i>
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Document Verification Content */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* Statistics Cards */}
            {statistics && (
              <div className="row g-4 mb-4">
                <div className="col-lg-3 col-md-6">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
                    <div className="card-body text-center p-4">
                      <div className="bg-danger bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                           style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '28px' }}></i>
                      </div>
                      <h2 className="fw-bold text-danger mb-1">{statistics.expired_documents}</h2>
                      <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Expired Documents</p>
                      <small className="text-muted">Require immediate action</small>
                    </div>
                  </div>
                </div>

                <div className="col-lg-3 col-md-6">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
                    <div className="card-body text-center p-4">
                      <div className="bg-warning bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                           style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '28px' }}></i>
                      </div>
                      <h2 className="fw-bold text-warning mb-1">{statistics.expiring_soon}</h2>
                      <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Expiring Soon</p>
                      <small className="text-muted">Within 30 days</small>
                    </div>
                  </div>
                </div>

                <div className="col-lg-3 col-md-6">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
                    <div className="card-body text-center p-4">
                      <div className="bg-success bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                           style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '28px' }}></i>
                      </div>
                      <h2 className="fw-bold text-success mb-1">{statistics.valid_documents}</h2>
                      <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Valid Documents</p>
                      <small className="text-muted">All documents current</small>
                    </div>
                  </div>
                </div>

                <div className="col-lg-3 col-md-6">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)' }}>
                    <div className="card-body text-center p-4">
                      <div className="bg-secondary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                           style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-question-circle-fill text-secondary" style={{ fontSize: '28px' }}></i>
                      </div>
                      <h2 className="fw-bold text-secondary mb-1">{statistics.missing_documents}</h2>
                      <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Missing Documents</p>
                      <small className="text-muted">Unregistered vehicles</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Verification Card */}
            <div className="card border-0 shadow-lg">
              <div className="card-header bg-white border-0 py-4">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                    <i className="bi bi-shield-check text-primary" style={{ fontSize: '24px' }}></i>
                  </div>
                  <div>
                    <h4 className="mb-1 fw-bold text-dark">Document Verification</h4>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Verify PUC, Insurance, and RC status for vehicles</p>
                  </div>
                </div>
              </div>
              
              <div className="card-body p-4">
                {/* Search Section */}
                <div className="row g-3 mb-5">
                  <div className="col-9">
                    <div className="input-group input-group-lg shadow-sm">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-search" style={{ fontSize: '16px' }}></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Enter vehicle plate number (e.g., GJ01AB1234)"
                        value={searchPlate}
                        onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                      />
                    </div>
                  </div>
                  <div className="col-3">
                    <button 
                      className="btn btn-primary btn-lg w-100 shadow-sm"
                      onClick={handleSearch}
                      disabled={isSearching || !searchPlate.trim()}
                    >
                      {isSearching ? (
                        <>
                          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-shield-check me-2" style={{ fontSize: '16px' }}></i>
                          <span>Verify</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Search Results */}
                {searchResult && (
                  <div 
                    className="card border-0 shadow-lg mb-4"
                    style={{ 
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, #f8faff 0%, #e6f3ff 100%)',
                      animation: 'slideIn 0.6s ease-out'
                    }}
                  >
                    <div className="card-body p-4">
                      {/* Header */}
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
                          <i className="bi bi-car-front-fill text-primary me-2" style={{ fontSize: '20px' }}></i>
                          Vehicle Details
                        </h5>
                        <span className="badge bg-dark bg-opacity-10 px-3 py-2 font-monospace fw-bold d-flex align-items-center gap-2" style={{ borderRadius: '25px', fontSize: '13px' }}>
                          <i className="bi bi-hash" style={{ fontSize: '12px' }}></i>
                          {searchResult.plate_number}
                        </span>
                      </div>

                      {/* Vehicle & Owner Info */}
                      <div className="row g-4 mb-4">
                        <div className="col-md-4">
                          <div className="bg-white bg-opacity-70 p-3 rounded-3">
                            <div className="d-flex align-items-center mb-2">
                              <i className="bi bi-person-fill text-primary me-2" style={{ fontSize: '16px' }}></i>
                              <small className="text-muted fw-medium">Owner Name</small>
                            </div>
                            <p className="fw-bold mb-0 text-dark" style={{ fontSize: '15px' }}>{searchResult.owner_name}</p>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="bg-white bg-opacity-70 p-3 rounded-3">
                            <div className="d-flex align-items-center mb-2">
                              <i className="bi bi-car-front text-primary me-2" style={{ fontSize: '16px' }}></i>
                              <small className="text-muted fw-medium">Vehicle</small>
                            </div>
                            <p className="fw-bold mb-0 text-dark" style={{ fontSize: '15px' }}>
                              {searchResult.vehicle_make} {searchResult.vehicle_model} ({searchResult.vehicle_year})
                            </p>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="bg-white bg-opacity-70 p-3 rounded-3">
                            <div className="d-flex align-items-center mb-2">
                              <i className="bi bi-clock-history text-secondary me-2" style={{ fontSize: '16px' }}></i>
                              <small className="text-muted fw-medium">Last Checked</small>
                            </div>
                            <p className="fw-bold mb-0 text-dark" style={{ fontSize: '15px' }}>
                              {formatDate(searchResult.last_checked)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Document Status */}
                      <div className="mb-4">
                        <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                          <i className="bi bi-file-earmark-text-fill text-primary me-2" style={{ fontSize: '18px' }}></i>
                          Document Status
                        </h6>

                        {/* PUC Certificate */}
                        <div className="bg-white bg-opacity-80 p-3 rounded-3 mb-3 shadow-sm">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <div className="bg-info bg-opacity-10 p-2 rounded-circle me-3">
                                <i className="bi bi-file-earmark-medical-fill text-info" style={{ fontSize: '18px' }}></i>
                              </div>
                              <div>
                                <span className="fw-medium text-dark">PUC Certificate</span>
                                {searchResult.puc_number && (
                                  <div>
                                    <small className="text-muted d-flex align-items-center">
                                      <i className="bi bi-hash me-1" style={{ fontSize: '10px' }}></i>
                                      {searchResult.puc_number}
                                    </small>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                              <span className={`badge d-flex align-items-center gap-1 ${getStatusColor(searchResult.puc_status)}`} style={{ fontSize: '11px', borderRadius: '20px' }}>
                                {getStatusIcon(searchResult.puc_status)}
                                <span className="text-capitalize">{searchResult.puc_status.replace('_', ' ')}</span>
                              </span>
                              {searchResult.puc_expiry && (
                                <small 
                                  className={`fw-medium d-flex align-items-center ${
                                    searchResult.puc_status === "expired"
                                      ? "text-danger"
                                      : isExpiringSoon(searchResult.puc_expiry)
                                        ? "text-warning"
                                        : "text-muted"
                                  }`}
                                  style={{ fontSize: '12px' }}
                                >
                                  <i className="bi bi-calendar-event me-1" style={{ fontSize: '10px' }}></i>
                                  Expires: {formatDate(searchResult.puc_expiry)}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Insurance */}
                        <div className="bg-white bg-opacity-80 p-3 rounded-3 mb-3 shadow-sm">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <div className="bg-success bg-opacity-10 p-2 rounded-circle me-3">
                                <i className="bi bi-shield-fill-check text-success" style={{ fontSize: '18px' }}></i>
                              </div>
                              <div>
                                <span className="fw-medium text-dark">Insurance</span>
                                {searchResult.insurance_number && (
                                  <div>
                                    <small className="text-muted d-flex align-items-center">
                                      <i className="bi bi-hash me-1" style={{ fontSize: '10px' }}></i>
                                      {searchResult.insurance_number}
                                    </small>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                              <span className={`badge d-flex align-items-center gap-1 ${getStatusColor(searchResult.insurance_status)}`} style={{ fontSize: '11px', borderRadius: '20px' }}>
                                {getStatusIcon(searchResult.insurance_status)}
                                <span className="text-capitalize">{searchResult.insurance_status.replace('_', ' ')}</span>
                              </span>
                              {searchResult.insurance_expiry && (
                                <small 
                                  className={`fw-medium d-flex align-items-center ${
                                    searchResult.insurance_status === "expired"
                                      ? "text-danger"
                                      : isExpiringSoon(searchResult.insurance_expiry)
                                        ? "text-warning"
                                        : "text-muted"
                                  }`}
                                  style={{ fontSize: '12px' }}
                                >
                                  <i className="bi bi-calendar-event me-1" style={{ fontSize: '10px' }}></i>
                                  Expires: {formatDate(searchResult.insurance_expiry)}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* RC Certificate */}
                        <div className="bg-white bg-opacity-80 p-3 rounded-3 shadow-sm">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <div className="bg-warning bg-opacity-10 p-2 rounded-circle me-3">
                                <i className="bi bi-file-earmark-check-fill text-warning" style={{ fontSize: '18px' }}></i>
                              </div>
                              <div>
                                <span className="fw-medium text-dark">RC Certificate</span>
                                {searchResult.rc_number && (
                                  <div>
                                    <small className="text-muted d-flex align-items-center">
                                      <i className="bi bi-hash me-1" style={{ fontSize: '10px' }}></i>
                                      {searchResult.rc_number}
                                    </small>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-3">
                              <span className={`badge d-flex align-items-center gap-1 ${getStatusColor(searchResult.rc_status)}`} style={{ fontSize: '11px', borderRadius: '20px' }}>
                                {getStatusIcon(searchResult.rc_status)}
                                <span className="text-capitalize">{searchResult.rc_status.replace('_', ' ')}</span>
                              </span>
                              {searchResult.rc_expiry && (
                                <small 
                                  className={`fw-medium d-flex align-items-center ${
                                    searchResult.rc_status === "expired"
                                      ? "text-danger"
                                      : isExpiringSoon(searchResult.rc_expiry)
                                        ? "text-warning"
                                        : "text-muted"
                                  }`}
                                  style={{ fontSize: '12px' }}
                                >
                                  <i className="bi bi-calendar-event me-1" style={{ fontSize: '10px' }}></i>
                                  Expires: {formatDate(searchResult.rc_expiry)}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="d-flex gap-2 pt-3 border-top flex-wrap">
                        <button 
                          className="btn btn-outline-primary btn-sm d-flex align-items-center" 
                          style={{ borderRadius: '20px' }}
                          onClick={() => handleGenerateReport(searchResult.vehicle_id, 'complete')}
                        >
                          <i className="bi bi-file-earmark-arrow-down me-2" style={{ fontSize: '14px' }}></i>
                          <span style={{ fontSize: '12px' }}>Generate Report</span>
                        </button>
                        <button 
                          className="btn btn-outline-info btn-sm d-flex align-items-center" 
                          style={{ borderRadius: '20px' }}
                          onClick={() => handleSendNotice(searchResult.vehicle_id, 'sms', 'all')}
                        >
                          <i className="bi bi-phone-fill me-2" style={{ fontSize: '14px' }}></i>
                          <span style={{ fontSize: '12px' }}>Send SMS</span>
                        </button>
                        <button 
                          className="btn btn-outline-success btn-sm d-flex align-items-center" 
                          style={{ borderRadius: '20px' }}
                          onClick={() => handleSendNotice(searchResult.vehicle_id, 'email', 'all')}
                        >
                          <i className="bi bi-envelope-fill me-2" style={{ fontSize: '14px' }}></i>
                          <span style={{ fontSize: '12px' }}>Send Email</span>
                        </button>
                        {(searchResult.puc_status === "expired" ||
                          searchResult.insurance_status === "expired" ||
                          searchResult.rc_status === "expired") && (
                          <button 
                            className="btn btn-danger btn-sm d-flex align-items-center" 
                            style={{ borderRadius: '20px' }}
                            onClick={() => handleFlagVehicle(searchResult.vehicle_id, 'expired_documents')}
                          >
                            <i className="bi bi-flag-fill me-2" style={{ fontSize: '14px' }}></i>
                            <span style={{ fontSize: '12px' }}>Flag Vehicle</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* No Results */}
                {searchResult === null && searchPlate && !isSearching && !error && (
                  <div className="text-center py-5">
                    <div className="bg-light bg-opacity-50 rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center"
                         style={{ width: '80px', height: '80px' }}>
                      <i className="bi bi-search text-muted" style={{ fontSize: '32px' }}></i>
                    </div>
                    <h5 className="text-muted mb-2">No Vehicle Found</h5>
                    <p className="text-muted mb-0">No vehicle found with plate number "{searchPlate}"</p>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-3" style={{ fontSize: '20px' }}></i>
                    <div>
                      <h6 className="alert-heading mb-1">Error!</h6>
                      <p className="mb-0">{error}</p>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {statistics && statistics.recent_searches && (
                  <div className="mt-5">
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                      <i className="bi bi-clock-history text-primary me-2" style={{ fontSize: '18px' }}></i>
                      Recent Searches
                    </h6>
                    <div className="row g-3">
                      {statistics.recent_searches.map((search, index) => (
                        <div key={index} className="col-md-4">
                          <div className="card border-0 shadow-sm">
                            <div className="card-body p-3">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="fw-medium d-flex align-items-center">
                                  <i className="bi bi-hash me-2 text-muted" style={{ fontSize: '12px' }}></i>
                                  {search.plate_number}
                                </span>
                                <span className={`badge d-flex align-items-center gap-1 ${getStatusColor(search.status)}`} style={{ fontSize: '10px' }}>
                                  {getStatusIcon(search.status)}
                                  {search.status}
                                </span>
                              </div>
                              <p className="text-muted mb-1 d-flex align-items-center" style={{ fontSize: '13px' }}>
                                <i className="bi bi-person me-2" style={{ fontSize: '12px' }}></i>
                                {search.owner_name}
                              </p>
                              <small className="text-muted d-flex align-items-center" style={{ fontSize: '11px' }}>
                                <i className="bi bi-clock me-2" style={{ fontSize: '10px' }}></i>
                                {formatDate(search.timestamp)}
                              </small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other tabs content */}
        {activeTab !== 'documents' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-4">
              <h5 className="card-title mb-0 fw-bold text-capitalize d-flex align-items-center">
                <i className={`${
                  activeTab === 'overview' ? 'bi-speedometer2' :
                  activeTab === 'live-feed' ? 'bi-camera-video-fill' :
                  activeTab === 'live-camera' ? 'bi-camera-fill' :
                  activeTab === 'ai-detection' ? 'bi-robot' :
                  activeTab === 'penalties' ? 'bi-file-earmark-text-fill' :
                  'bi-bar-chart-fill'
                } text-primary me-2`} style={{ fontSize: '20px' }}></i>
                {activeTab.replace('-', ' ')} {activeTab === 'overview' ? 'Dashboard' : 
                 activeTab === 'live-camera' ? 'Violation Detector' :
                 activeTab === 'live-feed' ? 'Monitor' :
                 activeTab === 'ai-detection' ? 'Engine' :
                 activeTab === 'penalties' ? 'Management' :
                 'Reports'}
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center py-5">
                <i className={`${
                  activeTab === 'overview' ? 'bi-speedometer2' :
                  activeTab === 'live-feed' ? 'bi-camera-video' :
                  activeTab === 'live-camera' ? 'bi-camera' :
                  activeTab === 'ai-detection' ? 'bi-robot' :
                  activeTab === 'penalties' ? 'bi-file-earmark-text' :
                  activeTab === 'documents' ? 'bi-folder' :
                  'bi-bar-chart'
                } text-muted mb-3`} style={{ fontSize: '64px' }}></i>
                <h5 className="text-muted mb-2">{activeTab.replace('-', ' ')} Component</h5>
                <p className="text-muted mb-0">{activeTab.replace('-', ' ')} functionality will be implemented here</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
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
        
        .form-control:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 0.2rem rgba(79, 70, 229, 0.25);
        }
        
        .input-group-text {
          background-color: #f8f9fa;
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

export default Documents;