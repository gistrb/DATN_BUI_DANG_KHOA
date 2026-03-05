import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { deleteFace } from '../services/api';
import api from '../services/api';
import Swal from 'sweetalert2';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { getFaceEmbedding, calculatePose, loadModels } from '../services/faceEmbedding';

const RegisterFace = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
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

  // Liveness detection states
  const [livenessPhase, setLivenessPhase] = useState('idle'); // 'idle' | 'checking' | 'passed'
  const [livenessModelLoaded, setLivenessModelLoaded] = useState(false);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const eyeClosedRef = useRef(false);
  const livenessTimeoutRef = useRef(null);

  // Eye Aspect Ratio thresholds (same as FaceCheck.jsx)
  const EAR_THRESHOLD = 0.25;
  const EAR_OPEN_THRESHOLD = 0.28;

  // MediaPipe Face Landmarker eye landmark indices
  const LEFT_EYE_TOP = [159, 158, 157];
  const LEFT_EYE_BOTTOM = [145, 153, 144];
  const LEFT_EYE_LEFT = 33;
  const LEFT_EYE_RIGHT = 133;
  const RIGHT_EYE_TOP = [386, 385, 384];
  const RIGHT_EYE_BOTTOM = [374, 380, 373];
  const RIGHT_EYE_LEFT = 362;
  const RIGHT_EYE_RIGHT = 263;

  const POSE_STAGES = [
    { pose: 'front', name: '📸 Nhìn thẳng vào camera', required: 1, color: '#0d6efd' },
    { pose: 'left', name: ' Xoay mặt sang phải', required: 1, color: '#198754' },
    { pose: 'right', name: ' Xoay mặt sang trái', required: 1, color: '#198754' },
    { pose: 'up', name: 'Ngẩng đầu lên', required: 1, color: '#fd7e14' },
    { pose: 'down', name: ' Cúi đầu xuống', required: 1, color: '#fd7e14' }
  ];

  const TOTAL_REQUIRED = 5; // 5 ảnh chất lượng cao

  // Helper to map calculated pose to stage pose string
  // calculatePose returns { yaw, pitch, roll } in degrees
  // Note: Observed baseline pitch is ~40° when looking straight
  const detectPoseType = (yaw, pitch) => {
      // Calibrated thresholds based on observed values
      // Baseline pitch appears to be around 40° when looking straight
      const PITCH_BASELINE = 40;
      const adjustedPitch = pitch - PITCH_BASELINE;
      
      const YAW_THRESH = 20;    // For left/right detection
      const PITCH_THRESH = 15;  // For up/down detection
      
      console.log(`[Pose] Yaw: ${yaw.toFixed(1)}° Pitch: ${pitch.toFixed(1)}° (adjusted: ${adjustedPitch.toFixed(1)}°)`);

      // Check for left/right first (yaw)
      if (yaw > YAW_THRESH) return 'right';
      if (yaw < -YAW_THRESH) return 'left';
      
      // Then check for up/down (adjusted pitch)
      if (adjustedPitch > PITCH_THRESH) return 'down';
      if (adjustedPitch < -PITCH_THRESH) return 'up';
      
      // Default to front if within thresholds
      if (Math.abs(yaw) < YAW_THRESH && Math.abs(adjustedPitch) < PITCH_THRESH) {
          return 'front';
      }
      
      return 'front'; // Fallback
  };

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
    loadModels().catch(console.error); // Load TFLite models
  }, []);

  const stateRef = useRef({
    stageIndex: 0,
    stageCaptures: 0,
    totalCaptures: [], // Embeddings now
    duplicateChecked: false,
    isRunning: false
  });

  const selectedEmployeeData = employees.find(e => e.employee_id === selectedEmployee);

  // Initialize FaceLandmarker for liveness detection
  useEffect(() => {
    const initLivenessModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        });
        faceLandmarkerRef.current = landmarker;
        setLivenessModelLoaded(true);
        console.log('[Liveness] FaceLandmarker model loaded');
      } catch (error) {
        console.error('[Liveness] Failed to load model:', error);
      }
    };
    initLivenessModel();

    return () => {
      if (livenessTimeoutRef.current) {
        clearTimeout(livenessTimeoutRef.current);
      }
    };
  }, []);

  // Calculate Eye Aspect Ratio
  const calculateEAR = useCallback((landmarks, eyeTop, eyeBottom, eyeLeft, eyeRight) => {
    const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    let verticalSum = 0;
    for (let i = 0; i < eyeTop.length; i++) {
      verticalSum += dist(landmarks[eyeTop[i]], landmarks[eyeBottom[i]]);
    }
    const avgVertical = verticalSum / eyeTop.length;
    const horizontal = dist(landmarks[eyeLeft], landmarks[eyeRight]);
    if (horizontal === 0) return 0;
    return avgVertical / horizontal;
  }, []);

  // Detect blink from video
  const detectBlink = useCallback((video) => {
    if (!faceLandmarkerRef.current) return false;

    try {
      const result = faceLandmarkerRef.current.detectForVideo(video, performance.now());
      
      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];
        
        const leftEAR = calculateEAR(landmarks, LEFT_EYE_TOP, LEFT_EYE_BOTTOM, LEFT_EYE_LEFT, LEFT_EYE_RIGHT);
        const rightEAR = calculateEAR(landmarks, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT);
        const avgEAR = (leftEAR + rightEAR) / 2;

        // console.log(`[Liveness] EAR: ${avgEAR.toFixed(3)} | Closed: ${eyeClosedRef.current}`);

        if (avgEAR < EAR_THRESHOLD) {
          eyeClosedRef.current = true;
        } else if (eyeClosedRef.current && avgEAR > EAR_OPEN_THRESHOLD) {
          console.log('[Liveness] BLINK DETECTED!');
          eyeClosedRef.current = false;
          return true;
        }
      }
    } catch (error) {
      console.error('[Liveness] Detection error:', error);
    }
    return false;
  }, [calculateEAR, EAR_THRESHOLD, EAR_OPEN_THRESHOLD, LEFT_EYE_TOP, LEFT_EYE_BOTTOM, LEFT_EYE_LEFT, LEFT_EYE_RIGHT, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT]);

  // Start liveness check before capturing
  const startLivenessCheck = useCallback(() => {
    if (!selectedEmployee) {
      setMessage({ type: 'warning', text: 'Vui lòng chọn nhân viên' });
      return;
    }

    if (!livenessModelLoaded) {
      setMessage({ type: 'warning', text: 'Đang tải model nhận diện, vui lòng chờ...' });
      return;
    }

    setLivenessPhase('checking');
    setBlinkDetected(false);
    eyeClosedRef.current = false;
    setMessage({ type: 'info', text: '👁️ Hãy chớp mắt để xác nhận người thật' });
    setPoseFeedback('Nhìn vào camera và chớp mắt một lần');

    const startTime = Date.now();
    const LIVENESS_TIMEOUT = 7000; // 7 giây timeout

    const checkLiveness = () => {
      // Check timeout
      if (Date.now() - startTime > LIVENESS_TIMEOUT) {
        setLivenessPhase('idle');
        setMessage({ type: 'warning', text: '⏰ Hết thời gian! Vui lòng thử lại và chớp mắt trong 15 giây.' });
        setPoseFeedback('');
        return;
      }

      const video = webcamRef.current?.video;
      if (video && video.readyState === 4) {
        const detected = detectBlink(video);
        if (detected) {
          setBlinkDetected(true);
          setLivenessPhase('passed');
          setMessage({ type: 'success', text: '✅ Xác nhận thành công! Bắt đầu thu thập ảnh...' });
          setPoseFeedback('');
          return;
        }
      }
      livenessTimeoutRef.current = setTimeout(checkLiveness, 100);
    };

    checkLiveness();
  }, [selectedEmployee, livenessModelLoaded, detectBlink]);

  // Cleanup liveness check on phase change
  useEffect(() => {
    if (livenessPhase !== 'checking' && livenessTimeoutRef.current) {
      clearTimeout(livenessTimeoutRef.current);
    }
  }, [livenessPhase]);

  // Auto start capturing when liveness passed
  const shouldStartCaptureRef = useRef(false);
  
  useEffect(() => {
    if (livenessPhase === 'passed' && blinkDetected && !isCapturing) {
      shouldStartCaptureRef.current = true;
      // Delay to show success message
      const timer = setTimeout(() => {
        if (shouldStartCaptureRef.current) {
          setLivenessPhase('idle');
          setBlinkDetected(false);
          
          // Trigger capturing
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
        }
      }, 500);
      return () => {
        clearTimeout(timer);
        shouldStartCaptureRef.current = false;
      };
    }
  }, [livenessPhase, blinkDetected, isCapturing]);

  // Run frame processing when capturing starts
  useEffect(() => {
    if (!isCapturing || !stateRef.current.isRunning) return;

    const processFrame = async () => {
      if (!stateRef.current.isRunning) return;

      const { stageIndex } = stateRef.current;

      if (stageIndex >= POSE_STAGES.length) {
        stateRef.current.isRunning = false;
        setIsCapturing(false);
        handleRegisterWithCaptures(stateRef.current.totalCaptures);
        return;
      }

      // Instead of getting screenshot, we work with video for landmarks
      const video = webcamRef.current?.video;
      
      if (video && video.readyState === 4 && faceLandmarkerRef.current) {
        try {
             // 1. Get Landmarks Locally
             const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
             
             if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                 const landmarks = results.faceLandmarks[0];
                 const { yaw, pitch } = calculatePose(landmarks);
                 
                 const currentStage = POSE_STAGES[stageIndex];
                 
                 // Determine pose
                 let detectedPose = 'front';
                 // Map yaw/pitch to 'front', 'left', 'right', 'up', 'down'
                 // Logic: 
                 // Yaw < -15 => Left (assuming self-view mirror: move head left -> nose moves left -> negative x diff? depends on calc)
                 // Let's rely on visual feedback loop or standard assumptions.
                 // In calculatePose: yaw = (nose.x - eyesCenter.x) ...
                 // If I look Left (turn head left), my nose moves left on the screen (if mirrored).
                 // nose.x decreases. eyesCenter also shifts.
                 // Actually, let's use the explicit logic from before or just generic logic:
                 
                 // Calibration check: 
                 // Yaw +ve = Right, -ve = Left?
                 // Pitch +ve = Down, -ve = Up?
                 detectedPose = detectPoseType(yaw, pitch);

                 if (detectedPose === currentStage.pose) {
                      // 2. Extract Embedding with Face Alignment
                      const embedding = await getFaceEmbedding(video, landmarks);
                      
                      stateRef.current.totalCaptures.push(embedding);
                      stateRef.current.stageCaptures++;

                      const newStageCaptures = stateRef.current.stageCaptures;
                      setAllCaptures(prev => [...prev, {}]); // Just update length for UI
                      setCurrentStageCaptures(newStageCaptures);
                      setPoseFeedback(`✅ Đúng! (${newStageCaptures}/${currentStage.required})`);
                      
                      if (newStageCaptures >= currentStage.required) {
                           // Duplicate Check on first capture (FRONT)
                           if (currentStage.pose === 'front' && !stateRef.current.duplicateChecked) {
                               stateRef.current.duplicateChecked = true;
                               setPoseFeedback('🔍 Đang kiểm tra trùng lặp...');
                               
                               try {
                                   const checkResponse = await api.post('/check-duplicate/', {
                                       embedding: embedding
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
                                      text: error.response?.data?.message || 'Lỗi kiểm tra hợp lệ'
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
          console.error('Error processing frame:', error);
          setPoseFeedback('❌ Lỗi xử lý');
        }
      }

      if (stateRef.current.isRunning) {
        // Slow down slightly to allow TFLite inference to breathe?
        // 500ms is safe.
        setTimeout(processFrame, 500);
      }
    };

    processFrame();
  }, [isCapturing]);


  const handleRegisterWithCaptures = async (embeddings) => {
    setLoading(true);
    setMessage({ type: 'info', text: 'Đang xử lý...' });

    try {
      // Send embeddings instead of images
      const data = await api.post('/register-face/', {
          employee_id: selectedEmployee,
          embeddings: embeddings
      });
      
      if (data.data.success) {
        Swal.fire({
          title: 'Thành công!',
          text: `Đăng ký thành công cho ${data.data.employee.name}!`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        setAllCaptures([]);
        setSelectedEmployee('');
        setMessage(null);
        fetchEmployees(); // Refresh list to update status
      } else {
        setMessage({ type: 'danger', text: data.data.error || 'Đăng ký thất bại' });
      }
    } catch (error) {
      console.error('FAILED TO REGISTER:', error);
      const errorData = error.response?.data || error;
      setMessage({
        type: 'danger',
        text: errorData.error || errorData.details || errorData.message || 'Đã xảy ra lỗi khi đăng ký'
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
                  disabled={isCapturing || loading || livenessPhase === 'checking'}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.has_face ? '✅ ' : '⚪ '}{emp.full_name} {emp.has_face ? '- Đã đăng ký' : '- Chưa đăng ký'}
                    </option>
                  ))}
                </select>
                {selectedEmployee && (
                  <small className={`form-text ${selectedEmployeeData?.has_face ? 'text-success' : 'text-warning'}`}>
                    {selectedEmployeeData?.has_face 
                      ? '✅ Nhân viên này đã có dữ liệu khuôn mặt' 
                      : '⚠️ Nhân viên này chưa đăng ký khuôn mặt'}
                  </small>
                )}
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

                  {/* Liveness check feedback */}
                  {livenessPhase === 'checking' && (
                    <div className="text-center mb-3">
                      <div className="alert alert-info d-flex align-items-center justify-content-center">
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        <span>👁️ Nhìn vào camera và chớp mắt...</span>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="text-center">
                    <button
                      className={`btn btn-lg ${livenessPhase === 'checking' ? 'btn-info' : 'btn-primary'}`}
                      onClick={startLivenessCheck}
                      disabled={!selectedEmployee || isCapturing || loading || livenessPhase === 'checking' || !livenessModelLoaded}
                    >
                      {!livenessModelLoaded ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Đang tải model...
                        </>
                      ) : livenessPhase === 'checking' ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Đang kiểm tra liveness...
                        </>
                      ) : isCapturing ? (
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
                      <li>Xoay phải (1 ảnh)</li>
                      <li>Xoay trái (1 ảnh)</li>
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
