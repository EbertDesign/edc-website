import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {CaseIcon} from '@sanity/icons/Case'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {EditIcon} from '@sanity/icons/Edit'
import {FilterIcon} from '@sanity/icons/Filter'
import {SparklesIcon} from '@sanity/icons/Sparkles'
import {StackIcon} from '@sanity/icons/Stack'
import {StarIcon} from '@sanity/icons/Star'
import {TagIcon} from '@sanity/icons/Tag'
import {UsersIcon} from '@sanity/icons/Users'
import {POST_TOPICS} from './schemaTypes/post'

/**
 * How the Studio's left pane is organised.
 *
 * The default structure lists the five document types alphabetically, which
 * says nothing about how the site is put together. This mirrors the site
 * instead — the work, the services that classify it, the deliverables those
 * services are made of, the journal, and the team — and every grouped list
 * answers a question an editor actually has: which cases belong to Brand
 * Identity, which deliverables no page mentions, what is still an unfinished
 * draft from the Webflow import.
 *
 * Two things to know before editing this file:
 *
 * - A `documentList` carrying a `filter` must also declare `.apiVersion()`.
 *   Miss it and the list fails when opened, not when the Studio builds.
 * - These lists resolve under the Studio's `drafts` perspective, where a
 *   draft comes back under its *published* `_id`. `_id in path("drafts.**")`
 *   is therefore always false in here — `_originalId` is the one that still
 *   carries the prefix, so that is what "Unpublished" filters on.
 */

/** Matches the frontend's client (see astro.config.mjs) so both read the same API. */
const API_VERSION = '2026-09-04'

type Ordering = {field: string; direction: 'asc' | 'desc'}[]

/** Cases and posts: newest first, the order /work and /journal render. */
const NEWEST_FIRST: Ordering = [{field: 'publishedAt', direction: 'desc'}]
/** Services: the fixed 01–04 order the site shows them in. */
const SITE_ORDER: Ordering = [{field: 'sortOrder', direction: 'asc'}]
/** Deliverables: 35 of them, so alphabetical is the only findable order. */
const ALPHABETICAL: Ordering = [{field: 'title', direction: 'asc'}]
/** Team: oldest first, matching TEAM_LIST_QUERY's `order(_createdAt asc)`. */
const JOINED_FIRST: Ordering = [{field: '_createdAt', direction: 'asc'}]

/** A filtered list of one type. Wraps the `.apiVersion()` requirement. */
const filtered = (
  S: StructureBuilder,
  {
    title,
    schemaType,
    filter,
    params,
    ordering,
  }: {
    title: string
    schemaType: string
    filter: string
    params?: Record<string, unknown>
    ordering: Ordering
  },
) => {
  const list = S.documentList()
    .apiVersion(API_VERSION)
    .title(title)
    .schemaType(schemaType)
    .filter(filter)
    .defaultOrdering(ordering)

  return params ? list.params(params) : list
}

/**
 * The work. Three saved views over the same six documents, then the same
 * grouping the site uses — a case belongs to exactly one service.
 */
const caseStudies = (S: StructureBuilder) =>
  S.listItem()
    .id('caseStudies')
    .title('Case studies')
    .icon(CaseIcon)
    .child(
      S.list()
        .id('caseStudiesList')
        .title('Case studies')
        .items([
          S.listItem()
            .id('allCases')
            .title('All case studies')
            .icon(CaseIcon)
            .child(
              S.documentTypeList('caseStudy')
                .title('All case studies')
                .defaultOrdering(NEWEST_FIRST),
            ),
          S.listItem()
            .id('featuredCases')
            .title('Featured')
            .icon(StarIcon)
            .child(
              filtered(S, {
                title: 'Featured',
                schemaType: 'caseStudy',
                filter: '_type == "caseStudy" && featured == true',
                ordering: NEWEST_FIRST,
              }),
            ),
          S.listItem()
            .id('unpublishedCases')
            .title('Unpublished')
            .icon(EditIcon)
            .child(
              filtered(S, {
                title: 'Unpublished',
                schemaType: 'caseStudy',
                // Never published, or published with edits still in draft.
                filter: '_type == "caseStudy" && _originalId in path("drafts.**")',
                ordering: NEWEST_FIRST,
              }),
            ),
          S.divider(),
          S.listItem()
            .id('casesByService')
            .title('By service')
            .icon(SparklesIcon)
            .child(
              S.documentTypeList('service')
                .title('By service')
                .defaultOrdering(SITE_ORDER)
                .child((serviceId) =>
                  filtered(S, {
                    title: 'Case studies',
                    schemaType: 'caseStudy',
                    filter: '_type == "caseStudy" && service._ref == $serviceId',
                    params: {serviceId},
                    ordering: NEWEST_FIRST,
                  }),
                ),
            ),
        ]),
    )

