import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { FaceDetector, FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { processAttendance } from '../services/api';

const FaceCheck = () => {
  const webcamRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [status, setStatus] = useState('Đang tải model...');
  const [modelLoaded, setModelLoaded] = useState(false);
  const navigate = useNavigate();
  
  const countdownRef = useRef(null);
  const isProcessingRef = useRef(false);
  const [cooldown, setCooldown] = useState(0);

  // Blink detection states
  const [blinkPhase, setBlinkPhase] = useState('waiting'); // 'waiting' | 'detecting' | 'confirmed'
  const [blinkCountdown, setBlinkCountdown] = useState(0);
  const prevEarRef = useRef(null);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const eyeClosedRef = useRef(false);

  // Eye Aspect Ratio threshold - lower = more sensitive
  const EAR_THRESHOLD = 0.25;
  const EAR_OPEN_THRESHOLD = 0.28;

  // MediaPipe Face Landmarker - correct eye landmark indices
  // Left eye: upper eyelid (159, 145), lower eyelid (153, 144), corners (33, 133)
  // Right eye: upper eyelid (386, 374), lower eyelid (380, 373), corners (362, 263)
  // Using vertical points for EAR calculation
  const LEFT_EYE_TOP = [159, 158, 157];
  const LEFT_EYE_BOTTOM = [145, 153, 144];
  const LEFT_EYE_LEFT = 33;
  const LEFT_EYE_RIGHT = 133;
  
  const RIGHT_EYE_TOP = [386, 385, 384];
  const RIGHT_EYE_BOTTOM = [374, 380, 373];
  const RIGHT_EYE_LEFT = 362;
  const RIGHT_EYE_RIGHT = 263;

  const calculateEAR = useCallback((landmarks, eyeTop, eyeBottom, eyeLeft, eyeRight) => {
    // EAR = (vertical distances) / (horizontal distance)
    // Using average of multiple vertical points for stability
    const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

    // Calculate average vertical distance
    let verticalSum = 0;
    for (let i = 0; i < eyeTop.length; i++) {
      verticalSum += dist(landmarks[eyeTop[i]], landmarks[eyeBottom[i]]);
    }
    const avgVertical = verticalSum / eyeTop.length;
    
    // Horizontal distance
    const horizontal = dist(landmarks[eyeLeft], landmarks[eyeRight]);

    if (horizontal === 0) return 0;
    return avgVertical / horizontal;
  }, []);

  useEffect(() => {
    const initModels = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        // Initialize Face Detector
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "CPU"
          },
          runningMode: "VIDEO"
        });

        // Initialize Face Landmarker for blink detection
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numFaces: 1
        });

        faceDetectorRef.current = detector;
        faceLandmarkerRef.current = landmarker;
        setModelLoaded(true);
        setStatus('Đưa khuôn mặt vào khung');
      } catch (error) {
        console.error('Failed to load models:', error);
        setStatus('Lỗi tải model. Vui lòng refresh trang.');
      }
    };

    initModels();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const ovalParams = {
    centerXRatio: 0.5,
    centerYRatio: 0.45,
    radiusXRatio: 0.35,
    radiusYRatio: 0.56,
  };

  const isFaceInOval = useCallback((bbox, videoWidth, videoHeight) => {
    const margin = 10;
    const isFaceFullyInFrame = 
      bbox.originX >= margin &&
      bbox.originY >= margin &&
      (bbox.originX + bbox.width) <= (videoWidth - margin) &&
      (bbox.originY + bbox.height) <= (videoHeight - margin);

    if (!isFaceFullyInFrame) {
      return false;
    }

    const faceCenterX = bbox.originX + bbox.width / 2;
    const faceCenterY = bbox.originY + bbox.height / 2;

    const ovalCenterX = videoWidth * ovalParams.centerXRatio;
    const ovalCenterY = videoHeight * ovalParams.centerYRatio;
    const ovalRadiusX = videoWidth * ovalParams.radiusXRatio;
    const ovalRadiusY = videoHeight * ovalParams.radiusYRatio;

    const normalizedX = (faceCenterX - ovalCenterX) / ovalRadiusX;
    const normalizedY = (faceCenterY - ovalCenterY) / ovalRadiusY;
    const distanceFromCenter = normalizedX * normalizedX + normalizedY * normalizedY;

    const isInsideOval = distanceFromCenter < 0.8;

    const corners = [
      { x: bbox.originX, y: bbox.originY },
      { x: bbox.originX + bbox.width, y: bbox.originY },
      { x: bbox.originX, y: bbox.originY + bbox.height },
      { x: bbox.originX + bbox.width, y: bbox.originY + bbox.height },
    ];

    let cornersInside = 0;
    for (const corner of corners) {
      const nx = (corner.x - ovalCenterX) / ovalRadiusX;
      const ny = (corner.y - ovalCenterY) / ovalRadiusY;
      if (nx * nx + ny * ny < 1.1) {
        cornersInside++;
      }
    }

    return isInsideOval && cornersInside >= 3;
  }, []);

  const [faceInOval, setFaceInOval] = useState(false);

  // Blink detection function
  const detectBlink = useCallback((video) => {
    if (!faceLandmarkerRef.current) return;

    try {
      const result = faceLandmarkerRef.current.detectForVideo(video, performance.now());
      
      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];
        
        // Calculate EAR for both eyes using new indices
        const leftEAR = calculateEAR(landmarks, LEFT_EYE_TOP, LEFT_EYE_BOTTOM, LEFT_EYE_LEFT, LEFT_EYE_RIGHT);
        const rightEAR = calculateEAR(landmarks, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT);
        const avgEAR = (leftEAR + rightEAR) / 2;

        // Debug logs
        console.log(`EAR: ${avgEAR.toFixed(3)} | Closed: ${eyeClosedRef.current} | Threshold: ${EAR_THRESHOLD}`);

        // Detect blink: eye closed (EAR < threshold) then opened (EAR > threshold)
        if (avgEAR < EAR_THRESHOLD) {
          if (!eyeClosedRef.current) {
            console.log('👁️ Eye CLOSED detected!');
          }
          eyeClosedRef.current = true;
        } else if (eyeClosedRef.current && avgEAR > EAR_OPEN_THRESHOLD) {
          // Eye was closed and now opened - blink detected
          console.log('✅ BLINK DETECTED!');
          setBlinkDetected(true);  // Use state to trigger re-render
          eyeClosedRef.current = false;
        }

        prevEarRef.current = avgEAR;
      }
    } catch (error) {
      console.error('Blink detection error:', error);
    }
  }, [calculateEAR]);

  useEffect(() => {
    if (!modelLoaded) return;

    let lastVideoTime = -1;
    let timeoutId = null;

    const detectFace = () => {
      if (webcamRef.current && webcamRef.current.video && faceDetectorRef.current) {
        const video = webcamRef.current.video;
        
        if (video.readyState === 4 && !isProcessingRef.current) {
          const currentTime = video.currentTime;
          
          if (currentTime !== lastVideoTime) {
            lastVideoTime = currentTime;
            
            try {
              const detections = faceDetectorRef.current.detectForVideo(video, performance.now());
              
              if (detections.detections && detections.detections.length > 0) {
                const detection = detections.detections[0];
                const bbox = detection.boundingBox;
                
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;
                const faceWidthRatio = bbox.width / videoWidth;
                const faceHeightRatio = bbox.height / videoHeight;
                
                if (faceWidthRatio > 0.15 && faceHeightRatio > 0.15) {
                  setFaceDetected(true);
                  
                  const inOval = isFaceInOval(bbox, videoWidth, videoHeight);
                  setFaceInOval(inOval);
                  
                  // Detect blink when in detecting phase
                  if (blinkPhase === 'detecting') {
                    detectBlink(video);
                  }
                  
                  if (!inOval) {
                    setCountdown(0);
                    setBlinkPhase('waiting');
                    blinkDetectedRef.current = false;
                    eyeClosedRef.current = false;
                  }
                } else {
                  setFaceDetected(false);
                  setFaceInOval(false);
                  setCountdown(0);
                  setBlinkPhase('waiting');
                  blinkDetectedRef.current = false;
                  eyeClosedRef.current = false;
                }
              } else {
                setFaceDetected(false);
                setFaceInOval(false);
                setCountdown(0);
                setBlinkPhase('waiting');
                blinkDetectedRef.current = false;
                eyeClosedRef.current = false;
              }
            } catch (error) {
              // Silent fail
            }
          }
        }
      }
      timeoutId = setTimeout(detectFace, 100); // Faster detection for blink
    };

    detectFace();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [modelLoaded, isFaceInOval, blinkPhase, detectBlink]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(prev => {
          const newValue = prev - 1;
          if (newValue > 0) {
            setStatus(`Chờ ${newValue} giây...`);
          } else {
            setStatus('Đưa khuôn mặt vào khung');
          }
          return newValue;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Main countdown and blink detection logic
  useEffect(() => {
    if (result || cooldown > 0) return;

    if (blinkPhase === 'waiting') {
      // Phase 1: Wait for face in oval for 2 seconds
      if (faceDetected && faceInOval && !loading && countdown < 2) {
        setStatus(`Giữ yên... (${(2 - countdown).toFixed(1)}s)`);
        countdownRef.current = setTimeout(() => {
          setCountdown(prev => prev + 0.1);
        }, 100);
      } else if (faceDetected && faceInOval && countdown >= 2 && !loading) {
        // Move to blink detection phase
        setBlinkPhase('detecting');
        setStatus('👁️ Hãy chớp mắt!');
        setBlinkDetected(false);
        eyeClosedRef.current = false;
      } else if (faceDetected && !faceInOval && !loading) {
        setStatus('Di chuyển khuôn mặt vào khung oval');
      } else if (!faceDetected && !loading) {
        setStatus('Đưa khuôn mặt vào khung');
      }
    } else if (blinkPhase === 'detecting') {
      // Phase 2: Wait for blink
      if (!faceDetected || !faceInOval) {
        // Face moved out - reset
        setBlinkPhase('waiting');
        setCountdown(0);
        setBlinkDetected(false);
        eyeClosedRef.current = false;
        return;
      }

      if (blinkDetected) {
        // Blink detected - move to confirmed phase
        setBlinkPhase('confirmed');
        setBlinkCountdown(1);
        setStatus('✅ Đã nhận diện! Đang xử lý...');
      }
    } else if (blinkPhase === 'confirmed') {
      // Phase 3: 1 second delay then capture
      if (blinkCountdown > 0) {
        const timer = setTimeout(() => {
          setBlinkCountdown(prev => prev - 0.1);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        // Capture!
        handleAutoCapture();
      }
    }

    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [faceDetected, faceInOval, countdown, loading, cooldown, result, blinkPhase, blinkCountdown, blinkDetected]);

  const handleAutoCapture = async () => {
    if (isProcessingRef.current || loading) return;
    
    isProcessingRef.current = true;
    setLoading(true);
    setStatus('Đang xử lý chấm công...');
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      const data = await processAttendance(imageSrc);
      
      if (data.success) {
        setResult({
          success: true,
          employee: data.employee,
          message: data.message,
          time: data.time || new Date().toLocaleTimeString('vi-VN')
        });
      } else {
        setResult({
          success: false,
          message: data.error
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.error || 'Đã xảy ra lỗi khi chấm công'
      });
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
      setCountdown(0);
      setBlinkPhase('waiting');
      setBlinkCountdown(0);
      setBlinkDetected(false);
      eyeClosedRef.current = false;
      setFaceDetected(false);
      setStatus('');
      
      setTimeout(() => {
        setResult(prev => {
          if (prev) {
            setCooldown(3);
            setStatus('Chờ 3 giây...');
          }
          return null;
        });
      }, 5000);
    }
  };

  const closeResult = () => {
    setResult(null);
    setCooldown(3);
    setStatus('Chờ 3 giây...');
  };

  const progressPercent = (countdown / 2) * 100;

  const getOvalStroke = () => {
    if (blinkPhase === 'detecting') return "#17a2b8"; // Cyan for blink phase
    if (blinkPhase === 'confirmed') return "#28a745"; // Green for confirmed
    if (faceInOval) return "#198754";
    if (faceDetected) return "#ffc107";
    return "rgba(255,255,255,0.6)";
  };

  const getStatusBg = () => {
    if (loading) return 'bg-primary';
    if (blinkPhase === 'detecting') return 'bg-info';
    if (blinkPhase === 'confirmed') return 'bg-success';
    if (faceInOval) return 'bg-success';
    if (faceDetected) return 'bg-warning';
    return 'bg-secondary bg-opacity-50';
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 bg-black">
      {/* Webcam */}
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />

      {/* Overlay with oval cutout */}
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{ pointerEvents: 'none' }}>
        <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id="oval-mask">
              <rect width="100%" height="100%" fill="white"/>
              <ellipse cx="50%" cy="45%" rx="200" ry="270" fill="black"/>
            </mask>
          </defs>
          
          <rect 
            width="100%" 
            height="100%" 
            fill="rgba(0,0,0,0.6)" 
            mask="url(#oval-mask)"
          />
          
          <ellipse 
            cx="50%" 
            cy="45%" 
            rx="200" 
            ry="270" 
            fill="none" 
            stroke={getOvalStroke()}
            strokeWidth={faceDetected ? "4" : "3"}
            style={{
              filter: blinkPhase === 'detecting' 
                ? "drop-shadow(0 0 15px #17a2b8)"
                : blinkPhase === 'confirmed'
                  ? "drop-shadow(0 0 15px #28a745)"
                  : faceInOval 
                    ? "drop-shadow(0 0 15px #198754)" 
                    : faceDetected 
                      ? "drop-shadow(0 0 10px #ffc107)" 
                      : "none",
              transition: "all 0.2s ease"
            }}
          />
          
          {faceInOval && countdown > 0 && blinkPhase === 'waiting' && (
            <ellipse 
              cx="50%" 
              cy="45%" 
              rx="210" 
              ry="280" 
              fill="none" 
              stroke="#198754"
              strokeWidth="6"
              strokeDasharray={`${progressPercent * 15} 1500`}
              strokeLinecap="round"
              style={{
                filter: "drop-shadow(0 0 8px #198754)",
                transition: "stroke-dasharray 0.1s linear"
              }}
            />
          )}

          {/* Blink phase indicator - pulsing ring */}
          {blinkPhase === 'detecting' && (
            <ellipse 
              cx="50%" 
              cy="45%" 
              rx="210" 
              ry="280" 
              fill="none" 
              stroke="#17a2b8"
              strokeWidth="4"
              style={{
                animation: "pulse 1s infinite",
                filter: "drop-shadow(0 0 10px #17a2b8)"
              }}
            />
          )}
        </svg>
        
        {/* Add CSS animation */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>

      {/* Header */}
      <div className="position-absolute top-0 start-0 end-0 p-4 d-flex justify-content-between align-items-center">
        <h1 className="h3 text-white fw-bold mb-0" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          Chấm công khuôn mặt
        </h1>
        <button 
          onClick={() => navigate('/login')}
          className="btn btn-outline-light"
        >
          <i className="bi bi-box-arrow-in-right me-1"></i>
          Admin Login
        </button>
      </div>

      {/* Status indicator */}
      <div className="position-absolute bottom-0 start-0 end-0 d-flex flex-column align-items-center" style={{ marginBottom: '120px' }}>
        <div className={`px-4 py-3 rounded-pill ${getStatusBg()}`}>
          <span className="text-white fs-5 fw-medium">
            {status}
          </span>
        </div>
        
        {!modelLoaded && (
          <div className="mt-3 d-flex align-items-center gap-2">
            <div className="spinner-border spinner-border-sm text-white" role="status"></div>
            <span className="text-white-50">Đang tải model nhận diện...</span>
          </div>
        )}
        
        {modelLoaded && !faceDetected && !loading && blinkPhase === 'waiting' && (
          <p className="text-white-50 small mt-3">
            Đặt khuôn mặt vào khung, giữ yên 2 giây, sau đó chớp mắt
          </p>
        )}

        {blinkPhase === 'detecting' && (
          <p className="text-white small mt-3" style={{ animation: 'pulse 1s infinite' }}>
            Nhìn vào camera và chớp mắt một lần
          </p>
        )}
      </div>

      {/* Result Modal */}
      {result && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
             style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
          <div className={`bg-white rounded-4 shadow-lg p-4 mx-3`} style={{ maxWidth: '400px', width: '100%' }}>
            {result.success ? (
              <div className="text-center">
                <div className="d-flex justify-content-center mb-3">
                  <div className="bg-success text-white rounded-circle p-3">
                    <i className="bi bi-check-lg" style={{ fontSize: '3rem' }}></i>
                  </div>
                </div>

                <h2 className="h4 fw-bold text-success mb-3">{result.message}</h2>

                <div className="bg-light rounded-3 p-3 text-start">
                  <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
                    <span className="text-muted fw-semibold">Nhân viên:</span>
                    <span className="fw-bold">{result.employee?.name}</span>
                  </div>
                  <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
                    <span className="text-muted fw-semibold">Mã NV:</span>
                    <span>{result.employee?.id}</span>
                  </div>
                  <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
                    <span className="text-muted fw-semibold">Phòng ban:</span>
                    <span>{result.employee?.department}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted fw-semibold">Thời gian:</span>
                    <span className="text-primary fw-bold fs-5">{result.time}</span>
                  </div>
                </div>

                <button onClick={closeResult} className="btn btn-success btn-lg w-100 mt-3">
                  Đóng
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="d-flex justify-content-center mb-3">
                  <div className="bg-danger text-white rounded-circle p-3">
                    <i className="bi bi-x-lg" style={{ fontSize: '3rem' }}></i>
                  </div>
                </div>

                <h2 className="h4 fw-bold text-danger mb-3">{result.message}</h2>

                <button onClick={closeResult} className="btn btn-danger btn-lg w-100">
                  Thử lại
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceCheck;
