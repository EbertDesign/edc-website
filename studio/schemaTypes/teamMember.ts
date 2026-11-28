import {defineType, defineField} from 'sanity'
import {UserIcon} from '@sanity/icons/User'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'

/** A person on the About page. Webflow collection "Team Members". */
export const teamMember = defineType({
  name: 'teamMember',
  title: 'Team member',
  type: 'document',
  icon: UserIcon,
  /* "Site order" is `orderRank`, set by dragging rows in the Studio's Team
     list (see structure.ts) and what TEAM_LIST_QUERY sorts by, so the Studio
     list and the About page agree. */
  orderings: [
    {...orderRankOrdering, title: 'Site order'},
    {title: 'Name A–Z', name: 'nameAsc', by: [{field: 'name', direction: 'asc'}]},
  ],
  fields: [
    /* Hidden. Written by the drag-and-drop Team list; a new member lands last. */
    orderRankField({type: 'teamMember'}),
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'jobTitle', type: 'string'}),
    defineField({name: 'bio', type: 'text', rows: 6}),
    defineField({
      name: 'photo',
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
  preview: {select: {title: 'name', subtitle: 'jobTitle', media: 'photo'}},
})
