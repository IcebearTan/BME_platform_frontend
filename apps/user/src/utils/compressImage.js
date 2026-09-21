const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const QUALITY_STEPS = [0.82, 0.75, 0.68, 0.6];

async function decodeImage(file) {
  if (window.createImageBitmap) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { image: bitmap, close: () => bitmap.close() };
    } catch {
      try {
        const bitmap = await createImageBitmap(file);
        return { image: bitmap, close: () => bitmap.close() };
      } catch {
        // Fall through to the object URL decoder for older browsers.
      }
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('图片无法解码'));
      element.src = url;
    });
    return { image, close: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('图片压缩失败'));
    }, 'image/jpeg', quality);
  });
}

function drawImage(image, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

function toJpegFile(blob, file) {
  const basename = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${basename}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export async function compressImage(file, {
  maxSide = 800,
  maxBytes = 600 * 1024,
} = {}) {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error('图片格式不支持，请上传 JPG 或 PNG 图片');
  }

  const { image, close } = await decodeImage(file);
  try {
    const sourceSide = Math.max(image.width, image.height);
    if (sourceSide * Math.min(image.width, image.height) > 80_000_000) {
      throw new Error('图片尺寸过大，请更换图片');
    }

    const minSide = Math.min(480, sourceSide);
    let side = Math.min(maxSide, sourceSide);
    let bestBlob = null;
    while (side >= minSide) {
      const scale = side / sourceSide;
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = drawImage(image, width, height);
      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
        if (blob.size <= maxBytes) {
          return toJpegFile(blob, file);
        }
      }
      side = Math.max(minSide, Math.floor(side * 0.85));
      if (side === minSide) break;
    }

    return toJpegFile(bestBlob, file);
  } finally {
    close();
  }
}
