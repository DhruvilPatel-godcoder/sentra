import React, { useState, useEffect } from 'react';
import { fetchAIDetectionData, fetchViolationDetails, updateViolationStatus, addLiveDetection } from '../api/AIDetection';

const AIDetection = () => {
  const [activeTab, setActiveTab] = useState('ai-detection');
  const [detectionData, setDetectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user] = useState({ name: 'Admin User', department: 'Traffic Control' });

  // AI Models data (static for now)
  const [models] = useState([
    { name: "Speed Detection Model", accuracy: 94.2, processingSpeed: 120, status: "active" },
    { name: "Helmet Detection Model", accuracy: 91.8, processingSpeed: 95, status: "active" },
    { name: "Traffic Light Model", accuracy: 96.5, processingSpeed: 110, status: "active" },
    { name: "Seatbelt Detection Model", accuracy: 89.3, processingSpeed: 85, status: "training" },
    { name: "Phone Usage Model", accuracy: 87.6, processingSpeed: 75, status: "active" },
  ]);

  useEffect(() => {
    fetchDetectionData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDetectionData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDetectionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchAIDetectionData();
      
      if (response.status === 'success') {
        setDetectionData(response.data);
      } else {
        setError(response.message || 'Failed to fetch detection data');
      }
    } catch (error) {
      console.error('Error fetching detection data:', error);
      setError('Failed to fetch detection data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleViolationClick = async (violationId) => {
    try {
      const response = await fetchViolationDetails(violationId);
      if (response.status === 'success') {
        setSelectedViolation(response.violation);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error fetching violation details:', error);
    }
  };

  const handleStatusUpdate = async (violationId, newStatus) => {
    try {
      const response = await updateViolationStatus(violationId, newStatus);
      if (response.status === 'success') {
        // Refresh data after update
        fetchDetectionData();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error updating violation status:', error);
    }
  };

  const startDetection = async () => {
    setIsProcessing(true);
    
    // Simulate live detection by adding random violations
    const detectionInterval = setInterval(async () => {
      if (Math.random() > 0.3) { // 70% chance of detection
        await addLiveDetection();
        fetchDetectionData(); // Refresh data to show new detection
      }
    }, 2000); // Every 2 seconds

    // Stop after 30 seconds
    setTimeout(() => {
      clearInterval(detectionInterval);
      setIsProcessing(false);
    }, 30000);
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
        setActiveTab(tabKey);
        break;
      case 'live-camera':
        window.location.href = '/livedetection';
        break;
      case 'penalties':
        window.location.href = '/penalties';
        break;
      case 'documents':
        window.location.href = '/documents';
        break;
      case 'analytics':
        setActiveTab(tabKey);
        break;
      default:
        setActiveTab(tabKey);
    }
  };

  const getViolationColor = (type) => {
    switch (type) {
      case 'speeding':
        return 'bg-danger text-white';
      case 'red_light_violation':
        return 'bg-danger text-white';
      case 'no_helmet':
        return 'bg-warning text-dark';
      case 'no_seatbelt':
        return 'bg-warning text-dark';
      case 'triple_riding':
        return 'bg-info text-white';
      case 'wrong_parking':
        return 'bg-secondary text-white';
      default:
        return 'bg-secondary text-white';
    }
  };

  const getViolationLabel = (type) => {
    switch (type) {
      case 'speeding':
        return 'Over-speeding';
      case 'red_light_violation':
        return 'Red Light Violation';
      case 'no_helmet':
        return 'No Helmet';
      case 'no_seatbelt':
        return 'No Seatbelt';
      case 'triple_riding':
        return 'Triple Riding';
      case 'wrong_parking':
        return 'Wrong Parking';
      default:
        return type?.replace('_', ' ').toUpperCase() || 'Unknown';
    }
  };

  const getModelStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "bg-success text-white";
      case "training":
        return "bg-warning text-dark";
      case "offline":
        return "bg-danger text-white";
      default:
        return "bg-secondary text-white";
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading AI Detection Engine...</h5>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="alert alert-danger border-0 shadow-lg" style={{ maxWidth: '400px' }}>
            <i className="bi bi-exclamation-triangle-fill text-danger mb-3" style={{ fontSize: '48px' }}></i>
            <h5>Error Loading AI Detection</h5>
            <p>{error}</p>
            <button 
              onClick={fetchDetectionData} 
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
                <i className="bi bi-robot text-primary" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA AI Detection</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>AI-Powered Traffic Monitoring System</p>
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

        {/* AI Detection Content */}
        {activeTab === 'ai-detection' && detectionData && (
          <div className="space-y-4">
            {/* AI Models Status */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 py-4">
                <div className="d-flex align-items-center">
                  <i className="bi bi-cpu-fill text-primary me-3" style={{ fontSize: '24px' }}></i>
                  <div>
                    <h5 className="card-title mb-1 fw-bold">AI Detection Models</h5>
                    <small className="text-muted">Machine learning models for traffic violation detection</small>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-4">
                  {models.map((model, index) => (
                    <div key={index} className="col-lg-4 col-md-6">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body p-4">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex align-items-center">
                              <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                                <i className="bi bi-brain text-primary" style={{ fontSize: '20px' }}></i>
                              </div>
                              <h6 className="fw-medium mb-0" style={{ fontSize: '14px' }}>{model.name}</h6>
                            </div>
                            <span className={`badge d-flex align-items-center gap-1 ${getModelStatusBadge(model.status)}`} style={{ fontSize: '11px' }}>
                              <i className={`${
                                model.status === 'active' ? 'bi-check-circle-fill' :
                                model.status === 'training' ? 'bi-clock-history' : 'bi-x-circle-fill'
                              }`} style={{ fontSize: '10px' }}></i>
                              {model.status.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <small className="text-muted d-flex align-items-center">
                                <i className="bi bi-bullseye me-1" style={{ fontSize: '12px' }}></i>
                                Accuracy
                              </small>
                              <small className="fw-medium">{model.accuracy}%</small>
                            </div>
                            <div className="progress" style={{ height: '8px' }}>
                              <div 
                                className={`progress-bar ${
                                  model.accuracy >= 95 ? 'bg-success' :
                                  model.accuracy >= 90 ? 'bg-info' :
                                  model.accuracy >= 85 ? 'bg-warning' : 'bg-danger'
                                }`}
                                style={{ width: `${model.accuracy}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted d-flex align-items-center">
                              <i className="bi bi-lightning-charge-fill me-1" style={{ fontSize: '12px' }}></i>
                              Speed
                            </small>
                            <small className="fw-medium">{model.processingSpeed} fps</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detection Control */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 py-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-camera-video-fill text-primary me-3" style={{ fontSize: '24px' }}></i>
                    <div>
                      <h5 className="card-title mb-1 fw-bold">Real-time Detection Engine</h5>
                      <small className="text-muted">Control AI-powered traffic violation detection</small>
                    </div>
                  </div>
                  {isProcessing && (
                    <span className="badge bg-success d-flex align-items-center gap-2 pulse-badge" style={{ fontSize: '12px' }}>
                      <i className="bi bi-dot" style={{ fontSize: '20px' }}></i>
                      AI Engine Active
                    </span>
                  )}
                </div>
              </div>
              <div className="card-body">
                <div className="d-flex align-items-center gap-3 mb-4">
                  <button 
                    className={`btn ${isProcessing ? 'btn-secondary' : 'btn-primary'} btn-lg d-flex align-items-center`}
                    onClick={startDetection} 
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-play-circle-fill me-2" style={{ fontSize: '18px' }}></i>
                        Start Detection
                      </>
                    )}
                  </button>
                  
                  {!isProcessing && (
                    <button className="btn btn-outline-primary btn-lg d-flex align-items-center">
                      <i className="bi bi-gear-fill me-2" style={{ fontSize: '18px' }}></i>
                      Configure
                    </button>
                  )}
                </div>

                {isProcessing && (
                  <div className="alert alert-info border-0 d-flex align-items-center" role="alert">
                    <i className="bi bi-info-circle-fill me-3" style={{ fontSize: '20px' }}></i>
                    <div>
                      <strong>AI Detection Active:</strong> The system is actively monitoring traffic violations across all connected cameras with real-time analysis.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="row g-4 mb-4">
              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Total Detections</h6>
                        <h2 className="mb-1 fw-bold text-primary" style={{ fontSize: '28px' }}>
                          {detectionData.summary.total_detections.toLocaleString()}
                        </h2>
                        <small className="text-success fw-medium d-flex align-items-center">
                          <i className="bi bi-arrow-up me-1" style={{ fontSize: '12px' }}></i>
                          <span className="text-success">+{detectionData.summary.today_detections}</span> today
                        </small>
                      </div>
                      <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                        <i className="bi bi-robot text-primary" style={{ fontSize: '28px' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Accuracy Rate</h6>
                        <h2 className="mb-1 fw-bold text-success" style={{ fontSize: '28px' }}>
                          {detectionData.summary.accuracy_rate}%
                        </h2>
                        <small className="text-success fw-medium d-flex align-items-center">
                          <i className="bi bi-bullseye me-1" style={{ fontSize: '12px' }}></i>
                          <span className="text-success">Excellent</span> performance
                        </small>
                      </div>
                      <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                        <i className="bi bi-bullseye text-success" style={{ fontSize: '28px' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Today's Detections</h6>
                        <h2 className="mb-1 fw-bold text-warning" style={{ fontSize: '28px' }}>
                          {detectionData.summary.today_detections}
                        </h2>
                        <small className="text-warning fw-medium d-flex align-items-center">
                          <i className="bi bi-clock-history me-1" style={{ fontSize: '12px' }}></i>
                          <span className="text-warning">Live monitoring</span>
                        </small>
                      </div>
                      <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
                        <i className="bi bi-bar-chart-fill text-warning" style={{ fontSize: '28px' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-3 col-md-6">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)' }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Active Cameras</h6>
                        <h2 className="mb-1 fw-bold text-info" style={{ fontSize: '28px' }}>
                          {detectionData.summary.active_cameras}
                        </h2>
                        <small className="text-info fw-medium d-flex align-items-center">
                          <i className="bi bi-wifi me-1" style={{ fontSize: '12px' }}></i>
                          <span className="text-info">Online</span> monitoring
                        </small>
                      </div>
                      <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                        <i className="bi bi-camera-video-fill text-info" style={{ fontSize: '28px' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Detections and Violation Types */}
            <div className="row g-4 mb-4">
              {/* Recent Detections */}
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 py-4">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <i className="bi bi-list-ul text-primary me-3" style={{ fontSize: '20px' }}></i>
                        <div>
                          <h5 className="card-title mb-1 fw-bold">Recent Detections</h5>
                          <small className="text-muted">Real-time AI-powered violation detection</small>
                        </div>
                      </div>
                      <button className="btn btn-outline-primary btn-sm d-flex align-items-center" onClick={fetchDetectionData}>
                        <i className="bi bi-arrow-clockwise me-1" style={{ fontSize: '14px' }}></i>
                        Refresh
                      </button>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      {detectionData.recent_detections && detectionData.recent_detections.length > 0 ? (
                        detectionData.recent_detections.map((detection, index) => (
                          <div 
                            key={detection.violation_id} 
                            className="p-4 border-bottom hover-bg-light"
                            onClick={() => handleViolationClick(detection.violation_id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center mb-3">
                                  <span className={`badge d-flex align-items-center gap-1 ${getViolationColor(detection.violation_type)} me-2`} style={{ fontSize: '11px' }}>
                                    <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '10px' }}></i>
                                    {getViolationLabel(detection.violation_type)}
                                  </span>
                                  <span className="badge bg-light text-dark d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                                    <i className="bi bi-bullseye" style={{ fontSize: '10px' }}></i>
                                    Confidence: {detection.confidence}%
                                  </span>
                                </div>
                                
                                <div className="row g-3 mb-3">
                                  <div className="col-6">
                                    <small className="text-muted d-flex align-items-center mb-1">
                                      <i className="bi bi-car-front-fill me-1" style={{ fontSize: '12px' }}></i>
                                      Plate Number:
                                    </small>
                                    <div className="fw-medium">{detection.plate_number}</div>
                                  </div>
                                  <div className="col-6">
                                    <small className="text-muted d-flex align-items-center mb-1">
                                      <i className="bi bi-geo-alt-fill me-1" style={{ fontSize: '12px' }}></i>
                                      Location:
                                    </small>
                                    <div className="text-truncate">{detection.location}</div>
                                  </div>
                                </div>
                                
                                <div className="d-flex justify-content-between align-items-center">
                                  <small className="text-muted d-flex align-items-center">
                                    <i className="bi bi-clock me-1" style={{ fontSize: '12px' }}></i>
                                    {formatTimestamp(detection.created_at)}
                                  </small>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-danger fw-bold d-flex align-items-center">
                                      <i className="bi bi-currency-rupee me-1" style={{ fontSize: '14px' }}></i>
                                      {detection.fine_amount}
                                    </span>
                                    <span className={`badge d-flex align-items-center gap-1 ${detection.status === 'paid' ? 'bg-success' : 'bg-warning text-dark'}`} style={{ fontSize: '11px' }}>
                                      <i className={`${detection.status === 'paid' ? 'bi-check-circle-fill' : 'bi-clock-history'}`} style={{ fontSize: '10px' }}></i>
                                      {detection.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-5">
                          <i className="bi bi-inbox text-muted mb-3" style={{ fontSize: '64px' }}></i>
                          <h5 className="text-muted mb-2">No recent detections available</h5>
                          <p className="text-muted mb-0">Start detection to see real-time violations</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Violation Types */}
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 py-4">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-pie-chart-fill text-primary me-3" style={{ fontSize: '20px' }}></i>
                      <div>
                        <h5 className="card-title mb-1 fw-bold">Violation Types</h5>
                        <small className="text-muted">Distribution of detected violations</small>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    {detectionData.violation_types && detectionData.violation_types.length > 0 ? (
                      detectionData.violation_types.map((violation, index) => (
                        <div key={violation.type} className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-medium d-flex align-items-center">
                              <i className="bi bi-exclamation-circle-fill text-primary me-2" style={{ fontSize: '14px' }}></i>
                              {getViolationLabel(violation.type)}
                            </span>
                            <span className="text-muted">{violation.count}</span>
                          </div>
                          <div className="progress mb-1" style={{ height: '8px' }}>
                            <div 
                              className="progress-bar bg-primary" 
                              style={{ width: `${violation.percentage}%` }}
                            ></div>
                          </div>
                          <small className="text-muted">{violation.percentage}% of total</small>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-5">
                        <i className="bi bi-pie-chart text-muted mb-3" style={{ fontSize: '64px' }}></i>
                        <h5 className="text-muted mb-2">No violation data available</h5>
                        <p className="text-muted mb-0">Data will appear after detections</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Hourly Detection Chart and Camera Performance */}
            <div className="row g-4">
              {/* Hourly Detection Chart */}
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 py-4">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-graph-up text-primary me-3" style={{ fontSize: '20px' }}></i>
                      <div>
                        <h5 className="card-title mb-1 fw-bold">Hourly Detection Trend</h5>
                        <small className="text-muted">Detection pattern throughout the day</small>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    {detectionData.hourly_detections && detectionData.hourly_detections.length > 0 ? (
                      <div className="d-flex align-items-end justify-content-between" style={{ height: '200px' }}>
                        {detectionData.hourly_detections.map((hour, index) => {
                          const maxCount = Math.max(...detectionData.hourly_detections.map(h => h.count));
                          const height = maxCount > 0 ? (hour.count / maxCount * 150 + 20) : 20;
                          return (
                            <div key={hour.hour} className="text-center flex-grow-1">
                              <div 
                                className="bg-primary rounded mx-1 d-flex align-items-end justify-content-center text-white fw-bold position-relative"
                                style={{ 
                                  height: `${height}px`,
                                  minHeight: '20px'
                                }}
                              >
                                <small>{hour.count}</small>
                              </div>
                              <small className="text-muted mt-1 d-block">{hour.hour}</small>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <i className="bi bi-graph-up text-muted mb-3" style={{ fontSize: '64px' }}></i>
                        <h5 className="text-muted mb-2">No hourly data available</h5>
                        <p className="text-muted mb-0">Chart will populate with detection data</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Camera Performance */}
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 py-4">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-camera-video text-primary me-3" style={{ fontSize: '20px' }}></i>
                      <div>
                        <h5 className="card-title mb-1 fw-bold">Camera Performance</h5>
                        <small className="text-muted">Top performing cameras</small>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    {detectionData.camera_performance && detectionData.camera_performance.length > 0 ? (
                      detectionData.camera_performance.map((camera, index) => (
                        <div key={camera.camera_id} className="mb-4 pb-3 border-bottom">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex align-items-center">
                              <div className={`p-2 rounded-circle me-3 ${camera.status === 'active' ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}>
                                <i className={`${camera.status === 'active' ? 'bi-camera-video-fill text-success' : 'bi-camera-video-off-fill text-danger'}`} style={{ fontSize: '16px' }}></i>
                              </div>
                              <div>
                                <div className="fw-medium">{camera.camera_id}</div>
                                <small className="text-muted text-truncate d-flex align-items-center">
                                  <i className="bi bi-geo-alt me-1" style={{ fontSize: '10px' }}></i>
                                  {camera.location}
                                </small>
                              </div>
                            </div>
                            <span className={`badge d-flex align-items-center gap-1 ${camera.status === 'active' ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '10px' }}>
                              <i className={`${camera.status === 'active' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} style={{ fontSize: '8px' }}></i>
                              {camera.status}
                            </span>
                          </div>
                          <div className="row g-2">
                            <div className="col-6">
                              <small className="text-muted d-flex align-items-center">
                                <i className="bi bi-eye-fill me-1" style={{ fontSize: '10px' }}></i>
                                Detections
                              </small>
                              <div className="fw-bold text-primary">{camera.detections}</div>
                            </div>
                            <div className="col-6">
                              <small className="text-muted d-flex align-items-center">
                                <i className="bi bi-bullseye me-1" style={{ fontSize: '10px' }}></i>
                                Accuracy
                              </small>
                              <div className="fw-bold text-success">{camera.accuracy}%</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-5">
                        <i className="bi bi-camera-video text-muted mb-3" style={{ fontSize: '64px' }}></i>
                        <h5 className="text-muted mb-2">No camera data available</h5>
                        <p className="text-muted mb-0">Camera performance will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs content */}
        {activeTab !== 'ai-detection' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-4">
              <h5 className="card-title mb-0 fw-bold text-capitalize d-flex align-items-center">
                <i className={`${
                  activeTab === 'overview' ? 'bi-speedometer2' :
                  activeTab === 'live-feed' ? 'bi-camera-video-fill' :
                  activeTab === 'live-camera' ? 'bi-camera-fill' :
                  activeTab === 'penalties' ? 'bi-file-earmark-text-fill' :
                  activeTab === 'documents' ? 'bi-folder-fill' :
                  'bi-bar-chart-fill'
                } text-primary me-2`} style={{ fontSize: '20px' }}></i>
                {activeTab.replace('-', ' ')} {activeTab === 'overview' ? 'Dashboard' : 
                 activeTab === 'live-camera' ? 'Violation Detector' :
                 activeTab === 'live-feed' ? 'Monitor' :
                 activeTab === 'penalties' ? 'Management' :
                 activeTab === 'documents' ? 'Verification' :
                 'Reports'}
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center py-5">
                <i className={`${
                  activeTab === 'overview' ? 'bi-speedometer2' :
                  activeTab === 'live-feed' ? 'bi-camera-video' :
                  activeTab === 'live-camera' ? 'bi-camera' :
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

      {/* Violation Details Modal */}
      {showModal && selectedViolation && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white border-0">
                <div>
                  <h5 className="modal-title fw-bold">Violation Details</h5>
                  <p className="text-white-50 mb-0">ID: {selectedViolation.violation_id}</p>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3 d-flex align-items-center">
                      <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                      Violation Information
                    </h6>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center mb-1">
                        <i className="bi bi-tag-fill me-1" style={{ fontSize: '12px' }}></i>Type:
                      </small>
                      <div className="fw-medium">{getViolationLabel(selectedViolation.violation_type)}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center mb-1">
                        <i className="bi bi-currency-rupee me-1" style={{ fontSize: '12px' }}></i>Fine Amount:
                      </small>
                      <div className="fw-bold text-danger fs-5">₹{selectedViolation.fine_amount}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center mb-1">
                        <i className="bi bi-geo-alt-fill me-1" style={{ fontSize: '12px' }}></i>Location:
                      </small>
                      <div className="fw-medium">{selectedViolation.location}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center mb-1">
                        <i className="bi bi-clock me-1" style={{ fontSize: '12px' }}></i>Date & Time:
                      </small>
                      <div className="fw-medium">{formatTimestamp(selectedViolation.created_at)}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center mb-1">
                        <i className="bi bi-bullseye me-1" style={{ fontSize: '12px' }}></i>Confidence:
                      </small>
                      <div className="fw-medium">{selectedViolation.confidence}%</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3 d-flex align-items-center">
                      <i className="bi bi-car-front-fill text-primary me-2"></i>
                      Vehicle & Owner Details
                    </h6>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center mb-1">
                        <i className="bi bi-car-front me-1" style={{ fontSize: '12px' }}></i>Plate Number:
                      </small>
                      <div className="fw-medium">{selectedViolation.plate_number}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center mb-1">
                        <i className="bi bi-car-front-fill me-1" style={{ fontSize: '12px' }}></i>Vehicle:
                      </small>
                      <div className="fw-medium">
                        {selectedViolation.vehicle_details?.make} {selectedViolation.vehicle_details?.model} ({selectedViolation.vehicle_details?.year})
                      </div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center mb-1">
                        <i className="bi bi-person-fill me-1" style={{ fontSize: '12px' }}></i>Owner:
                      </small>
                      <div className="fw-medium">{selectedViolation.owner_details?.name}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center mb-1">
                        <i className="bi bi-telephone-fill me-1" style={{ fontSize: '12px' }}></i>Contact:
                      </small>
                      <div className="fw-medium">{selectedViolation.owner_details?.mobile_number}</div>
                    </div>
                    {selectedViolation.speed_detected && (
                      <div className="mb-3">
                        <small className="text-muted d-flex align-items-center mb-1">
                          <i className="bi bi-speedometer2 me-1" style={{ fontSize: '12px' }}></i>Speed:
                        </small>
                        <div className="fw-medium text-danger">
                          {selectedViolation.speed_detected} km/h (Limit: {selectedViolation.speed_limit} km/h)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedViolation.evidence_photo && (
                  <div className="mt-4">
                    <h6 className="fw-bold mb-3 d-flex align-items-center">
                      <i className="bi bi-camera-fill text-info me-2"></i>
                      Evidence Photo
                    </h6>
                    <img 
                      src={selectedViolation.evidence_photo} 
                      alt="Evidence" 
                      className="img-fluid rounded border shadow-sm"
                      style={{ maxHeight: '300px' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 bg-light">
                <div className="d-flex gap-2">
                  {selectedViolation.status === 'pending' && (
                    <>
                      <button 
                        className="btn btn-success"
                        onClick={() => handleStatusUpdate(selectedViolation.violation_id, 'confirmed')}
                      >
                        <i className="bi bi-check-circle-fill me-2"></i>
                        Confirm Fine
                      </button>
                      <button 
                        className="btn btn-warning"
                        onClick={() => handleStatusUpdate(selectedViolation.violation_id, 'under_review')}
                      >
                        <i className="bi bi-clock-history me-2"></i>
                        Under Review
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleStatusUpdate(selectedViolation.violation_id, 'dismissed')}
                      >
                        <i className="bi bi-x-circle-fill me-2"></i>
                        Dismiss
                      </button>
                    </>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-bg-light:hover {
          background-color: #f8f9fa !important;
          transition: background-color 0.3s ease;
        }
        
        .pulse-badge {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
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

export default AIDetection;