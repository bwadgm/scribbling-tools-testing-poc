import { useState } from 'react'
import ScribbleCanvas from './ScribbleCanvas'
import { getFormsForTemplate } from '../utils/templates'

export default function FormTabs({ templateId, onClose, initialScribble }) {
  const [activeFormIndex, setActiveFormIndex] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formToDelete, setFormToDelete] = useState(null)
  const forms = getFormsForTemplate(templateId)

  if (forms.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No forms available for this template.</p>
      </div>
    )
  }

  const handleDeleteForm = (formId, index) => {
    setFormToDelete({ id: formId, index })
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (formToDelete) {
      // Remove form from template's forms array
      // This would need to be implemented in the templates.js or passed as a prop
      console.log('Deleting form:', formToDelete.id)
      // For now, just close the modal
      setShowDeleteConfirm(false)
      setFormToDelete(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setFormToDelete(null)
  }

  if (forms.length === 1) {
    // If only one form, show it directly without tabs
    return (
      <ScribbleCanvas
        initialScribble={initialScribble}
        onClose={onClose}
        formId={forms[0].id}
      />
    )
  }

  const activeForm = forms[activeFormIndex]

  return (
    <div className="flex flex-col w-full h-full">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-4">
        {forms.map((form, index) => (
          <div
            key={form.id}
            className={`flex items-center border-b-2 transition-colors ${index === activeFormIndex
              ? 'border-blue-500 bg-white'
              : 'border-transparent'
              }`}
          >
            <button
              onClick={() => setActiveFormIndex(index)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${index === activeFormIndex
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {form.name}
            </button>
            <button
              onClick={() => handleDeleteForm(form.id, index)}
              className="p-1 mr-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete form"
            >
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
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-auto scroll-smooth">
        <ScribbleCanvas
          key={activeForm.id} // Force re-render when switching forms
          initialScribble={initialScribble}
          onClose={onClose}
          formId={activeForm.id}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Form</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this form? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
