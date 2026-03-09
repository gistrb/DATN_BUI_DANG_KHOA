/**
 * Face Detection using custom ONNX model (SCRFD/RetinaFace format)
 */

let detSession = null;
const INPUT_SIZE = 640; // Default input size

/**
 * Loads the detection ONNX model
 */
export const loadDetectionModel = async () => {
  try {
    if (!window.ort) {
      throw new Error("ONNX Runtime library not loaded.");
    }
    if (!detSession) {
      detSession = await window.ort.InferenceSession.create(
        "/models/mobilefacenet_insightface_det.onnx"
      );
      console.log("Detection ONNX model loaded successfully");
    }
    return detSession;
  } catch (error) {
    console.error("Failed to load Detection ONNX model:", error);
    throw error;
  }
};

/**
 * Generate anchors (centers) for SCRFD
 */
const generateAnchors = (width, height) => {
  const strides = [8, 16, 32];
  const centers = {};

  strides.forEach(stride => {
    const num_grid_y = Math.floor(height / stride);
    const num_grid_x = Math.floor(width / stride);
    const strideCenters = [];
    
    for (let i = 0; i < num_grid_y; i++) {
      for (let j = 0; j < num_grid_x; j++) {
        // SCRFD has 2 anchors per cell
        for (let k = 0; k < 2; k++) {
          strideCenters.push({
            cx: j * stride,
            cy: i * stride
          });
        }
      }
    }
    centers[stride] = strideCenters;
  });
  
  return centers;
};

/**
 * Fast NMS Implementation
 */
const nms = (boxes, iou_threshold) => {
  if (boxes.length === 0) return [];
  
  boxes.sort((a, b) => b.score - a.score);
  
  const keep = [];
  const flags = new Array(boxes.length).fill(false);
  
  for (let i = 0; i < boxes.length; i++) {
    if (flags[i]) continue;
    keep.push(boxes[i]);
    
    for (let j = i + 1; j < boxes.length; j++) {
      if (flags[j]) continue;
      
      const a = boxes[i];
      const b = boxes[j];
      
      const ix1 = Math.max(a.x1, b.x1);
      const iy1 = Math.max(a.y1, b.y1);
      const ix2 = Math.min(a.x2, b.x2);
      const iy2 = Math.min(a.y2, b.y2);
      
      const iw = Math.max(0, ix2 - ix1);
      const ih = Math.max(0, iy2 - iy1);
      
      if (iw > 0 && ih > 0) {
        const inter = iw * ih;
        const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
        const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
        const union = areaA + areaB - inter;
        const iou = inter / union;
        
        if (iou > iou_threshold) {
          flags[j] = true;
        }
      }
    }
  }
  
  return keep;
};

/**
 * Custom inference function
 * @param {HTMLVideoElement|HTMLCanvasElement|HTMLImageElement} source 
 */
