import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { processAttendance } from '../services/api';
import { Button } from '../components';

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

  // Initialize MediaPipe Face Detector
  useEffect(() => {
    const initFaceDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU"
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

  // Detection loop
  useEffect(() => {
    if (!modelLoaded) return;

    let lastVideoTime = -1;

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
                
                // Check if face is reasonably sized
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;
                const faceWidthRatio = bbox.width / videoWidth;
                const faceHeightRatio = bbox.height / videoHeight;
                
                if (faceWidthRatio > 0.15 && faceHeightRatio > 0.15) {
                  setFaceDetected(true);
                } else {
                  setFaceDetected(false);
                  setCountdown(0);
                }
              } else {
                setFaceDetected(false);
                setCountdown(0);
              }
            } catch (error) {
              // Silent fail
            }
          }
        }
      }
      animationRef.current = requestAnimationFrame(detectFace);
    };

    detectFace();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [modelLoaded]);

  // Handle countdown and auto-capture
  useEffect(() => {
    if (faceDetected && !loading && countdown < 2) {
      setStatus(`Giữ yên... (${(2 - countdown).toFixed(1)}s)`);
      countdownRef.current = setTimeout(() => {
        setCountdown(prev => prev + 0.1);
      }, 100);
    } else if (faceDetected && countdown >= 2 && !loading) {
      handleAutoCapture();
    } else if (!faceDetected && !loading) {
      setStatus('Đưa khuôn mặt vào khung');
    }

    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [faceDetected, countdown, loading]);

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
      setStatus('Đưa khuôn mặt vào khung');
      
      setTimeout(() => {
        setResult(null);
      }, 5000);
    }
  };

  const closeResult = () => {
    setResult(null);
  };

  const progressPercent = (countdown / 2) * 100;

  return (
    <div className="fixed inset-0 bg-black">
      {/* Webcam fullscreen */}
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        className="w-full h-full object-contain"
        videoConstraints={{ 
          facingMode: "user",
          width: 640,
          height: 480
        }}
      />

      {/* Overlay with oval cutout */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id="oval-mask">
              <rect width="100%" height="100%" fill="white"/>
              <ellipse cx="50%" cy="45%" rx="200" ry="270" fill="black"/>
            </mask>
          </defs>
          
          {/* Dark overlay with oval hole */}
          <rect 
            width="100%" 
            height="100%" 
            fill="rgba(0,0,0,0.6)" 
            mask="url(#oval-mask)"
          />
          
          {/* Oval border - glows green when face detected */}
          <ellipse 
            cx="50%" 
            cy="45%" 
            rx="200" 
            ry="270" 
            fill="none" 
            stroke={faceDetected ? "#22c55e" : "rgba(255,255,255,0.6)"}
            strokeWidth={faceDetected ? "4" : "3"}
            style={{
              filter: faceDetected ? "drop-shadow(0 0 15px #22c55e) drop-shadow(0 0 30px #22c55e)" : "none",
              transition: "all 0.2s ease"
            }}
          />
          
          {/* Progress ring when face detected */}
          {faceDetected && countdown > 0 && (
            <ellipse 
              cx="50%" 
              cy="45%" 
              rx="210" 
              ry="280" 
              fill="none" 
              stroke="#22c55e"
              strokeWidth="6"
              strokeDasharray={`${progressPercent * 15} 1500`}
              strokeLinecap="round"
              style={{
                filter: "drop-shadow(0 0 8px #22c55e)",
                transition: "stroke-dasharray 0.1s linear"
              }}
            />
          )}
        </svg>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white drop-shadow-lg">
          Chấm công khuôn mặt
        </h1>
        <Button 
          onClick={() => navigate('/admin/login')}
          className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0"
        >
          Admin Login
        </Button>
      </div>

      {/* Status indicator */}
      <div className="absolute bottom-32 left-0 right-0 flex flex-col items-center">
        <div className={`px-8 py-4 rounded-full backdrop-blur-sm transition-all ${
          loading ? 'bg-blue-500/80' :
          faceDetected ? 'bg-green-500/80' : 'bg-white/20'
        }`}>
          <span className="text-white text-xl font-medium">
            {status}
          </span>
        </div>
        
        {!modelLoaded && (
          <div className="mt-4 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white/70">Đang tải model nhận diện...</span>
          </div>
        )}
        
        {modelLoaded && !faceDetected && !loading && (
          <p className="text-white/70 text-sm mt-4">
            Đặt khuôn mặt vào khung và giữ yên trong 2 giây
          </p>
        )}
      </div>

      {/* Result Modal */}
      {result && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className={`bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 transform transition-all ${
            result.success ? 'border-4 border-green-500' : 'border-4 border-red-500'
          }`}>
            {result.success ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-green-500 text-white rounded-full p-4 animate-bounce">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-green-700">{result.message}</h2>

                <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-left">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-gray-600">Nhân viên:</span>
                    <span className="text-gray-900 font-bold">{result.employee?.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-gray-600">Mã NV:</span>
                    <span className="text-gray-900">{result.employee?.id}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-gray-600">Phòng ban:</span>
                    <span className="text-gray-900">{result.employee?.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-600">Thời gian:</span>
                    <span className="text-blue-600 font-bold text-xl">{result.time}</span>
                  </div>
                </div>

                <Button onClick={closeResult} variant="success" size="lg" className="w-full">
                  Đóng
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-red-500 text-white rounded-full p-4 animate-pulse">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-red-700">{result.message}</h2>

                <Button onClick={closeResult} variant="danger" size="lg" className="w-full">
                  Thử lại
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceCheck;
