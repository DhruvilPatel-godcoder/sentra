import React, { useState, useEffect, useRef } from 'react';
import {
  uploadImageForDetection,
  getDetectionResults,
  getViolationMemos,
  getDetectionStats
} from '../api/liveDetection';

const LiveDetection = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [violations, setViolations] = useState([]);
  const [statistics, setStatistics] = useState({
    total_detections: 0,
    total_violations: 0,
    violation_rate: 0
  });
  const [cameraId, setCameraId] = useState('upload');
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('live-camera');
  const [user] = useState({ name: 'Admin User', department: 'Traffic Control' });

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
      case 'live-camera':
        window.location.href = '/livedetection';
        break;
      case 'ai-detection':
        window.location.href = '/aidetection';
        break;
      case 'penalties':
        window.location.href = '/penalties';
        break;
      case 'documents':
        window.location.href = '/documents';
        break;
      case 'analytics':
        window.location.href = '/dashboard#analytics';
        break;
      default:
        window.location.href = '/dashboard';
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDetectionHistory();
    fetchViolations();
    fetchStatistics();
  }, []);

  const fetchDetectionHistory = async () => {
    try {
      const response = await getDetectionResults();
      if (response.status === 'success') {
        setDetectionHistory(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching detection history:', error);
    }
  };

  const fetchViolations = async () => {
    try {
      const response = await getViolationMemos();
      if (response.status === 'success') {
        setViolations(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching violations:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await getDetectionStats('24h');
      if (response.status === 'success') {
        setStatistics(response.data || {
          total_detections: 0,
          total_violations: 0,
          violation_rate: 0
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setDetectionResult(null);
    }
  };

  const processImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);

    try {
      const response = await uploadImageForDetection(selectedImage, cameraId);
      
      if (response.status === 'success') {
        setDetectionResult(response.data);
        // Refresh data after processing
        await Promise.all([
          fetchDetectionHistory(),
          fetchViolations(),
          fetchStatistics()
        ]);
      } else {
        console.error('Processing failed:', response.message);
        alert(`Processing failed: ${response.message}`);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert(`Error processing image: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResults = () => {
    // Use window.confirm to avoid ESLint error
    const shouldClear = window.confirm('Are you sure you want to clear all results?');
    if (shouldClear) {
      setSelectedImage(null);
      setDetectionResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadReport = () => {
    if (!detectionResult) return;

    const report = {
      detection_id: detectionResult.detection_id,
      timestamp: detectionResult.timestamp,
      camera_id: cameraId,
      results: detectionResult,
      statistics: statistics
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detection_report_${detectionResult.detection_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getConfidencePercentage = (confidence) => {
    if (confidence === null || confidence === undefined) return '0.0';
    return (confidence * 100).toFixed(1);
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-bottom">
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-between py-3 px-4">
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                <i className="bi bi-camera-fill text-primary" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA Live Detection</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Real-time Violation Detection System</p>
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

        {/* Statistics Cards */}
        <div className="row g-4 mb-4">
          <div className="col-lg-4 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-primary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-bar-chart-fill text-primary" style={{ fontSize: '28px' }}></i>
                </div>
                <h2 className="fw-bold text-primary mb-1">{statistics.total_detections || 0}</h2>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Total Detections</p>
                <small className="text-muted">Last 24 hours</small>
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-danger bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '28px' }}></i>
                </div>
                <h2 className="fw-bold text-danger mb-1">{statistics.total_violations || 0}</h2>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Total Violations</p>
                <small className="text-muted">Helmet violations</small>
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-success bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-percent text-success" style={{ fontSize: '28px' }}></i>
                </div>
                <h2 className="fw-bold text-success mb-1">{statistics.violation_rate || 0}%</h2>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Violation Rate</p>
                <small className="text-muted">Detection accuracy</small>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="card border-0 shadow-lg mb-4">
          <div className="card-header bg-white border-0 py-4">
            <div className="d-flex align-items-center">
              <div className="bg-info bg-opacity-10 p-3 rounded-circle me-3">
                <i className="bi bi-cloud-upload text-info" style={{ fontSize: '24px' }}></i>
              </div>
              <div>
                <h4 className="mb-1 fw-bold text-dark">Image Upload & Detection</h4>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Upload images for AI-powered helmet violation detection</p>
              </div>
            </div>
          </div>
          <div className="card-body p-4">
            {/* Camera ID Input */}
            <div className="mb-4">
              <label htmlFor="camera-id" className="form-label fw-medium">
                <i className="bi bi-camera2 me-2"></i>Camera ID
              </label>
              <input
                type="text"
                id="camera-id"
                className="form-control"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                placeholder="Enter camera ID (e.g., CAM001)"
              />
            </div>

            {/* File Upload */}
            <div className="border border-2 border-dashed rounded-3 p-5 text-center mb-4" 
                 style={{ backgroundColor: '#f8f9fa' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="d-none"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="d-block" style={{cursor: 'pointer'}}>
                <div className="text-muted mb-3">
                  <i className="bi bi-cloud-arrow-up" style={{ fontSize: '48px' }}></i>
                </div>
                <h5 className="mb-2">Click to upload image</h5>
                <p className="text-muted mb-0">Supports JPG, PNG, BMP formats • Max size 10MB</p>
              </label>
            </div>

            {/* Selected Image Preview */}
            {selectedImage && (
              <div className="mb-4">
                <h6 className="fw-medium mb-3">
                  <i className="bi bi-image me-2"></i>Selected Image
                </h6>
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center">
                      <img
                        src={URL.createObjectURL(selectedImage)}
                        alt="Selected"
                        className="border rounded me-3"
                        style={{width: '120px', height: '120px', objectFit: 'cover'}}
                      />
                      <div>
                        <h6 className="mb-1 d-flex align-items-center">
                          <i className="bi bi-file-earmark-image me-2 text-primary"></i>
                          {selectedImage.name}
                        </h6>
                        <p className="text-muted mb-1 d-flex align-items-center">
                          <i className="bi bi-hdd me-2" style={{ fontSize: '12px' }}></i>
                          {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <small className="text-muted d-flex align-items-center">
                          <i className="bi bi-calendar-event me-2" style={{ fontSize: '10px' }}></i>
                          {new Date(selectedImage.lastModified).toLocaleString()}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="d-flex gap-2 flex-wrap">
              <button
                onClick={processImage}
                disabled={!selectedImage || isProcessing}
                className="btn btn-primary d-flex align-items-center"
              >
                {isProcessing ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-play-circle me-2"></i>
                    <span>Process Image</span>
                  </>
                )}
              </button>

              <button
                onClick={clearResults}
                className="btn btn-outline-secondary d-flex align-items-center"
              >
                <i className="bi bi-trash3 me-2"></i>
                Clear Results
              </button>

              {detectionResult && (
                <button
                  onClick={downloadReport}
                  className="btn btn-success d-flex align-items-center"
                >
                  <i className="bi bi-download me-2"></i>
                  Download Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Detection Results */}
        {detectionResult && (
          <div className="card border-0 shadow-lg mb-4">
            <div className="card-header bg-white border-0 py-4">
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded-circle me-3">
                  <i className="bi bi-search text-warning" style={{ fontSize: '24px' }}></i>
                </div>
                <div>
                  <h4 className="mb-1 fw-bold text-dark">Detection Results</h4>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>AI analysis results for uploaded image</p>
                </div>
              </div>
            </div>
            <div className="card-body p-4">
              <div className="row">
                {/* Result Summary */}
                <div className="col-lg-6 mb-4">
                  <div className={`alert ${detectionResult.is_violation ? 'alert-danger' : 'alert-success'} border-0 shadow-sm`}>
                    <div className="d-flex align-items-center mb-3">
                      <i className={`bi ${detectionResult.is_violation ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2`} style={{ fontSize: '20px' }}></i>
                      <span className="fw-bold">
                        {detectionResult.is_violation ? 'VIOLATION DETECTED' : 'NO VIOLATION FOUND'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-info-circle me-2"></i>Detection Details
                    </h6>
                    <div className="card border-0" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="card-body p-3">
                        <div className="row mb-2">
                          <div className="col-6 text-muted d-flex align-items-center">
                            <i className="bi bi-hash me-2" style={{ fontSize: '12px' }}></i>
                            Detection ID:
                          </div>
                          <div className="col-6">
                            <code>{detectionResult.detection_id || 'N/A'}</code>
                          </div>
                        </div>
                        <div className="row mb-2">
                          <div className="col-6 text-muted d-flex align-items-center">
                            <i className="bi bi-clock me-2" style={{ fontSize: '12px' }}></i>
                            Timestamp:
                          </div>
                          <div className="col-6">{formatTimestamp(detectionResult.timestamp)}</div>
                        </div>
                        <div className="row mb-2">
                          <div className="col-6 text-muted d-flex align-items-center">
                            <i className="bi bi-person me-2" style={{ fontSize: '12px' }}></i>
                            Person Detected:
                          </div>
                          <div className={`col-6 d-flex align-items-center ${detectionResult.person_detected ? 'text-success' : 'text-danger'}`}>
                            <i className={`bi ${detectionResult.person_detected ? 'bi-check-lg' : 'bi-x-lg'} me-1`}></i>
                            {detectionResult.person_detected ? 'Yes' : 'No'}
                          </div>
                        </div>
                        <div className="row mb-2">
                          <div className="col-6 text-muted d-flex align-items-center">
                            <i className="bi bi-shield me-2" style={{ fontSize: '12px' }}></i>
                            Helmet Detected:
                          </div>
                          <div className={`col-6 d-flex align-items-center ${detectionResult.helmet_detected ? 'text-success' : 'text-danger'}`}>
                            <i className={`bi ${detectionResult.helmet_detected ? 'bi-check-lg' : 'bi-x-lg'} me-1`}></i>
                            {detectionResult.helmet_detected ? 'Yes' : 'No'}
                          </div>
                        </div>
                        {detectionResult.plate_number && (
                          <div className="row">
                            <div className="col-6 text-muted d-flex align-items-center">
                              <i className="bi bi-credit-card me-2" style={{ fontSize: '12px' }}></i>
                              License Plate:
                            </div>
                            <div className="col-6">
                              <code>{detectionResult.plate_number}</code>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confidence Scores */}
                  <div>
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-speedometer2 me-2"></i>Confidence Scores
                    </h6>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted d-flex align-items-center">
                          <i className="bi bi-person me-2"></i>Person Detection:
                        </small>
                        <span className="fw-medium">{getConfidencePercentage(detectionResult.person_confidence)}%</span>
                      </div>
                      <div className="progress" style={{height: '8px'}}>
                        <div 
                          className="progress-bar bg-primary" 
                          style={{width: `${getConfidencePercentage(detectionResult.person_confidence)}%`}}
                        ></div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted d-flex align-items-center">
                          <i className="bi bi-shield me-2"></i>Helmet Detection:
                        </small>
                        <span className="fw-medium">{getConfidencePercentage(detectionResult.helmet_confidence)}%</span>
                      </div>
                      <div className="progress" style={{height: '8px'}}>
                        <div 
                          className="progress-bar bg-success" 
                          style={{width: `${getConfidencePercentage(detectionResult.helmet_confidence)}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Processed Image */}
                {detectionResult.annotated_image_url && (
                  <div className="col-lg-6">
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-image me-2"></i>Processed Image
                    </h6>
                    <div className="card border-0 shadow-sm">
                      <div className="card-body p-2">
                        <img
                          src={detectionResult.annotated_image_url}
                          alt="Processed"
                          className="img-fluid rounded"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Detections */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-0 py-4">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <div className="bg-secondary bg-opacity-10 p-3 rounded-circle me-3">
                  <i className="bi bi-clock-history text-secondary" style={{ fontSize: '24px' }}></i>
                </div>
                <div>
                  <h4 className="mb-1 fw-bold text-dark">Recent Detections</h4>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Latest detection history and results</p>
                </div>
              </div>
              <span className="badge bg-primary">
                {detectionHistory.length} Records
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0 fw-medium">
                      <i className="bi bi-clock me-2"></i>Timestamp
                    </th>
                    <th className="border-0 fw-medium">
                      <i className="bi bi-camera me-2"></i>Camera ID
                    </th>
                    <th className="border-0 fw-medium">
                      <i className="bi bi-flag me-2"></i>Status
                    </th>
                    <th className="border-0 fw-medium">
                      <i className="bi bi-person me-2"></i>Person
                    </th>
                    <th className="border-0 fw-medium">
                      <i className="bi bi-shield me-2"></i>Helmet
                    </th>
                    <th className="border-0 fw-medium">
                      <i className="bi bi-credit-card me-2"></i>Plate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detectionHistory.length > 0 ? (
                    detectionHistory.slice(0, 10).map((detection, index) => (
                      <tr key={detection.detection_id || index}>
                        <td className="border-0">{formatTimestamp(detection.timestamp)}</td>
                        <td className="border-0">
                          <code className="bg-light px-2 py-1 rounded">{detection.camera_id || 'N/A'}</code>
                        </td>
                        <td className="border-0">
                          <span className={`badge ${detection.is_violation ? 'bg-danger' : 'bg-success'}`}>
                            <i className={`bi ${detection.is_violation ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-1`}></i>
                            {detection.is_violation ? 'Violation' : 'Normal'}
                          </span>
                        </td>
                        <td className="border-0">
                          <i className={`bi ${detection.person_detected ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}`}></i>
                        </td>
                        <td className="border-0">
                          <i className={`bi ${detection.helmet_detected ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}`}></i>
                        </td>
                        <td className="border-0">
                          <code className="bg-light px-2 py-1 rounded">{detection.plate_number || '-'}</code>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-5 border-0">
                        <i className="bi bi-info-circle me-2" style={{ fontSize: '24px' }}></i>
                        <div>No detection history available</div>
                        <small>Upload an image to start detecting violations</small>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Violations */}
        {violations.length > 0 && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-4">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <div className="bg-danger bg-opacity-10 p-3 rounded-circle me-3">
                    <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '24px' }}></i>
                  </div>
                  <div>
                    <h4 className="mb-1 fw-bold text-dark">Recent Violations</h4>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Latest helmet violations detected</p>
                  </div>
                </div>
                <span className="badge bg-danger">
                  {violations.length} Violations
                </span>
              </div>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                {violations.slice(0, 5).map((violation, index) => (
                  <div key={violation.violation_id || index} className="col-12">
                    <div className="alert alert-danger border-0 shadow-sm">
                      <div className="d-flex align-items-start">
                        <i className="bi bi-exclamation-triangle-fill me-3 mt-1" style={{ fontSize: '20px' }}></i>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <h6 className="alert-heading mb-1 d-flex align-items-center">
                                <i className="bi bi-hash me-2" style={{ fontSize: '14px' }}></i>
                                Violation #{violation.violation_id || `TEMP-${index + 1}`}
                              </h6>
                              <small className="text-muted d-flex align-items-center">
                                <i className="bi bi-calendar-event me-1"></i>
                                {formatTimestamp(violation.created_at || violation.timestamp)}
                              </small>
                            </div>
                            <span className="badge bg-danger">
                              <i className="bi bi-flag-fill me-1"></i>
                              {violation.status || 'Active'}
                            </span>
                          </div>
                          
                          <div className="row g-2">
                            {violation.plate_number && (
                              <div className="col-md-6">
                                <small className="text-muted d-flex align-items-center">
                                  <i className="bi bi-credit-card me-2"></i>
                                  License Plate: 
                                  <code className="ms-1">{violation.plate_number}</code>
                                </small>
                              </div>
                            )}
                            
                            {violation.fine_amount && (
                              <div className="col-md-6">
                                <small className="text-muted d-flex align-items-center">
                                  <i className="bi bi-currency-rupee me-2"></i>
                                  Fine Amount: 
                                  <strong className="ms-1">₹{violation.fine_amount}</strong>
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
        
        .table tbody tr:hover {
          background-color: rgba(13, 110, 253, 0.05);
        }
        
        .progress {
          border-radius: 10px;
        }
        
        .progress-bar {
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default LiveDetection;