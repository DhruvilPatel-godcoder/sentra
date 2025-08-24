import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCameras, fetchLiveDetections, fetchCameraStream } from '../api/livefeed';

const LiveFeed = () => {
  const [activeTab, setActiveTab] = useState('live-feed');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [liveDetections, setLiveDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useState({ name: 'Admin User', department: 'Traffic Control' });
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const videoRef = useRef(null);

  // Memoize the fetch functions to prevent unnecessary re-renders
  const fetchDetectionsForCamera = useCallback(async (cameraId) => {
    try {
      console.log(`Fetching detections for camera: ${cameraId}`);
      const detectionsRes = await fetchLiveDetections(cameraId);
      if (detectionsRes.status === 'success') {
        setLiveDetections(detectionsRes.detections || []);
      }
    } catch (error) {
      console.error('Error fetching camera detections:', error);
    }
  }, []);

  const fetchLiveFeedData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching live feed data...');
      
      const [camerasRes, detectionsRes] = await Promise.all([
        fetchCameras(),
        fetchLiveDetections()
      ]);

      console.log('Cameras response:', camerasRes);
      console.log('Detections response:', detectionsRes);

      // Handle cameras
      if (camerasRes.status === 'success') {
        setCameras(camerasRes.cameras || []);
        // Set first active camera as selected only if no camera is selected
        if (!selectedCamera) {
          const activeCameras = camerasRes.cameras?.filter(cam => cam.status === 'active') || [];
          if (activeCameras.length > 0) {
            setSelectedCamera(activeCameras[0]);
          }
        }
      } else {
        console.error('Cameras error:', camerasRes.message);
      }

      // Handle live detections
      if (detectionsRes.status === 'success') {
        setLiveDetections(detectionsRes.detections || []);
      } else {
        console.error('Detections error:', detectionsRes.message);
        setLiveDetections([]);
      }

    } catch (error) {
      console.error('Error fetching live feed data:', error);
      setError('Failed to fetch live feed data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [selectedCamera]);

  // Initial data fetch - runs only once
  useEffect(() => {
    fetchLiveFeedData();
  }, [fetchLiveFeedData]);

  // Separate effect for periodic updates
  useEffect(() => {
    let interval;
    
    if (selectedCamera?.camera_id) {
      // Initial fetch for selected camera
      fetchDetectionsForCamera(selectedCamera.camera_id);
      
      // Set up interval for periodic updates
      interval = setInterval(() => {
        fetchDetectionsForCamera(selectedCamera.camera_id);
      }, 10000); // Update every 10 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedCamera?.camera_id, fetchDetectionsForCamera]);

  // Fetch camera stream when camera is selected
  const fetchStreamForCamera = useCallback(async (camera) => {
    if (!camera) return;
    
    setStreamLoading(true);
    setStreamError(null);
    
    try {
      console.log(`Fetching stream for camera: ${camera.camera_id}`);
      const streamRes = await fetchCameraStream(camera.camera_id);
      
      if (streamRes.status === 'success') {
        const stream = streamRes.stream;
        
        // Convert RTSP to HTTP stream if needed
        let videoUrl = stream.stream_url;
        
        // If it's an RTSP stream, you'll need to convert it to HTTP/HLS
        // For demo purposes, we'll use a sample stream or convert the URL
        if (videoUrl && videoUrl.startsWith('rtsp://')) {
          // Option 1: Use a streaming server to convert RTSP to HLS/WebRTC
          // videoUrl = `http://your-streaming-server/hls/${camera.camera_id}.m3u8`;
          
          // Option 2: For testing, use a sample HTTP stream
          videoUrl = `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`;
          
          console.warn('RTSP stream detected. Using sample video for demo. Implement streaming server for production.');
        }
        
        setStreamUrl(videoUrl);
        
        // If it's a direct HTTP video URL, load it in video element
        if (videoRef.current && videoUrl) {
          videoRef.current.src = videoUrl;
          videoRef.current.load();
        }
      } else {
        setStreamError('Failed to load camera stream');
      }
    } catch (error) {
      console.error('Error fetching camera stream:', error);
      setStreamError('Stream connection failed');
    } finally {
      setStreamLoading(false);
    }
  }, []);

  const handleCameraSelect = useCallback((camera) => {
    console.log('Camera selected:', camera.camera_id);
    setSelectedCamera(camera);
    fetchStreamForCamera(camera);
  }, [fetchStreamForCamera]);

  // Video error handler
  const handleVideoError = useCallback((e) => {
    console.error('Video load error:', e);
    setStreamError('Failed to load video stream');
  }, []);

  // Video load handler
  const handleVideoLoad = useCallback(() => {
    console.log('Video loaded successfully');
    setStreamError(null);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminToken');
    window.location.href = '/';
  }, []);

  const navigateToTab = useCallback((tabKey) => {
    // Navigate to other pages based on tab
    switch (tabKey) {
      case 'overview':
        window.location.href = '/dashboard';
        break;
      case 'live-feed':
        setActiveTab(tabKey);
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
        setActiveTab(tabKey);
    }
  }, []);

  const getViolationColor = useCallback((type) => {
    switch (type) {
      case 'speeding':
      case 'over_speed':
        return 'bg-danger text-white';
      case 'red_light_violation':
      case 'signal_jump':
        return 'bg-danger text-white';
      case 'no_helmet':
        return 'bg-warning text-dark';
      case 'no_seatbelt':
        return 'bg-warning text-dark';
      case 'wrong_parking':
      case 'no_parking':
        return 'bg-warning text-dark';
      case 'triple_riding':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary text-white';
    }
  }, []);

  const getViolationIcon = useCallback((type) => {
    switch (type) {
      case 'speeding':
      case 'over_speed':
        return 'bi-speedometer2';
      case 'red_light_violation':
      case 'signal_jump':
        return 'bi-stoplight-fill';
      case 'no_helmet':
        return 'bi-person-x';
      case 'no_seatbelt':
        return 'bi-shield-x';
      case 'wrong_parking':
      case 'no_parking':
        return 'bi-p-square';
      case 'triple_riding':
        return 'bi-people-fill';
      default:
        return 'bi-exclamation-triangle';
    }
  }, []);

  const getViolationLabel = useCallback((type) => {
    switch (type) {
      case 'speeding':
      case 'over_speed':
        return 'Over-speeding';
      case 'red_light_violation':
      case 'signal_jump':
        return 'Red Light Jump';
      case 'no_helmet':
        return 'No Helmet';
      case 'no_seatbelt':
        return 'No Seatbelt';
      case 'wrong_parking':
      case 'no_parking':
        return 'No Parking';
      case 'triple_riding':
        return 'Triple Riding';
      default:
        return type?.replace('_', ' ').toUpperCase() || 'Unknown';
    }
  }, []);

  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hour ago`;
    return date.toLocaleDateString();
  }, []);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Live Feed...</h5>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="alert alert-danger border-0 shadow-lg" role="alert" style={{ maxWidth: '500px' }}>
          <div className="d-flex align-items-center mb-3">
            <i className="bi bi-exclamation-triangle-fill me-3" style={{ fontSize: '24px' }}></i>
            <h4 className="alert-heading mb-0">Connection Error!</h4>
          </div>
          <p className="mb-3">{error}</p>
          <button className="btn btn-outline-danger d-flex align-items-center" onClick={fetchLiveFeedData}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Retry Connection
          </button>
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
                <i className="bi bi-camera-video-fill text-primary" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA Live Feed</h1>
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

        {/* Live Feed Content */}
        {activeTab === 'live-feed' && (
          <div className="space-y-4">
            {/* Camera Statistics */}
            <div className="row g-4 mb-4">
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
                  <div className="card-body text-center p-4">
                    <div className="bg-primary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                         style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-camera-video-fill text-primary" style={{ fontSize: '28px' }}></i>
                    </div>
                    <h2 className="fw-bold text-primary mb-1">
                      {cameras.filter(cam => cam.status === 'active').length}
                    </h2>
                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Active Cameras</p>
                    <small className="text-success fw-medium">
                      <i className="bi bi-check-circle me-1"></i>
                      Operational
                    </small>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
                  <div className="card-body text-center p-4">
                    <div className="bg-warning bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                         style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '28px' }}></i>
                    </div>
                    <h2 className="fw-bold text-warning mb-1">{liveDetections.length}</h2>
                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Live Detections</p>
                    <small className="text-muted">
                      <i className="bi bi-clock me-1"></i>
                      Last 10 minutes
                    </small>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)' }}>
                  <div className="card-body text-center p-4">
                    <div className="bg-info bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                         style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-geo-alt-fill text-info" style={{ fontSize: '28px' }}></i>
                    </div>
                    <h2 className="fw-bold text-info mb-1">{cameras.length}</h2>
                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Camera Locations</p>
                    <small className="text-muted">
                      <i className="bi bi-shield-check me-1"></i>
                      Total coverage
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Camera Selection and Live Feed */}
            <div className="card border-0 shadow-lg">
              <div className="card-header bg-white border-0 py-4">
                <div className="d-flex align-items-center">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                    <i className="bi bi-broadcast text-primary" style={{ fontSize: '24px' }}></i>
                  </div>
                  <div>
                    <h4 className="mb-1 fw-bold text-dark">Live Camera Feed</h4>
                    <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Real-time AI-powered violation detection</p>
                  </div>
                </div>
              </div>
              <div className="card-body p-4">
                {/* Camera Selection Buttons */}
                <div className="mb-4">
                  <h6 className="fw-bold mb-3 d-flex align-items-center">
                    <i className="bi bi-camera2 me-2 text-primary"></i>
                    Select Camera
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {cameras.map((camera) => (
                      <button
                        key={camera.camera_id}
                        className={`btn ${selectedCamera?.camera_id === camera.camera_id ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center`}
                        onClick={() => handleCameraSelect(camera)}
                      >
                        <i className="bi bi-camera-video me-2"></i>
                        {camera.camera_id}
                        <span className={`ms-2 badge ${camera.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                          <i className={`bi ${camera.status === 'active' ? 'bi-circle-fill' : 'bi-x-circle-fill'} me-1`} style={{ fontSize: '8px' }}></i>
                          {camera.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="row g-4">
                  {/* Live Feed */}
                  <div className="col-lg-6">
                    <div className="position-relative">
                      <div 
                        className="bg-dark rounded-3 position-relative overflow-hidden shadow-lg"
                        style={{ aspectRatio: '16/9', minHeight: '300px' }}
                      >
                        {/* Video Element */}
                        {selectedCamera && streamUrl && !streamLoading && !streamError ? (
                          <video
                            ref={videoRef}
                            className="w-100 h-100 object-fit-cover"
                            autoPlay
                            muted
                            controls
                            onError={handleVideoError}
                            onLoadedData={handleVideoLoad}
                            style={{ objectFit: 'cover' }}
                          >
                            <source src={streamUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          // Placeholder when no stream or loading
                          <div className="w-100 h-100 bg-gradient-dark d-flex align-items-center justify-content-center">
                            <div className="text-center text-white">
                              <div className="mb-3">
                                {streamLoading ? (
                                  <div className="spinner-border text-white" role="status">
                                    <span className="visually-hidden">Loading stream...</span>
                                  </div>
                                ) : streamError ? (
                                  <i className="bi bi-exclamation-triangle" style={{ fontSize: '48px', opacity: '0.7' }}></i>
                                ) : (
                                  <i className="bi bi-camera-video" style={{ fontSize: '48px', opacity: '0.7' }}></i>
                                )}
                              </div>
                              <p className="mb-0 fw-medium">
                                {streamLoading ? 'Loading Stream...' : 
                                 streamError ? 'Stream Error' : 
                                 'Select a camera to view live feed'}
                              </p>
                              <small className="text-white-50">
                                <i className="bi bi-geo-alt me-1"></i>
                                {selectedCamera ? selectedCamera.location : 'No camera selected'}
                              </small>
                              {streamError && (
                                <div className="mt-3">
                                  <button 
                                    className="btn btn-outline-light btn-sm"
                                    onClick={() => fetchStreamForCamera(selectedCamera)}
                                  >
                                    <i className="bi bi-arrow-clockwise me-1"></i>
                                    Retry Stream
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Live Indicator */}
                        {selectedCamera?.status === 'active' && streamUrl && !streamError && (
                          <div className="position-absolute top-0 start-0 m-3">
                            <span className="badge bg-danger d-flex align-items-center px-3 py-2" style={{ borderRadius: '20px' }}>
                              <span className="bg-white rounded-circle me-2 pulse-dot"></span>
                              <i className="bi bi-broadcast me-2"></i>
                              LIVE
                            </span>
                          </div>
                        )}
                        
                        {/* Camera Info */}
                        {selectedCamera && (
                          <div className="position-absolute bottom-0 start-0 m-3">
                            <span className="badge bg-dark bg-opacity-75 text-white px-3 py-2" style={{ borderRadius: '20px' }}>
                              <i className="bi bi-camera2 me-2"></i>
                              {selectedCamera.camera_id} - {selectedCamera.location}
                            </span>
                          </div>
                        )}

                        {/* Stream Info Overlay */}
                        {streamUrl && !streamError && (
                          <div className="position-absolute top-0 end-0 m-3">
                            <span className="badge bg-success bg-opacity-75 text-white px-2 py-1" style={{ fontSize: '10px' }}>
                              <i className="bi bi-wifi me-1"></i>
                              HD
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status and Controls */}
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <small className="text-muted d-flex align-items-center">
                          <i className="bi bi-info-circle me-2"></i>
                          Status: {selectedCamera?.status || 'No camera selected'}
                          {streamUrl && !streamError && (
                            <span className="text-success ms-2">
                              <i className="bi bi-dot"></i>
                              Streaming
                            </span>
                          )}
                        </small>
                        {selectedCamera && (
                          <div className="d-flex align-items-center gap-2">
                            <span className={`rounded-circle me-2 ${selectedCamera.status === 'active' ? 'bg-success' : 'bg-danger'}`} style={{ width: '8px', height: '8px' }}></span>
                            <small className={`fw-medium d-flex align-items-center ${selectedCamera.status === 'active' ? 'text-success' : 'text-danger'}`}>
                              <i className={`bi ${selectedCamera.status === 'active' ? 'bi-wifi' : 'bi-wifi-off'} me-1`}></i>
                              {selectedCamera.status === 'active' ? 'Online' : 'Offline'}
                            </small>
                            {streamUrl && selectedCamera.status === 'active' && (
                              <button 
                                className="btn btn-outline-primary btn-sm ms-2"
                                onClick={() => fetchStreamForCamera(selectedCamera)}
                                title="Refresh Stream"
                              >
                                <i className="bi bi-arrow-clockwise"></i>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stream URL Display (for debugging) */}
                      {streamUrl && (
                        <div className="mt-2">
                          <small className="text-muted d-flex align-items-center">
                            <i className="bi bi-link-45deg me-1"></i>
                            Stream: <code className="ms-1 text-truncate" style={{ fontSize: '10px', maxWidth: '200px' }}>{streamUrl}</code>
                          </small>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Detections */}
                  <div className="col-lg-6">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-bold mb-0 d-flex align-items-center">
                        <i className="bi bi-clock-history me-2 text-primary"></i>
                        Recent Detections
                      </h6>
                      <span className="badge bg-primary">
                        {liveDetections.length} Records
                      </span>
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="custom-scrollbar">
                      <div className="d-flex flex-column gap-3">
                        {liveDetections && liveDetections.length > 0 ? ( 
                          liveDetections.map((detection, index) => (
                            <div key={detection.detection_id || index} className="card border-0 shadow-sm">
                              <div className="card-body p-3">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                  <span className={`badge d-flex align-items-center ${getViolationColor(detection.violation_type)}`} style={{ fontSize: '11px', borderRadius: '20px' }}>
                                    <i className={`${getViolationIcon(detection.violation_type)} me-1`}></i>
                                    {getViolationLabel(detection.violation_type)}
                                  </span>
                                  <small className="text-muted d-flex align-items-center">
                                    <i className="bi bi-clock me-1"></i>
                                    {formatTimestamp(detection.detected_at)}
                                  </small>
                                </div>

                                <div className="row g-2 mb-3">
                                  <div className="col-6">
                                    <div className="d-flex align-items-center">
                                      <i className="bi bi-car-front text-muted me-2"></i>
                                      <small className="fw-medium">{detection.plate_number || 'Unknown'}</small>
                                    </div>
                                  </div>
                                  <div className="col-6">
                                    <div className="d-flex align-items-center">
                                      <i className="bi bi-geo-alt text-muted me-2"></i>
                                      <small>{detection.location || selectedCamera?.location}</small>
                                    </div>
                                  </div>
                                </div>

                                {detection.speed && (
                                  <div className="mb-3">
                                    <small className="d-flex align-items-center">
                                      <i className="bi bi-speedometer2 text-danger me-2"></i>
                                      <span className="text-danger fw-bold">Speed: {detection.speed} km/h</span>
                                      <span className="text-muted ms-2">(Limit: {detection.speed_limit || 60} km/h)</span>
                                    </small>
                                  </div>
                                )}

                                <div className="d-flex justify-content-between align-items-center">
                                  <small className="text-muted d-flex align-items-center">
                                    <i className="bi bi-percent me-1"></i>
                                    Confidence: {detection.confidence || 95}%
                                  </small>
                                  <button className="btn btn-outline-primary btn-sm d-flex align-items-center">
                                    <i className="bi bi-eye me-1"></i>
                                    <span style={{ fontSize: '12px' }}>View Details</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-5">
                            <div className="bg-light bg-opacity-50 rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center"
                                 style={{ width: '80px', height: '80px' }}>
                              <i className="bi bi-inbox text-muted" style={{ fontSize: '32px' }}></i>
                            </div>
                            <h6 className="text-muted mb-2">No Recent Detections</h6>
                            <p className="text-muted mb-0">Select an active camera to view live detections</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs content */}
        {activeTab !== 'live-feed' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-4">
              <h5 className="card-title mb-0 fw-bold text-capitalize d-flex align-items-center">
                <i className={`${
                  activeTab === 'overview' ? 'bi-speedometer2' :
                  activeTab === 'live-feed' ? 'bi-camera-video-fill' :
                  activeTab === 'live-camera' ? 'bi-camera-fill' :
                  activeTab === 'ai-detection' ? 'bi-robot' :
                  activeTab === 'penalties' ? 'bi-file-earmark-text-fill' :
                  activeTab === 'documents' ? 'bi-folder-fill' :
                  'bi-bar-chart-fill'
                } text-primary me-2`} style={{ fontSize: '20px' }}></i>
                {activeTab.replace('-', ' ')} {activeTab === 'overview' ? 'Dashboard' : 
                 activeTab === 'live-camera' ? 'Violation Detector' :
                 activeTab === 'ai-detection' ? 'Engine' :
                 activeTab === 'penalties' ? 'Management' :
                 activeTab === 'documents' ? 'Verification' :
                 'Reports'}
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center py-5">
                <i className={`${
                  activeTab === 'overview' ? 'bi-speedometer2' :
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
        .object-fit-cover {
          object-fit: cover;
        }
        
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
        
        .bg-gradient-dark {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        }
        
        video {
          border-radius: 12px;
        }
        
        .text-truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default LiveFeed;