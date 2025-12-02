import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import FaceCheck from './pages/FaceCheck';
import RegisterFace from './pages/RegisterFace';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FaceCheck />} />
        <Route path="/face-check" element={<FaceCheck />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/register-face" element={<RegisterFace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
