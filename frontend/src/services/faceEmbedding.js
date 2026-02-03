// Use tf and tflite from CDN (loaded in index.html)
// This ensures both libraries use the same Tensor class

let tfliteModel = null;

/**
 * Loads the MobileFaceNet TFLite model
 */
export const loadModels = async () => {
    try {
        // Wait for tf and tflite to be loaded from CDN
        if (!window.tf) {
            throw new Error('TensorFlow.js library not loaded. Check index.html script tag.');
        }
        if (!window.tflite) {
            throw new Error('TFLite library not loaded. Check index.html script tag.');
        }

        const tf = window.tf;
        const tflite = window.tflite;

        // Wait for tf to be ready
        await tf.ready();
        console.log("TensorFlow.js ready. Backend:", tf.getBackend());

        // Load MobileFaceNet model
        if (!tfliteModel) {
            // Configure TFLite WASM path
            tflite.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.8/dist/');
            tfliteModel = await tflite.loadTFLiteModel('/models/mobilefacenet.tflite');
            console.log("MobileFaceNet model loaded successfully");
        }
        return tfliteModel;
    } catch (error) {
        console.error("Failed to load MobileFaceNet model:", error);
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
 * Extracts face embedding from image with face alignment
 * @param {HTMLVideoElement|HTMLImageElement} imageElement 
 * @param {Object[]} landmarks - Optional MediaPipe landmarks for alignment
 */
export const getFaceEmbedding = async (imageElement, landmarks = null) => {
    if (!tfliteModel) await loadModels();

    const tf = window.tf;
    
    if (!imageElement) throw new Error("No image element provided");

    // Align face if landmarks provided, otherwise just use raw image
    let sourceElement = imageElement;
    if (landmarks && landmarks.length > 0) {
        sourceElement = alignFace(imageElement, landmarks);
        console.log("[Embedding] Using aligned face");
    } else {
        console.log("[Embedding] No landmarks provided, using raw image");
    }

    // Manually manage tensor disposal
    let inputTensor = null;
    let resized = null;
    let normalized = null;
    let batched = null;
    let outputTensor = null;

    try {
        // 1. Convert image to tensor
        inputTensor = tf.browser.fromPixels(sourceElement);
        
        // 2. Resize to 112x112 (in case alignment canvas is different size)
        resized = tf.image.resizeBilinear(inputTensor, [112, 112]);
        
        // 3. Normalize (img - 127.5) / 128
        normalized = resized.sub(127.5).div(128.0);
        
        // 4. Expand dims to [1, 112, 112, 3]
        batched = normalized.expandDims(0);
        
        // 5. Run inference
        outputTensor = tfliteModel.predict(batched);
        
        // 6. Get embedding data BEFORE disposing
        const embedding = outputTensor.dataSync();
        
        return Array.from(embedding);
    } finally {
        // Clean up all tensors
        if (inputTensor) inputTensor.dispose();
        if (resized) resized.dispose();
        if (normalized) normalized.dispose();
        if (batched) batched.dispose();
        if (outputTensor) outputTensor.dispose();
    }
};
