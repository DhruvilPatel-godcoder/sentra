import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  fetchUserDashboardStats, 
  fetchRecentViolations, 
  fetchUserVehicles, 
  fetchUserPayments, 
  fetchUserProfile 
} from '../api/userDashboard';

const UserDashboard = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // State for all dashboard data
  const [user, setUser] = useState({
    name: "User",
    vehicles: []
  });
  const [userStats, setUserStats] = useState({
    totalViolations: 0,
    pendingPayments: 0,
    totalFines: 0,
    paidFines: 0,
    pendingAmount: 0,
    accountBalance: 0,
    documentsExpiring: 0,
    totalVehicles: 0,
    pucStatus: "valid",
    pucExpiry: null,
    pendingFinesForPuc: 0,
  });
  const [recentViolations, setRecentViolations] = useState([]);
  const [userVehicles, setUserVehicles] = useState([]);
  const [userPayments, setUserPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState({});

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user ID from localStorage if not in params
        const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
        
        if (!currentUserId) {
          navigate('/login');
          return;
        }

        // Fetch all data in parallel
        const [statsRes, violationsRes, vehiclesRes, paymentsRes, profileRes] = await Promise.all([
          fetchUserDashboardStats(currentUserId),
          fetchRecentViolations(currentUserId),
          fetchUserVehicles(currentUserId),
          fetchUserPayments(currentUserId),
          fetchUserProfile(currentUserId)
        ]);

        // Handle stats
        if (statsRes.status === 'success') {
          setUserStats(statsRes.data);
        } else {
          console.error('Stats error:', statsRes.message);
        }

        // Handle violations
        if (violationsRes.status === 'success') {
          setRecentViolations(violationsRes.violations || []);
        } else {
          console.error('Violations error:', violationsRes.message);
        }

        // Handle vehicles
        if (vehiclesRes.status === 'success') {
          setUserVehicles(vehiclesRes.vehicles || []);
        } else {
          console.error('Vehicles error:', vehiclesRes.message);
        }

        // Handle payments
        if (paymentsRes.status === 'success') {
          setUserPayments(paymentsRes.payments || []);
          setPaymentStats(paymentsRes.stats || {});
        } else {
          console.error('Payments error:', paymentsRes.message);
        }

        // Handle profile
        if (profileRes.status === 'success') {
          setUser({
            name: profileRes.data.user_info.name,
            vehicles: vehiclesRes.vehicles?.map(v => v.plate_number) || []
          });
        } else {
          console.error('Profile error:', profileRes.message);
        }

      } catch (error) {
        console.error('Dashboard loading error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [userId, navigate]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "paid":
      case "success":
        return "bg-success text-white";
      case "overdue":
      case "failed":
        return "bg-danger text-white";
      case "pending":
        return "bg-warning text-dark";
      default:
        return "bg-secondary text-white";
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
          <h5 className="text-muted">Loading Dashboard...</h5>
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
            <h5>Error Loading Dashboard</h5>
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
              <div className="bg-success bg-opacity-10 p-3 rounded-circle me-3">
                <i className="bi bi-people-fill text-success" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA Citizen Portal</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Traffic Violation Management</p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="text-end d-none d-md-block">
                <p className="fw-medium text-dark mb-0" style={{ fontSize: '14px' }}>{user.name}</p>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                  ₹{userStats.accountBalance.toLocaleString()} • {userStats.totalVehicles} vehicles
                </p>
              </div>
              <div className="position-relative">
    <button 
      className="btn btn-outline-primary dropdown-toggle" 
      onClick={() => setDropdownOpen(!dropdownOpen)}
      onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
    >
      <i className="bi bi-person-circle" style={{ fontSize: '18px' }}></i>
    </button>
    {dropdownOpen && (
      <ul className="dropdown-menu show position-absolute" style={{ right: 0, top: '100%' }}>
        <li>
          <button 
            className="dropdown-item"
            onClick={() => {
              setDropdownOpen(false);
              // Add profile navigation logic
            }}
          >
            <i className="bi bi-person me-2"></i>Profile
          </button>
        </li>
        <li>
          <button 
            className="dropdown-item"
            onClick={() => {
              setDropdownOpen(false);
              // Add settings navigation logic
            }}
          >
            <i className="bi bi-gear me-2"></i>Settings
          </button>
        </li>
        <li><hr className="dropdown-divider" /></li>
        <li>
          <button 
            className="dropdown-item text-danger" 
            onClick={() => {
              setDropdownOpen(false);
              handleLogout();
            }}
          >
            <i className="bi bi-box-arrow-right me-2"></i>Logout
          </button>
        </li>
      </ul>
    )}
  </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid py-4 px-4">
        {/* Tab Navigation */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-2">
            <ul className="nav nav-pills nav-fill bg-light rounded-3 p-2">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <i className="bi bi-house-door-fill me-2" style={{ fontSize: '16px' }}></i>
                  Overview
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

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="row g-4">
            {/* Stats Cards */}
            <div className="col-12">
              <div className="row g-4 mb-4">
                <div className="col-md-6 col-lg-4 col-xl">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' }}>
                    <div className="card-body text-center p-4">
                      <div className="bg-warning bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                           style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '28px' }}></i>
                      </div>
                      <h3 className="fw-bold text-warning mb-1">{userStats.totalViolations}</h3>
                      <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Total Violations</p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 col-lg-4 col-xl">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f8d7da 0%, #f5b7b1 100%)' }}>
                    <div className="card-body text-center p-4">
                      <div className="bg-danger bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                           style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-clock-history text-danger" style={{ fontSize: '28px' }}></i>
                      </div>
                      <h3 className="fw-bold text-danger mb-1">{userStats.pendingPayments}</h3>
                      <p className="text-muted mb-0" style={{ fontSize: '13px' }}>₹{userStats.pendingAmount.toLocaleString()} due</p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 col-lg-4 col-xl">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #cce7ff 0%, #74b9ff 100%)' }}>
                    <div className="card-body text-center p-4">
                      <div className="bg-info bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                           style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-credit-card-fill text-info" style={{ fontSize: '28px' }}></i>
                      </div>
                      <h3 className="fw-bold text-info mb-1">₹{userStats.totalFines.toLocaleString()}</h3>
                      <p className="text-muted mb-0" style={{ fontSize: '13px' }}>₹{userStats.paidFines.toLocaleString()} paid</p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 col-lg-4 col-xl">
                  <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' }}>
                    <div className="card-body text-center p-4">
                      <div className="bg-primary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                           style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-shield-fill-check text-primary" style={{ fontSize: '28px' }}></i>
                      </div>
                      <h3 className="fw-bold text-primary mb-1">{userStats.documentsExpiring}</h3>
                      <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Expiring Soon</p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 col-lg-4 col-xl">
                  <div className={`card border-0 shadow-sm h-100 ${
                    userStats.pucStatus === "blocked" 
                      ? 'border-danger' 
                      : userStats.pucStatus === "expired" 
                        ? 'border-warning' 
                        : 'border-success'
                  }`} style={{ 
                    background: userStats.pucStatus === "blocked" 
                      ? 'linear-gradient(135deg, #f8d7da 0%, #f5b7b1 100%)' 
                      : userStats.pucStatus === "expired" 
                        ? 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' 
                        : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                  }}>
                    <div className="card-body text-center p-4">
                      <div className="d-flex align-items-center justify-content-center mb-3">
                        {userStats.pucStatus === "blocked" ? (
                          <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '48px' }}></i>
                        ) : userStats.pucStatus === "expired" ? (
                          <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '48px' }}></i>
                        ) : (
                          <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '48px' }}></i>
                        )}
                      </div>
                      <h5 className={`fw-bold mb-1 ${
                        userStats.pucStatus === "blocked" 
                          ? 'text-danger' 
                          : userStats.pucStatus === "expired" 
                            ? 'text-warning' 
                            : 'text-success'
                      }`}>
                        {userStats.pucStatus === "blocked"
                          ? "BLOCKED"
                          : userStats.pucStatus === "expired"
                            ? "EXPIRED"
                            : "VALID"}
                      </h5>
                      <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                        {userStats.pucStatus === "blocked"
                          ? `₹${userStats.pendingFinesForPuc.toLocaleString()} pending`
                          : userStats.pucExpiry ? `Expires ${new Date(userStats.pucExpiry).toLocaleDateString()}` : "No expiry data"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0 py-4">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-lightning-charge-fill text-primary me-3" style={{ fontSize: '24px' }}></i>
                    <h5 className="card-title mb-0 fw-bold">Quick Actions</h5>
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Common tasks and services</p>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-3">
                    <button 
                      className="btn btn-outline-primary btn-lg text-start d-flex align-items-center"
                      onClick={() => navigate(`/userpayments/${userId}`)}
                    >
                      <i className="bi bi-credit-card-fill me-3" style={{ fontSize: '20px' }}></i>
                      <div>
                        <div className="fw-medium">Pay Pending Fines</div>
                        <small className="text-muted">₹{userStats.pendingAmount.toLocaleString()} due</small>
                      </div>
                    </button>
                    <button 
                      className="btn btn-outline-secondary btn-lg text-start d-flex align-items-center"
                      onClick={() => navigate(`/userviolations/${userId}`)}
                    >
                      <i className="bi bi-file-earmark-text-fill me-3" style={{ fontSize: '20px' }}></i>
                      <div>
                        <div className="fw-medium">View Violation History</div>
                        <small className="text-muted">Check all violations</small>
                      </div>
                    </button>
                    <button 
                      className="btn btn-outline-info btn-lg text-start d-flex align-items-center"
                      onClick={() => setActiveTab('documents')}
                    >
                      <i className="bi bi-shield-fill-check me-3" style={{ fontSize: '20px' }}></i>
                      <div>
                        <div className="fw-medium">Check Document Status</div>
                        <small className="text-muted">Verify documents</small>
                      </div>
                    </button>
                    <button 
                      className={`btn btn-lg text-start d-flex align-items-center ${
                        userStats.pucStatus === "blocked" 
                          ? 'btn-danger' 
                          : 'btn-outline-success'
                      }`}
                      onClick={() => setActiveTab("documents")}
                    >
                      <i className="bi bi-car-front-fill me-3" style={{ fontSize: '20px' }}></i>
                      <div>
                        <div className="fw-medium">
                          {userStats.pucStatus === "blocked" ? "Clear Fines for PUC" : "Get PUC Certificate"}
                        </div>
                        <small className="text-muted">
                          {userStats.pucStatus === "blocked" ? "Payment required" : "Certificate services"}
                        </small>
                      </div>
                    </button>
                    <button 
                      className="btn btn-outline-warning btn-lg text-start d-flex align-items-center"
                      onClick={() => navigate(`/userdisputes/${userId}`)}
                    >
                      <i className="bi bi-scale me-3" style={{ fontSize: '20px' }}></i>
                      <div>
                        <div className="fw-medium">Submit Dispute</div>
                        <small className="text-muted">Challenge violations</small>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Violations */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0 py-4">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-clock-history text-primary me-3" style={{ fontSize: '24px' }}></i>
                    <h5 className="card-title mb-0 fw-bold">Recent Violations</h5>
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Your latest traffic violations</p>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-column gap-3">
                    {recentViolations.length > 0 ? (
                      recentViolations.slice(0, 4).map((violation) => (
                        <div key={violation.violation_id} className="border rounded-3 p-3 bg-light">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <div className="me-3">
                                <i className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '20px' }}></i>
                              </div>
                              <div>
                                <p className="fw-medium mb-1" style={{ fontSize: '14px' }}>{violation.type}</p>
                                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                                  <i className="bi bi-geo-alt me-1"></i>{violation.location} • 
                                  <i className="bi bi-calendar-event ms-2 me-1"></i>{violation.date}
                                </p>
                              </div>
                            </div>
                            <div className="text-end">
                              <p className="fw-bold mb-1 text-primary" style={{ fontSize: '14px' }}>₹{violation.amount}</p>
                              <span className={`badge ${getStatusBadgeClass(violation.status)}`} style={{ fontSize: '11px' }}>
                                {violation.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-5">
                        <i className="bi bi-check-circle-fill text-success mb-3" style={{ fontSize: '48px' }}></i>
                        <h6 className="text-muted">No recent violations</h6>
                        <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Great! You have a clean driving record.</p>
                      </div>
                    )}
                  </div>
                  {recentViolations.length > 4 && (
                    <div className="text-center mt-3">
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => navigate(`/userviolations/${userId}`)}
                      >
                        <i className="bi bi-eye me-2"></i>
                        View All Violations
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Important Notices */}
            {(userStats.pendingAmount > 0 || userStats.pucStatus === "blocked" || userStats.documentsExpiring > 0) && (
              <div className="col-12">
                <div className="card border-warning bg-warning bg-opacity-10 shadow-sm">
                  <div className="card-header bg-transparent border-warning">
                    <h5 className="card-title mb-0 fw-bold text-warning d-flex align-items-center">
                      <i className="bi bi-exclamation-triangle-fill me-2" style={{ fontSize: '20px' }}></i>
                      Important Notices
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="d-flex flex-column gap-3">
                      {userStats.pendingAmount > 0 && (
                        <div className="d-flex align-items-start">
                          <div className="bg-danger rounded-circle me-3 mt-1" style={{ width: '8px', height: '8px' }}></div>
                          <div>
                            <p className="fw-medium mb-1 text-danger" style={{ fontSize: '14px' }}>
                              <i className="bi bi-credit-card me-2"></i>Pending Payments
                            </p>
                            <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                              You have ₹{userStats.pendingAmount.toLocaleString()} in pending fines. Pay now to avoid license suspension.
                            </p>
                          </div>
                        </div>
                      )}
                      {userStats.pucStatus === "blocked" && (
                        <div className="d-flex align-items-start">
                          <div className="bg-danger rounded-circle me-3 mt-1" style={{ width: '8px', height: '8px' }}></div>
                          <div>
                            <p className="fw-medium mb-1 text-danger" style={{ fontSize: '14px' }}>
                              <i className="bi bi-shield-x me-2"></i>PUC Service Blocked
                            </p>
                            <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                              Clear ₹{userStats.pendingFinesForPuc.toLocaleString()} in pending fines to access PUC services.
                            </p>
                          </div>
                        </div>
                      )}
                      {userStats.documentsExpiring > 0 && (
                        <div className="d-flex align-items-start">
                          <div className="bg-warning rounded-circle me-3 mt-1" style={{ width: '8px', height: '8px' }}></div>
                          <div>
                            <p className="fw-medium mb-1 text-warning" style={{ fontSize: '14px' }}>
                              <i className="bi bi-file-earmark-text me-2"></i>Documents Expiring
                            </p>
                            <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                              {userStats.documentsExpiring} document(s) expiring in the next 30 days. Renew now.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 shadow-lg">
                <div className="card-header bg-white border-0 py-3">
                  <h5 className="card-title mb-0 fw-bold">My Vehicles</h5>
                  <small className="text-muted">Manage your registered vehicles</small>
                </div>
                <div className="card-body">
                  {userVehicles.length > 0 ? (
                    <div className="row g-4">
                      {userVehicles.map((vehicle) => (
                        <div key={vehicle.vehicle_id} className="col-md-6 col-lg-4">
                          <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                              <div className="d-flex align-items-center mb-3">
                                <div className="bg-primary bg-opacity-10 rounded-circle me-3 d-flex align-items-center justify-content-center"
                                     style={{ width: '40px', height: '40px' }}>
                                  <i className="bi bi-car-front-fill text-primary" style={{ fontSize: '20px' }}></i>
                                </div>
                                <div>
                                  <h6 className="fw-bold mb-0">{vehicle.plate_number}</h6>
                                  <small className="text-muted">{vehicle.make} {vehicle.model}</small>
                                </div>
                              </div>
                              <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="small text-muted">Type:</span>
                                  <span className="small fw-medium">{vehicle.vehicle_type}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="small text-muted">Year:</span>
                                  <span className="small fw-medium">{vehicle.year}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <span className="small text-muted">Violations:</span>
                                  <span className={`badge ${vehicle.violation_count > 0 ? 'bg-warning' : 'bg-success'}`}>
                                    {vehicle.violation_count}
                                  </span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="small text-muted">PUC Status:</span>
                                  <span className={`badge ${
                                    vehicle.puc_status === 'valid' ? 'bg-success' : 
                                    vehicle.puc_status === 'expired' ? 'bg-warning' : 'bg-danger'
                                  }`}>
                                    {vehicle.puc_status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="bi bi-car text-muted mb-3" style={{ fontSize: '48px' }}></i>
                      <h5 className="text-muted">No Vehicles Registered</h5>
                      <p className="text-muted">Register your vehicles to manage violations and documents.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Violations Tab */}
        {activeTab === 'violations' && (
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 shadow-lg">
                <div className="card-header bg-white border-0 py-3">
                  <h5 className="card-title mb-0 fw-bold">Violation History</h5>
                  <small className="text-muted">All your traffic violations</small>
                </div>
                <div className="card-body">
                  {recentViolations.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Location</th>
                            <th>Vehicle</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentViolations.map((violation) => (
                            <tr key={violation.violation_id}>
                              <td>{violation.date}</td>
                              <td>{violation.type}</td>
                              <td>{violation.location}</td>
                              <td>{violation.vehicle_number}</td>
                              <td>₹{violation.amount}</td>
                              <td>
                                <span className={`badge ${getStatusBadgeClass(violation.status)}`}>
                                  {violation.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="bi bi-check-circle-fill text-success mb-3" style={{ fontSize: '48px' }}></i>
                      <h5 className="text-muted">No Violations</h5>
                      <p className="text-muted">Great! You have a clean driving record.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="row g-4">
            <div className="col-12">
              <div className="row g-4 mb-4">
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body text-center">
                      <h4 className="fw-bold text-success">₹{paymentStats.total_paid?.toLocaleString() || 0}</h4>
                      <p className="text-muted mb-0">Total Paid</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body text-center">
                      <h4 className="fw-bold text-primary">{paymentStats.total_transactions || 0}</h4>
                      <p className="text-muted mb-0">Total Transactions</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body text-center">
                      <h4 className="fw-bold text-info">{paymentStats.auto_deducted_count || 0}</h4>
                      <p className="text-muted mb-0">Auto Deducted</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="card border-0 shadow-lg">
                <div className="card-header bg-white border-0 py-3">
                  <h5 className="card-title mb-0 fw-bold">Payment History</h5>
                  <small className="text-muted">All your payment transactions</small>
                </div>
                <div className="card-body">
                  {userPayments.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Violation</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Status</th>
                            <th>Auto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userPayments.map((payment) => (
                            <tr key={payment.payment_id}>
                              <td>{payment.date}</td>
                              <td>{payment.violation_type} - {payment.location}</td>
                              <td>₹{payment.amount}</td>
                              <td>{payment.payment_method}</td>
                              <td>
                                <span className={`badge ${getStatusBadgeClass(payment.status)}`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td>
                                {payment.auto_deducted ? (
                                  <i className="bi bi-check text-success" style={{ width: '16px', height: '16px' }}></i>
                                ) : (
                                  <i className="bi bi-x text-muted" style={{ width: '16px', height: '16px' }}></i>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <i className="bi bi-credit-card text-muted mb-3" style={{ width: '48px', height: '48px' }}></i>
                      <h5 className="text-muted">No Payment History</h5>
                      <p className="text-muted">No payment transactions found.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="card border-0 shadow-lg">
            <div className="card-body text-center p-5">
              <i className="bi bi-file-earmark-text text-muted mb-3" style={{ width: '48px', height: '48px' }}></i>
              <h5 className="text-muted">Document Management</h5>
              <p className="text-muted">Document management features coming soon...</p>
            </div>
          </div>
        )}

        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <div className="card border-0 shadow-lg">
            <div className="card-body text-center p-5">
              <i className="bi bi-scale text-muted mb-3" style={{ width: '48px', height: '48px' }}></i>
              <h5 className="text-muted">Dispute System</h5>
              <p className="text-muted">Dispute system features coming soon...</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .nav-pills .nav-link {
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .nav-pills .nav-link:hover {
          background-color: rgba(13, 110, 253, 0.1);
          transform: translateY(-1px);
        }
        
        .nav-pills .nav-link.active {
          background: linear-gradient(45deg, #0d6efd, #6f42c1);
          box-shadow: 0 4px 15px rgba(13, 110, 253, 0.3);
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

export default UserDashboard;