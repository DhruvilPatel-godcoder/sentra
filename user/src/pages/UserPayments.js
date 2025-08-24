import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  fetchUserPaymentStats, 
  fetchUserPaymentHistory, 
  retryFailedPayment, 
  downloadPaymentReceipt,
  fetchPendingViolations,
  processBulkPayment
} from '../api/userPayments';

const UserPayments = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryingPayment, setRetryingPayment] = useState(null);

  // State for payment data
  const [user, setUser] = useState({
    name: "User",
    mobile: "+91 9876543210"
  });
  const [paymentStats, setPaymentStats] = useState({
    total_paid: 0,
    completed_payments: 0,
    failed_payments: 0,
    pending_payments: 0,
    auto_deducted_count: 0,
    total_transactions: 0,
    account_balance: 0,
    mobile_number: ""
  });
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);

  // Modal state for pending fines
  const [showPendingFinesModal, setShowPendingFinesModal] = useState(false);
  const [pendingViolations, setPendingViolations] = useState([]);
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [loadingPendingFines, setLoadingPendingFines] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  // Load payment data
  useEffect(() => {
    const loadPaymentData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user ID from localStorage if not in params
        const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
        
        if (!currentUserId) {
          navigate('/login');
          return;
        }

        // Fetch payment data in parallel
        const [statsRes, historyRes] = await Promise.all([
          fetchUserPaymentStats(currentUserId),
          fetchUserPaymentHistory(currentUserId, searchTerm)
        ]);

        // Handle stats
        if (statsRes.status === 'success') {
          setPaymentStats(statsRes.data);
          setUser({
            name: statsRes.data.user_name || "User",
            mobile: statsRes.data.mobile_number || "+91 9876543210"
          });
        } else {
          console.error('Stats error:', statsRes.message);
        }

        // Handle payment history
        if (historyRes.status === 'success') {
          setPayments(historyRes.payments || []);
          setFilteredPayments(historyRes.payments || []);
        } else {
          console.error('History error:', historyRes.message);
        }

      } catch (error) {
        console.error('Payment data loading error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, [userId, navigate, searchTerm]);

  // Filter payments based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredPayments(payments);
      return;
    }

    const filtered = payments.filter(
      (payment) =>
        payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.violation_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.violation_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPayments(filtered);
  }, [searchTerm, payments]);

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-success text-white";
      case "pending":
        return "bg-warning text-dark";
      case "failed":
        return "bg-danger text-white";
      default:
        return "bg-secondary text-white";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <i className="bi bi-check-circle-fill" style={{ fontSize: '12px' }}></i>;
      case "pending":
        return <i className="bi bi-clock-history" style={{ fontSize: '12px' }}></i>;
      case "failed":
        return <i className="bi bi-x-circle-fill" style={{ fontSize: '12px' }}></i>;
      default:
        return null;
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case "UPI":
        return <i className="bi bi-phone-fill" style={{ fontSize: '16px' }}></i>;
      case "Card":
        return <i className="bi bi-credit-card-fill" style={{ fontSize: '16px' }}></i>;
      case "Net Banking":
        return <i className="bi bi-bank" style={{ fontSize: '16px' }}></i>;
      default:
        return <i className="bi bi-credit-card-fill" style={{ fontSize: '16px' }}></i>;
    }
  };

  const handleRetryPayment = async (paymentId) => {
    try {
      setRetryingPayment(paymentId);
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
      
      const result = await retryFailedPayment(currentUserId, paymentId);
      
      if (result.status === 'success') {
        // Refresh payment data
        const historyRes = await fetchUserPaymentHistory(currentUserId, searchTerm);
        if (historyRes.status === 'success') {
          setPayments(historyRes.payments || []);
          setFilteredPayments(historyRes.payments || []);
        }
        
        alert('Payment retry initiated successfully!');
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error retrying payment: ${error.message}`);
    } finally {
      setRetryingPayment(null);
    }
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
      const result = await downloadPaymentReceipt(currentUserId, paymentId);
      
      if (result.status === 'success') {
        // In a real app, you would download the actual receipt
        console.log('Receipt data:', result.receipt_data);
        alert('Receipt download initiated (check console for data)');
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error downloading receipt: ${error.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('userToken');
    navigate('/login');
  };

  // Handle opening pending fines modal
  const handleOpenPendingFinesModal = async () => {
    setShowPendingFinesModal(true);
    setLoadingPendingFines(true);
    
    try {
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
      const result = await fetchPendingViolations(currentUserId);
      
      if (result.status === 'success') {
        setPendingViolations(result.violations || []);
      } else {
        console.error('Error fetching pending violations:', result.message);
        setPendingViolations([]);
      }
    } catch (error) {
      console.error('Error fetching pending violations:', error);
      setPendingViolations([]);
    } finally {
      setLoadingPendingFines(false);
    }
  };

  // Handle violation selection
  const handleViolationSelect = (violationId) => {
    setSelectedViolations(prev => {
      if (prev.includes(violationId)) {
        return prev.filter(id => id !== violationId);
      } else {
        return [...prev, violationId];
      }
    });
  };

  // Handle select all violations
  const handleSelectAllViolations = () => {
    if (selectedViolations.length === pendingViolations.length) {
      setSelectedViolations([]);
    } else {
      setSelectedViolations(pendingViolations.map(v => v.violation_id));
    }
  };

  // Handle bulk payment
  const handleBulkPayment = async () => {
    if (selectedViolations.length === 0) {
      alert('Please select at least one violation to pay');
      return;
    }

    setProcessingPayment(true);
    
    try {
      const currentUserId = userId || JSON.parse(localStorage.getItem('userData'))?.user_id;
      const result = await processBulkPayment(currentUserId, selectedViolations, paymentMethod);
      
      if (result.status === 'success') {
        alert(`Successfully processed payment for ${selectedViolations.length} violations. Total amount: ₹${result.total_amount}`);
        setShowPendingFinesModal(false);
        setSelectedViolations([]);
        
        // Refresh payment data
        const [statsRes, historyRes] = await Promise.all([
          fetchUserPaymentStats(currentUserId),
          fetchUserPaymentHistory(currentUserId, searchTerm)
        ]);

        if (statsRes.status === 'success') {
          setPaymentStats(statsRes.data);
        }

        if (historyRes.status === 'success') {
          setPayments(historyRes.payments || []);
          setFilteredPayments(historyRes.payments || []);
        }
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert(`Error processing payment: ${error.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Calculate total amount for selected violations
  const getTotalSelectedAmount = () => {
    return pendingViolations
      .filter(v => selectedViolations.includes(v.violation_id))
      .reduce((total, v) => total + v.fine_amount, 0);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Payment History...</h5>
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
            <h5>Error Loading Payment Data</h5>
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
                <i className="bi bi-credit-card-fill text-success" style={{ fontSize: '28px' }}></i>
              </div>
              <div>
                <h1 className="h4 mb-0 fw-bold text-dark">SENTRA Payment Portal</h1>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>Payment History & Management</p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="text-end d-none d-md-block">
                <p className="fw-medium text-dark mb-0" style={{ fontSize: '14px' }}>{user.name}</p>
                <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                  ₹{paymentStats.account_balance.toLocaleString()} • {user.mobile}
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
                <button 
                  className="nav-link"
                  onClick={() => navigate(`/userviolations/${userId}`)}
                >
                  <i className="bi bi-exclamation-triangle-fill me-2" style={{ fontSize: '16px' }}></i>
                  Violations
                </button>
              </li>
              <li className="nav-item">
                <button className="nav-link active">
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

        {/* Payment Summary */}
        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-success bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '28px' }}></i>
                </div>
                <h3 className="fw-bold text-success mb-1">₹{paymentStats.total_paid.toLocaleString()}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Total Paid</p>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-info bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-trophy-fill text-info" style={{ fontSize: '28px' }}></i>
                </div>
                <h3 className="fw-bold text-info mb-1">{paymentStats.completed_payments}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Successful Payments</p>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-danger bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '28px' }}></i>
                </div>
                <h3 className="fw-bold text-danger mb-1">{paymentStats.failed_payments}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Failed Payments</p>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)' }}>
              <div className="card-body text-center p-4">
                <div className="bg-primary bg-opacity-10 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px' }}>
                  <i className="bi bi-telephone-fill text-primary" style={{ fontSize: '28px' }}></i>
                </div>
                <div className="fw-bold text-primary mb-1" style={{ fontSize: '16px' }}>{user.mobile}</div>
                <p className="text-muted mb-0" style={{ fontSize: '13px' }}>Registered Mobile</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-0 py-4">
            <div className="d-flex align-items-center mb-2">
              <i className="bi bi-clock-history text-primary me-3" style={{ fontSize: '24px' }}></i>
              <h5 className="card-title mb-0 fw-bold">Payment History</h5>
            </div>
            <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
              View all payment transactions for mobile: {user.mobile}
            </p>
          </div>
          <div className="card-body">
            {/* Search */}
            <div className="mb-4">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search" style={{ fontSize: '16px' }}></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by payment ID, violation ID, vehicle number, or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Payments List */}
            <div className="d-flex flex-column gap-4">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="border rounded-3 p-4 bg-white shadow-sm">
                  {/* Payment Header */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="text-muted">
                        {getMethodIcon(payment.method)}
                      </div>
                      <div>
                        <h6 className="fw-medium mb-1">Payment #{payment.id}</h6>
                        <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                          Violation: {payment.violation_id}
                        </p>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge d-flex align-items-center gap-1 ${getStatusColor(payment.status)}`} style={{ fontSize: '11px' }}>
                        {getStatusIcon(payment.status)}
                        <span className="text-capitalize">{payment.status}</span>
                      </span>
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => handleDownloadReceipt(payment.payment_id)}
                      >
                        <i className="bi bi-download me-1" style={{ fontSize: '12px' }}></i>
                        Receipt
                      </button>
                      {payment.status === "failed" && (
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleRetryPayment(payment.payment_id)}
                          disabled={retryingPayment === payment.payment_id}
                        >
                          {retryingPayment === payment.payment_id ? (
                            <>
                              <div className="spinner-border spinner-border-sm me-1" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                              Retrying...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-arrow-clockwise me-1"></i>
                              Retry
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment Details Grid */}
                  <div className="row g-3 mb-3">
                    <div className="col-md-2">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Vehicle:</div>
                      <div className="fw-medium d-flex align-items-center">
                        <i className="bi bi-car-front me-2" style={{ fontSize: '14px' }}></i>
                        {payment.vehicle_number}
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Amount:</div>
                      <div className="fw-bold text-success" style={{ fontSize: '16px' }}>₹{payment.amount}</div>
                    </div>
                    <div className="col-md-2">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Method:</div>
                      <div className="fw-medium d-flex align-items-center">
                        {getMethodIcon(payment.method)}
                        <span className="ms-2">{payment.method}</span>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Date & Time:</div>
                      <div className="fw-medium d-flex align-items-center">
                        <i className="bi bi-calendar-event me-2" style={{ fontSize: '14px' }}></i>
                        {payment.formatted_date}
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Mobile:</div>
                      <div className="fw-medium d-flex align-items-center">
                        <i className="bi bi-telephone me-2" style={{ fontSize: '14px' }}></i>
                        {payment.mobile_number}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-light rounded-3 p-3 mb-3">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Transaction ID:</div>
                        <div className="fw-medium font-monospace" style={{ fontSize: '14px' }}>{payment.transaction_id}</div>
                      </div>
                      <div className="col-md-6">
                        <div className="text-muted mb-1" style={{ fontSize: '13px' }}>Processing Status:</div>
                        <div className={`fw-medium ${
                          payment.status === "success" 
                            ? "text-success" 
                            : payment.status === "pending" 
                              ? "text-warning" 
                              : "text-danger"
                        }`} style={{ fontSize: '14px' }}>
                          {payment.status === "success" 
                            ? "Successfully processed" 
                            : payment.status === "pending" 
                              ? "Processing in progress" 
                              : "Payment failed - please retry"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status-specific alerts */}
                  {payment.status === "failed" && (
                    <div className="bg-danger bg-opacity-10 border border-danger rounded-3 p-3">
                      <div className="d-flex align-items-start">
                        <i className="bi bi-x-circle-fill text-danger me-2 mt-1" style={{ fontSize: '16px' }}></i>
                        <div>
                          <div className="fw-medium text-danger mb-1" style={{ fontSize: '14px' }}>
                            Payment Failed
                          </div>
                          <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                            Your payment of ₹{payment.amount} for violation {payment.violation_id} could not be processed. 
                            Please retry or contact support if the issue persists.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {payment.status === "pending" && (
                    <div className="bg-warning bg-opacity-10 border border-warning rounded-3 p-3">
                      <div className="d-flex align-items-start">
                        <i className="bi bi-clock-history text-warning me-2 mt-1" style={{ fontSize: '16px' }}></i>
                        <div>
                          <div className="fw-medium text-warning mb-1" style={{ fontSize: '14px' }}>
                            Payment Processing
                          </div>
                          <p className="text-muted mb-0" style={{ fontSize: '12px' }}>
                            Your payment of ₹{payment.amount} is being processed. You will receive confirmation via SMS on {payment.mobile_number}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredPayments.length === 0 && (
              <div className="text-center py-5">
                <i className="bi bi-inbox text-muted mb-3" style={{ fontSize: '64px' }}></i>
                <h5 className="text-muted">No payments found</h5>
                <p className="text-muted mb-0">No payments match your search criteria. Try adjusting your search terms.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Payment Actions */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0 py-4">
            <h5 className="card-title mb-1 fw-bold">
              <i className="bi bi-lightning-charge-fill text-warning me-2"></i>
              Quick Payment Actions
            </h5>
            <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
              Manage payments for mobile: {user.mobile}
            </p>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <button 
                  className="btn btn-outline-primary btn-lg w-100 text-start d-flex align-items-center"
                  onClick={handleOpenPendingFinesModal}
                >
                  <i className="bi bi-credit-card-fill me-3" style={{ fontSize: '20px' }}></i>
                  <div>
                    <div className="fw-medium">Pay Pending Fines</div>
                    <small className="text-muted">Clear outstanding violations</small>
                  </div>
                </button>
              </div>
              <div className="col-md-4">
                <button 
                  className="btn btn-outline-success btn-lg w-100 text-start d-flex align-items-center"
                  onClick={() => {
                    const failedPayments = payments.filter(p => p.status === "failed");
                    if (failedPayments.length > 0) {
                      handleRetryPayment(failedPayments[0].payment_id);
                    } else {
                      alert('No failed payments to retry');
                    }
                  }}
                >
                  <i className="bi bi-arrow-clockwise me-3" style={{ fontSize: '20px' }}></i>
                  <div>
                    <div className="fw-medium">Retry Failed Payments</div>
                    <small className="text-muted">{paymentStats.failed_payments} failed transactions</small>
                  </div>
                </button>
              </div>
              <div className="col-md-4">
                <button 
                  className="btn btn-outline-info btn-lg w-100 text-start d-flex align-items-center"
                  onClick={() => {
                    // Download all receipts functionality
                    alert('Bulk receipt download feature coming soon!');
                  }}
                >
                  <i className="bi bi-download me-3" style={{ fontSize: '20px' }}></i>
                  <div>
                    <div className="fw-medium">Download All Receipts</div>
                    <small className="text-muted">Bulk receipt download</small>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Fines Modal */}
      {showPendingFinesModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-credit-card-fill me-2"></i>
                  Pay Pending Fines
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => {
                    setShowPendingFinesModal(false);
                    setSelectedViolations([]);
                  }}
                ></button>
              </div>
              
              <div className="modal-body p-0">
                {loadingPendingFines ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <h6 className="text-muted">Loading pending violations...</h6>
                  </div>
                ) : pendingViolations.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="bi bi-check-circle-fill text-success mb-3" style={{ fontSize: '64px' }}></i>
                    <h5 className="text-success">No Pending Fines</h5>
                    <p className="text-muted mb-0">You have no outstanding violations to pay.</p>
                  </div>
                ) : (
                  <>
                    {/* Summary Header */}
                    <div className="bg-light border-bottom p-4">
                      <div className="row align-items-center">
                        <div className="col-md-6">
                          <h6 className="mb-1">
                            <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                            {pendingViolations.length} Pending Violation{pendingViolations.length > 1 ? 's' : ''}
                          </h6>
                          <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                            Total Outstanding: ₹{pendingViolations.reduce((total, v) => total + v.fine_amount, 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="col-md-6 text-end">
                          <button 
                            className="btn btn-outline-primary me-2"
                            onClick={handleSelectAllViolations}
                          >
                            {selectedViolations.length === pendingViolations.length ? 'Deselect All' : 'Select All'}
                          </button>
                          {selectedViolations.length > 0 && (
                            <span className="badge bg-primary" style={{ fontSize: '12px' }}>
                              {selectedViolations.length} selected • ₹{getTotalSelectedAmount().toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Violations List */}
                    <div className="p-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <div className="row g-3">
                        {pendingViolations.map((violation) => (
                          <div key={violation.violation_id} className="col-12">
                            <div className={`card border ${selectedViolations.includes(violation.violation_id) ? 'border-primary bg-primary bg-opacity-10' : ''}`}>
                              <div className="card-body p-3">
                                <div className="row align-items-center">
                                  <div className="col-md-1">
                                    <div className="form-check">
                                      <input 
                                        className="form-check-input" 
                                        type="checkbox" 
                                        checked={selectedViolations.includes(violation.violation_id)}
                                        onChange={() => handleViolationSelect(violation.violation_id)}
                                      />
                                    </div>
                                  </div>
                                  <div className="col-md-8">
                                    <div className="row g-2">
                                      <div className="col-md-6">
                                        <div className="text-muted mb-1" style={{ fontSize: '12px' }}>Violation ID:</div>
                                        <div className="fw-medium" style={{ fontSize: '14px' }}>{violation.violation_id}</div>
                                      </div>
                                      <div className="col-md-6">
                                        <div className="text-muted mb-1" style={{ fontSize: '12px' }}>Vehicle:</div>
                                        <div className="fw-medium d-flex align-items-center" style={{ fontSize: '14px' }}>
                                          <i className="bi bi-car-front me-1"></i>
                                          {violation.vehicle_number}
                                        </div>
                                      </div>
                                      <div className="col-md-6">
                                        <div className="text-muted mb-1" style={{ fontSize: '12px' }}>Violation Type:</div>
                                        <div className="fw-medium" style={{ fontSize: '14px' }}>{violation.violation_type}</div>
                                      </div>
                                      <div className="col-md-6">
                                        <div className="text-muted mb-1" style={{ fontSize: '12px' }}>Location:</div>
                                        <div className="fw-medium d-flex align-items-center" style={{ fontSize: '14px' }}>
                                          <i className="bi bi-geo-alt me-1"></i>
                                          {violation.location}
                                        </div>
                                      </div>
                                      <div className="col-md-6">
                                        <div className="text-muted mb-1" style={{ fontSize: '12px' }}>Date:</div>
                                        <div className="fw-medium d-flex align-items-center" style={{ fontSize: '14px' }}>
                                          <i className="bi bi-calendar-event me-1"></i>
                                          {violation.date}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-md-3 text-end">
                                    <div className="text-muted mb-1" style={{ fontSize: '12px' }}>Fine Amount:</div>
                                    <h5 className="fw-bold text-danger mb-0">₹{violation.fine_amount.toLocaleString()}</h5>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Method Selection */}
                    {selectedViolations.length > 0 && (
                      <div className="border-top p-4">
                        <h6 className="mb-3">
                          <i className="bi bi-credit-card me-2"></i>
                          Select Payment Method
                        </h6>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-check-label w-100">
                              <input 
                                type="radio" 
                                className="form-check-input me-2" 
                                name="paymentMethod"
                                value="UPI"
                                checked={paymentMethod === 'UPI'}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                              />
                              <div className="card border p-3 text-center h-100">
                                <i className="bi bi-phone-fill text-primary mb-2" style={{ fontSize: '24px' }}></i>
                                <div className="fw-medium">UPI</div>
                                <small className="text-muted">PhonePe, GPay, Paytm</small>
                              </div>
                            </label>
                          </div>
                          <div className="col-md-4">
                            <label className="form-check-label w-100">
                              <input 
                                type="radio" 
                                className="form-check-input me-2" 
                                name="paymentMethod"
                                value="Card"
                                checked={paymentMethod === 'Card'}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                              />
                              <div className="card border p-3 text-center h-100">
                                <i className="bi bi-credit-card-fill text-success mb-2" style={{ fontSize: '24px' }}></i>
                                <div className="fw-medium">Card</div>
                                <small className="text-muted">Debit/Credit Card</small>
                              </div>
                            </label>
                          </div>
                          <div className="col-md-4">
                            <label className="form-check-label w-100">
                              <input 
                                type="radio" 
                                className="form-check-input me-2" 
                                name="paymentMethod"
                                value="Net Banking"
                                checked={paymentMethod === 'Net Banking'}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                              />
                              <div className="card border p-3 text-center h-100">
                                <i className="bi bi-bank text-info mb-2" style={{ fontSize: '24px' }}></i>
                                <div className="fw-medium">Net Banking</div>
                                <small className="text-muted">Internet Banking</small>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {!loadingPendingFines && pendingViolations.length > 0 && selectedViolations.length > 0 && (
                <div className="modal-footer bg-light">
                  <div className="d-flex justify-content-between align-items-center w-100">
                    <div>
                      <h6 className="mb-0">
                        Total Amount: <span className="text-primary">₹{getTotalSelectedAmount().toLocaleString()}</span>
                      </h6>
                      <small className="text-muted">
                        {selectedViolations.length} violation{selectedViolations.length > 1 ? 's' : ''} selected
                      </small>
                    </div>
                    <div>
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary me-2"
                        onClick={() => {
                          setShowPendingFinesModal(false);
                          setSelectedViolations([]);
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary"
                        onClick={handleBulkPayment}
                        disabled={processingPayment || paymentStats.account_balance < getTotalSelectedAmount()}
                      >
                        {processingPayment ? (
                          <>
                            <div className="spinner-border spinner-border-sm me-2" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-credit-card-fill me-2"></i>
                            Pay ₹{getTotalSelectedAmount().toLocaleString()}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {paymentStats.account_balance < getTotalSelectedAmount() && (
                    <div className="w-100 mt-2">
                      <div className="alert alert-warning mb-0 p-2">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Insufficient account balance. Available: ₹{paymentStats.account_balance.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
  );
};

export default UserPayments;