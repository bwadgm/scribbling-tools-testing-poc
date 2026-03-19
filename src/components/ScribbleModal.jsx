import { useEffect } from 'react';
import ScribbleCanvas from './ScribbleCanvas';

export default function ScribbleModal({ isOpen, onClose, initialScribble }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10] flex items-center justify-center bg-black/50">
      <div className="flex flex-col bg-white shadow-2xl min-w-[700px]" style={{width: '1000px', height: '90vh', maxHeight: '800px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-1 bg-gray-100 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">Scribbler</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-600 cursor-pointer"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Canvas area - 90% width centered container */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-100 pt-4">
          <div style={{ width: '90%', height: '100%', position: 'relative' }}>
            <ScribbleCanvas initialScribble={initialScribble} onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}
