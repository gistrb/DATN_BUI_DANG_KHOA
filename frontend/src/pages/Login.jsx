import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import Swal from 'sweetalert2';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, logout, user } = useAuth();

  // Redirect if already logged in as admin
  useEffect(() => {
    if (user) {
      if (user.is_staff || user.is_superuser) {
        navigate('/admin/dashboard');
      } else {
        // Clear non-admin user and stay on login page
        logout();
      }
    }
  }, [user, navigate, logout]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        const userData = result.user;
        
        // Only allow admin/staff to login on web
        if (!userData.is_staff && !userData.is_superuser) {
          logout(); // Clear the session
          Swal.fire({
            title: 'Không có quyền truy cập',
            text: 'Tài khoản nhân viên chỉ được sử dụng trên ứng dụng di động',
            icon: 'warning',
            confirmButtonText: 'Đóng'
          });
          return;
        }
        
        await Swal.fire({
          title: 'Đăng nhập thành công!',
          text: `Chào mừng ${userData.full_name || userData.username}`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });

        navigate('/admin/dashboard');
      } else {
        Swal.fire({
          title: 'Đăng nhập thất bại',
          text: result.message || 'Tên đăng nhập hoặc mật khẩu không đúng',
          icon: 'error',
          confirmButtonText: 'Thử lại'
        });
      }
    } catch (err) {
      Swal.fire({
        title: 'Lỗi',
        text: err.message || 'Đã xảy ra lỗi khi đăng nhập',
        icon: 'error',
        confirmButtonText: 'Đóng'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">
                  <i className="bi bi-person-lock me-2"></i>
                  Đăng nhập
                </h4>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleLogin}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                      Tên đăng nhập
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      disabled={loading}
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="password" className="form-label">
                      Mật khẩu
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                    />
                  </div>
                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Đang đăng nhập...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-box-arrow-in-right me-2"></i>
                          Đăng nhập
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
              <div className="card-footer text-center bg-light">
                <button
                  className="btn btn-link text-decoration-none"
                  onClick={() => navigate('/face-check')}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Quay lại trang chấm công
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
