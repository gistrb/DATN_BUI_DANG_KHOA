import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { Input, Button, Alert, PageContainer } from '../components';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        const user = result.user;
        const isAdmin = user.username === 'admin' || user.is_superuser || user.is_staff;

        if (isAdmin) {
          navigate('/admin/register-face');
        } else {
          setError('Chỉ admin mới có quyền truy cập');
        }
      } else {
        setError(result.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer centered maxWidth="md">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Admin Login</h2>
        <p className="text-gray-600 text-sm text-center mb-4">
          Đăng nhập để quản lý đăng ký khuôn mặt
        </p>
        
        {error && (
          <Alert type="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleLogin}>
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
            disabled={loading}
          >
            Login as Admin
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Quay lại trang chấm công
          </button>
        </div>
      </div>
    </PageContainer>
  );
};

export default Login;
