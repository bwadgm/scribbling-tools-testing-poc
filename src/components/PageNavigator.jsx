export default function PageNavigator({ currentPage, totalPages, onPageChange }) {
  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className="absolute top-4 right-4 flex flex-col items-center gap-1 z-50">
      {/* Up arrow */}
      <button
        onClick={handlePrev}
        disabled={currentPage <= 1}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/90 shadow-md border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        aria-label="Previous page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>

      {/* Page indicator */}
      <div className="px-3 py-1.5 bg-white/90 shadow-md rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 select-none whitespace-nowrap">
        {currentPage} / {totalPages}
      </div>

      {/* Down arrow */}
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/90 shadow-md border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        aria-label="Next page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
