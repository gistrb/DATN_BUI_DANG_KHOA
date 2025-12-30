import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { processAttendance } from '../services/api';

const FaceCheck = () => {
  const webcamRef = useRef(null);
  const faceDetectorRef = useRef(null);
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

  useEffect(() => {
    const initFaceDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "CPU"
          },
          runningMode: "VIDEO"
        });

        faceDetectorRef.current = detector;
        setModelLoaded(true);
        setStatus('Đưa khuôn mặt vào khung');
      } catch (error) {
        console.error('Failed to load face detector:', error);
        setStatus('Lỗi tải model. Vui lòng refresh trang.');
      }
    };

    initFaceDetector();

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
                  
                  if (!inOval) {
                    setCountdown(0);
                  }
                } else {
                  setFaceDetected(false);
                  setFaceInOval(false);
                  setCountdown(0);
                }
              } else {
                setFaceDetected(false);
                setFaceInOval(false);
                setCountdown(0);
              }
            } catch (error) {
              // Silent fail
            }
          }
        }
      }
      timeoutId = setTimeout(detectFace, 200);
    };

    detectFace();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [modelLoaded, isFaceInOval]);

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

  useEffect(() => {
    if (result || cooldown > 0) return;

    if (faceDetected && faceInOval && !loading && countdown < 2) {
      setStatus(`Giữ yên... (${(2 - countdown).toFixed(1)}s)`);
      countdownRef.current = setTimeout(() => {
        setCountdown(prev => prev + 0.1);
      }, 100);
    } else if (faceDetected && faceInOval && countdown >= 2 && !loading) {
      handleAutoCapture();
    } else if (faceDetected && !faceInOval && !loading) {
      setStatus('Di chuyển khuôn mặt vào khung oval');
    } else if (!faceDetected && !loading) {
      setStatus('Đưa khuôn mặt vào khung');
    }

    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [faceDetected, faceInOval, countdown, loading, cooldown, result]);

  const handleAutoCapture = async () => {
    if (isProcessingRef.current || loading) return;
    
    isProcessingRef.current = true;
    setLoading(true);
    setStatus('Đang xử lý...');
    
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
    if (faceInOval) return "#198754";
    if (faceDetected) return "#ffc107";
    return "rgba(255,255,255,0.6)";
  };

  const getStatusBg = () => {
    if (loading) return 'bg-primary';
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
              filter: faceInOval 
                ? "drop-shadow(0 0 15px #198754)" 
                : faceDetected 
                  ? "drop-shadow(0 0 10px #ffc107)" 
                  : "none",
              transition: "all 0.2s ease"
            }}
          />
          
          {faceInOval && countdown > 0 && (
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
        </svg>
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
        
        {modelLoaded && !faceDetected && !loading && (
          <p className="text-white-50 small mt-3">
            Đặt khuôn mặt vào khung và giữ yên trong 2 giây
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
