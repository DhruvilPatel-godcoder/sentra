import React, { useState, useEffect } from 'react';
import { fetchDashboardStats, fetchRecentViolations, fetchViolationTrends, fetchTopLocations } from '../api/dashboard';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState({
    active_cameras: 0,
    today_violations: 0,
    pending_penalties: 0,
    revenue_today: 0,
    camera_change: '',
    violation_change: '',
    penalty_change: '',
    revenue_change: ''
  });
  const [recentViolations, setRecentViolations] = useState([]);
  const [violationTrends, setViolationTrends] = useState([]);
  const [topLocations, setTopLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useState({ name: 'Admin User', department: 'Traffic Control' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [statsRes, violationsRes, trendsRes, locationsRes] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentViolations(),
        fetchViolationTrends(),
        fetchTopLocations()
      ]);

      if (statsRes.status === 'success') setDashboardStats(statsRes.data);
      if (violationsRes.status === 'success') setRecentViolations(violationsRes.violations || []);
      else setRecentViolations([]);
      if (trendsRes.status === 'success') setViolationTrends(trendsRes.trends || []);
      else setViolationTrends([]);
      if (locationsRes.status === 'success') setTopLocations(locationsRes.locations || []);
      else setTopLocations([]);
    } catch (error) {
      setError('Failed to fetch dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/';
  };

  const navigateToTab = (tabKey) => {
    switch (tabKey) {
      case 'overview':
        setActiveTab(tabKey);
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
        setActiveTab(tabKey);
        break;
      default:
        setActiveTab(tabKey);
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'high': return 'text-danger';
      case 'medium': return 'text-warning';
      case 'low': return 'text-info';
      default: return 'text-muted';
    }
  };

  const getBadgeClass = (severity) => {
    switch (severity) {
      case 'high': return 'bg-danger';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Dashboard...</h5>
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
            <h5>Error Loading Dashboard</h5>
            <p>{error}</p>
            <button 
              onClick={fetchDashboardData} 
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
                <i className="bi bi-shield-check text-primary" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA Admin</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Traffic Management System</p>
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

        {/* Tab Content */}
        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="tab-pane fade show active">
              {/* Stats Cards */}
              <div className="row g-4 mb-4">
                <div className="col-xl-3 col-lg-6 col-md-6">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' }}>
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Active Cameras</h6>
                          <h2 className="mb-1 fw-bold text-primary" style={{ fontSize: '28px' }}>{dashboardStats.active_cameras || 0}</h2>
                          <small className="text-success fw-medium">
                            <i className="bi bi-arrow-up me-1" style={{ fontSize: '12px' }}></i>
                            <span className="text-success">{dashboardStats.camera_change || '+0'}</span> from last hour
                          </small>
                        </div>
                        <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                          <i className="bi bi-camera-video-fill text-primary" style={{ fontSize: '28px' }}></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-lg-6 col-md-6">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Today's Violations</h6>
                          <h2 className="mb-1 fw-bold text-danger" style={{ fontSize: '28px' }}>{dashboardStats.today_violations || 0}</h2>
                          <small className="text-danger fw-medium">
                            <i className="bi bi-arrow-up me-1" style={{ fontSize: '12px' }}></i>
                            <span className="text-danger">{dashboardStats.violation_change || '0%'}</span> from yesterday
                          </small>
                        </div>
                        <div className="bg-danger bg-opacity-10 p-3 rounded-circle">
                          <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '28px' }}></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-lg-6 col-md-6">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Pending Penalties</h6>
                          <h2 className="mb-1 fw-bold text-warning" style={{ fontSize: '28px' }}>{dashboardStats.pending_penalties || 0}</h2>
                          <small className="text-warning fw-medium">
                            <i className="bi bi-clock-history me-1" style={{ fontSize: '12px' }}></i>
                            <span className="text-warning">{dashboardStats.penalty_change || '0'}</span> pending
                          </small>
                        </div>
                        <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
                          <i className="bi bi-file-earmark-text-fill text-warning" style={{ fontSize: '28px' }}></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-lg-6 col-md-6">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Revenue Today</h6>
                          <h2 className="mb-1 fw-bold text-success" style={{ fontSize: '28px' }}>₹{dashboardStats.revenue_today?.toLocaleString() || 0}</h2>
                          <small className="text-success fw-medium">
                            <i className="bi bi-arrow-up me-1" style={{ fontSize: '12px' }}></i>
                            <span className="text-success">{dashboardStats.revenue_change || '0%'}</span> from yesterday
                          </small>
                        </div>
                        <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                          <i className="bi bi-currency-rupee text-success" style={{ fontSize: '28px' }}></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="row g-4">
                <div className="col-12">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-white border-0 py-4 d-flex align-items-center justify-content-between">
                      <div>
                        <h5 className="card-title mb-1 fw-bold">
                          <i className="bi bi-activity text-primary me-2" style={{ fontSize: '20px' }}></i>
                          Recent Activity
                        </h5>
                        <small className="text-muted">Latest detected traffic violations & actions</small>
                      </div>
                      <button className="btn btn-outline-primary">
                        <i className="bi bi-list-ul me-2" style={{ fontSize: '14px' }}></i>
                        View All
                      </button>
                    </div>
                    <div className="card-body">
                      {/* Search/Filter Bar */}
                      <div className="row g-3 mb-4">
                        <div className="col-md-8">
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0">
                              <i className="bi bi-search" style={{ fontSize: '16px' }}></i>
                            </span>
                            <input
                              type="text"
                              className="form-control border-start-0"
                              placeholder="Search by plate, location, or type..."
                            />
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="dropdown">
                            <button className="btn btn-outline-secondary dropdown-toggle w-100" type="button" data-bs-toggle="dropdown">
                              <i className="bi bi-funnel me-2" style={{ fontSize: '14px' }}></i>
                              Filter
                            </button>
                            <ul className="dropdown-menu w-100">
                              <li><button className="dropdown-item">
                                <i className="bi bi-list me-2"></i>All
                              </button></li>
                              <li><button className="dropdown-item">
                                <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>High Severity
                              </button></li>
                              <li><button className="dropdown-item">
                                <i className="bi bi-check-circle-fill text-success me-2"></i>Paid
                              </button></li>
                              <li><button className="dropdown-item">
                                <i className="bi bi-clock-history text-warning me-2"></i>Pending
                              </button></li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Activity List */}
                      {recentViolations && recentViolations.length > 0 ? (
                        <div className="d-flex flex-column gap-3">
                          {recentViolations.slice(0, 6).map((violation, idx) => (
                            <div key={idx} className="border rounded-3 p-4 bg-white shadow-sm">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  {/* Severity Icon */}
                                  <div className={`p-2 rounded-circle ${
                                    violation.severity === 'high' ? 'bg-danger bg-opacity-10' :
                                    violation.severity === 'medium' ? 'bg-warning bg-opacity-10' :
                                    'bg-info bg-opacity-10'
                                  }`}>
                                    <i className={`${
                                      violation.severity === 'high' ? 'bi-exclamation-triangle-fill text-danger' :
                                      violation.severity === 'medium' ? 'bi-exclamation-circle-fill text-warning' :
                                      'bi-info-circle-fill text-info'
                                    }`} style={{ fontSize: '20px' }}></i>
                                  </div>
                                  <div>
                                    <div className="fw-bold text-dark mb-1" style={{ fontSize: '15px' }}>
                                      {violation.type}
                                      {violation.status === 'paid' && (
                                        <span className="badge bg-success ms-2">
                                          <i className="bi bi-check-circle-fill me-1" style={{ fontSize: '10px' }}></i>
                                          Paid
                                        </span>
                                      )}
                                      {violation.status === 'pending' && (
                                        <span className="badge bg-warning text-dark ms-2">
                                          <i className="bi bi-clock-history me-1" style={{ fontSize: '10px' }}></i>
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-muted d-flex align-items-center gap-3" style={{ fontSize: '13px' }}>
                                      <span className="d-flex align-items-center">
                                        <i className="bi bi-geo-alt-fill me-2" style={{ fontSize: '12px' }}></i>
                                        {violation.location}
                                      </span>
                                      <span className="d-flex align-items-center">
                                        <i className="bi bi-car-front-fill me-2" style={{ fontSize: '12px' }}></i>
                                        {violation.plate_number}
                                      </span>
                                      <span className="d-flex align-items-center">
                                        <i className="bi bi-clock me-2" style={{ fontSize: '12px' }}></i>
                                        {violation.time}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-end">
                                  <div className="fw-bold text-primary mb-1" style={{ fontSize: '16px' }}>
                                    ₹{violation.fine_amount}
                                  </div>
                                  <button className="btn btn-outline-primary btn-sm">
                                    <i className="bi bi-eye-fill me-1" style={{ fontSize: '12px' }}></i>
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <i className="bi bi-inbox text-muted mb-3" style={{ fontSize: '64px' }}></i>
                          <h5 className="text-muted mb-2">No recent activity found</h5>
                          <p className="text-muted mb-0">Check back later for new violations and updates.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="tab-pane fade show active">
              <div className="row g-4">
                <div className="col-lg-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-white border-0 py-4">
                      <h5 className="card-title mb-1 fw-bold">
                        <i className="bi bi-graph-up text-primary me-2" style={{ fontSize: '20px' }}></i>
                        Violation Trends
                      </h5>
                      <small className="text-muted">Weekly violation statistics</small>
                    </div>
                    <div className="card-body">
                      {violationTrends && violationTrends.length > 0 ? (
                        <div className="d-flex flex-column gap-3">
                          {violationTrends.map((day, index) => (
                            <div key={index} className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3">
                              <div className="d-flex align-items-center">
                                <i className="bi bi-calendar-date text-primary me-3" style={{ fontSize: '16px' }}></i>
                                <span className="fw-medium" style={{ fontSize: '14px' }}>{day.day}</span>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold" style={{ fontSize: '14px' }}>{day.violations}</span>
                                <span className={`badge d-flex align-items-center gap-1 ${
                                  day.change && day.change.startsWith('+') ? 'bg-danger text-white' : 'bg-success text-white'
                                }`} style={{ fontSize: '11px' }}>
                                  <i className={`${
                                    day.change && day.change.startsWith('+') ? 'bi-arrow-up' : 'bi-arrow-down'
                                  }`} style={{ fontSize: '10px' }}></i>
                                  {day.change}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <i className="bi bi-graph-up text-muted mb-3" style={{ fontSize: '64px' }}></i>
                          <h5 className="text-muted mb-2">No trend data available</h5>
                          <p className="text-muted mb-0">Violation trends will appear here once data is collected.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-white border-0 py-4">
                      <h5 className="card-title mb-1 fw-bold">
                        <i className="bi bi-geo-alt-fill text-primary me-2" style={{ fontSize: '20px' }}></i>
                        Top Violation Locations
                      </h5>
                      <small className="text-muted">Hotspots for traffic violations</small>
                    </div>
                    <div className="card-body">
                      {topLocations && topLocations.length > 0 ? (
                        <div className="d-flex flex-column gap-3">
                          {topLocations.map((location, index) => (
                            <div key={index} className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3">
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                                  <i className="bi bi-geo-alt-fill text-primary" style={{ fontSize: '14px' }}></i>
                                </div>
                                <span className="fw-medium" style={{ fontSize: '14px' }}>{location.location}</span>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold" style={{ fontSize: '14px' }}>{location.violations}</span>
                                <span className="badge bg-primary text-white" style={{ fontSize: '11px' }}>
                                  {location.percentage}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <i className="bi bi-geo-alt text-muted mb-3" style={{ fontSize: '64px' }}></i>
                          <h5 className="text-muted mb-2">No location data available</h5>
                          <p className="text-muted mb-0">Location statistics will appear here once violations are recorded.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Tabs */}
          {['live-feed', 'live-camera', 'ai-detection', 'penalties', 'documents'].map(tab => (
            activeTab === tab && (
              <div key={tab} className="tab-pane fade show active">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 py-4">
                    <h5 className="card-title mb-0 fw-bold text-capitalize d-flex align-items-center">
                      <i className={`${
                        tab === 'live-feed' ? 'bi-camera-video-fill' :
                        tab === 'live-camera' ? 'bi-camera-fill' :
                        tab === 'ai-detection' ? 'bi-robot' :
                        tab === 'penalties' ? 'bi-file-earmark-text-fill' :
                        'bi-folder-fill'
                      } text-primary me-2`} style={{ fontSize: '20px' }}></i>
                      {tab.replace('-', ' ')} {
                        tab === 'live-feed' ? 'Camera Feed' :
                        tab === 'live-camera' ? 'Violation Detector' :
                        tab === 'ai-detection' ? 'Engine' :
                        tab === 'penalties' ? 'Management' :
                        'Verification'
                      }
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="text-center py-5">
                      <i className={`${
                        tab === 'live-feed' ? 'bi-camera-video' :
                        tab === 'live-camera' ? 'bi-camera' :
                        tab === 'ai-detection' ? 'bi-robot' :
                        tab === 'penalties' ? 'bi-file-earmark-text' :
                        'bi-folder'
                      } text-muted mb-3`} style={{ fontSize: '64px' }}></i>
                      <h5 className="text-muted mb-2">{tab.replace('-', ' ')} Component</h5>
                      <p className="text-muted mb-0">{tab.replace('-', ' ')} functionality will be implemented here</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

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

export default Dashboard;