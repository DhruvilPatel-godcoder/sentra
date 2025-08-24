import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LiveFeed from "./pages/LiveFeed";
import AIDetection from "./pages/AIDetection";
import Penalty from "./pages/Penalty";
import Documents from "./pages/Documents";
import LiveDetection from "./pages/LiveDetection";  


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Dashboard for a specific station */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Live Feed Page */}
        <Route path="/livefeed" element={<LiveFeed />} />

        {/* AI Detection Page */}
        <Route path="/aidetection" element={<AIDetection />} />

        {/* Penalty Page */}
        <Route path="/penalties" element={<Penalty />} />

        {/* Documents Page */}
        <Route path="/documents" element={<Documents />} />

        {/* Live Detection Page */}
        <Route path="/livedetection" element={<LiveDetection />} />

      </Routes>
    </Router>
  );
}

export default App;
