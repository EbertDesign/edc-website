import {defineType, defineField} from 'sanity'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'

/**
 * One thing the studio produces — "Brand Narrative", "Wayfinding & Signage".
 * Services and case studies each list the deliverables they include, so this
 * is a leaf document that both reference. Webflow collection "Deliverables".
 */
export const deliverable = defineType({
  name: 'deliverable',
  title: 'Deliverable',
  type: 'document',
  icon: CheckmarkCircleIcon,
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'subtitle', type: 'string', description: 'The short line under the name.'}),
    defineField({name: 'description', type: 'text', rows: 4}),
    defineField({
      name: 'image',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', type: 'string', title: 'Alternative text'})],
    }),
    defineField({
      name: 'legacyId',
      type: 'string',
      title: 'Webflow item ID',
      readOnly: true,
      description: 'Kept from the Webflow export so reruns and redirects can find this item.',
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'subtitle', media: 'image'}},
})
