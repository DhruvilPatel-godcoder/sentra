import React, { useState, useEffect } from 'react';
import { fetchPenaltyData, fetchPenaltyDetails, sendPenaltyNotice, updatePenaltyStatus, processPayment } from '../api/Penalty';

const Penalty = () => {
  const [activeTab, setActiveTab] = useState('penalties');
  const [penaltyData, setPenaltyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [user] = useState({ name: 'Admin User', department: 'Traffic Control' });

  useEffect(() => {
    fetchPenalties();
  }, [searchTerm, statusFilter]);

  const fetchPenalties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchPenaltyData({
        search: searchTerm,
        status: statusFilter,
        page: 1,
        limit: 50
      });
      
      if (response.status === 'success') {
        setPenaltyData(response.data);
      } else {
        setError(response.message || 'Failed to fetch penalty data');
      }
    } catch (error) {
      console.error('Error fetching penalty data:', error);
      setError('Failed to fetch penalty data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handlePenaltyClick = async (penaltyId) => {
    try {
      const response = await fetchPenaltyDetails(penaltyId);
      if (response.status === 'success') {
        setSelectedPenalty(response.penalty);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error fetching penalty details:', error);
    }
  };

  const handleSendNotice = async (penaltyId, noticeType = 'sms') => {
    try {
      const response = await sendPenaltyNotice(penaltyId, noticeType);
      if (response.status === 'success') {
        // Refresh data after sending notice
        fetchPenalties();
        alert('Notice sent successfully!');
      }
    } catch (error) {
      console.error('Error sending notice:', error);
      alert('Failed to send notice');
    }
  };

  const handleStatusUpdate = async (penaltyId, newStatus) => {
    try {
      const response = await updatePenaltyStatus(penaltyId, newStatus);
      if (response.status === 'success') {
        fetchPenalties();
        setShowModal(false);
        alert('Status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleProcessPayment = async (penaltyId, paymentMethod = 'manual') => {
    try {
      const response = await processPayment(penaltyId, paymentMethod, false);
      if (response.status === 'success') {
        fetchPenalties();
        setShowModal(false);
        alert('Payment processed successfully!');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment');
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
        setActiveTab(tabKey);
        break;
      case 'live-camera':
        window.location.href = '/livedetection';
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-dark';
      case 'paid':
        return 'bg-success text-white';
      case 'overdue':
        return 'bg-danger text-white';
      case 'disputed':
        return 'bg-info text-white';
      default:
        return 'bg-secondary text-white';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'bi-clock-history';
      case 'paid':
        return 'bi-check-circle-fill';
      case 'overdue':
        return 'bi-exclamation-triangle-fill';
      case 'disputed':
        return 'bi-question-circle-fill';
      default:
        return 'bi-circle';
    }
  };

  const getViolationLabel = (type) => {
    switch (type) {
      case 'speeding':
        return 'Over-speeding';
      case 'red_light_violation':
        return 'Red Light Jump';
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

  const getViolationIcon = (type) => {
    switch (type) {
      case 'speeding':
        return 'bi-speedometer2';
      case 'red_light_violation':
        return 'bi-stoplight-fill';
      case 'no_helmet':
        return 'bi-person-x';
      case 'no_seatbelt':
        return 'bi-shield-x';
      case 'triple_riding':
        return 'bi-people-fill';
      case 'wrong_parking':
        return 'bi-p-square';
      default:
        return 'bi-exclamation-triangle';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Penalty System...</h5>
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
            <h4 className="alert-heading mb-0">Error!</h4>
          </div>
          <p className="mb-3">{error}</p>
          <button className="btn btn-outline-danger d-flex align-items-center" onClick={fetchPenalties}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Retry
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
                <i className="bi bi-file-earmark-text-fill text-primary" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA Penalty Management</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Traffic Violation Penalty System</p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="text-end d-none d-md-block">
                <p className="fw-medium text-dark mb-0" style={{ fontSize: '14px' }}>{user.name}</p>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>{user.department}</p>
              </div>
              <div className="dropdown">
                <button className="btn btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
                  <i className="bi bi-person-circle" style={{ fontSize: '18px' }}></i>
                </button>
                <ul className="dropdown-menu">
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

        {/* Penalty Management Content */}
        {activeTab === 'penalties' && penaltyData && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="row g-4 mb-4">
              <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
                  <div className="card-body text-center p-4">
                    <div className="bg-primary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                         style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-file-earmark-text-fill text-primary" style={{ fontSize: '28px' }}></i>
                    </div>
                    <h2 className="fw-bold text-primary mb-1">{penaltyData.summary.total_penalties}</h2>
                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Total Penalties</p>
                    <small className="text-muted">All violations</small>
                  </div>
                </div>
              </div>

              <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
                  <div className="card-body text-center p-4">
                    <div className="bg-warning bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                         style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-clock-history text-warning" style={{ fontSize: '28px' }}></i>
                    </div>
                    <h2 className="fw-bold text-warning mb-1">{penaltyData.summary.pending_penalties}</h2>
                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Pending</p>
                    <small className="text-muted">Awaiting payment</small>
                  </div>
                </div>
              </div>

              <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
                  <div className="card-body text-center p-4">
                    <div className="bg-success bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                         style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '28px' }}></i>
                    </div>
                    <h2 className="fw-bold text-success mb-1">{penaltyData.summary.paid_penalties}</h2>
                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Paid</p>
                    <small className="text-muted">Completed payments</small>
                  </div>
                </div>
              </div>

              <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
                  <div className="card-body text-center p-4">
                    <div className="bg-danger bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                         style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '28px' }}></i>
                    </div>
                    <h2 className="fw-bold text-danger mb-1">{penaltyData.summary.overdue_penalties}</h2>
                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Overdue</p>
                    <small className="text-muted">Require action</small>
                  </div>
                </div>
              </div>

              <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' }}>
                  <div className="card-body text-center p-4">
                    <div className="bg-info bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                         style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-question-circle-fill text-info" style={{ fontSize: '28px' }}></i>
                    </div>
                    <h2 className="fw-bold text-info mb-1">{penaltyData.summary.disputed_penalties}</h2>
                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Disputed</p>
                    <small className="text-muted">Under review</small>
                  </div>
                </div>
              </div>

              <div className="col-lg-2 col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' }}>
                  <div className="card-body text-center p-4">
                    <div className="bg-purple bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                         style={{ width: '60px', height: '60px' }}>
                      <i className="bi bi-currency-rupee text-purple" style={{ fontSize: '28px', color: '#7c3aed' }}></i>
                    </div>
                    <h2 className="fw-bold mb-1" style={{ fontSize: '24px', color: '#7c3aed' }}>
                      {formatCurrency(penaltyData.summary.total_revenue)}
                    </h2>
                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Total Revenue</p>
                    <small className="text-muted">Collections made</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Penalty List */}
            <div className="card border-0 shadow-lg">
              <div className="card-header bg-white border-0 py-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                      <i className="bi bi-list-ul text-primary" style={{ fontSize: '24px' }}></i>
                    </div>
                    <div>
                      <h4 className="mb-1 fw-bold text-dark">Penalty Management</h4>
                      <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Manage and track traffic violation penalties</p>
                    </div>
                  </div>
                  <button className="btn btn-outline-primary d-flex align-items-center" onClick={fetchPenalties}>
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Refresh
                  </button>
                </div>
              </div>
              <div className="card-body p-4">
                {/* Filters */}
                <div className="row g-3 mb-4">
                  <div className="col-md-8">
                    <div className="input-group shadow-sm">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-search" style={{ fontSize: '16px' }}></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Search by plate number, violation type, or owner name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <select 
                      className="form-select shadow-sm" 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="disputed">Disputed</option>
                    </select>
                  </div>
                </div>

                {/* Penalties List */}
                <div style={{ maxHeight: '600px', overflowY: 'auto' }} className="custom-scrollbar">
                  {penaltyData.penalties && penaltyData.penalties.length > 0 ? (
                    penaltyData.penalties.map((penalty) => (
                      <div key={penalty.id} className="card border-0 shadow-sm mb-3 penalty-card">
                        <div className="card-body p-4">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex align-items-center gap-3">
                              <span className="font-monospace fw-medium px-3 py-1 bg-light rounded-pill" style={{ fontSize: '14px' }}>
                                <i className="bi bi-hash me-1"></i>
                                {penalty.id}
                              </span>
                              <span className={`badge d-flex align-items-center gap-1 ${getStatusColor(penalty.status)}`} style={{ fontSize: '11px', borderRadius: '20px' }}>
                                <i className={getStatusIcon(penalty.status)}></i>
                                <span className="text-capitalize">{penalty.status}</span>
                              </span>
                            </div>
                            <div className="d-flex gap-2">
                              <button 
                                className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                onClick={() => handlePenaltyClick(penalty.violation_id)}
                              >
                                <i className="bi bi-eye me-1"></i>
                                <span style={{ fontSize: '12px' }}>View</span>
                              </button>
                              {penalty.status === "pending" && (
                                <>
                                  <button 
                                    className="btn btn-info btn-sm d-flex align-items-center"
                                    onClick={() => handleSendNotice(penalty.violation_id, 'sms')}
                                  >
                                    <i className="bi bi-phone me-1"></i>
                                    <span style={{ fontSize: '12px' }}>SMS</span>
                                  </button>
                                  <button 
                                    className="btn btn-success btn-sm d-flex align-items-center"
                                    onClick={() => handleSendNotice(penalty.violation_id, 'email')}
                                  >
                                    <i className="bi bi-envelope me-1"></i>
                                    <span style={{ fontSize: '12px' }}>Email</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="row g-3 mb-3">
                            <div className="col-md-3 col-6">
                              <div className="d-flex align-items-center mb-1">
                                <i className="bi bi-car-front text-muted me-2" style={{ fontSize: '14px' }}></i>
                                <small className="text-muted">Plate Number:</small>
                              </div>
                              <p className="fw-medium mb-0" style={{ fontSize: '14px' }}>{penalty.plate_number}</p>
                            </div>
                            <div className="col-md-3 col-6">
                              <div className="d-flex align-items-center mb-1">
                                <i className={`${getViolationIcon(penalty.violation_type)} text-muted me-2`} style={{ fontSize: '14px' }}></i>
                                <small className="text-muted">Violation:</small>
                              </div>
                              <p className="fw-medium mb-0" style={{ fontSize: '14px' }}>{getViolationLabel(penalty.violation_type)}</p>
                            </div>
                            <div className="col-md-3 col-6">
                              <div className="d-flex align-items-center mb-1">
                                <i className="bi bi-currency-rupee text-muted me-2" style={{ fontSize: '14px' }}></i>
                                <small className="text-muted">Amount:</small>
                              </div>
                              <p className="fw-bold text-danger mb-0" style={{ fontSize: '14px' }}>{formatCurrency(penalty.amount)}</p>
                            </div>
                            <div className="col-md-3 col-6">
                              <div className="d-flex align-items-center mb-1">
                                <i className="bi bi-calendar-event text-muted me-2" style={{ fontSize: '14px' }}></i>
                                <small className="text-muted">Due Date:</small>
                              </div>
                              <p className="fw-medium mb-0" style={{ fontSize: '14px' }}>
                                {new Date(penalty.due_date).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </div>

                          <div className="row g-3">
                            <div className="col-md-4">
                              <div className="d-flex align-items-center mb-1">
                                <i className="bi bi-person text-muted me-2" style={{ fontSize: '14px' }}></i>
                                <small className="text-muted">Owner:</small>
                              </div>
                              <p className="fw-medium mb-0" style={{ fontSize: '14px' }}>{penalty.owner_name}</p>
                            </div>
                            <div className="col-md-4">
                              <div className="d-flex align-items-center mb-1">
                                <i className="bi bi-geo-alt text-muted me-2" style={{ fontSize: '14px' }}></i>
                                <small className="text-muted">Location:</small>
                              </div>
                              <p className="fw-medium mb-0" style={{ fontSize: '14px' }}>{penalty.location}</p>
                            </div>
                            <div className="col-md-4">
                              <div className="d-flex align-items-center mb-1">
                                <i className="bi bi-clock text-muted me-2" style={{ fontSize: '14px' }}></i>
                                <small className="text-muted">Date & Time:</small>
                              </div>
                              <p className="fw-medium mb-0" style={{ fontSize: '14px' }}>
                                {formatDate(penalty.timestamp)}
                              </p>
                            </div>
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
                      <h5 className="text-muted mb-2">No Penalties Found</h5>
                      <p className="text-muted mb-0">No penalties found matching your criteria.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs content */}
        {activeTab !== 'penalties' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-4">
              <h5 className="card-title mb-0 fw-bold text-capitalize d-flex align-items-center">
                <i className={`${
                  activeTab === 'overview' ? 'bi-speedometer2' :
                  activeTab === 'live-feed' ? 'bi-camera-video-fill' :
                  activeTab === 'live-camera' ? 'bi-camera-fill' :
                  activeTab === 'ai-detection' ? 'bi-robot' :
                  activeTab === 'documents' ? 'bi-folder-fill' :
                  'bi-bar-chart-fill'
                } text-primary me-2`} style={{ fontSize: '20px' }}></i>
                {activeTab.replace('-', ' ')} {activeTab === 'overview' ? 'Dashboard' : 
                 activeTab === 'live-camera' ? 'Violation Detector' :
                 activeTab === 'live-feed' ? 'Monitor' :
                 activeTab === 'ai-detection' ? 'Engine' :
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
                  activeTab === 'ai-detection' ? 'bi-robot' :
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

      {/* Penalty Details Modal */}
      {showModal && selectedPenalty && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white border-0">
                <h5 className="modal-title d-flex align-items-center">
                  <i className="bi bi-file-earmark-text me-2"></i>
                  Penalty Details - {selectedPenalty.violation_id}
                </h5>
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
                      <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                      Violation Information
                    </h6>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center">
                        <i className={`${getViolationIcon(selectedPenalty.violation_type)} me-2`} style={{ fontSize: '12px' }}></i>
                        Type:
                      </small>
                      <div className="fw-medium">{getViolationLabel(selectedPenalty.violation_type)}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center">
                        <i className="bi bi-currency-rupee me-2" style={{ fontSize: '12px' }}></i>
                        Fine Amount:
                      </small>
                      <div className="fw-bold text-danger fs-5">{formatCurrency(selectedPenalty.fine_amount)}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center">
                        <i className="bi bi-geo-alt me-2" style={{ fontSize: '12px' }}></i>
                        Location:
                      </small>
                      <div className="fw-medium">{selectedPenalty.location}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center">
                        <i className="bi bi-calendar-event me-2" style={{ fontSize: '12px' }}></i>
                        Date & Time:
                      </small>
                      <div className="fw-medium">{formatDate(selectedPenalty.created_at)}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center">
                        <i className={`${getStatusIcon(selectedPenalty.status)} me-2`} style={{ fontSize: '12px' }}></i>
                        Status:
                      </small>
                      <div className="fw-medium">
                        <span className={`badge ${getStatusColor(selectedPenalty.status)}`}>
                          <i className={`${getStatusIcon(selectedPenalty.status)} me-1`}></i>
                          {selectedPenalty.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3 d-flex align-items-center">
                      <i className="bi bi-person-vcard text-info me-2"></i>
                      Vehicle & Owner Details
                    </h6>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center">
                        <i className="bi bi-car-front me-2" style={{ fontSize: '12px' }}></i>
                        Plate Number:
                      </small>
                      <div className="fw-medium font-monospace">{selectedPenalty.vehicle_info?.plate_number}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center">
                        <i className="bi bi-car-front-fill me-2" style={{ fontSize: '12px' }}></i>
                        Vehicle:
                      </small>
                      <div className="fw-medium">
                        {selectedPenalty.vehicle_info?.make} {selectedPenalty.vehicle_info?.model} ({selectedPenalty.vehicle_info?.year})
                      </div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center">
                        <i className="bi bi-person me-2" style={{ fontSize: '12px' }}></i>
                        Owner:
                      </small>
                      <div className="fw-medium">{selectedPenalty.owner_info?.name}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center">
                        <i className="bi bi-phone me-2" style={{ fontSize: '12px' }}></i>
                        Contact:
                      </small>
                      <div className="fw-medium">{selectedPenalty.owner_info?.mobile_number}</div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-flex align-items-center">
                        <i className="bi bi-envelope me-2" style={{ fontSize: '12px' }}></i>
                        Email:
                      </small>
                      <div className="fw-medium">{selectedPenalty.owner_info?.email}</div>
                    </div>
                  </div>
                </div>
                
                {selectedPenalty.evidence_photo && (
                  <div className="mt-4">
                    <h6 className="fw-bold mb-3 d-flex align-items-center">
                      <i className="bi bi-camera text-success me-2"></i>
                      Evidence Photo
                    </h6>
                    <div className="card border-0 shadow-sm">
                      <div className="card-body p-2">
                        <img 
                          src={selectedPenalty.evidence_photo} 
                          alt="Evidence" 
                          className="img-fluid rounded"
                          style={{ maxHeight: '300px', width: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedPenalty.payment_info && (
                  <div className="mt-4">
                    <h6 className="fw-bold mb-3 d-flex align-items-center">
                      <i className="bi bi-credit-card text-primary me-2"></i>
                      Payment Information
                    </h6>
                    <div className="row g-3">
                      <div className="col-6">
                        <small className="text-muted d-flex align-items-center">
                          <i className="bi bi-hash me-2" style={{ fontSize: '12px' }}></i>
                          Payment ID:
                        </small>
                        <div className="fw-medium font-monospace">{selectedPenalty.payment_info.payment_id}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-flex align-items-center">
                          <i className="bi bi-wallet me-2" style={{ fontSize: '12px' }}></i>
                          Method:
                        </small>
                        <div className="fw-medium text-capitalize">{selectedPenalty.payment_info.payment_method}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 bg-light">
                <div className="d-flex gap-2 w-100 justify-content-end">
                  {selectedPenalty.status === 'pending' && (
                    <>
                      <button 
                        className="btn btn-success d-flex align-items-center"
                        onClick={() => handleProcessPayment(selectedPenalty.violation_id, 'manual')}
                      >
                        <i className="bi bi-check-circle me-2"></i>
                        Mark as Paid
                      </button>
                      <button 
                        className="btn btn-warning d-flex align-items-center"
                        onClick={() => handleStatusUpdate(selectedPenalty.violation_id, 'overdue')}
                      >
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Mark Overdue
                      </button>
                      <button 
                        className="btn btn-info d-flex align-items-center"
                        onClick={() => handleSendNotice(selectedPenalty.violation_id, 'both')}
                      >
                        <i className="bi bi-bell me-2"></i>
                        Send Notice
                      </button>
                    </>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-secondary d-flex align-items-center"
                    onClick={() => setShowModal(false)}
                  >
                    <i className="bi bi-x-lg me-2"></i>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .penalty-card:hover {
          transform: translateY(-2px);
          transition: all 0.3s ease;
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
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
        
        .form-control:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 0.2rem rgba(79, 70, 229, 0.25);
        }
        
        .input-group-text {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
};

export default Penalty;