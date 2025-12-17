import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { registerFace } from '../services/api';
import api from '../services/api';

const RegisterFace = () => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [allCaptures, setAllCaptures] = useState([]);
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [currentStageCaptures, setCurrentStageCaptures] = useState(0);
    const [isCapturing, setIsCapturing] = useState(false);
    const [message, setMessage] = useState('');
    const [poseFeedback, setPoseFeedback] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
    const navigate = useNavigate();

    const POSE_STAGES = [
        { pose: 'front', name: '📸 Nhìn thẳng vào camera', required: 5, color: '#0d6efd' },
        { pose: 'left', name: '↪️ Xoay mặt sang TRÁI nhẹ', required: 5, color: '#198754' },
        { pose: 'right', name: '↩️ Xoay mặt sang PHẢI nhẹ', required: 5, color: '#198754' },
        { pose: 'up', name: '⬆️ Ngẩng đầu lên nhẹ', required: 3, color: '#fd7e14' },
        { pose: 'down', name: '⬇️ Cúi đầu xuống nhẹ', required: 2, color: '#fd7e14' }
    ];

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
                const response = await api.get('/api/employees/');
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

    // Use refs for mutable state in async loop to avoid stale closures and race conditions
    const stateRef = useRef({
        stageIndex: 0,
        stageCaptures: 0,
        totalCaptures: [],
        duplicateChecked: false,
        isRunning: false
    });

    const startCapturing = useCallback(() => {
        if (!selectedEmployee) {
            setMessage({ type: 'error', text: 'Vui lòng chọn nhân viên' });
            return;
        }

        setIsCapturing(true);
        setAllCaptures([]);
        setCurrentStageIndex(0);
        setCurrentStageCaptures(0);
        setIsDuplicateChecking(false);
        setMessage({ type: 'info', text: 'Đang bắt đầu thu thập...' });

        // Reset state ref
        stateRef.current = {
            stageIndex: 0,
            stageCaptures: 0,
            totalCaptures: [],
            duplicateChecked: false,
            isRunning: true
        };

        const processFrame = async () => {
            // Check if user stopped
            if (!stateRef.current.isRunning) return;

            const { stageIndex, stageCaptures } = stateRef.current;

            // Check if done
            if (stageIndex >= POSE_STAGES.length) {
                stateRef.current.isRunning = false;
                setIsCapturing(false);
                handleRegisterWithCaptures(stateRef.current.totalCaptures);
                return;
            }

            const imageSrc = webcamRef.current?.getScreenshot();

            if (imageSrc) {
                try {
                    // Check pose
                    const poseResponse = await api.post('/check-pose/', {
                        image: imageSrc
                    });

                    const poseData = poseResponse.data;

                    if (poseData.success) {
                        const currentStage = POSE_STAGES[stageIndex];
                        const detectedPose = poseData.pose_type;

                        if (detectedPose === currentStage.pose) {
                            // Correct pose - capture
                            stateRef.current.totalCaptures.push(imageSrc);
                            stateRef.current.stageCaptures++;

                            const newStageCaptures = stateRef.current.stageCaptures;

                            // Update UI
                            setAllCaptures([...stateRef.current.totalCaptures]);
                            setCurrentStageCaptures(newStageCaptures);
                            setPoseFeedback(`✅ Đúng! (${newStageCaptures}/${currentStage.required})`);

                            // Check if stage complete
                            if (newStageCaptures >= currentStage.required) {
                                // Early duplicate check after front stage
                                if (currentStage.pose === 'front' && !stateRef.current.duplicateChecked) {
                                    stateRef.current.duplicateChecked = true;
                                    setPoseFeedback('🔍 Đang kiểm tra trùng lặp...');

                                    try {
                                        const checkResponse = await api.post('/check-duplicate/', {
                                            image: imageSrc
                                        });

                                        if (checkResponse.data.success && checkResponse.data.is_duplicate) {
                                            stateRef.current.isRunning = false;
                                            setIsCapturing(false);
                                            setMessage({
                                                type: 'error',
                                                text: `Khuôn mặt đã tồn tại! Trùng với: ${checkResponse.data.employee_name} (${checkResponse.data.employee_id})`
                                            });
                                            return; // Stop loop
                                        }

                                        setPoseFeedback('✅ Không trùng - tiếp tục!');
                                    } catch (error) {
                                        console.error('Error checking duplicate:', error);
                                    }
                                }

                                // Move to next stage
                                stateRef.current.stageIndex++;
                                stateRef.current.stageCaptures = 0;

                                setCurrentStageIndex(stateRef.current.stageIndex);
                                setCurrentStageCaptures(0);

                                // Delay before next stage
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        } else {
                            setPoseFeedback(`❌ Cần: ${currentStage.name}`);
                        }
                    } else {
                        setPoseFeedback('❌ Không phát hiện khuôn mặt');
                    }
                } catch (error) {
                    console.error('Error checking pose:', error);
                    setPoseFeedback('❌ Lỗi kiểm tra tư thế');
                }
            }

            // Schedule next frame only if still running
            if (stateRef.current.isRunning) {
                setTimeout(processFrame, 500);
            }
        };

        // Start the loop
        processFrame();

    }, [selectedEmployee]);

    const handleRegisterWithCaptures = async (captures) => {
        setLoading(true);
        setMessage({ type: 'info', text: 'Đang xử lý...' });

        try {
            const data = await registerFace(selectedEmployee, captures);
            if (data.success) {
                setMessage({
                    type: 'success',
                    text: `Đăng ký thành công cho ${data.employee.name}! Đã lưu ${data.samples_count} mẫu.`
                });
                setAllCaptures([]);
                setSelectedEmployee('');
                setTimeout(() => window.location.reload(), 3000);
            } else {
                setMessage({ type: 'error', text: data.error || 'Đăng ký thất bại' });
            }
        } catch (error) {
            console.error('FAILED TO REGISTER:', error);
            setMessage({
                type: 'error',
                text: error.error || error.details || error.message || 'Đã xảy ra lỗi khi đăng ký'
            });
        } finally {
            setLoading(false);
            setIsCapturing(false);
        }
    };

    const currentStage = POSE_STAGES[currentStageIndex] || POSE_STAGES[0];

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

                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4">
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
                        <canvas ref={canvasRef} className="absolute top-0 left-0" />
                    </div>

                    {/* Pose Instruction */}
                    {isCapturing && (
                        <div
                            className="p-3 mb-3 rounded text-center text-white text-lg font-bold"
                            style={{ backgroundColor: currentStage.color }}
                        >
                            {currentStage.name} ({currentStageCaptures}/{currentStage.required})
                        </div>
                    )}

                    {/* Pose Feedback */}
                    {poseFeedback && isCapturing && (
                        <div className="text-center mb-3">
                            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded font-semibold">
                                {poseFeedback}
                            </span>
                        </div>
                    )}

                    {/* Current Stage Progress */}
                    <div className="mb-2">
                        <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-300"
                                style={{ width: `${(currentStageCaptures / currentStage.required) * 100}%` }}
                            >
                                {currentStageCaptures > 0 && `${currentStageCaptures}/${currentStage.required}`}
                            </div>
                        </div>
                    </div>

                    {/* Total Progress */}
                    <div className="mb-6">
                        <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                                className="bg-green-600 h-full flex items-center justify-center text-white text-sm font-bold transition-all duration-300"
                                style={{ width: `${(allCaptures.length / 20) * 100}%` }}
                            >
                                {allCaptures.length}/20
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
