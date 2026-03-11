import { useCallback, useEffect, useRef, useState } from 'react';
import { Tldraw, AssetRecordType, createShapeId, Box } from 'tldraw';
import 'tldraw/tldraw.css';
import PageNavigator from './PageNavigator';
import { SCRIBBLE_IMAGES } from '../config/images';

const IMAGE_WIDTH = 800;
const IMAGE_GAP = 20;

// Constrain a shape to stay within the canvas bounds
function constrainShapeToBounds(editor, shape, canvasBounds) {
  // Skip locked shapes (our background images)
  if (shape.isLocked) return shape;
  
  // Skip shapes parented to other shapes
  if (shape.parentId !== editor.getCurrentPageId()) return shape;

  const shapeBounds = editor.getShapePageBounds(shape);
  if (!shapeBounds) return shape;

  // Check if shape is completely within bounds
  if (canvasBounds.contains(shapeBounds)) {
    return shape;
  }

  // Clamp the shape position to stay within canvas bounds
  let clampedX = shape.x;
  let clampedY = shape.y;

  // Calculate how much the shape extends outside bounds
  if (shapeBounds.minX < canvasBounds.minX) {
    clampedX += canvasBounds.minX - shapeBounds.minX;
  } else if (shapeBounds.maxX > canvasBounds.maxX) {
    clampedX -= shapeBounds.maxX - canvasBounds.maxX;
  }

  if (shapeBounds.minY < canvasBounds.minY) {
    clampedY += canvasBounds.minY - shapeBounds.minY;
  } else if (shapeBounds.maxY > canvasBounds.maxY) {
    clampedY -= shapeBounds.maxY - canvasBounds.maxY;
  }

  // Final clamp to ensure shape stays within bounds
  clampedX = Math.max(canvasBounds.minX, Math.min(clampedX, canvasBounds.maxX - shapeBounds.w));
  clampedY = Math.max(canvasBounds.minY, Math.min(clampedY, canvasBounds.maxY - shapeBounds.h));

  return {
    ...shape,
    x: clampedX,
    y: clampedY,
  };
}

