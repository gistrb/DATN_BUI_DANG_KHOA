import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login.jsx';
import FaceCheck from './pages/FaceCheck.jsx';
import RegisterFace from './pages/RegisterFace.jsx';
import Dashboard from './pages/Dashboard.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<FaceCheck />} />
          <Route path="/face-check" element={<FaceCheck />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/register-face" element={<RegisterFace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
