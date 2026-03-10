export const IMAGE_WIDTH = 800;
export const IMAGE_HEIGHT = 1100;
export const PAGE_GAP = 60;
export const PAGE_COUNT = 5;

/**
 * Generate a placeholder document page image using Canvas API.
 * Returns a data URL string.
 */
export function generatePlaceholderImage(pageNum) {
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;
  const ctx = canvas.getContext('2d');

  // White page background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  // Subtle page border
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, IMAGE_WIDTH - 1, IMAGE_HEIGHT - 1);

  // Header bar
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, IMAGE_WIDTH, 50);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 50);
  ctx.lineTo(IMAGE_WIDTH, 50);
  ctx.stroke();

  // Header text
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Document — Page ${pageNum}`, 24, 32);

  // Simulated text lines
  ctx.fillStyle = '#e5e7eb';
  let y = 80;
  const lineHeight = 28;
  const margin = 40;

  for (let i = 0; i < 30 && y + lineHeight < IMAGE_HEIGHT - 60; i++) {
    const maxWidth = IMAGE_WIDTH - 2 * margin;
    const lineWidth =
      i % 5 === 4
        ? maxWidth * (0.3 + Math.random() * 0.3)
        : maxWidth * (0.7 + Math.random() * 0.3);

    ctx.fillRect(margin, y, lineWidth, 8);
    y += lineHeight;

    if (i % 5 === 4) y += 16;
  }

  // Footer page number
  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`— ${pageNum} —`, IMAGE_WIDTH / 2, IMAGE_HEIGHT - 24);

  return canvas.toDataURL('image/png');
}

/**
 * Create Excalidraw element skeletons and BinaryFileData for background pages.
 */
export function createBackgroundData(pageCount = PAGE_COUNT) {
  const elementSkeletons = [];
  const files = {};

  for (let i = 0; i < pageCount; i++) {
    const fileId = `bg-file-${i}`;
    const elementId = `bg-img-${i}`;
    const dataURL = generatePlaceholderImage(i + 1);

    files[fileId] = {
      id: fileId,
      dataURL,
      mimeType: 'image/png',
      created: Date.now(),
    };

    elementSkeletons.push({
      type: 'image',
      id: elementId,
      fileId,
      x: 0,
      y: i * (IMAGE_HEIGHT + PAGE_GAP),
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      locked: true,
      status: 'saved',
    });
  }

  return { elementSkeletons, files };
}

/**
 * Get the Y position of a specific page (1-indexed).
 */
export function getPageY(pageNum) {
  return (pageNum - 1) * (IMAGE_HEIGHT + PAGE_GAP);
}
