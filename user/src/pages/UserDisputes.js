import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  fetchUserDisputeStats, 
  fetchUserDisputesHistory, 
  fetchPendingViolationsForDispute,
  submitDispute,
  fetchDisputeDetails,
  uploadEvidence,
  fileToBase64
} from '../api/userDisputes';

const UserDisputes = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [showNewDispute, setShowNewDispute] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // State for dispute data
  const [user, setUser] = useState({
    name: "User",
    mobile: "+91 9876543210"
  });
  const [disputeStats, setDisputeStats] = useState({
    total_disputes: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    mobile_number: ""
  });
  const [disputes, setDisputes] = useState([]);
  const [pendingViolations, setPendingViolations] = useState([]);
  const [filteredDisputes, setFilteredDisputes] = useState([]);

  // Load dispute data
  useEffect(() => {
    const loadDisputeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user ID from localStorage if not in params
        const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
        
        if (!currentUserId) {
          navigate('/login');
          return;
        }

        // Fetch dispute data in parallel
        const [statsRes, historyRes, violationsRes] = await Promise.all([
          fetchUserDisputeStats(currentUserId),
          fetchUserDisputesHistory(currentUserId, searchTerm, statusFilter),
          fetchPendingViolationsForDispute(currentUserId)
        ]);

        // Handle stats
        if (statsRes.status === 'success') {
          setDisputeStats(statsRes.data);
          setUser({
            name: statsRes.data.user_name || "User",
            mobile: statsRes.data.mobile_number || "+91 9876543210"
          });
        } else {
          console.error('Stats error:', statsRes.message);
        }

        // Handle disputes history
        if (historyRes.status === 'success') {
          setDisputes(historyRes.disputes || []);
          setFilteredDisputes(historyRes.disputes || []);
        } else {
          console.error('History error:', historyRes.message);
        }

        // Handle pending violations
        if (violationsRes.status === 'success') {
          setPendingViolations(violationsRes.violations || []);
        } else {
          console.error('Violations error:', violationsRes.message);
        }

      } catch (error) {
        console.error('Dispute data loading error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadDisputeData();
  }, [userId, navigate, searchTerm, statusFilter]);

  // Filter disputes based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDisputes(disputes);
      return;
    }

    const filtered = disputes.filter(
      (dispute) =>
        dispute.appeal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.violation_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.violation_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDisputes(filtered);
  }, [searchTerm, disputes]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-warning text-dark";
      case "resolved":
        return "bg-success text-white";
      case "rejected":
        return "bg-danger text-white";
      default:
        return "bg-secondary text-white";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <i className="bi bi-clock-history" style={{ fontSize: '12px' }}></i>;
      case "resolved":
        return <i className="bi bi-check-circle-fill" style={{ fontSize: '12px' }}></i>;
      case "rejected":
        return <i className="bi bi-x-circle-fill" style={{ fontSize: '12px' }}></i>;
      default:
        return <i className="bi bi-file-earmark-text" style={{ fontSize: '12px' }}></i>;
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
        setEvidenceFile(base64);
      } catch (error) {
        alert('Error processing file');
      }
    }
  };

  const handleSubmitDispute = async () => {
    if (!selectedViolation || !disputeReason || !description) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setSubmittingDispute(true);
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
      
      const disputeData = {
        violation_id: selectedViolation,
        dispute_reason: disputeReason,
        description: description,
        evidence_file: evidenceFile || ""
      };

      const result = await submitDispute(currentUserId, disputeData);
      
      if (result.status === 'success') {
        alert('Dispute submitted successfully!');
        setShowNewDispute(false);
        setSelectedViolation("");
        setDisputeReason("");
        setDescription("");
        setEvidenceFile(null);
        
        // Refresh data
        const historyRes = await fetchUserDisputesHistory(currentUserId, searchTerm, statusFilter);
        if (historyRes.status === 'success') {
          setDisputes(historyRes.disputes || []);
          setFilteredDisputes(historyRes.disputes || []);
        }
        
        const statsRes = await fetchUserDisputeStats(currentUserId);
        if (statsRes.status === 'success') {
          setDisputeStats(statsRes.data);
        }
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error submitting dispute: ${error.message}`);
    } finally {
      setSubmittingDispute(false);
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
          <h5 className="text-muted">Loading Disputes...</h5>
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
            <h5>Error Loading Dispute Data</h5>
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
                <i className="bi bi-scale text-primary" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA Dispute Portal</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Challenge Traffic Violations</p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="text-end d-none d-md-block">
                <p className="fw-medium text-dark mb-0" style={{ fontSize: '14px' }}>{user.name}</p>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                  {disputeStats.total_disputes} disputes • {user.mobile}
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
                  <i className="bi bi-house-door me-2" style={{ fontSize: '16px' }}></i>
                  Dashboard
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className="nav-link"
                  onClick={() => navigate(`/uservehicles/${userId}`)}
                >
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
                <button className="nav-link active">
                  <i className="bi bi-scale me-2" style={{ fontSize: '16px' }}></i>
                  Disputes
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Dispute Stats */}
        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Total Disputes</h6>
                    <h2 className="mb-1 fw-bold text-primary" style={{ fontSize: '28px' }}>{disputeStats.total_disputes}</h2>
                    <small className="text-muted">All time</small>
                  </div>
                  <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
                    <i className="bi bi-file-earmark-text-fill text-primary" style={{ fontSize: '24px' }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Under Review</h6>
                    <h2 className="mb-1 fw-bold text-warning" style={{ fontSize: '28px' }}>{disputeStats.under_review}</h2>
                    <small className="text-muted">Pending</small>
                  </div>
                  <div className="bg-warning bg-opacity-10 p-3 rounded-circle">
                    <i className="bi bi-clock-history text-warning" style={{ fontSize: '24px' }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Approved</h6>
                    <h2 className="mb-1 fw-bold text-success" style={{ fontSize: '28px' }}>{disputeStats.approved}</h2>
                    <small className="text-muted">Successful</small>
                  </div>
                  <div className="bg-success bg-opacity-10 p-3 rounded-circle">
                    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '24px' }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="text-muted mb-2 fw-medium" style={{ fontSize: '13px' }}>Rejected</h6>
                    <h2 className="mb-1 fw-bold text-danger" style={{ fontSize: '28px' }}>{disputeStats.rejected}</h2>
                    <small className="text-muted">Unsuccessful</small>
                  </div>
                  <div className="bg-danger bg-opacity-10 p-3 rounded-circle">
                    <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '24px' }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New Dispute Form */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-0 py-4">
            <div className="d-flex align-items-center mb-2">
              <i className="bi bi-plus-circle-fill text-primary me-3" style={{ fontSize: '24px' }}></i>
              <h5 className="card-title mb-0 fw-bold">Submit New Dispute</h5>
            </div>
            <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
              Challenge a traffic violation for mobile: {user.mobile}
            </p>
          </div>
          <div className="card-body">
            {!showNewDispute ? (
              <div className="text-center py-5">
                <i className="bi bi-scale text-muted mb-3" style={{ fontSize: '64px' }}></i>
                <h5 className="fw-medium mb-2">Have a dispute?</h5>
                <p className="text-muted mb-4" style={{ fontSize: '14px' }}>
                  If you believe a violation was issued in error, you can submit a dispute with supporting evidence.
                </p>
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowNewDispute(true)}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Submit New Dispute
                </button>
              </div>
            ) : (
              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-list-check me-2"></i>
                    Select Violation
                  </label>
                  <select 
                    className="form-select"
                    value={selectedViolation}
                    onChange={(e) => setSelectedViolation(e.target.value)}
                  >
                    <option value="">Choose a violation to dispute</option>
                    {pendingViolations.map((violation) => (
                      <option key={violation.violation_id} value={violation.violation_id}>
                        {violation.violation_id} - {violation.violation_type} - {violation.vehicle_number} (₹{violation.fine_amount})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-question-circle me-2"></i>
                    Dispute Reason
                  </label>
                  <select 
                    className="form-select"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                  >
                    <option value="">Select reason for dispute</option>
                    <option value="incorrect-location">Incorrect Location</option>
                    <option value="vehicle-not-mine">Vehicle Not Mine</option>
                    <option value="emergency-situation">Emergency Situation</option>
                    <option value="equipment-malfunction">Equipment Malfunction</option>
                    <option value="incorrect-violation">Incorrect Violation Type</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-chat-square-text me-2"></i>
                    Description
                  </label>
                  <textarea
                    className="form-control"
                    placeholder="Provide detailed explanation of why you're disputing this violation..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-paperclip me-2"></i>
                    Supporting Evidence
                  </label>
                  <div className="border border-2 border-dashed rounded-3 p-4 text-center bg-light">
                    <i className="bi bi-cloud-upload text-muted mb-3" style={{ fontSize: '48px' }}></i>
                    <p className="text-muted mb-2">Upload photos, videos, or documents</p>
                    <input
                      type="file"
                      className="form-control d-none"
                      id="evidenceFile"
                      accept="image/*,video/*,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="evidenceFile" className="btn btn-outline-primary">
                      <i className="bi bi-file-earmark-plus me-2"></i>
                      Choose Files
                    </label>
                    <p className="text-muted mt-2 mb-0" style={{ fontSize: '12px' }}>
                      Max 10MB per file. JPG, PNG, PDF, MP4 supported.
                    </p>
                    {evidenceFile && (
                      <div className="mt-3">
                        <span className="badge bg-success fs-6">
                          <i className="bi bi-check-circle me-2"></i>
                          File uploaded successfully
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12">
                  <div className="d-flex gap-3">
                    <button
                      className="btn btn-success btn-lg"
                      onClick={handleSubmitDispute}
                      disabled={submittingDispute || !selectedViolation || !disputeReason}
                    >
                      {submittingDispute ? (
                        <>
                          <div className="spinner-border spinner-border-sm me-2" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send me-2"></i>
                          Submit Dispute
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-lg"
                      onClick={() => setShowNewDispute(false)}
                    >
                      <i className="bi bi-x-circle me-2"></i>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Existing Disputes */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-0 py-4">
            <div className="d-flex align-items-center mb-2">
              <i className="bi bi-journal-text text-primary me-3" style={{ fontSize: '24px' }}></i>
              <h5 className="card-title mb-0 fw-bold">Your Disputes</h5>
            </div>
            <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
              Track dispute status for mobile: {user.mobile}
            </p>
          </div>
          <div className="card-body">
            {/* Search and Filter */}
            <div className="row g-3 mb-4">
              <div className="col-md-8">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search" style={{ fontSize: '16px' }}></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by dispute ID, violation ID, vehicle number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <select 
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Under Review</option>
                  <option value="resolved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Disputes List */}
            <div className="d-flex flex-column gap-4">
              {filteredDisputes.map((dispute) => (
                <div key={dispute.id} className="border rounded-3 p-4 bg-white shadow-sm">
                  {/* Dispute Header */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="text-muted">
                        <i className="bi bi-file-earmark-text-fill" style={{ fontSize: '20px' }}></i>
                      </div>
                      <div>
                        <h6 className="fw-medium mb-1">Dispute #{dispute.appeal_id}</h6>
                        <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                          Violation: {dispute.violation_id}
                        </p>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge d-flex align-items-center gap-1 ${getStatusColor(dispute.status)}`} style={{ fontSize: '11px' }}>
                        {getStatusIcon(dispute.status)}
                        <span className="text-capitalize">{dispute.status === 'resolved' ? 'Approved' : dispute.status}</span>
                      </span>
                      <button className="btn btn-outline-primary btn-sm">
                        <i className="bi bi-eye me-1" style={{ fontSize: '12px' }}></i>
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Dispute Details Grid */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-3">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Vehicle:</div>
                      <div className="fw-medium d-flex align-items-center">
                        <i className="bi bi-car-front me-2" style={{ fontSize: '14px' }}></i>
                        {dispute.vehicle_number}
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Violation Type:</div>
                      <div className="fw-medium">{dispute.violation_type}</div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Submitted:</div>
                      <div className="fw-medium d-flex align-items-center">
                        <i className="bi bi-calendar-event me-2" style={{ fontSize: '14px' }}></i>
                        {dispute.formatted_date}
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Mobile:</div>
                      <div className="fw-medium d-flex align-items-center">
                        <i className="bi bi-telephone me-2" style={{ fontSize: '14px' }}></i>
                        {dispute.mobile_number}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-light rounded-3 p-3 mb-3">
                    <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Reason:</div>
                    <div className="fw-medium" style={{ fontSize: '14px' }}>{dispute.reason}</div>
                  </div>

                  {/* Admin Response */}
                  {dispute.admin_response && (
                    <div className="bg-info bg-opacity-10 border border-info rounded-3 p-3">
                      <div className="text-info fw-medium mb-1 d-flex align-items-center" style={{ fontSize: '14px' }}>
                        <i className="bi bi-person-badge me-2"></i>
                        Admin Response:
                      </div>
                      <p className="mb-0" style={{ fontSize: '13px' }}>{dispute.admin_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredDisputes.length === 0 && (
              <div className="text-center py-5">
                <i className="bi bi-inbox text-muted mb-3" style={{ fontSize: '64px' }}></i>
                <h5 className="text-muted">No disputes found</h5>
                <p className="text-muted mb-0">No disputes match your search criteria. Try adjusting your search terms.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0 py-4">
            <h5 className="card-title mb-1 fw-bold">
              <i className="bi bi-lightning-charge-fill text-warning me-2"></i>
              Quick Actions
            </h5>
            <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
              Dispute management for mobile: {user.mobile}
            </p>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <button 
                  className="btn btn-outline-primary btn-lg w-100 text-start d-flex align-items-center"
                  onClick={() => setShowNewDispute(true)}
                >
                  <i className="bi bi-plus-circle-fill me-3" style={{ fontSize: '24px' }}></i>
                  <div>
                    <div className="fw-medium">Submit New Dispute</div>
                    <small className="text-muted">Challenge a violation</small>
                  </div>
                </button>
              </div>
              <div className="col-md-4">
                <button 
                  className="btn btn-outline-info btn-lg w-100 text-start d-flex align-items-center"
                  onClick={() => navigate(`/userviolations/${userId}`)}
                >
                  <i className="bi bi-exclamation-triangle-fill me-3" style={{ fontSize: '24px' }}></i>
                  <div>
                    <div className="fw-medium">View Violations</div>
                    <small className="text-muted">See all violations</small>
                  </div>
                </button>
              </div>
              <div className="col-md-4">
                <button 
                  className="btn btn-outline-success btn-lg w-100 text-start d-flex align-items-center"
                  onClick={() => navigate(`/userpayments/${userId}`)}
                >
                  <i className="bi bi-credit-card-fill me-3" style={{ fontSize: '24px' }}></i>
                  <div>
                    <div className="fw-medium">Payment History</div>
                    <small className="text-muted">View transactions</small>
                  </div>
                </button>
              </div>
            </div>
          </div>
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
        }
        
        .input-group-text {
          background-color: #f8f9fa;
        }
        
        .badge {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default UserDisputes;