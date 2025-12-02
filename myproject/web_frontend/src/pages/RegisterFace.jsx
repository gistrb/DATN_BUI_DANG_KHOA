import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { registerFace } from '../services/api';
import axios from 'axios';

const RegisterFace = () => {
    const webcamRef = useRef(null);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [captures, setCaptures] = useState([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const REQUIRED_CAPTURES = 20;
    const CAPTURE_INTERVAL = 500;

    // Check if user is admin
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/admin/login');
            return;
        }
        const user = JSON.parse(storedUser);
        if (user.username !== 'admin' && !user.is_staff) {
            alert('Chỉ admin mới có quyền truy cập trang này');
            navigate('/');
        }
    }, [navigate]);

    // Fetch employees
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/employees/');
                setEmployees(response.data.employees || []);
            } catch (error) {
                console.error('Error fetching employees:', error);
            }
        };
        fetchEmployees();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const startCapturing = useCallback(() => {
        if (!selectedEmployee) {
            setMessage({ type: 'error', text: 'Vui lòng chọn nhân viên' });
            return;
        }

        setIsCapturing(true);
        setCaptures([]);
        setMessage({ type: 'info', text: 'Đang thu thập mẫu khuôn mặt...' });

        let count = 0;
        const interval = setInterval(() => {
            if (count >= REQUIRED_CAPTURES) {
                clearInterval(interval);
                setIsCapturing(false);
                handleRegister();
                return;
            }

            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                setCaptures(prev => [...prev, imageSrc]);
                count++;
            }
        }, CAPTURE_INTERVAL);
    }, [selectedEmployee]);

    const handleRegister = async () => {
        setLoading(true);
        setMessage({ type: 'info', text: 'Đang xử lý...' });

        try {
            const data = await registerFace(selectedEmployee, captures);
            if (data.success) {
                setMessage({
                    type: 'success',
                    text: `Đăng ký thành công cho ${data.employee.name}! Đã lưu ${data.samples_count} mẫu.`
                });
                setCaptures([]);
                setSelectedEmployee('');
                setTimeout(() => window.location.reload(), 3000);
            } else {
                setMessage({ type: 'error', text: data.error || 'Đăng ký thất bại' });
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.error || error.details || 'Đã xảy ra lỗi khi đăng ký'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-10">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Đăng ký khuôn mặt nhân viên</h1>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        Logout
                    </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="mb-6">
                        <label className="block text-gray-700 font-bold mb-2">Chọn nhân viên:</label>
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isCapturing || loading}
                        >
                            <option value="">-- Chọn nhân viên --</option>
                            {employees.map((emp) => (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                    {emp.full_name} ({emp.employee_id})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-6">
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="w-full h-full object-cover"
                            videoConstraints={{
                                width: 1280,
                                height: 720,
                                facingMode: "user"
                            }}
                        />
                    </div>

                    <div className="mb-6">
                        <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full flex items-center justify-center text-white text-sm font-bold transition-all duration-300"
                                style={{ width: `${(captures.length / REQUIRED_CAPTURES) * 100}%` }}
                            >
                                {captures.length}/{REQUIRED_CAPTURES}
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 mb-4 rounded text-center font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700' :
                                message.type === 'error' ? 'bg-red-100 text-red-700' :
                                    'bg-blue-100 text-blue-700'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <div className="text-center">
                        <button
                            onClick={startCapturing}
                            disabled={!selectedEmployee || isCapturing || loading}
                            className={`px-8 py-3 rounded-full font-bold text-white text-lg ${!selectedEmployee || isCapturing || loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {isCapturing ? 'Đang thu thập...' : loading ? 'Đang xử lý...' : 'Bắt đầu thu thập'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterFace;
