import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { registerFace, deleteFace } from '../services/api';
import api from '../services/api';
import Swal from 'sweetalert2';

const RegisterFace = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [allCaptures, setAllCaptures] = useState([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [currentStageCaptures, setCurrentStageCaptures] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [message, setMessage] = useState(null);
  const [poseFeedback, setPoseFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const POSE_STAGES = [
    { pose: 'front', name: '📸 Nhìn thẳng vào camera', required: 1, color: '#0d6efd' },
    { pose: 'left', name: '↪️ Xoay mặt sang trái', required: 1, color: '#198754' },
    { pose: 'right', name: '↩️ Xoay mặt sang phải', required: 1, color: '#198754' },
    { pose: 'up', name: '⬆️ Ngẩng đầu lên', required: 1, color: '#fd7e14' },
    { pose: 'down', name: '⬇️ Cúi đầu xuống', required: 1, color: '#fd7e14' }
  ];

  const TOTAL_REQUIRED = 5; // 5 ảnh chất lượng cao

  useEffect(() => {
    if (!isAdmin()) {
      Swal.fire('Lỗi', 'Chỉ admin mới có quyền truy cập trang này', 'error');
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/employees/');
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const stateRef = useRef({
    stageIndex: 0,
    stageCaptures: 0,
    totalCaptures: [],
    duplicateChecked: false,
    isRunning: false
  });

  const selectedEmployeeData = employees.find(e => e.employee_id === selectedEmployee);

  const startCapturing = useCallback(() => {
    if (!selectedEmployee) {
      setMessage({ type: 'warning', text: 'Vui lòng chọn nhân viên' });
      return;
    }

    setIsCapturing(true);
    setAllCaptures([]);
    setCurrentStageIndex(0);
    setCurrentStageCaptures(0);
    setMessage({ type: 'info', text: 'Đang bắt đầu thu thập...' });

    stateRef.current = {
      stageIndex: 0,
      stageCaptures: 0,
      totalCaptures: [],
      duplicateChecked: false,
      isRunning: true
    };

    const processFrame = async () => {
      if (!stateRef.current.isRunning) return;

      const { stageIndex, stageCaptures } = stateRef.current;

      if (stageIndex >= POSE_STAGES.length) {
        stateRef.current.isRunning = false;
        setIsCapturing(false);
        handleRegisterWithCaptures(stateRef.current.totalCaptures);
        return;
      }

      const imageSrc = webcamRef.current?.getScreenshot();

      if (imageSrc) {
        try {
          const poseResponse = await api.post('/check-pose/', {
            image: imageSrc
          });

          const poseData = poseResponse.data;

          if (poseData.success) {
            const currentStage = POSE_STAGES[stageIndex];
            const detectedPose = poseData.pose_type;

            if (detectedPose === currentStage.pose) {
              stateRef.current.totalCaptures.push(imageSrc);
              stateRef.current.stageCaptures++;

              const newStageCaptures = stateRef.current.stageCaptures;

              setAllCaptures([...stateRef.current.totalCaptures]);
              setCurrentStageCaptures(newStageCaptures);
              setPoseFeedback(`✅ Đúng! (${newStageCaptures}/${currentStage.required})`);

              if (newStageCaptures >= currentStage.required) {
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
                        type: 'danger',
                        text: `Khuôn mặt đã tồn tại! Trùng với: ${checkResponse.data.employee_name} (${checkResponse.data.employee_id})`
                      });
                      return;
                    }

                    setPoseFeedback('✅ Không trùng - tiếp tục!');
                  } catch (error) {
                    console.error('Error checking duplicate:', error);
                    stateRef.current.isRunning = false;
                    setIsCapturing(false);
                    setMessage({
                      type: 'danger',
                      text: error.response?.data?.message || error.response?.data?.error || 'Lỗi kiểm tra hợp lệ'
                    });
                    return;
                  }
                }

                stateRef.current.stageIndex++;
                stateRef.current.stageCaptures = 0;

                setCurrentStageIndex(stateRef.current.stageIndex);
                setCurrentStageCaptures(0);

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

      if (stateRef.current.isRunning) {
        setTimeout(processFrame, 500);
      }
    };

    processFrame();
  }, [selectedEmployee]);

  const handleRegisterWithCaptures = async (captures) => {
    setLoading(true);
    setMessage({ type: 'info', text: 'Đang xử lý...' });

    try {
      const data = await registerFace(selectedEmployee, captures);
      if (data.success) {
        Swal.fire({
          title: 'Thành công!',
          text: `Đăng ký thành công cho ${data.employee.name}!`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        setAllCaptures([]);
        setSelectedEmployee('');
        setMessage(null);
        fetchEmployees(); // Refresh list to update status
      } else {
        setMessage({ type: 'danger', text: data.error || 'Đăng ký thất bại' });
      }
    } catch (error) {
      console.error('FAILED TO REGISTER:', error);
      setMessage({
        type: 'danger',
        text: error.error || error.details || error.message || 'Đã xảy ra lỗi khi đăng ký'
      });
    } finally {
      setLoading(false);
      setIsCapturing(false);
    }
  };

  const handleDeleteFace = async () => {
    const result = await Swal.fire({
      title: 'Xóa dữ liệu khuôn mặt?',
      text: `Bạn có chắc chắn muốn xóa dữ liệu của nhân viên ${selectedEmployeeData?.full_name}? Hành động này không thể hoàn tác.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa dữ liệu',
      cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const response = await deleteFace(selectedEmployee);
        if (response.success) {
          Swal.fire(
            'Đã xóa!',
            'Dữ liệu khuôn mặt đã được xóa.',
            'success'
          );
          fetchEmployees(); // Refresh list
          setSelectedEmployee(''); // Reset selection
        }
      } catch (error) {
        Swal.fire('Lỗi', error.message || 'Không thể xóa dữ liệu', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const currentStage = POSE_STAGES[currentStageIndex] || POSE_STAGES[0];

  return (
    <div>
      <h2 className="mb-4">
        <i className="bi bi-person-bounding-box me-2"></i>
        Quản lý khuôn mặt
      </h2>

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className={`card-header text-white ${selectedEmployeeData?.has_face ? 'bg-primary' : 'bg-warning text-dark'}`}>
              <h5 className="mb-0">
                <i className={`bi ${selectedEmployeeData?.has_face ? 'bi-hdd-network' : 'bi-camera-video'} me-2`}></i>
                {selectedEmployeeData?.has_face ? 'Quản lý dữ liệu' : 'Thu thập khuôn mặt'}
              </h5>
            </div>
            <div className="card-body">
              {/* Employee Selection */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Chọn nhân viên:</label>
                <select
                  className="form-select"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  disabled={isCapturing || loading}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.has_face ? '✓ ' : '⚪ '} 
                      {emp.full_name} ({emp.employee_id}) 
                      {emp.has_face ? ' [Đã đăng ký]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmployeeData?.has_face ? (
                // DELETE INTERFACE
                <div className="text-center py-5">
                  <div className="mb-4">
                    <i className="bi bi-person-check-fill text-success" style={{ fontSize: '4rem' }}></i>
                    <h4 className="mt-3">Nhân viên đã đăng ký khuôn mặt</h4>
                    <p className="text-muted">Dữ liệu khuôn mặt đã sẵn sàng để chấm công.</p>
                  </div>
                  
                  <div className="alert alert-warning d-inline-block text-start" style={{ maxWidth: '500px' }}>
                    <strong><i className="bi bi-exclamation-triangle me-2"></i>Lưu ý:</strong>
                    Nếu nhân viên thay đổi ngoại hình đáng kể hoặc gặp khó khăn khi chấm công, bạn có thể xóa dữ liệu cũ và đăng ký lại.
                  </div>

                  <div className="mt-4">
                    <button 
                      className="btn btn-danger btn-lg me-3"
                      onClick={handleDeleteFace}
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="spinner-border spinner-border-sm me-2"></div>
                      ) : (
                        <i className="bi bi-trash me-2"></i>
                      )}
                      Xóa dữ liệu khuôn mặt
                    </button>
                    
                    {/* Optional: Allow re-register immediately? Maybe better to force delete first for safety */}
                  </div>
                </div>
              ) : (
                // REGISTER INTERFACE
                <>
                  {/* Webcam */}
                  <div className="position-relative bg-black rounded overflow-hidden mb-3" style={{ aspectRatio: '16/9' }}>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                      videoConstraints={{
                        facingMode: "user",
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                      }}
                    />
                    <canvas ref={canvasRef} className="position-absolute top-0 start-0" />
                  </div>

                  {/* Current Stage Indicator */}
                  {isCapturing && (
                    <div
                      className="p-3 mb-3 rounded text-center text-white fw-bold fs-5"
                      style={{ backgroundColor: currentStage.color }}
                    >
                      {currentStage.name} ({currentStageCaptures}/{currentStage.required})
                    </div>
                  )}

                  {/* Pose Feedback */}
                  {poseFeedback && isCapturing && (
                    <div className="text-center mb-3">
                      <span className="badge bg-primary fs-6 px-3 py-2">
                        {poseFeedback}
                      </span>
                    </div>
                  )}

                  {/* Stage Progress */}
                  <div className="mb-2">
                    <div className="progress" style={{ height: '20px' }}>
                      <div
                        className="progress-bar bg-primary progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        style={{ width: `${(currentStageCaptures / currentStage.required) * 100}%` }}
                      >
                        {currentStageCaptures > 0 && `${currentStageCaptures}/${currentStage.required}`}
                      </div>
                    </div>
                  </div>

                  {/* Total Progress */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-1">
                      <small>Tổng tiến độ</small>
                      <small>{allCaptures.length}/{TOTAL_REQUIRED} ảnh</small>
                    </div>
                    <div className="progress" style={{ height: '25px' }}>
                      <div
                        className="progress-bar bg-success"
                        role="progressbar"
                        style={{ width: `${(allCaptures.length / TOTAL_REQUIRED) * 100}%` }}
                      >
                        {allCaptures.length}/{TOTAL_REQUIRED}
                      </div>
                    </div>
                  </div>

                  {/* Message Alert */}
                  {message && (
                    <div className={`alert alert-${message.type} mb-3`} role="alert">
                      {message.text}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="text-center">
                    <button
                      className="btn btn-lg btn-primary"
                      onClick={startCapturing}
                      disabled={!selectedEmployee || isCapturing || loading}
                    >
                      {isCapturing ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Đang thu thập...
                        </>
                      ) : loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-camera me-2"></i>
                          Bắt đầu thu thập
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Hướng dẫn
              </h5>
            </div>
            <div className="card-body">
              {selectedEmployeeData?.has_face ? (
                 <div>
                   <p><strong>Xóa dữ liệu:</strong></p>
                   <ul className="mb-0">
                     <li>Sử dụng khi nhân viên nghỉ việc hoặc cần đăng ký lại.</li>
                     <li>Dữ liệu sau khi xóa sẽ không thể phục hồi.</li>
                     <li>Nhân viên sẽ không thể chấm công cho đến khi đăng ký lại.</li>
                   </ul>
                 </div>
              ) : (
                <ol className="mb-0">
                  <li className="mb-2">Chọn nhân viên từ danh sách</li>
                  <li className="mb-2">Nhấn "Bắt đầu thu thập"</li>
                  <li className="mb-2">Làm theo hướng dẫn tư thế:
                    <ul className="mt-1">
                      <li>Nhìn thẳng (1 ảnh)</li>
                      <li>Xoay trái (1 ảnh)</li>
                      <li>Xoay phải (1 ảnh)</li>
                      <li>Ngẩng lên (1 ảnh)</li>
                      <li>Cúi xuống (1 ảnh)</li>
                    </ul>
                  </li>
                  <li className="mb-2">Hệ thống tự động lưu khi đủ ảnh</li>
                </ol>
              )}
            </div>
          </div>

          {/* Stage Progress List - Only show when registering */}
          {!selectedEmployeeData?.has_face && (
            <div className="card mt-3">
              <div className="card-header bg-secondary text-white">
                <h6 className="mb-0">Các giai đoạn</h6>
              </div>
              <ul className="list-group list-group-flush">
                {POSE_STAGES.map((stage, index) => (
                  <li 
                    key={stage.pose} 
                    className={`list-group-item d-flex justify-content-between align-items-center ${
                      index < currentStageIndex ? 'list-group-item-success' :
                      index === currentStageIndex ? 'list-group-item-primary' : ''
                    }`}
                  >
                    <span>{stage.name}</span>
                    <span className="badge bg-secondary">{stage.required}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterFace;
