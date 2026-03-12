import { Tldraw, useEditor, track } from 'tldraw';
import 'tldraw/tldraw.css';

const IMAGE_WIDTH = 785;
const IMAGE_HEIGHT = 866;

// Background component that tracks camera and transforms image accordingly
const ImageBackground = track(() => {
  const editor = useEditor();
  const camera = editor.getCamera();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <img
        src="/images/image2.png"
        alt="Canvas Background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${IMAGE_WIDTH}px`,
          height: `${IMAGE_HEIGHT}px`,
          // Image follows camera - zooms and pans with canvas
          transform: `translate(${camera.x * camera.z}px, ${camera.y * camera.z}px) scale(${camera.z})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
});

export default function ScribbleCanvas() {

  const cameraOptions = {
    constraints: {
      bounds: { x: 0, y: 0, w: IMAGE_WIDTH, h: IMAGE_HEIGHT },
      behavior: 'contain',
      initialZoom: 'fit-x',
      baseZoom: 'fit-x',
      padding: { x: 0, y: 0 },
      origin: { x: 0.5, y: 0 },
    },
    zoomSteps: [1, 1.5, 2, 3, 4, 6, 8],
  };

  return (
    <div style={{ width: '800px', height: '100%', margin: '0 auto', position: 'relative' }}>
      <Tldraw
        components={{
          Background: ImageBackground,
        }}
        cameraOptions={cameraOptions}
      />
    </div>
  );
}