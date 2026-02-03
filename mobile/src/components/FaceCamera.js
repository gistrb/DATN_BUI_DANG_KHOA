/**
 * Face Camera Component with Real-time MediaPipe Detection
 * 
 * Uses:
 * - react-native-vision-camera for camera
 * - react-native-mediapipe for face landmark detection
 * - vision-camera-resize-plugin for GPU preprocessing
 * - react-native-skia for face alignment
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useFaceLandmarkDetection, RunningMode, Delegate } from 'react-native-mediapipe';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { Worklets, useSharedValue } from 'react-native-worklets-core';
import { 
  calculateAffineMatrix, 
  calculatePose, 
  isPoseAcceptable,
  runInference,
  loadFaceModel,
  LANDMARK_INDICES 
} from '../services/faceEmbedding';

const FaceCamera = ({ 
  onFaceDetected, 
  onEmbeddingExtracted,
  onPoseUpdate,
  showGuide = true,
  autoCapture = false,
}) => {
  const device = useCameraDevice('front');
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceStatus, setFaceStatus] = useState('Đang tìm khuôn mặt...');
  const [modelLoaded, setModelLoaded] = useState(false);

  // Shared values for frame processor communication
  const detectedLandmarks = useSharedValue(null);
  const currentPose = useSharedValue(null);

  // Load model on mount
  useEffect(() => {
    const init = async () => {
      try {
        const permission = await Camera.requestCameraPermission();
        setHasPermission(permission === 'granted');
        
        await loadFaceModel();
        setModelLoaded(true);
        console.log('[FaceCamera] Ready');
      } catch (error) {
        console.error('[FaceCamera] Init error:', error);
      }
    };
    init();
  }, []);

  // MediaPipe face landmark detection
  const faceLandmarkDetection = useFaceLandmarkDetection(
    (results, width, height) => {
      // Callback when face detected
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        detectedLandmarks.value = landmarks;
        
        // Calculate pose
        const pose = calculatePose(landmarks);
        currentPose.value = pose;
        
        if (onPoseUpdate) {
          Worklets.runOnJS(() => onPoseUpdate(pose))();
        }
        
        if (onFaceDetected) {
          Worklets.runOnJS(() => onFaceDetected(landmarks, width, height))();
        }
      } else {
        detectedLandmarks.value = null;
        currentPose.value = null;
      }
    },
    (error) => {
      console.error('[FaceCamera] Detection error:', error);
    },
    RunningMode.LIVE_STREAM,
    'face_landmarker.task', // Model file
    {
      numFaces: 1,
      minFaceDetectionConfidence: 0.7,
      minFacePresenceConfidence: 0.7,
      minTrackingConfidence: 0.7,
      delegate: Delegate.GPU,
    }
  );

  // Resize plugin for GPU preprocessing
  const { resize } = useResizePlugin();

  // Frame processor
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    // Run face detection
    faceLandmarkDetection.detectOnFrame(frame);
    
    // If auto-capture enabled and face in good position
    if (autoCapture && detectedLandmarks.value && currentPose.value) {
      const pose = currentPose.value;
      
      if (isPoseAcceptable(pose)) {
        // Get aligned and normalized buffer using GPU
        const buffer = resize(frame, {
          size: { width: 112, height: 112 },
          pixelFormat: 'rgb',
          dataType: 'float32',
          // Normalize: (pixel - 127.5) / 127.5 ≈ (pixel * (1/127.5)) - 1
          multiplier: 1 / 127.5,
          offset: -1,
        });
        
        // Run inference on main thread
        Worklets.runOnJS(() => {
          extractAndCallback(buffer, detectedLandmarks.value, frame.width, frame.height);
        })();
      }
    }
  }, [faceLandmarkDetection, autoCapture]);

  // Extract embedding and callback
  const extractAndCallback = useCallback(async (buffer, landmarks, width, height) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const embedding = await runInference(buffer);
      
      if (embedding && onEmbeddingExtracted) {
        const pose = calculatePose(landmarks);
        onEmbeddingExtracted({
          success: true,
          embedding,
          pose,
          landmarks,
        });
      }
    } catch (error) {
      console.error('[FaceCamera] Extraction error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onEmbeddingExtracted]);

  // Manual capture
  const captureAndExtract = useCallback(async () => {
    if (!cameraRef.current || !detectedLandmarks.value) {
      return { success: false, error: 'No face detected' };
    }
    
    const landmarks = detectedLandmarks.value;
    const pose = calculatePose(landmarks);
    
    if (!isPoseAcceptable(pose)) {
      return { success: false, error: 'Vui lòng nhìn thẳng vào camera', pose };
    }
    
    // Take snapshot
    const photo = await cameraRef.current.takeSnapshot({
      quality: 90,
    });
    
    // Process through resize plugin manually
    // Note: For snapshot, we need to load image and process
    // This is a simplified version - full implementation would use Skia
    
    return { 
      success: true, 
      photo, 
      landmarks, 
      pose,
    };
  }, []);

  // Update status based on detection
  useEffect(() => {
    const checkStatus = () => {
      if (!detectedLandmarks.value) {
        setFaceStatus('Đang tìm khuôn mặt...');
      } else if (currentPose.value) {
        const pose = currentPose.value;
        if (!isPoseAcceptable(pose)) {
          if (Math.abs(pose.yaw) > 25) {
            setFaceStatus(pose.yaw > 0 ? 'Xoay mặt sang trái' : 'Xoay mặt sang phải');
          } else if (Math.abs(pose.pitch) > 25) {
            setFaceStatus(pose.pitch > 0 ? 'Ngẩng đầu lên' : 'Cúi đầu xuống');
          } else if (Math.abs(pose.roll) > 15) {
            setFaceStatus('Giữ đầu thẳng');
          }
        } else {
          setFaceStatus('Khuôn mặt OK ✓');
        }
      }
    };
    
    const interval = setInterval(checkStatus, 100);
    return () => clearInterval(interval);
  }, []);

  if (!device || !hasPermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Đang khởi tạo camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />
      
      {/* Face Guide Overlay */}
      {showGuide && (
        <View style={styles.overlay}>
          <View style={styles.faceGuide}>
            <View style={styles.faceOval} />
          </View>
          
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>{faceStatus}</Text>
            {isProcessing && <ActivityIndicator size="small" color="#fff" />}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: 280,
    height: 360,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOval: {
    width: 220,
    height: 300,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(79, 70, 229, 0.7)',
    borderStyle: 'dashed',
  },
  statusBar: {
    position: 'absolute',
    bottom: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default FaceCamera;
