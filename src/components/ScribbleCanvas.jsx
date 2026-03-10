import { useState, useCallback, useEffect, useRef } from 'react';
import { Excalidraw, convertToExcalidrawElements } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import PageNavigator from './PageNavigator';
import {
  createBackgroundData,
  IMAGE_WIDTH,
  IMAGE_HEIGHT,
  PAGE_GAP,
  PAGE_COUNT,
} from '../utils/imageHelpers';

export default function ScribbleCanvas() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const lockedScrollXRef = useRef(null);
  const isResettingRef = useRef(false);
  const initialDataRef = useRef(null);

  // Build initial data once (background images + files)
  if (!initialDataRef.current) {
    const { elementSkeletons, files } = createBackgroundData(PAGE_COUNT);
    const elements = convertToExcalidrawElements(elementSkeletons);
    initialDataRef.current = {
      elements,
      files,
      appState: {
        viewBackgroundColor: '#e8e8e8',
      },
      scrollToContent: false,
    };
  }

  // After Excalidraw mounts, scroll to first page and lock horizontal scroll
  useEffect(() => {
    if (!excalidrawAPI) return;

    const timer = setTimeout(() => {
      const firstImg = excalidrawAPI
        .getSceneElements()
        .find((el) => el.id === 'bg-img-0');

      if (firstImg) {
        excalidrawAPI.scrollToContent(firstImg, {
          fitToViewport: true,
          viewportZoomFactor: 0.9,
          animate: false,
        });
      }

      // Capture centered scrollX to use as lock value
      const appState = excalidrawAPI.getAppState();
      lockedScrollXRef.current = appState.scrollX;
    }, 400);

    return () => clearTimeout(timer);
  }, [excalidrawAPI]);

  // Track current page + lock horizontal scroll
  const handleScrollChange = useCallback(
    (scrollX, scrollY) => {
      if (!excalidrawAPI) return;

      const appState = excalidrawAPI.getAppState();
      const zoom = appState.zoom?.value || 1;
      const viewportHeight = window.innerHeight;

      // Determine which page is centered in the viewport
      const viewportCenterY = (-scrollY + viewportHeight / 2) / zoom;
      const pageHeight = IMAGE_HEIGHT + PAGE_GAP;
      const pageIndex = Math.round(
        (viewportCenterY - IMAGE_HEIGHT / 2) / pageHeight
      );
      const clampedPage = Math.max(1, Math.min(PAGE_COUNT, pageIndex + 1));
      setCurrentPage(clampedPage);

      // Lock horizontal scroll to centered position
      if (
        !isResettingRef.current &&
        lockedScrollXRef.current !== null &&
        Math.abs(scrollX - lockedScrollXRef.current) > 2
      ) {
        isResettingRef.current = true;
        excalidrawAPI.updateScene({
          appState: { scrollX: lockedScrollXRef.current },
        });
        requestAnimationFrame(() => {
          isResettingRef.current = false;
        });
      }
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
          viewportZoomFactor: 0.9,
          animate: true,
          duration: 300,
        });
        setCurrentPage(pageNum);

        // Update locked scrollX after navigation settles
        setTimeout(() => {
          const appState = excalidrawAPI.getAppState();
          lockedScrollXRef.current = appState.scrollX;
        }, 400);
      }
    },
    [excalidrawAPI]
  );

  return (
    <div className="relative w-full h-full">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={initialDataRef.current}
        onScrollChange={handleScrollChange}
        theme="light"
      />
      <PageNavigator
        currentPage={currentPage}
        totalPages={PAGE_COUNT}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