export const getFaceDetection = async (source, threshold = 0.5) => {
  if (!detSession) await loadDetectionModel();
  
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  
  // Calculate scaling to preserve aspect ratio
  const srcWidth = source.videoWidth || source.width;
  const srcHeight = source.videoHeight || source.height;
  
  const scale = Math.min(INPUT_SIZE / srcWidth, INPUT_SIZE / srcHeight);
  const newWidth = Math.round(srcWidth * scale);
  const newHeight = Math.round(srcHeight * scale);
  
  const padX = (INPUT_SIZE - newWidth) / 2;
  const padY = (INPUT_SIZE - newHeight) / 2;
  
  // Fill black background
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  // Draw scaled image centered
  ctx.drawImage(source, padX, padY, newWidth, newHeight);
  
  const imgData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const pixels = imgData.data;
  
  // Create Tensor [1, 3, 640, 640]
  const inputTensor = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
  
  for (let i = 0; i < INPUT_SIZE; i++) {
    for (let j = 0; j < INPUT_SIZE; j++) {
      const idx = (i * INPUT_SIZE + j) * 4;
      // Normalization per Insightface SCRFD: (val - 127.5) / 128.0
      inputTensor[0 * INPUT_SIZE * INPUT_SIZE + i * INPUT_SIZE + j] = (pixels[idx] - 127.5) / 128.0;
      inputTensor[1 * INPUT_SIZE * INPUT_SIZE + i * INPUT_SIZE + j] = (pixels[idx + 1] - 127.5) / 128.0;
      inputTensor[2 * INPUT_SIZE * INPUT_SIZE + i * INPUT_SIZE + j] = (pixels[idx + 2] - 127.5) / 128.0;
    }
  }
  
  const tensor = new window.ort.Tensor("float32", inputTensor, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  
  const outputNames = detSession.outputNames;
  const feeds = {};
  feeds[detSession.inputNames[0]] = tensor;
  
  const results = await detSession.run(feeds);
  
  // Group outputs by length
  const scoresObj = { 8: null, 16: null, 32: null };
  const bboxesObj = { 8: null, 16: null, 32: null };
  const kpsObj = { 8: null, 16: null, 32: null };
  
  outputNames.forEach(name => {
    const val = results[name];
    const shape = val.dims; 
    let num_anchors_total = shape[0];
    if (shape.length > 2 && shape[1] > 1) { // Sometimes shape is [1, num_anchors, ...]
       num_anchors_total = shape[1];
    }
    
    let stride = 0;
    if (num_anchors_total === 12800) stride = 8;
    else if (num_anchors_total === 3200) stride = 16;
    else if (num_anchors_total === 800) stride = 32;
    // For smaller input sizes, calculate dynamically if needed, but we used INPUT_SIZE = 640
    
    const lastDim = shape[shape.length - 1];
    if (lastDim === 1) scoresObj[stride] = val.data;
    else if (lastDim === 4) bboxesObj[stride] = val.data;
    else if (lastDim === 10) kpsObj[stride] = val.data;
  });
  
  const anchors = generateAnchors(INPUT_SIZE, INPUT_SIZE);
  const strides = [8, 16, 32];
  let proposals = [];
  
  strides.forEach(stride => {
    const scores = scoresObj[stride];
    const bboxes = bboxesObj[stride];
    const kps = kpsObj[stride];
    const strideAnchors = anchors[stride];
    
    if (!scores || !bboxes || !kps) return;
    
    for (let i = 0; i < strideAnchors.length; i++) {
        const score = scores[i];
        if (score < threshold) continue;
        
        const cx = strideAnchors[i].cx;
        const cy = strideAnchors[i].cy;
        
        // Bbox predicted distance offsets
        const dx1 = bboxes[i * 4 + 0];
        const dy1 = bboxes[i * 4 + 1];
        const dx2 = bboxes[i * 4 + 2];
        const dy2 = bboxes[i * 4 + 3];
        
        const x1 = cx - dx1 * stride;
        const y1 = cy - dy1 * stride;
        const x2 = cx + dx2 * stride;
        const y2 = cy + dy2 * stride;
        
        const landmarks = [];
        for (let k = 0; k < 5; k++) {
            const klx = kps[i * 10 + k * 2 + 0];
            const kly = kps[i * 10 + k * 2 + 1];
            landmarks.push({
                x: cx + klx * stride,
                y: cy + kly * stride
            });
        }
        
        proposals.push({
            x1, y1, x2, y2, score, landmarks
        });
    }
  });
  
  // Apply NMS
  const finalBoxes = nms(proposals, 0.4);
  
  // Map coordinates from 640x640 padded region back to original source space
  finalBoxes.forEach(box => {
    // Inverse scale and pad
    box.x1 = (box.x1 - padX) / scale;
    box.y1 = (box.y1 - padY) / scale;
    box.x2 = (box.x2 - padX) / scale;
    box.y2 = (box.y2 - padY) / scale;
    
    box.landmarks.forEach(lm => {
        lm.x = (lm.x - padX) / scale;
        lm.y = (lm.y - padY) / scale;
    });
    
    // Bounds check
    box.x1 = Math.max(0, box.x1);
    box.y1 = Math.max(0, box.y1);
    box.x2 = Math.min(srcWidth, box.x2);
    box.y2 = Math.min(srcHeight, box.y2);
  });
  
  // Sort primarily by closest to center, or by size, or score. Let's return highest score first
  return finalBoxes.map(b => ({
      boundingBox: {
          originX: b.x1,
          originY: b.y1,
          width: b.x2 - b.x1,
          height: b.y2 - b.y1
      },
      score: b.score,
      keypoints: b.landmarks // Array of 5 {x, y}
  }));
};
