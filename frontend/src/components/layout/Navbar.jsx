import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine if we're in admin section
  const isAdminSection = location.pathname.startsWith('/admin');

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        {/* Sidebar toggle for mobile */}
        {isAdminSection && (
          <button
            className="btn btn-dark d-lg-none me-2"
            type="button"
            onClick={onToggleSidebar}
          >
            <i className="bi bi-list"></i>
          </button>
        )}

        <Link className="navbar-brand" to={user?.is_staff ? "/admin/dashboard" : "/"}>
          Hệ thống chấm công
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Non-admin navigation links */}
          {!isAdminSection && (
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  <i className="bi bi-camera-video"></i> Chấm công
                </Link>
              </li>
            </ul>
          )}

          <ul className="navbar-nav ms-auto">
            {user ? (
              <>
                <li className="nav-item">
                  <span className="nav-link">
                    Xin chào, {user.full_name || user.username}
                  </span>
                </li>
                <li className="nav-item">
                  <button
                    className="nav-link btn btn-link"
                    style={{ textDecoration: 'none' }}
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right"></i> Đăng xuất
                  </button>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <Link className="nav-link" to="/login">
                  <i className="bi bi-box-arrow-in-right"></i> Đăng nhập
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