/**
 * The 35 deliverables. Flat and alphabetical for finding one, grouped by
 * service for seeing the shape of an offering, plus the list that catches
 * the one mistake this type invites — a deliverable nothing points at, which
 * gets a /deliverables/ page no navigation reaches.
 */
const deliverables = (S: StructureBuilder) =>
  S.listItem()
    .id('deliverables')
    .title('Deliverables')
    .icon(CheckmarkCircleIcon)
    .child(
      S.list()
        .id('deliverablesList')
        .title('Deliverables')
        .items([
          S.listItem()
            .id('allDeliverables')
            .title('All deliverables')
            .icon(StackIcon)
            .child(
              S.documentTypeList('deliverable')
                .title('All deliverables')
                .defaultOrdering(ALPHABETICAL),
            ),
          S.listItem()
            .id('deliverablesByService')
            .title('By service')
            .icon(SparklesIcon)
            .child(
              S.documentTypeList('service')
                .title('By service')
                .defaultOrdering(SITE_ORDER)
                .child((serviceId) =>
                  filtered(S, {
                    title: 'Deliverables',
                    schemaType: 'deliverable',
                    filter:
                      '_type == "deliverable" && _id in *[_id == $serviceId].deliverables[]._ref',
                    params: {serviceId},
                    ordering: ALPHABETICAL,
                  }),
                ),
            ),
          S.divider(),
          S.listItem()
            .id('orphanDeliverables')
            .title('Not used anywhere')
            .icon(FilterIcon)
            .child(
              filtered(S, {
                title: 'Not used anywhere',
                schemaType: 'deliverable',
                filter: `_type == "deliverable"
                  && !(_id in *[_type == "service"].deliverables[]._ref)
                  && !(_id in *[_type == "caseStudy"].deliverables[]._ref)`,
                ordering: ALPHABETICAL,
              }),
            ),
        ]),
    )

/**
 * The journal. `topic` is a fixed string list rather than a reference type,
 * so the groups come from the same constant the field is built from — the
 * two cannot drift apart.
 */
const journal = (S: StructureBuilder) =>
  S.listItem()
    .id('journal')
    .title('Journal')
    .icon(DocumentTextIcon)
    .child(
      S.list()
        .id('journalList')
        .title('Journal')
        .items([
          S.listItem()
            .id('allPosts')
            .title('All posts')
            .icon(DocumentTextIcon)
            .child(S.documentTypeList('post').title('All posts').defaultOrdering(NEWEST_FIRST)),
          S.divider(),
          ...POST_TOPICS.map((topic) =>
            S.listItem()
              .id(`topic-${topic.toLowerCase().replace(/\W+/g, '-')}`)
              .title(topic)
              .icon(TagIcon)
              .child(
                filtered(S, {
                  title: topic,
                  schemaType: 'post',
                  filter: '_type == "post" && topic == $topic',
                  params: {topic},
                  ordering: NEWEST_FIRST,
                }),
              ),
          ),
        ]),
    )

export const structure: StructureResolver = (S) =>
  S.list()
    .id('root')
    .title('Ebert Design')
    .items([
      caseStudies(S),
      S.listItem()
        .id('services')
        .title('Services')
        .icon(SparklesIcon)
        .child(S.documentTypeList('service').title('Services').defaultOrdering(SITE_ORDER)),
      deliverables(S),
      journal(S),
      S.divider(),
      S.listItem()
        .id('team')
        .title('Team')
        .icon(UsersIcon)
        .child(S.documentTypeList('teamMember').title('Team').defaultOrdering(JOINED_FIRST)),
    ])
