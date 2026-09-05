import {defineType, defineField, defineArrayMember} from 'sanity'
import {CaseIcon} from '@sanity/icons/Case'

/**
 * A piece of client work. Webflow collection "Cases".
 *
 * Six exist in the export; three are drafts and were imported as drafts, so
 * they are here to finish rather than lost. `featured` is the export's
 * "Featured Project?" flag, which no page currently reads.
 */
export const caseStudy = defineType({
  name: 'caseStudy',
  title: 'Case study',
  type: 'document',
  icon: CaseIcon,
  groups: [
    {name: 'summary', title: 'Summary', default: true},
    {name: 'story', title: 'Story'},
    {name: 'media', title: 'Media'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      description: 'The client name.',
      group: 'summary',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      group: 'summary',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heading',
      type: 'string',
      description: 'The tagline shown with the client name — "Hands on care."',
      group: 'summary',
    }),
    defineField({
      name: 'subheading',
      type: 'text',
      rows: 3,
      description: 'Who the client is.',
      group: 'summary',
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 4,
      description: 'What the work was.',
      group: 'summary',
    }),
    defineField({
      name: 'service',
      type: 'reference',
      to: [{type: 'service'}],
      group: 'summary',
    }),
    defineField({
      name: 'deliverables',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'deliverable'}]})],
      group: 'summary',
    }),
    defineField({name: 'featured', type: 'boolean', initialValue: false, group: 'summary'}),
    defineField({
      name: 'publishedAt',
      type: 'datetime',
      group: 'summary',
      description: 'Orders the case list. Newest first.',
    }),
    defineField({name: 'process', type: 'blockContent', group: 'story'}),
    defineField({name: 'impact', type: 'blockContent', group: 'story'}),
    defineField({
      name: 'thumbnail',
      type: 'image',
      options: {hotspot: true},
      group: 'media',
      fields: [defineField({name: 'alt', type: 'string', title: 'Alternative text'})],
    }),
    defineField({
      name: 'gallery',
      type: 'array',
      group: 'media',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', type: 'string', title: 'Alternative text'})],
        }),
      ],
    }),
    defineField({
      name: 'legacyId',
      type: 'string',
      title: 'Webflow item ID',
      readOnly: true,
      group: 'summary',
      description: 'Kept from the Webflow export so reruns and redirects can find this item.',
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'heading', media: 'thumbnail'}},
})
