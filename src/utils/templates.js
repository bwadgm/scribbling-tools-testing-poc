// Template configuration for different scribble types
export const TEMPLATES = {
  'general-op': {
    id: 'general-op',
    name: 'General OP',
    description: 'General outpatient template',
    images: [
      '/images/generalOP/gen_1.png',
      '/images/generalOP/gen_2.png',
      '/images/generalOP/gen_3.png',
    ],
    thumbnail: '/images/generalOP/gen_1.png',
  },
  'cardiology-op': {
    id: 'cardiology-op',
    name: 'Cardiology OP',
    description: 'Cardiology outpatient template',
    images: [
      '/images/cardioOP/cardio_1.png',
      '/images/cardioOP/cardio_2.png',
      '/images/cardioOP/cardio_3.png',
    ],
    thumbnail: '/images/cardioOP/cardio_1.png',
  },
  'pulmonary-op': {
    id: 'pulmonary-op',
    name: 'Pulmonary OP',
    description: 'Pulmonary outpatient template',
    images: [
      '/images/image2.png',
      '/images/image3.png',
      '/images/image4.png',
    ],
    thumbnail: '/images/image2.png',
  },
}

export const DEFAULT_TEMPLATE_ID = 'medical-report'

export const getTemplateById = (id) => {
  return TEMPLATES[id] || TEMPLATES[DEFAULT_TEMPLATE_ID]
}

export const getAllTemplates = () => {
  return Object.values(TEMPLATES)
}
