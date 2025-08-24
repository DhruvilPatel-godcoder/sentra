"use client"

import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  fetchUserViolationStats,
  fetchUserViolationsHistory,
  payViolation,
  submitDispute,
  downloadEvidence,
  getViolationDetails
} from '../api/userViolations';

const UserViolations = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    violationId: "",
    amount: 0,
    violationType: "",
  })
  const [disputeModal, setDisputeModal] = useState({
    isOpen: false,
    violationId: "",
    violationType: "",
    description: ""
  })

  // State for violation data
  const [user, setUser] = useState({
    name: "User",
    mobile: "+91 9876543210",
    vehicles: []
  })
  const [violationStats, setViolationStats] = useState({
    total_violations: 0,
    pending_payments: 0,
    auto_deducted: 0,
    total_amount_due: 0
  })
  const [violations, setViolations] = useState([])

  // Load violation data
  useEffect(() => {
    const loadViolationData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get user ID from localStorage if not in params
        const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id
        
        if (!currentUserId) {
          navigate('/login')
          return
        }

        // Fetch violation data in parallel
        const [statsRes, historyRes] = await Promise.all([
          fetchUserViolationStats(currentUserId),
          fetchUserViolationsHistory(currentUserId, searchTerm, statusFilter)
        ])

        // Handle stats
        if (statsRes.status === 'success') {
          setViolationStats(statsRes.data)
          setUser({
            name: statsRes.data.user_name || "User",
            mobile: statsRes.data.mobile_number || "+91 9876543210",
            vehicles: []
          })
        } else {
          console.error('Stats error:', statsRes.message)
        }

        // Handle violation history
        if (historyRes.status === 'success') {
          setViolations(historyRes.violations || [])
        } else {
          console.error('History error:', historyRes.message)
        }

      } catch (error) {
        console.error('Violation data loading error:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadViolationData()
  }, [userId, navigate, searchTerm, statusFilter])

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-warning text-dark"
      case "paid":
        return "bg-success text-white"
      case "auto-deducted":
        return "bg-info text-white"
      case "overdue":
        return "bg-danger text-white"
      case "auto-failed":
        return "bg-warning text-dark"
      case "disputed":
        return "bg-secondary text-white"
      default:
        return "bg-light text-dark"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "auto-deducted":
        return <i className="bi bi-lightning-charge-fill" style={{ fontSize: '12px' }}></i>
      case "auto-failed":
        return <i className="bi bi-x-circle-fill" style={{ fontSize: '12px' }}></i>
      case "paid":
        return <i className="bi bi-check-circle-fill" style={{ fontSize: '12px' }}></i>
      case "overdue":
        return <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '12px' }}></i>
      case "pending":
        return <i className="bi bi-clock-history" style={{ fontSize: '12px' }}></i>
      case "disputed":
        return <i className="bi bi-scale" style={{ fontSize: '12px' }}></i>
      default:
        return null
    }
  }

  // Filter violations based on search and status
  const displayedViolations = violations.filter((violation) => {
    const matchesSearch =
      violation.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || violation.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handlePayNow = (violation) => {
    setPaymentModal({
      isOpen: true,
      violationId: violation.id,
      amount: violation.totalAmount || violation.amount,
      violationType: violation.type,
    })
  }

  const closePaymentModal = () => {
    setPaymentModal({
      isOpen: false,
      violationId: "",
      amount: 0,
      violationType: "",
    })
  }

  const handleProcessPayment = async (paymentMethod = 'UPI') => {
    try {
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id
      const result = await payViolation(currentUserId, paymentModal.violationId, paymentMethod)
      
      if (result.status === 'success') {
        alert(`Payment of ₹${paymentModal.amount} processed successfully!`)
        closePaymentModal()
        
        // Refresh violation data
        const historyRes = await fetchUserViolationsHistory(currentUserId, searchTerm, statusFilter)
        if (historyRes.status === 'success') {
          setViolations(historyRes.violations || [])
        }
      } else {
        alert(`Payment failed: ${result.message}`)
      }
    } catch (error) {
      alert(`Payment error: ${error.message}`)
    }
  }

  const handleDownloadEvidence = async (violation) => {
    try {
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id
      const result = await downloadEvidence(currentUserId, violation.id)
      
      if (result.status === 'success') {
        console.log('Evidence data:', result.evidence_data)
        alert('Evidence download initiated (check console for data)')
      } else {
        alert(`Error: ${result.message}`)
      }
    } catch (error) {
      alert(`Error downloading evidence: ${error.message}`)
    }
  }

  const handleDispute = (violation) => {
    setDisputeModal({
      isOpen: true,
      violationId: violation.id,
      violationType: violation.type,
      description: ""
    })
  }

  const closeDisputeModal = () => {
    setDisputeModal({
      isOpen: false,
      violationId: "",
      violationType: "",
      description: ""
    })
  }

  const handleSubmitDispute = async () => {
    if (!disputeModal.description.trim()) {
      alert('Please provide a description for your dispute')
      return
    }

    try {
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id
      const result = await submitDispute(currentUserId, disputeModal.violationId, disputeModal.description)
      
      if (result.status === 'success') {
        alert('Dispute submitted successfully!')
        closeDisputeModal()
        
        // Refresh violation data
        const historyRes = await fetchUserViolationsHistory(currentUserId, searchTerm, statusFilter)
        if (historyRes.status === 'success') {
          setViolations(historyRes.violations || [])
        }
      } else {
        alert(`Dispute submission failed: ${result.message}`)
      }
    } catch (error) {
      alert(`Error submitting dispute: ${error.message}`)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('userData')
    localStorage.removeItem('userToken')
    navigate('/login')
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Violation History...</h5>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="alert alert-danger border-0 shadow-lg" style={{ maxWidth: '400px' }}>
            <i className="bi bi-exclamation-triangle-fill text-danger mb-3" style={{ fontSize: '48px' }}></i>
            <h5>Error Loading Violation Data</h5>
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
    )
  }

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-bottom">
        <div className="container-fluid">
          <div className="d-flex align-items-center justify-content-between py-3 px-4">
            <div className="d-flex align-items-center">
              <div className="bg-warning bg-opacity-10 p-3 rounded-circle me-3">
                <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA Violation Portal</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Traffic Violation Management</p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="text-end d-none d-md-block">
                <p className="fw-medium text-dark mb-0" style={{ fontSize: '14px' }}>{user.name}</p>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                  {violationStats.total_violations} violations • {user.mobile}
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
                <button 
                  className="nav-link"
                  onClick={() => navigate(`/uservehicles/${userId}`)}
                >
                  <i className="bi bi-car-front-fill me-2" style={{ fontSize: '16px' }}></i>
                  My Vehicles
                </button>
              </li>
              <li className="nav-item">
                <button className="nav-link active">
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

        {/* Summary Cards */}
        <div className="row g-4 mb-5">
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-danger bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-file-earmark-text-fill text-danger" style={{ fontSize: '28px' }}></i>
                </div>
                <h2 className="fw-bold text-danger mb-1">{violationStats.total_violations}</h2>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Total Violations</p>
                <small className="text-muted">All time violations</small>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-warning bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-clock-history text-warning" style={{ fontSize: '28px' }}></i>
                </div>
                <h2 className="fw-bold text-warning mb-1">{violationStats.pending_payments}</h2>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Pending Payment</p>
                <small className="text-muted">Requires action</small>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-success bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-lightning-charge-fill text-success" style={{ fontSize: '28px' }}></i>
                </div>
                <h2 className="fw-bold text-success mb-1">{violationStats.auto_deducted}</h2>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Auto-Deducted</p>
                <small className="text-muted">Successful auto-payment</small>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-primary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-currency-rupee text-primary" style={{ fontSize: '28px' }}></i>
                </div>
                <h2 className="fw-bold text-primary mb-1">₹{violationStats.total_amount_due.toLocaleString()}</h2>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Total Amount Due</p>
                <small className="text-muted">Outstanding fines</small>
              </div>
            </div>
          </div>
        </div>

        {/* Main Violation History Card */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0 py-4">
            <div className="d-flex align-items-center mb-3">
              <i className="bi bi-file-earmark-text-fill text-primary me-3" style={{ fontSize: '24px' }}></i>
              <div>
                <h4 className="mb-1 fw-bold">Violation History</h4>
                <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>View all your traffic violations with auto-deduction status and evidence</p>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="row g-3">
              <div className="col-md-8">
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search" style={{ fontSize: '16px' }}></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search violations, vehicle, or location..."
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
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="auto-deducted">Auto-Deducted</option>
                  <option value="auto-failed">Auto-Failed</option>
                  <option value="overdue">Overdue</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card-body">
            {/* Violations List */}
            <div className="d-flex flex-column gap-4">
              {displayedViolations.map((violation) => (
                <div key={violation.id} className="border rounded-3 p-4 bg-white shadow-sm">
                  {/* Header */}
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-3">
                      <span className="fw-bold font-monospace fs-6">{violation.id}</span>
                      <span className={`badge d-flex align-items-center gap-1 ${getStatusColor(violation.status)}`} style={{ fontSize: '11px' }}>
                        {getStatusIcon(violation.status)}
                        <span className="text-capitalize">{violation.status.replace("-", " ")}</span>
                      </span>
                      {violation.status === "overdue" && (
                        <span className="badge bg-danger text-white d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '10px' }}></i>
                          Action Required
                        </span>
                      )}
                      {violation.status === "auto-failed" && (
                        <span className="badge border border-warning text-warning d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                          <i className="bi bi-x-circle-fill" style={{ fontSize: '10px' }}></i>
                          Payment Failed
                        </span>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <button className="btn btn-outline-primary btn-sm">
                        <i className="bi bi-eye-fill me-1" style={{ fontSize: '14px' }}></i>
                        Details
                      </button>
                      {(violation.status === "pending" ||
                        violation.status === "overdue" ||
                        violation.status === "auto-failed") && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handlePayNow(violation)}
                        >
                          <i className="bi bi-credit-card-fill me-1" style={{ fontSize: '14px' }}></i>
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Violation Details Grid */}
                  <div className="row g-4 mb-4">
                    <div className="col-lg-3 col-md-6">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Violation Type</div>
                      <div className="fw-medium">{violation.type}</div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Vehicle</div>
                      <div className="fw-medium d-flex align-items-center">
                        <i className="bi bi-car-front-fill me-2" style={{ fontSize: '14px' }}></i>
                        {violation.plateNumber}
                      </div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>{violation.vehicleModel}</div>
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Location</div>
                      <div className="fw-medium d-flex align-items-start">
                        <i className="bi bi-geo-alt-fill me-2 mt-1 flex-shrink-0" style={{ fontSize: '14px' }}></i>
                        <span>{violation.location}</span>
                      </div>
                      {violation.coordinates && (
                        <div className="text-muted font-monospace" style={{ fontSize: '12px' }}>{violation.coordinates}</div>
                      )}
                    </div>
                    <div className="col-lg-3 col-md-6">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Date & Time</div>
                      <div className="fw-medium d-flex align-items-center">
                        <i className="bi bi-calendar-event me-2" style={{ fontSize: '14px' }}></i>
                        {new Date(violation.date).toLocaleDateString('en-IN')}
                      </div>
                      <div className="text-muted d-flex align-items-center" style={{ fontSize: '12px' }}>
                        <i className="bi bi-clock me-2" style={{ fontSize: '12px' }}></i>
                        {violation.time}
                      </div>
                    </div>
                  </div>

                  {/* Amount and Officer Info */}
                  <div className="row g-4 mb-4">
                    <div className="col-md-6">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Fine Amount</div>
                      <div className="d-flex align-items-center gap-3">
                        <div className="fw-bold text-success fs-5">₹{violation.amount}</div>
                        {violation.totalAmount && violation.totalAmount > violation.amount && (
                          <div style={{ fontSize: '13px' }}>
                            <span className="text-muted">Total: </span>
                            <span className="fw-medium text-danger">₹{violation.totalAmount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Officer Details</div>
                      <div className="fw-medium d-flex align-items-center">
                        <i className="bi bi-shield-fill-check me-2" style={{ fontSize: '14px' }}></i>
                        {violation.officerName}
                      </div>
                      {violation.cameraId && (
                        <div className="text-muted d-flex align-items-center" style={{ fontSize: '12px' }}>
                          <i className="bi bi-camera-fill me-2" style={{ fontSize: '12px' }}></i>
                          Camera: {violation.cameraId}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Evidence Section */}
                  {violation.evidencePhoto && (
                    <>
                      <hr className="my-4" />
                      <div className="bg-light rounded-3 p-4 mb-4">
                        <h6 className="fw-medium d-flex align-items-center mb-3">
                          <i className="bi bi-camera-fill me-2 text-primary" style={{ fontSize: '18px' }}></i>
                          Evidence Photo
                        </h6>
                        <div className="d-flex gap-4">
                          <img
                            src={violation.evidencePhoto}
                            alt={`Evidence for ${violation.type}`}
                            className="rounded-3 border"
                            style={{ width: '96px', height: '96px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00OCA2NEw0MCA0OEw1NiA0OEw0OCA2NFoiIGZpbGw9IiM5Q0E1QUYiLz4KPC9zdmc+'
                            }}
                          />
                          <div className="flex-fill">
                            <p className="text-muted mb-3" style={{ fontSize: '13px' }}>{violation.evidence}</p>
                            <button 
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => handleDownloadEvidence(violation)}
                            >
                              <i className="bi bi-download me-1" style={{ fontSize: '14px' }}></i>
                              Download Evidence
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Auto-Deduction Status */}
                  {(violation.status === "auto-deducted" ||
                    violation.status === "auto-failed" ||
                    (violation.autoDeductionAttempts && violation.autoDeductionAttempts > 0)) && (
                    <>
                      <hr className="my-4" />
                      <div className="bg-info bg-opacity-10 border border-info rounded-3 p-4 mb-4">
                        <h6 className="fw-medium d-flex align-items-center mb-3 text-info">
                          <i className="bi bi-lightning-charge-fill me-2" style={{ fontSize: '18px' }}></i>
                          Auto-Deduction Status
                        </h6>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <div className="text-muted" style={{ fontSize: '13px' }}>Attempts</div>
                            <div className="fw-medium">{violation.autoDeductionAttempts || 0}</div>
                          </div>
                          {violation.autoDeductionDate && (
                            <div className="col-md-4">
                              <div className="text-muted" style={{ fontSize: '13px' }}>Last Attempt</div>
                              <div className="fw-medium">{new Date(violation.autoDeductionDate).toLocaleDateString('en-IN')}</div>
                            </div>
                          )}
                          {violation.failureReason && (
                            <div className="col-md-4">
                              <div className="text-muted" style={{ fontSize: '13px' }}>Failure Reason</div>
                              <div className="fw-medium text-danger">{violation.failureReason}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Penalty Breakdown */}
                  {(violation.insufficientFundsPenalty || violation.latePenalty) && (
                    <>
                      <hr className="my-4" />
                      <div className="bg-danger bg-opacity-10 border border-danger rounded-3 p-4 mb-4">
                        <h6 className="fw-medium text-danger mb-3">
                          <i className="bi bi-calculator-fill me-2" style={{ fontSize: '18px' }}></i>
                          Penalty Breakdown
                        </h6>
                        <div style={{ fontSize: '13px' }}>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Original Fine:</span>
                            <span className="fw-medium">₹{violation.amount}</span>
                          </div>
                          {violation.insufficientFundsPenalty && (
                            <div className="d-flex justify-content-between mb-2 text-danger">
                              <span>Insufficient Funds Penalty:</span>
                              <span className="fw-medium">+₹{violation.insufficientFundsPenalty}</span>
                            </div>
                          )}
                          {violation.latePenalty && (
                            <div className="d-flex justify-content-between mb-2 text-danger">
                              <span>Late Payment Penalty (6+ months):</span>
                              <span className="fw-medium">+₹{violation.latePenalty}</span>
                            </div>
                          )}
                          <hr className="my-2" />
                          <div className="d-flex justify-content-between">
                            <span className="fw-bold">Total Amount:</span>
                            <span className="fw-bold fs-6">₹{violation.totalAmount}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  {(violation.status === "pending" ||
                    violation.status === "overdue" ||
                    violation.status === "auto-failed") && (
                    <>
                      <hr className="my-4" />
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="text-muted d-flex align-items-center" style={{ fontSize: '13px' }}>
                          <i className="bi bi-calendar-event me-2" style={{ fontSize: '14px' }}></i>
                          Due Date: {new Date(violation.dueDate).toLocaleDateString('en-IN')}
                        </div>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => handleDispute(violation)}
                          >
                            <i className="bi bi-scale me-1" style={{ fontSize: '14px' }}></i>
                            Dispute
                          </button>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handlePayNow(violation)}
                          >
                            <i className="bi bi-credit-card-fill me-1" style={{ fontSize: '14px' }}></i>
                            Pay ₹{violation.totalAmount || violation.amount}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* No Results */}
            {displayedViolations.length === 0 && (
              <div className="text-center py-5">
                <i className="bi bi-search text-muted mb-3" style={{ fontSize: '64px' }}></i>
                <h5 className="text-muted mb-2">No violations found</h5>
                <p className="text-muted">No violations match your search criteria. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Modal */}
        {paymentModal.isOpen && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-primary text-white border-0">
                  <div>
                    <h5 className="modal-title fw-bold">Payment for {paymentModal.violationType}</h5>
                    <p className="text-white-50 mb-0">Violation ID: {paymentModal.violationId}</p>
                  </div>
                  <button type="button" className="btn-close btn-close-white" onClick={closePaymentModal}></button>
                </div>
                <div className="modal-body text-center py-5">
                  <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-4" 
                       style={{ width: '80px', height: '80px' }}>
                    <i className="bi bi-credit-card-fill text-primary" style={{ fontSize: '40px' }}></i>
                  </div>
                  <h4 className="fw-bold mb-2">₹{paymentModal.amount}</h4>
                  <p className="text-muted mb-4">Choose your payment method</p>
                  <div className="d-flex gap-3 justify-content-center">
                    <button 
                      className="btn btn-outline-primary btn-lg"
                      onClick={() => handleProcessPayment('UPI')}
                    >
                      <i className="bi bi-phone-fill me-2" style={{ fontSize: '16px' }}></i>
                      UPI Payment
                    </button>
                    <button 
                      className="btn btn-outline-primary btn-lg"
                      onClick={() => handleProcessPayment('Card')}
                    >
                      <i className="bi bi-credit-card-fill me-2" style={{ fontSize: '16px' }}></i>
                      Card Payment
                    </button>
                    <button 
                      className="btn btn-outline-primary btn-lg"
                      onClick={() => handleProcessPayment('Net Banking')}
                    >
                      <i className="bi bi-bank me-2" style={{ fontSize: '16px' }}></i>
                      Net Banking
                    </button>
                  </div>
                </div>
                <div className="modal-footer border-0 bg-light">
                  <button type="button" className="btn btn-secondary btn-lg" onClick={closePaymentModal}>
                    <i className="bi bi-x-circle me-2"></i>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Modal */}
        {disputeModal.isOpen && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-warning text-dark border-0">
                  <div>
                    <h5 className="modal-title fw-bold">Dispute Violation {disputeModal.violationId}</h5>
                    <p className="text-dark mb-0">Violation Type: {disputeModal.violationType}</p>
                  </div>
                  <button type="button" className="btn-close" onClick={closeDisputeModal}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-4">
                    <label className="form-label fw-medium">
                      <i className="bi bi-chat-left-text-fill me-2"></i>Dispute Description
                    </label>
                    <textarea
                      className="form-control form-control-lg"
                      rows="4"
                      placeholder="Please provide detailed reasons for disputing this violation..."
                      value={disputeModal.description}
                      onChange={(e) => setDisputeModal({ ...disputeModal, description: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="text-center">
                    <button className="btn btn-warning btn-lg" onClick={handleSubmitDispute}>
                      <i className="bi bi-check-circle-fill me-2" style={{ fontSize: '16px' }}></i>
                      Submit Dispute
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
        
        .font-monospace {
          font-family: 'Courier New', monospace;
        }
        
        .border {
          border-color: rgba(0,0,0,0.1) !important;
        }
        
        .badge {
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

export default UserViolations