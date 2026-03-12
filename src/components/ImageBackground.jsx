import { useLayoutEffect, useRef } from 'react';
import { useEditor, useValue } from 'tldraw';

export default function ImageBackground({ imageUrl, imageWidth, imageHeight, ...props }) {
  console.log('ImageBackground render called with:', { imageUrl, imageWidth, imageHeight, props });
  
  const editor = useEditor();
  const screenBounds = useValue('screenBounds', () => editor.getViewportScreenBounds(), [editor]);
  const devicePixelRatio = useValue('dpr', () => editor.getInstanceState().devicePixelRatio, [editor]);
  const camera = useValue('camera', () => editor.getCamera(), [editor]);
  
  const canvas = useRef(null);
  
  console.log('ImageBackground camera:', camera);

  useLayoutEffect(() => {
    if (!canvas.current || !imageUrl) return;

    const canvasW = screenBounds.w * devicePixelRatio;
    const canvasH = screenBounds.h * devicePixelRatio;
    canvas.current.width = canvasW;
    canvas.current.height = canvasH;

    const ctx = canvas.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasW, canvasH);

    const img = new Image();
    img.onload = () => {
      // Image position in page space (top-left corner)
      const pageX = 0;
      const pageY = 0;
      
      // Convert page coordinates to screen coordinates
      // tldraw camera: x and y are the camera position, z is zoom level
      const screenX = (pageX - camera.x) * camera.z * devicePixelRatio;
      const screenY = (pageY - camera.y) * camera.z * devicePixelRatio;
      const screenWidth = imageWidth * camera.z * devicePixelRatio;
      const screenHeight = imageHeight * camera.z * devicePixelRatio;

      // Draw the image
      ctx.drawImage(img, screenX, screenY, screenWidth, screenHeight);
      
      console.log('Drawing image at:', { screenX, screenY, screenWidth, screenHeight, camera });
    };
    img.onerror = () => {
      console.error('Failed to load background image:', imageUrl);
    };
    img.src = imageUrl;
  }, [screenBounds, camera, devicePixelRatio, imageUrl, imageWidth, imageHeight, editor]);

  return <canvas className="tl-grid" ref={canvas} />;
}
