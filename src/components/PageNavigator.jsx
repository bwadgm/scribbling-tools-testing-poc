import { memo } from 'react';

function PageNavigator({ currentPage, totalPages, onPrevPage, onNextPage, onGoToPage }) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-gray-200">
      {/* Up Arrow */}
      <button
        onClick={onPrevPage}
        disabled={currentPage <= 1}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* Page Number Display */}
      <div className="flex flex-col items-center px-2 py-1">
        <span className="text-lg font-bold text-gray-800">{currentPage}</span>
        <div className="w-6 h-px bg-gray-300 my-1" />
        <span className="text-sm text-gray-500">{totalPages}</span>
      </div>

      {/* Down Arrow */}
      <button
        onClick={onNextPage}
        disabled={currentPage >= totalPages}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Quick Jump Dots */}
      {totalPages <= 10 && (
        <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-200">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => onGoToPage(i + 1)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentPage === i + 1
                  ? 'bg-blue-600 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(PageNavigator);
