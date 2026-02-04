// Use ONNX Runtime from CDN (loaded in index.html)
// Face alignment and pose calculation remain unchanged

let onnxSession = null;

/**
 * Loads the MobileFaceNet ONNX model
 */
export const loadModels = async () => {
    try {
        // Wait for ort to be loaded from CDN
        if (!window.ort) {
            throw new Error('ONNX Runtime library not loaded. Check index.html script tag.');
        }

        const ort = window.ort;

        // Load ONNX model
        if (!onnxSession) {
            onnxSession = await ort.InferenceSession.create('/models/mobilefacenet_insightface.onnx');
            console.log("MobileFaceNet ONNX model loaded successfully");
        }
        return onnxSession;
    } catch (error) {
        console.error("Failed to load MobileFaceNet ONNX model:", error);
        throw error;
    }
};

/**
 * Calculates Yaw, Pitch, Roll from MediaPipe FaceLandmarker landmarks
 * @param {Object} landmarks - The landmarks object from MediaPipe
 * @returns {Object} { yaw, pitch, roll }
 */
export const calculatePose = (landmarks) => {
    // MediaPipe FaceLandmarker provides normalized x,y,z
    // Nose tip: 1, Left Eye: 33, Right Eye: 263, Chin: 152
    
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];
    
    // Yaw: Rotation around Y-axis (Looking Left/Right)
    const eyesCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
    const faceWidth = Math.abs(rightEye.x - leftEye.x);
    const yaw = (nose.x - eyesCenter.x) / faceWidth * 90 * 2; 
    
    // Pitch: Rotation around X-axis (Looking Up/Down)
    const pitch = (nose.y - eyesCenter.y) / Math.abs(chin.y - eyesCenter.y) * 90; 
    
    // Roll: Rotation around Z-axis (Head Tilt)
    const dy = rightEye.y - leftEye.y;
    const dx = rightEye.x - leftEye.x;
    const roll = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return { yaw, pitch, roll };
};

/**
 * Aligns and crops face from video/image using MediaPipe landmarks
 * @param {HTMLVideoElement|HTMLImageElement} imageElement - Source image/video
 * @param {Object[]} landmarks - MediaPipe face landmarks (normalized 0-1)
 * @param {number} outputSize - Output size (default 112 for MobileFaceNet)
 * @returns {HTMLCanvasElement} - Aligned face canvas
 */
export const alignFace = (imageElement, landmarks, outputSize = 112) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Get image dimensions
    const width = imageElement.videoWidth || imageElement.width;
    const height = imageElement.videoHeight || imageElement.height;

    // MediaPipe landmark indices for eyes
    // Left eye center: average of landmarks around left eye
    // Right eye center: average of landmarks around right eye
    const leftEyeIdx = [33, 133]; // Inner and outer corners
    const rightEyeIdx = [362, 263]; // Inner and outer corners

    // Calculate eye centers (convert from normalized to pixel coords)
    const leftEye = {
        x: (landmarks[leftEyeIdx[0]].x + landmarks[leftEyeIdx[1]].x) / 2 * width,
        y: (landmarks[leftEyeIdx[0]].y + landmarks[leftEyeIdx[1]].y) / 2 * height
    };
    const rightEye = {
        x: (landmarks[rightEyeIdx[0]].x + landmarks[rightEyeIdx[1]].x) / 2 * width,
        y: (landmarks[rightEyeIdx[0]].y + landmarks[rightEyeIdx[1]].y) / 2 * height
    };

    // Calculate rotation angle to align eyes horizontally
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const angle = Math.atan2(dy, dx);

    // Calculate center between eyes
    const eyeCenter = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2
    };

    // Distance between eyes
    const eyeDist = Math.sqrt(dx * dx + dy * dy);

    // Standard eye positions in aligned face (for 112x112)
    // Eyes should be at approximately 35% from top, 30% and 70% from left
    const desiredLeftEye = { x: 0.35 * outputSize, y: 0.35 * outputSize };
    const desiredRightEye = { x: 0.65 * outputSize, y: 0.35 * outputSize };
    const desiredDist = desiredRightEye.x - desiredLeftEye.x;

    // Calculate scale
    const scale = desiredDist / eyeDist;

    // Calculate the center of desired eyes position
    const desiredCenter = {
        x: (desiredLeftEye.x + desiredRightEye.x) / 2,
        y: (desiredLeftEye.y + desiredRightEye.y) / 2
    };

    // Apply transformations
    ctx.save();
    
    // Move to desired center
    ctx.translate(desiredCenter.x, desiredCenter.y);
    
    // Rotate to align eyes
    ctx.rotate(-angle);
    
    // Scale
    ctx.scale(scale, scale);
    
    // Draw image centered on eye center
    ctx.drawImage(
        imageElement,
        -eyeCenter.x,
        -eyeCenter.y,
        width,
        height
    );
    
    ctx.restore();

    return canvas;
};

/**
 * Extracts face embedding from image with face alignment using ONNX Runtime
 * @param {HTMLVideoElement|HTMLImageElement} imageElement 
 * @param {Object[]} landmarks - Optional MediaPipe landmarks for alignment
 */
export const getFaceEmbedding = async (imageElement, landmarks = null) => {
    if (!onnxSession) await loadModels();

    const ort = window.ort;
    
    if (!imageElement) throw new Error("No image element provided");

    // Align face if landmarks provided, otherwise just use raw image
    let sourceElement = imageElement;
    if (landmarks && landmarks.length > 0) {
        sourceElement = alignFace(imageElement, landmarks);
        console.log("[Embedding] Using aligned face");
    } else {
        console.log("[Embedding] No landmarks provided, using raw image");
    }

    // Create a temporary canvas to extract image data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 112;
    canvas.height = 112;
    
    // Draw the source (aligned or raw) to canvas
    ctx.drawImage(sourceElement, 0, 0, 112, 112);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, 112, 112);
    const pixels = imageData.data; // RGBA format

    // Prepare input tensor in CHW format (channels first)
    // ONNX model expects: [batch, channels, height, width] = [1, 3, 112, 112]
    const inputTensor = new Float32Array(1 * 3 * 112 * 112);
    
    // Convert RGBA to RGB and normalize: (value - 127.5) / 128.0
    // Also convert from HWC (height, width, channels) to CHW (channels, height, width)
    for (let i = 0; i < 112; i++) {
        for (let j = 0; j < 112; j++) {
            const pixelIndex = (i * 112 + j) * 4; // RGBA has 4 channels
            
            // Red channel
            inputTensor[0 * 112 * 112 + i * 112 + j] = (pixels[pixelIndex] - 127.5) / 128.0;
            // Green channel
            inputTensor[1 * 112 * 112 + i * 112 + j] = (pixels[pixelIndex + 1] - 127.5) / 128.0;
            // Blue channel
            inputTensor[2 * 112 * 112 + i * 112 + j] = (pixels[pixelIndex + 2] - 127.5) / 128.0;
        }
    }

    try {
        // Create ONNX tensor
        const tensor = new ort.Tensor('float32', inputTensor, [1, 3, 112, 112]);
        
        // Run inference
        const feeds = { 'input.1': tensor };
        const results = await onnxSession.run(feeds);
        
        // Get output tensor (should be named '516' based on model inspection)
        const outputTensor = results['516'];
        const embedding = outputTensor.data;
        
        return Array.from(embedding);
    } catch (error) {
        console.error("[getFaceEmbedding] Error during inference:", error);
        throw error;
    }
};
