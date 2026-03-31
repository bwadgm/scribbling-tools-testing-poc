import { useState, useRef, useEffect } from 'react'
import ScribbleCanvas from './ScribbleCanvas'
import { getFormsForTemplate, FORMS } from '../utils/templates'
import { deleteFormScene } from '../utils/localStorage'

export default function FormTabs({ templateId, onClose, initialScribble }) {
  const [activeFormIndex, setActiveFormIndex] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formToDelete, setFormToDelete] = useState(null)
  const allForms = Object.values(FORMS)
  const forms = getFormsForTemplate(templateId)

  const getInitialForms = () => {
    // First, try to restore from saved scribble's formIds
    if (initialScribble?.formIds && initialScribble.formIds.length > 0) {
      const savedForms = initialScribble.formIds.map((id) => FORMS[id]).filter(Boolean)
      if (savedForms.length > 0) {
        return savedForms
      }
    }
    // Fallback to template forms
    return getFormsForTemplate(templateId)
  }

  const [activeForms, setActiveForms] = useState(getInitialForms)

  const [isFormPanelOpen, setIsFormPanelOpen] = useState(false)
  const formPanelRef = useRef(null)
  const addFormBtnRef = useRef(null)

  const activeFormIds = activeForms.map((f) => f.id)
  const formIds = activeFormIds

  if (activeForms.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No forms available for this template.</p>
      </div>
    )
  }

  if (activeForms.length === 1) {
    // If only one form, show it directly without tabs
    return (
      <ScribbleCanvas
        initialScribble={initialScribble}
        onClose={onClose}
        formId={activeForms[0].id}
        formIds={activeForms.map(f => f.id)} // Pass formIds
      />
    )
  }

  const handleAddForm = (form) => {
    if (!activeFormIds.includes(form.id)) {
      setActiveForms((prev) => [...prev, form])
      setActiveFormIndex(activeForms.length)
    }
    setIsFormPanelOpen(false)
  }

  const handleDeleteForm = (formId, index) => {
    setFormToDelete({ id: formId, index })
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (formToDelete) {
      const { id: formId, index } = formToDelete
      // Remove form from active tabs
      setActiveForms((prev) => prev.filter((f) => f.id !== formId))
      // Fix active index: if deleting the active or a preceding tab, adjust
      setActiveFormIndex((prev) => {
        if (index < prev) return prev - 1
        if (index === prev) return Math.max(0, prev - 1)
        return prev
      })
      // Remove saved scene data for this form if scribble is persisted
      if (initialScribble?.id) {
        deleteFormScene(initialScribble.id, formId)
      }
      setShowDeleteConfirm(false)
      setFormToDelete(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setFormToDelete(null)
  }

  const activeForm = activeForms[activeFormIndex]

  return (
    <div className="flex flex-col w-full h-full">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-4">
        {/* Tabs container - takes remaining space */}
        <div className="flex overflow-x-auto flex-1">
          {activeForms.map((form, index) => (
            <div
              key={form.id}
              className={`flex items-center border-b-2 transition-colors shrink-0 ${index === activeFormIndex
                  ? 'border-blue-500 bg-white'
                  : 'border-transparent'
                }`}
            >
              <button
                onClick={() => setActiveFormIndex(index)}
                className={`px-2 py-3 text-sm font-medium transition-colors ${index === activeFormIndex
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add Form button - fixed width */}
        <div className="relative flex items-center ml-2">
          <button
            ref={addFormBtnRef}
            onClick={() => setIsFormPanelOpen((prev) => !prev)}
            className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
            title="Add form"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add
          </button>

          {/* Dropdown panel */}
          {isFormPanelOpen && (
            <div
              ref={formPanelRef}
              className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-2"
            >
              <p className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                Available Forms
              </p>
              {allForms.map((form) => {
                const isAdded = activeFormIds.includes(form.id)
                return (
                  <label
                    key={form.id}
                    className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isAdded
                        ? 'opacity-50 cursor-default'
                        : 'hover:bg-gray-50'
                      }`}
                  onClick={() => !isAdded && handleAddForm(form)}
                  >
                    <input
                      type="checkbox"
                      checked={isAdded}
                      disabled={isAdded}
                      readOnly
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{form.name}</p>
                      <p className="text-xs text-gray-500">{form.description}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <ScribbleCanvas
          key={activeForm.id} // Force re-render when switching forms
          initialScribble={initialScribble}
          onClose={onClose}
          formId={activeForm.id}
          formIds={formIds} // Pass formIds to ScribbleCanvas
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
