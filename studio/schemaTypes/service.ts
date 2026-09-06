import {defineType, defineField, defineArrayMember} from 'sanity'
import {SparklesIcon} from '@sanity/icons/Sparkles'

/**
 * A service line — Brand Strategy, Brand Culture, Brand Identity, Brand
 * Application. Four of them, shown in a fixed order with a "01"–"04" label.
 * Webflow collection "Services".
 */
export const service = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  icon: SparklesIcon,
  orderings: [
    {title: 'Site order', name: 'sortOrder', by: [{field: 'sortOrder', direction: 'asc'}]},
  ],
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heading',
      type: 'string',
      description: 'The statement on the service page.',
    }),
    defineField({name: 'description', type: 'text', rows: 4}),
    defineField({
      name: 'image',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', type: 'string', title: 'Alternative text'})],
    }),
    defineField({
      name: 'sortOrder',
      type: 'number',
      description: 'Position in the services list. 1 is first.',
      validation: (rule) => rule.integer().positive(),
    }),
    defineField({
      name: 'label',
      type: 'string',
      title: 'Number label',
      description: 'Shown beside the name — "01", "02" and so on.',
    }),
    defineField({
      name: 'deliverables',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'deliverable'}]})],
    }),
    defineField({
      name: 'legacyId',
      type: 'string',
      title: 'Webflow item ID',
      readOnly: true,
      description: 'Kept from the Webflow export so reruns and redirects can find this item.',
    }),
  ],
  /* Four services, already in a fixed order, so the number label alone adds
     nothing — how many deliverables sit under one is the useful fact. */
  preview: {
    select: {title: 'title', label: 'label', deliverables: 'deliverables', media: 'image'},
    prepare: ({title, label, deliverables, media}) => {
      const count = deliverables?.length ?? 0
      return {
        title,
        subtitle: [label, `${count} deliverable${count === 1 ? '' : 's'}`]
          .filter(Boolean)
          .join(' · '),
        media,
      }
    },
  },
})
