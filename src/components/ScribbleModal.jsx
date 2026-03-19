import { useEffect } from 'react';
import FormTabs from './FormTabs';

export default function ScribbleModal({ isOpen, onClose, initialScribble, templateId }) {
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
    <div className="fixed inset-0 z-10 bg-white border-b border-gray-200 shrink-0  shadow-2xl w-full h-full">
        {/* Header */}
          <button
            onClick={onClose}
            className="absolute  right-2 top-1 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-600 cursor-pointer"
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

        {/* Canvas area - 90% width centered container */}
        <div className="flex-1 rounded-0  absolute h-full w-[98%] left-0 top-0 overflow-hidden flex items-center justify-center bg-white pt-4">
            <FormTabs 
            templateId={initialScribble?.templateId || templateId}
            initialScribble={initialScribble} 
            onClose={onClose} 
          />
        </div>
    </div>
  );
}