export default function ScribbleModal({ isOpen, onClose }) {
  const [editor, setEditor] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const imageDataRef = useRef([]);
  const canvasBoundsRef = useRef(null);

  const loadImageDimensions = useCallback(async () => {
    const loadedImages = [];
    
    for (let i = 0; i < SCRIBBLE_IMAGES.length; i++) {
      const img = new Image();
      img.src = SCRIBBLE_IMAGES[i];
      
      await new Promise((resolve) => {
        img.onload = () => {
          const aspectRatio = img.naturalHeight / img.naturalWidth;
          const scaledHeight = IMAGE_WIDTH * aspectRatio;
          loadedImages.push({
            src: SCRIBBLE_IMAGES[i],
            width: IMAGE_WIDTH,
            height: scaledHeight,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
          });
          resolve();
        };
        img.onerror = () => {
          loadedImages.push({
            src: SCRIBBLE_IMAGES[i],
            width: IMAGE_WIDTH,
            height: 600,
            originalWidth: IMAGE_WIDTH,
            originalHeight: 600,
          });
          resolve();
        };
      });
    }
    
    imageDataRef.current = loadedImages;
    setTotalPages(loadedImages.length);
    setImagesLoaded(true);
    return loadedImages;
  }, []);

  const handleMount = useCallback((editorInstance) => {
    setEditor(editorInstance);

    const initializeEditor = async () => {
      const images = imageDataRef.current.length > 0
        ? imageDataRef.current
        : await loadImageDimensions();

      if (images.length === 0) return;

      let currentY = 0;
      const totalHeight = images.reduce((acc, img) => acc + img.height + IMAGE_GAP, -IMAGE_GAP);

      // Create canvas bounds for constraining shapes
      const canvasBounds = new Box(0, 0, IMAGE_WIDTH, totalHeight);
      canvasBoundsRef.current = canvasBounds;

      // Register side effects to constrain all shapes within canvas bounds
      editorInstance.sideEffects.registerBeforeCreateHandler('shape', (shape) => {
        if (!canvasBoundsRef.current) return shape;
        return constrainShapeToBounds(editorInstance, shape, canvasBoundsRef.current);
      });

      editorInstance.sideEffects.registerBeforeChangeHandler('shape', (prevShape, nextShape) => {
        if (!canvasBoundsRef.current) return nextShape;
        return constrainShapeToBounds(editorInstance, nextShape, canvasBoundsRef.current);
      });

      editorInstance.run(() => {
        for (let i = 0; i < images.length; i++) {
          const imgData = images[i];
          const assetId = AssetRecordType.createId(`image-${i}`);
          const shapeId = createShapeId(`image-shape-${i}`);

          editorInstance.createAssets([{
            id: assetId,
            type: 'image',
            typeName: 'asset',
            props: {
              name: `page-${i + 1}.png`,
              src: imgData.src,
              w: imgData.originalWidth,
              h: imgData.originalHeight,
              mimeType: 'image/png',
              isAnimated: false,
            },
            meta: { pageIndex: i },
          }]);

          editorInstance.createShape({
            id: shapeId,
            type: 'image',
            x: 0,
            y: currentY,
            isLocked: true,
            props: {
              assetId,
              w: imgData.width,
              h: imgData.height,
            },
          });

          currentY += imgData.height + IMAGE_GAP;
        }
      }, { ignoreShapeLock: true });

      editorInstance.setCameraOptions({
        wheelBehavior: 'pan',
        panSpeed: 1,
        zoomSpeed: 1,
        zoomSteps: [0.5, 0.75, 1, 1.25, 1.5, 2],
        constraints: {
          bounds: { x: 0, y: 0, w: IMAGE_WIDTH, h: totalHeight },
          padding: { x: 0, y: 0 },
          origin: { x: 0.5, y: 0 },
          initialZoom: 'fit-x',
          baseZoom: 'fit-x',
          behavior: 'outside',
        },
      });

      editorInstance.zoomToBounds({ x: 0, y: 0, w: IMAGE_WIDTH, h: images[0].height }, {
        inset: 32,
        animation: { duration: 0 },
      });
    };

    initializeEditor();
  }, [loadImageDimensions]);

  useEffect(() => {
    if (!editor || !imagesLoaded) return;

    const updateCurrentPage = () => {
      const camera = editor.getCamera();
      const images = imageDataRef.current;
      
      let accumulatedY = 0;
      const viewportCenterY = -camera.y + (window.innerHeight / 2) / camera.z;

      for (let i = 0; i < images.length; i++) {
        const imageBottom = accumulatedY + images[i].height;
        if (viewportCenterY >= accumulatedY && viewportCenterY < imageBottom) {
          setCurrentPage(i + 1);
          return;
        }
        accumulatedY += images[i].height + IMAGE_GAP;
      }
    };

    const unsubscribe = editor.store.listen(() => {
      updateCurrentPage();
    }, { source: 'user', scope: 'document' });

    const interval = setInterval(updateCurrentPage, 100);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      clearInterval(interval);
    };
  }, [editor, imagesLoaded]);

  const navigateToPage = useCallback((pageNumber) => {
    if (!editor || pageNumber < 1 || pageNumber > totalPages) return;

    const images = imageDataRef.current;
    let targetY = 0;

    for (let i = 0; i < pageNumber - 1; i++) {
      targetY += images[i].height + IMAGE_GAP;
    }

    const targetImage = images[pageNumber - 1];
    
    editor.zoomToBounds(
      { x: 0, y: targetY, w: IMAGE_WIDTH, h: targetImage.height },
      { inset: 32, animation: { duration: 300 } }
    );
    
    setCurrentPage(pageNumber);
  }, [editor, totalPages]);

  const handlePrevPage = useCallback(() => {
    navigateToPage(currentPage - 1);
  }, [currentPage, navigateToPage]);

  const handleNextPage = useCallback(() => {
    navigateToPage(currentPage + 1);
  }, [currentPage, navigateToPage]);

  useEffect(() => {
    if (isOpen) {
      loadImageDimensions();
    }
  }, [isOpen, loadImageDimensions]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-[95vw] h-[95vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Scribble Editor</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Canvas Container */}
        <div className="relative flex-1">
          <div className="absolute inset-0">
            <Tldraw
              onMount={handleMount}
              hideUi={false}
              inferDarkMode={false}
            />
          </div>

          {/* Page Navigator */}
          {totalPages > 0 && (
            <PageNavigator
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              onGoToPage={navigateToPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
