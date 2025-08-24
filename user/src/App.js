import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login"
import Dashboard from "./pages/UserDashboard";
import UserPayments from "./pages/UserPayments";
import UserViolations from "./pages/UserViolations";
import UserDisputes from "./pages/UserDisputes";
import UserVehicles from "./pages/UserVehicles";


function App() {
  return (
    <Router>
      <Routes>
        
        {/* Dashboard for a specific station */}
        <Route path="/" element={<Login />} />
        <Route path="/userdashboard/:user_id" element={<Dashboard />} />
        <Route path="/userpayments/:user_id" element={<UserPayments />} />
        <Route path="/userviolations/:user_id" element={<UserViolations />} />
        <Route path="/userdisputes/:user_id" element={<UserDisputes />} />
        <Route path="/uservehicles/:user_id" element={<UserVehicles />} />

      </Routes>
    </Router>
  );
}

export default App;
