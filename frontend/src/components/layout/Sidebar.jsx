import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ show, onClose }) => {
  const location = useLocation();

  const menuItems = [
    {
      path: '/admin/dashboard',
      icon: 'bi-speedometer2',
      label: 'Dashboard',
    },
    {
      path: '/admin/employees',
      icon: 'bi-people',
      label: 'Quản lý nhân viên',
    },
    {
      path: '/admin/departments',
      icon: 'bi-building',
      label: 'Quản lý phòng ban',
    },
    {
      path: '/admin/accounts',
      icon: 'bi-person-gear',
      label: 'Quản lý tài khoản',
    },
    {
      path: '/admin/register-face',
      icon: 'bi-person-badge',
      label: 'Quản lý khuôn mặt',
    },
    {
      path: '/face-check',
      icon: 'bi-camera-video',
      label: 'Chấm công',
    },
    {
      path: '/admin/statistics',
      icon: 'bi-bar-chart-line',
      label: 'Thống kê',
    },
  ];

  const isActive = (path) => {
    if (path === '/admin/dashboard') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {show && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-lg-none"
          style={{ zIndex: 99 }}
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`admin-sidebar ${show ? 'show' : ''}`}>
        <div className="p-3">
          <h5 className="text-white mb-0">
            <i className="bi bi-gear-fill me-2"></i>
            Admin Panel
          </h5>
        </div>
        <hr className="text-secondary mt-0" />

        <nav className="nav flex-column">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={onClose}
            >
              <i className={`bi ${item.icon}`}></i>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
