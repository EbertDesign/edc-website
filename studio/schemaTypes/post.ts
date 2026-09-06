import {defineType, defineField} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

/**
 * The topics a post can carry. Exported because the Studio structure groups
 * the journal by these, and a list that drifts from the field would quietly
 * hide posts.
 */
export const POST_TOPICS = ['About Us', 'Nonprofit', 'B Corps', 'Brand Strategy', 'Brand Identity']

/** "12 Mar 2025" — short enough for a list row, unambiguous about the year. */
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})

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
    {title: 'Oldest first', name: 'publishedAsc', by: [{field: 'publishedAt', direction: 'asc'}]},
    {title: 'Title A–Z', name: 'titleAsc', by: [{field: 'title', direction: 'asc'}]},
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
      options: {list: POST_TOPICS.map((topic) => ({title: topic, value: topic}))},
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
  /* Topic and date, because the list is ordered by date and grouped by topic
     — those are the two things worth seeing without opening the post. */
  preview: {
    select: {title: 'title', topic: 'topic', publishedAt: 'publishedAt', media: 'mainImage'},
    prepare: ({title, topic, publishedAt, media}) => ({
      title,
      subtitle: [topic, publishedAt ? formatDate(publishedAt) : 'No date']
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
})
