import { useState, useCallback, useEffect, useRef } from 'react';
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import PageNavigator from './PageNavigator';
import { createBackgroundData, PAGE_GAP, PAGE_COUNT } from '../utils/imageHelpers';

export default function ScribbleCanvas() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [totalHeight, setTotalHeight] = useState(0);
  const initialDataRef = useRef(null);
  const elementSkeletonsRef = useRef([]);
  const isCleaningRef = useRef(false);

  // Load background images asynchronously
  useEffect(() => {
    async function loadImages() {
      try {
        const { elementSkeletons, files, canvasWidth, totalHeight } = await createBackgroundData();
        const elements = convertToExcalidrawElements(elementSkeletons);
        
        // Filter out blocker elements, only keep image elements
        const imageElements = elementSkeletons.filter(el => el.type === 'image');
        elementSkeletonsRef.current = imageElements;
        setCanvasWidth(canvasWidth);
        setTotalHeight(totalHeight);
        
        initialDataRef.current = {
          elements,
          files,
          appState: {
            viewBackgroundColor: '#ffffff',
          },
          scrollToContent: false,
        };
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading images:', error);
        setIsLoading(false);
      }
    }
    
    loadImages();
  }, []);

  // After Excalidraw mounts, scroll to first page
  useEffect(() => {
    if (!excalidrawAPI) return;

    const timer = setTimeout(() => {
      const firstImg = excalidrawAPI
        .getSceneElements()
        .find((el) => el.id === 'bg-img-0');

      if (firstImg) {
        excalidrawAPI.scrollToContent(firstImg, {
          fitToViewport: true,
          viewportZoomFactor: 1.0,
          animate: false,
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [excalidrawAPI]);

  // Remove elements drawn outside image bounds and apply custom stroke width
  const handleChange = useCallback(
    (elements, appState) => {
      if (!excalidrawAPI || isCleaningRef.current || elementSkeletonsRef.current.length === 0) return;

      const elementsToRemove = [];
      const elementsToUpdate = [];
      const maxWidth = canvasWidth;
      const maxHeight = totalHeight;

      elements.forEach((element) => {
        // Skip locked elements (images)
        if (element.locked) return;

        // Check if element is outside bounds
        const isOutsideHorizontal = element.x < 0 || element.x + element.width > maxWidth;
        const isOutsideVertical = element.y < 0 || element.y + element.height > maxHeight;

        if (isOutsideHorizontal || isOutsideVertical) {
          elementsToRemove.push(element.id);
        } else {
          // Apply custom thinner stroke width (0.5 instead of default 1)
          // Excalidraw's "thin" = 1, "regular" = 2, "bold" = 4
          // We'll make thin even thinner by setting to 0.5
          if (element.strokeWidth === 1 && !element.customStrokeApplied) {
            elementsToUpdate.push({
              ...element,
              strokeWidth: 0.5,
              customStrokeApplied: true, // Flag to prevent re-processing
            });
          }
        }
      });

      // Update or remove elements if needed
      if (elementsToRemove.length > 0 || elementsToUpdate.length > 0) {
        isCleaningRef.current = true;
        
        let updatedElements = elements.filter(
          (el) => !elementsToRemove.includes(el.id)
        );

        // Apply stroke width updates
        if (elementsToUpdate.length > 0) {
          updatedElements = updatedElements.map((el) => {
            const update = elementsToUpdate.find((u) => u.id === el.id);
            return update || el;
          });
        }

        excalidrawAPI.updateScene({ elements: updatedElements });
        setTimeout(() => {
          isCleaningRef.current = false;
        }, 100);
      }
    },
    [excalidrawAPI, canvasWidth, totalHeight]
  );

  // Track current page based on scroll position
  const handleScrollChange = useCallback(
    (scrollX, scrollY) => {
      if (!excalidrawAPI || elementSkeletonsRef.current.length === 0) return;

      const appState = excalidrawAPI.getAppState();
      const zoom = appState.zoom?.value || 1;
      const viewportHeight = window.innerHeight;
      const viewportCenterY = (-scrollY + viewportHeight / 2) / zoom;

      // Find which page the viewport center is on
      let currentPageIndex = 0;
      for (let i = 0; i < elementSkeletonsRef.current.length; i++) {
        const element = elementSkeletonsRef.current[i];
        const pageTop = element.y;
        const pageBottom = element.y + element.height;
        
        if (viewportCenterY >= pageTop && viewportCenterY <= pageBottom) {
          currentPageIndex = i;
          break;
        } else if (viewportCenterY < pageTop) {
          currentPageIndex = Math.max(0, i - 1);
          break;
        } else if (i === elementSkeletonsRef.current.length - 1) {
          currentPageIndex = i;
        }
      }
      
      setCurrentPage(currentPageIndex + 1);
    },
    [excalidrawAPI]
  );

  // Navigate to a specific page
  const handlePageChange = useCallback(
    (pageNum) => {
      if (!excalidrawAPI) return;

      const targetId = `bg-img-${pageNum - 1}`;
      const elements = excalidrawAPI.getSceneElements();
      const target = elements.find((el) => el.id === targetId);

      if (target) {
        excalidrawAPI.scrollToContent(target, {
          fitToViewport: true,
          viewportZoomFactor: 1.0,
          animate: true,
          duration: 300,
        });
        setCurrentPage(pageNum);
      }
    },
    [excalidrawAPI]
  );

  if (isLoading) {
    return (
      <div className="relative h-full flex items-center justify-center">
        <div className="text-gray-500">Loading images...</div>
      </div>
    );
  }

  return (
    <div 
      className="relative h-full" 
      style={{ 
        overflow: 'hidden', 
        backgroundColor: '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch'
      }}
    >
      <div 
        style={{ 
          width: `${canvasWidth}px`, 
          height: '100%',
          position: 'relative',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'hidden'
          }}
        >
          <Excalidraw
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            initialData={initialDataRef.current}
            onChange={handleChange}
            onScrollChange={handleScrollChange}
            theme="light"
            viewModeEnabled={false}
          />
        </div>
        <PageNavigator
          currentPage={currentPage}
          totalPages={PAGE_COUNT}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
