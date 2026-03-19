import { getAllTemplates } from '../utils/templates'

export default function TemplateSelector({ isOpen, onClose, onSelectTemplate }) {
  if (!isOpen) return null

  const templates = getAllTemplates()

  const handleTemplateSelect = (template) => {
    onSelectTemplate(template)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Choose a Template</h2>
            <p className="text-sm text-gray-600 mt-1">Select a template to start your scribble</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-blue-300"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  handleTemplateSelect(template)
                }
              }}
            >
              {/* Thumbnail */}
              <div className="mb-3 rounded-lg bg-gray-50 h-32 flex items-center justify-center overflow-hidden">
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    // Fallback if image doesn't load
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div
                  className="w-full h-full flex items-center justify-center text-gray-400 text-sm"
                  style={{ display: 'none' }}
                >
                  Template Preview
                </div>
              </div>

              {/* Template Info */}
              <div className="mb-2">
                <h3 className="font-semibold text-gray-900 text-base">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              </div>

              {/* Image Count */}
              <div className="flex items-center text-xs text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                {template.images.length} {template.images.length === 1 ? 'image' : 'images'}
              </div>
            </div>
          ))}
        </div>

        {/* Cancel Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
