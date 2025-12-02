import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await login(username, password);
            if (data.success) {
                // Store user info correctly (data.user is already an object)
                localStorage.setItem('user', JSON.stringify(data.user));

                // Check if user is superuser (admin)
                // Note: Django admin check should use is_superuser or check username
                const user = data.user;
                const isAdmin = user.username === 'admin' || user.is_superuser || user.is_staff;

                if (isAdmin) {
                    navigate('/admin/register-face');
                } else {
                    setError('Chỉ admin mới có quyền truy cập');
                }
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError(err.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Admin Login</h2>
                <p className="text-gray-600 text-sm text-center mb-4">Đăng nhập để quản lý đăng ký khuôn mặt</p>
                {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition duration-200"
                    >
                        Login as Admin
                    </button>
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
        </div>
    );
};

export default Login;
