import { createCredentialIssuerHandler } from '@bsv/simple/server'

const handler = createCredentialIssuerHandler({
  schemas: [{
    id: 'freelancer-verified',
    name: 'VerifiedFreelancer',
    description: 'Verified freelancer credential for the marketplace',
    fields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true },
      { key: 'skill', label: 'Primary Skill', type: 'select', required: true, options: [
        { value: 'web-dev', label: 'Web Development' },
        { value: 'mobile-dev', label: 'Mobile Development' },
        { value: 'design', label: 'UI/UX Design' },
        { value: 'backend', label: 'Backend Engineering' },
        { value: 'devops', label: 'DevOps' },
        { value: 'data', label: 'Data Science' },
      ]},
      { key: 'rate', label: 'Hourly Rate (sats)', type: 'number', required: true },
      { key: 'bio', label: 'Bio', type: 'textarea' },
    ],
    computedFields: (values) => ({
      ...values,
      verifiedAt: new Date().toISOString(),
      status: 'active',
    }),
  }]
})

export const GET = handler.GET, POST = handler.POST
