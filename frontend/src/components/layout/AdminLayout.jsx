import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (!user.is_staff && !user.is_superuser) {
        navigate('/');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user || (!user.is_staff && !user.is_superuser)) {
    return null;
  }

  return (
    <div className="admin-layout">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar show={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="admin-content">
        <div className="container-fluid py-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
