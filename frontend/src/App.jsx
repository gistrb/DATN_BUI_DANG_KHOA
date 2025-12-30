import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layout
import { AdminLayout } from './components';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FaceCheck from './pages/FaceCheck';
import RegisterFace from './pages/RegisterFace';

// Admin Pages
import {
  EmployeeListPage,
  EmployeeDetailPage,
  EmployeeFormPage,
  DepartmentListPage,
  DepartmentDetailPage,
  AccountListPage,
} from './pages/admin';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/face-check" element={<FaceCheck />} />
          <Route path="/" element={<FaceCheck />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Employee Management */}
            <Route path="employees" element={<EmployeeListPage />} />
            <Route path="employees/create" element={<EmployeeFormPage />} />
            <Route path="employees/:id" element={<EmployeeDetailPage />} />
            <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
            
            {/* Department Management */}
            <Route path="departments" element={<DepartmentListPage />} />
            <Route path="departments/:id" element={<DepartmentDetailPage />} />
            
            {/* Account Management */}
            <Route path="accounts" element={<AccountListPage />} />
            
            {/* Face Registration */}
            <Route path="register-face" element={<RegisterFace />} />
          </Route>
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
