// Forms configuration - individual forms with multiple images
export const FORMS = {
  'general-op-form': {
    id: 'general-op-form',
    name: 'General OP - Form',
    description: 'General outpatient form',
    images: [
      '/images/generalOP/gen_1.webp',
      '/images/generalOP/gen_2.webp',
      '/images/generalOP/gen_3.webp',
      '/images/extra_page.png'
    ],
    thumbnail: '/images/generalOP/gen_1.webp',
  },
  'cardiology-op-form': {
    id: 'cardiology-op-form',
    name: 'Cardiology OP - Form',
    description: 'Cardiology outpatient form',
    images: [
      '/images/cardioOP/cardio_1.webp',
      '/images/cardioOP/cardio_2.webp',
      '/images/cardioOP/cardio_3.webp',
      '/images/extra_page.png'
    ],
    thumbnail: '/images/cardioOP/cardio_1.webp',
  },
   'test-form': {
    id: 'test-form',
    name: 'Test - Form',
    description: 'Test outpatient form',
    images: [
      '/images/cardioOP/cardio_1.webp',
      '/images/generalOP/gen_2.webp',
      '/images/cardioOP/cardio_3.webp',
      '/images/extra_page.png'
    ],
    thumbnail: '/images/cardioOP/cardio_1.webp',
  },
}

// Templates configuration - parent containers that hold multiple forms
export const TEMPLATES = {
  'general-op': {
    id: 'general-op',
    name: 'General OP',
    description: 'General outpatient templates',
    forms: ['general-op-form', 'cardiology-op-form'],
    thumbnail: '/images/generalOP/gen_1.webp',
  },
  'cardiology-op': {
    id: 'cardiology-op',
    name: 'Cardiology OP',
    description: 'Cardiology outpatient templates',
    forms: ['cardiology-op-form', 'general-op-form'],
    thumbnail: '/images/cardioOP/cardio_1.webp',
  },
}

export const DEFAULT_TEMPLATE_ID = 'general-op'

export const getFormById = (id) => {
  return FORMS[id]
}

export const getTemplateById = (id) => {
  return TEMPLATES[id] || TEMPLATES[DEFAULT_TEMPLATE_ID]
}

export const getAllTemplates = () => {
  return Object.values(TEMPLATES)
}

export const getFormsForTemplate = (templateId) => {
  const template = getTemplateById(templateId)
  if (!template || !template.forms) return []
  return template.forms.map(formId => getFormById(formId)).filter(Boolean)
}
