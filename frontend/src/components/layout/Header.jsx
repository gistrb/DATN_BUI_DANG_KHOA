import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { Button } from '../common';

const Header = ({
  title,
  showBackButton = false,
  backTo = '/',
  rightContent,
  className = '',
}) => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={`bg-white shadow ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <button
              onClick={() => navigate(backTo)}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Quay lại
            </button>
          )}
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {rightContent}
          
          {user && (
            <>
              {isAdmin() && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/admin/register-face')}
                >
                  Đăng ký khuôn mặt
                </Button>
              )}
              <Button
                variant="danger"
                onClick={handleLogout}
              >
                Đăng xuất
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
