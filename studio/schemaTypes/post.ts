import {defineType, defineField} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

/**
 * A journal entry. Webflow collection "Blog Posts".
 *
 * `topic` is a short fixed list rather than a reference: the site has five
 * values across six posts and no topic pages, so a taxonomy document would be
 * a second thing to edit for no page it could produce. Promote it to a
 * document if topic listings are ever wanted.
 */
export const post = defineType({
  name: 'post',
  title: 'Journal post',
  type: 'document',
  icon: DocumentTextIcon,
  orderings: [
    {title: 'Newest first', name: 'publishedDesc', by: [{field: 'publishedAt', direction: 'desc'}]},
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
      name: 'topic',
      type: 'string',
      options: {
        list: [
          {title: 'About Us', value: 'About Us'},
          {title: 'Nonprofit', value: 'Nonprofit'},
          {title: 'B Corps', value: 'B Corps'},
          {title: 'Brand Strategy', value: 'Brand Strategy'},
          {title: 'Brand Identity', value: 'Brand Identity'},
        ],
      },
    }),
    defineField({name: 'publishedAt', type: 'datetime', validation: (rule) => rule.required()}),
    defineField({
      name: 'mainImage',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', type: 'string', title: 'Alternative text'})],
    }),
    defineField({name: 'body', type: 'blockContent'}),
    defineField({
      name: 'legacyId',
      type: 'string',
      title: 'Webflow item ID',
      readOnly: true,
      description: 'Kept from the Webflow export so reruns and redirects can find this item.',
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'topic', media: 'mainImage'}},
})
