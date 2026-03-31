export const PAGE_GAP = 60;

// Import images from assets folder
const imageModules = import.meta.glob('/src/assets/images/*.{png,jpg,jpeg}', {
  eager: true,
  as: 'url',
});

// Get sorted list of image URLs
const imagePaths = Object.keys(imageModules)
  .sort()
  .map((path) => imageModules[path]);

export const PAGE_COUNT = imagePaths.length || 5;

/**
 * Load an image and return its dimensions and data URL.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        dataURL: src,
      });
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Generate placeholder if no real images exist.
 */
function generatePlaceholderImage(pageNum) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 800, 1100);
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, 799, 1099);

  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, 800, 50);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 50);
  ctx.lineTo(800, 50);
  ctx.stroke();

  ctx.fillStyle = '#374151';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Document — Page ${pageNum}`, 24, 32);

  ctx.fillStyle = '#e5e7eb';
  let y = 80;
  const lineHeight = 28;
  const margin = 40;

  for (let i = 0; i < 30 && y + lineHeight < 1040; i++) {
    const maxWidth = 720;
    const lineWidth =
      i % 5 === 4 ? maxWidth * (0.3 + Math.random() * 0.3) : maxWidth * (0.7 + Math.random() * 0.3);
    ctx.fillRect(margin, y, lineWidth, 8);
    y += lineHeight;
    if (i % 5 === 4) y += 16;
  }

  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`— ${pageNum} —`, 400, 1076);

  return canvas.toDataURL('image/png');
}

/**
 * Create Excalidraw element skeletons and BinaryFileData for background pages.
 * Loads real images from assets/images folder, or generates placeholders if none exist.
 */
export async function createBackgroundData() {
  const elementSkeletons = [];
  const files = {};
  let currentY = 0;
  let maxWidth = 800;
  const BLOCKER_SIZE = 50000;

  if (imagePaths.length === 0) {
    // No images found, use placeholders
    for (let i = 0; i < 5; i++) {
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
        y: currentY,
        width: 800,
        height: 1100,
        locked: true,
        status: 'saved',
      });

      currentY += 1100 + PAGE_GAP;
    }
  } else {
    // Load real images
    const loadedImages = await Promise.all(imagePaths.map((path) => loadImage(path)));

    for (let i = 0; i < loadedImages.length; i++) {
      const img = loadedImages[i];
      const fileId = `bg-file-${i}`;
      const elementId = `bg-img-${i}`;

      maxWidth = Math.max(maxWidth, img.width);

      files[fileId] = {
        id: fileId,
        dataURL: img.dataURL,
        mimeType: 'image/png',
        created: Date.now(),
      };

      elementSkeletons.push({
        type: 'image',
        id: elementId,
        fileId,
        x: 0,
        y: currentY,
        width: img.width,
        height: img.height,
        locked: true,
        status: 'saved',
      });

      currentY += img.height + PAGE_GAP;
    }
  }

  const totalHeight = currentY;

  return { elementSkeletons, files, canvasWidth: maxWidth, totalHeight };
}

/**
 * Get page dimensions for a specific page index.
 * This requires accessing the cached background data.
 */
export function getPageInfo(elementSkeletons, pageIndex) {
  if (pageIndex < 0 || pageIndex >= elementSkeletons.length) return null;
  const element = elementSkeletons[pageIndex];
  return {
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

/**
 * Generate Excalidraw elements with frames for loaded images.
 * Creates image and frame elements for each image in the list.
 * IMPORTANT: Children must come BEFORE frame in array (Excalidraw requirement).
 */
export function generatePageElements(imageData) {
  const elements = [];
  const totalPages = imageData.images.length;

  imageData.images.forEach((img, index) => {
    const frameId = `frame-${index}`;
    const textId = `text-${index}`;

    // 1. Create image element FIRST (child comes before frame)
    elements.push({
      id: img.id,
      type: 'image',
      x: img.x,
      y: img.y,
      width: img.width,
      height: img.height,
      angle: 0,
      strokeColor: 'transparent',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 0,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: frameId, // Bind image to its frame
      roundness: null,
      seed: index * 100 + 2,
      version: 1,
      versionNonce: index * 100 + 2,
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: true,
      fileId: img.id,
      scale: [1, 1],
      status: 'saved',
    });

    // 2. Create page number text element
    const pageNumber = `Page ${index + 1} of ${totalPages}`;
    const textY = img.y + img.height; // 15px from bottom
    const textX = img.x + img.width / 2; // Center horizontally

    elements.push({
      id: textId,
      type: 'text',
      x: textX - 50, // Offset by half width to center the text
      y: textY,
      width: 100,
      height: 15,
      angle: 0,
      strokeColor: '#666666',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 0,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: frameId, // Bind text to its frame
      roundness: null,
      seed: index * 100 + 3,
      version: 1,
      versionNonce: index * 100 + 3,
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: true,
      text: pageNumber,
      fontSize: 10,
      fontFamily: 3, // Virgil (printed font)
      textAlign: 'center',
      verticalAlign: 'middle',
      containerId: null,
      originalText: pageNumber,
      autoResize: true,
      isDetached: false,
    });

    // 3. Create frame element AFTER children
    elements.push({
      id: frameId,
      type: 'frame',
      x: img.x,
      y: img.y,
      width: img.width,
      height: img.height,
      angle: 0,
      strokeColor: '#868e96',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: index * 100 + 1,
      version: 1,
      versionNonce: index * 100 + 1,
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: true,
      name: `Image ${index + 1}`,
      children: [img.id, textId], // Frame contains the image and text as children
    });
  });

  return elements;
}
