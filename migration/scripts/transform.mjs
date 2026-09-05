/**
 * Webflow CSV export -> Sanity NDJSON.
 *
 *   node migration/scripts/transform.mjs
 *
 * Reads the five collection CSVs in migration/extracted, writes
 * migration/transformed/import.ndjson and a report in migration/reports.
 * Deterministic: the same input produces the same output, so it can be
 * re-run and re-imported with `sanity dataset import --replace`.
 *
 * Decisions worth knowing:
 *
 * - Document IDs are `wf-<Webflow item ID>`. The Sanity guidance prefers
 *   generated IDs, but an NDJSON import has to know every ID up front to
 *   write the references between documents in the same file, and the Webflow
 *   item ID is a real, stable identity from the source system. It is also
 *   stored as `legacyId`, so nothing depends on the convention later.
 * - Draft or archived items in Webflow become Sanity drafts (`drafts.` prefix):
 *   present in the Studio, absent from the site, exactly as they were.
 * - Images point at the local snapshot in cms-assets via `_sanityAsset`
 *   (`image@file://...`), which the CLI importer uploads. Nothing imported
 *   depends on the Webflow CDN.
 * - Rich text HTML becomes Portable Text with @portabletext/block-tools.
 *   Webflow's `<figure data-rt-type="image">` wrappers become image blocks
 *   with alt and caption; links keep their href and new-tab flag.
 */
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs'
import {resolve, basename} from 'node:path'
import {pathToFileURL} from 'node:url'
import {parse} from 'csv-parse/sync'
import {JSDOM} from 'jsdom'
import {htmlToBlocks} from '@portabletext/block-tools'
import {createSchema} from 'sanity'

const ROOT = resolve(import.meta.dirname, '../..')
const EXTRACTED = resolve(ROOT, 'migration/extracted')
const ASSETS = resolve(ROOT, '../cms-assets')
const OUT = resolve(ROOT, 'migration/transformed/import.ndjson')
const REPORT = resolve(ROOT, 'migration/reports/transform-report.json')

// ---------------------------------------------------------------- helpers

const report = {counts: {}, drafts: [], issues: []}
const issue = (type, slug, message) => report.issues.push({type, slug, message})

const csv = (nameFragment) => {
  const file = resolve(
    EXTRACTED,
    `Ebert Design Company - ${nameFragment}.csv`,
  )
  return parse(readFileSync(file, 'utf8'), {columns: true, bom: true, skip_empty_lines: true})
}

const isTrue = (v) => String(v ?? '').trim().toLowerCase() === 'true'
const isDraft = (row) => isTrue(row.Draft) || isTrue(row.Archived)
const docId = (row) => `${isDraft(row) ? 'drafts.' : ''}wf-${row['Item ID']}`
const publishedId = (row) => `wf-${row['Item ID']}`
const clean = (v) => {
  const s = String(v ?? '').replace(/‍/g, '').trim()
  return s.length ? s : undefined
}
const date = (v) => {
  const d = new Date(String(v ?? ''))
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}
const slug = (v) => ({_type: 'slug', current: String(v).trim()})
const key = (prefix, i) => `${prefix}-${i}`
const list = (v) =>
  String(v ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

/* Webflow writes `__wf_reserved_inherit` as an alt meaning "use the asset's
   own" — which is no alt at all. */
const altText = (v) => {
  const s = clean(v)
  return s && s !== '__wf_reserved_inherit' ? s : undefined
}

/* Snapshot filenames are the URL's basename, percent-decoded and stripped of
   Unicode format characters (Webflow leaks left-to-right marks into a few).
   Must match the normalisation in the download step. */
const snapshotName = (url) =>
  decodeURIComponent(basename(url))
    .replace(/[\p{Cf}\p{Cc}]/gu, '')
    .trim()

/** A Sanity image pointing at the local snapshot of a Webflow CDN URL. */
const image = (url, alt, slugForReport) => {
  if (!url) return undefined
  const file = resolve(ASSETS, snapshotName(url))
  const a = altText(alt)
  if (!existsSync(file)) {
    issue('missing-asset', slugForReport, `not in snapshot: ${url}`)
    return {_type: 'image', _sanityAsset: `image@${url}`, ...(a ? {alt: a} : {})}
  }
  // pathToFileURL encodes the spaces in the project path correctly.
  return {_type: 'image', _sanityAsset: `image@${pathToFileURL(file).href}`, ...(a ? {alt: a} : {})}
}

// ------------------------------------------------- rich text -> Portable Text

/* block-tools needs the compiled type it is converting into, so a minimal
   mirror of studio/schemaTypes/blockContent.ts lives here. Keep the two in
   step. `createSchema` from `sanity` (not `@sanity/schema`) so the built-in
   image/hotspot types resolve. */
const schema = createSchema({
  name: 'migration',
  types: [
    {
      name: 'blockContent',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                fields: [
                  {name: 'href', type: 'url'},
                  {name: 'blank', type: 'boolean'},
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          fields: [
            {name: 'alt', type: 'string'},
            {name: 'caption', type: 'string'},
          ],
        },
      ],
    },
  ],
})
const blockContentType = schema.get('blockContent')

const richText = (html, slugForReport) => {
  const src = clean(html)
  if (!src) return undefined
  let linkCount = 0

  /* Webflow writes `<p id="">‍</p>` (a zero-width joiner) as an empty line
     and demotes nothing, so the one `<h1>` inside a body would fight the
     page's own. Clean both before converting. */
  const dom = new JSDOM(src)
  const doc = dom.window.document
  doc.querySelectorAll('h1').forEach((h) => {
    const h2 = doc.createElement('h2')
    h2.innerHTML = h.innerHTML
    h.replaceWith(h2)
  })
  doc.querySelectorAll('p').forEach((p) => {
    if (!p.textContent.replace(/[\s‍]/g, '').length && !p.querySelector('img')) p.remove()
  })

  const blocks = htmlToBlocks(doc.body.innerHTML, blockContentType, {
    parseHtml: (h) => new JSDOM(h).window.document,
    rules: [
      {
        deserialize(el, next) {
          const tag = el.tagName?.toLowerCase()

          // Webflow's image figure: <figure data-rt-type="image"><div><img></div><figcaption>…
          if (tag === 'figure') {
            const img = el.querySelector('img')
            const srcUrl = img?.getAttribute('src')
            if (!srcUrl) return undefined
            const caption = clean(el.querySelector('figcaption')?.textContent)
            const alt = img.getAttribute('alt')
            return {
              _type: '__block',
              block: {
                ...image(srcUrl, alt, slugForReport),
                ...(caption ? {caption} : {}),
              },
            }
          }
          if (tag === 'img') {
            const srcUrl = el.getAttribute('src')
            if (!srcUrl) return undefined
            return {_type: '__block', block: image(srcUrl, el.getAttribute('alt'), slugForReport)}
          }
          if (tag === 'a') {
            const href = el.getAttribute('href')
            if (!href) return undefined
            /* block-tools does not key a markDef that a custom rule returns,
               and a keyless markDef leaves every span pointing at `null`. Key
               it here; the renumbering below keeps the pairing intact. */
            return {
              _type: '__annotation',
              markDef: {
                _type: 'link',
                _key: `link-${linkCount++}`,
                href,
                blank: el.getAttribute('target') === '_blank',
              },
              children: next(el.childNodes),
            }
          }
          return undefined
        },
      },
    ],
  })

  // Stable keys so a rerun produces byte-identical output. Spans refer to
  // markDefs by key, so renumber the markDefs first and remap the spans'
  // `marks` to the new keys — otherwise every link annotation dangles.
  blocks.forEach((b, i) => {
    b._key = key('b', i)
    const renamed = new Map()
    if (Array.isArray(b.markDefs))
      b.markDefs.forEach((m, j) => {
        const next = key(`b${i}m`, j)
        renamed.set(m._key, next)
        m._key = next
      })
    if (Array.isArray(b.children))
      b.children.forEach((c, j) => {
        c._key = key(`b${i}s`, j)
        if (Array.isArray(c.marks)) c.marks = c.marks.map((mk) => renamed.get(mk) ?? mk)
      })
  })
  return blocks
}

// ------------------------------------------------------------- transform

const deliverablesCsv = csv('Deliverables - 64beea3c9843812b08125eba')
const servicesCsv = csv('Services - 64beea3c9843812b08125ee0')
const teamCsv = csv('Team Members - 64beea3c9843812b08125ea4')
const postsCsv = csv('Blog Posts - 64beea3c9843812b08125edf')
const casesCsv = csv('Cases - 64beea3c9843812b08125e81')

/* Webflow's reference fields export the *slug* of the target here, so the
   lookups are slug -> published document ID. */
const deliverableBySlug = new Map(deliverablesCsv.map((r) => [r.Slug, publishedId(r)]))
const serviceBySlug = new Map(servicesCsv.map((r) => [r.Slug, publishedId(r)]))

const ref = (id, i) => ({_type: 'reference', _ref: id, _key: key('r', i)})
const refs = (slugs, lookup, kind, owner) =>
  slugs
    .map((s, i) => {
      const id = lookup.get(s)
      if (!id) issue('unresolved-reference', owner, `${kind} "${s}" not found`)
      return id ? ref(id, i) : null
    })
    .filter(Boolean)

const base = (row, type) => ({
  _id: docId(row),
  _type: type,
  legacyId: row['Item ID'],
})

const docs = []

for (const r of deliverablesCsv) {
  docs.push({
    ...base(r, 'deliverable'),
    title: clean(r.Name),
    slug: slug(r.Slug),
    subtitle: clean(r.Subtitle),
    description: clean(r['Description Text']),
    image: image(clean(r['Deliverables Image']), clean(r.Name), r.Slug),
  })
}

for (const r of servicesCsv) {
  docs.push({
    ...base(r, 'service'),
    title: clean(r.Name),
    slug: slug(r.Slug),
    heading: clean(r.Heading),
    description: clean(r['Description Text']),
    image: image(clean(r['Service Image']), clean(r.Name), r.Slug),
    sortOrder: clean(r['Custom Sort Order']) ? Number(r['Custom Sort Order']) : undefined,
    label: clean(r.Number),
    deliverables: refs(list(r.Deliverables), deliverableBySlug, 'deliverable', r.Slug),
  })
}

for (const r of teamCsv) {
  docs.push({
    ...base(r, 'teamMember'),
    name: clean(r.Name),
    slug: slug(r.Slug),
    jobTitle: clean(r['Job Title']),
    bio: clean(r['Bio Summary']),
    photo: image(clean(r['Profile Picture']), clean(r.Name), r.Slug),
  })
}

for (const r of postsCsv) {
  docs.push({
    ...base(r, 'post'),
    title: clean(r.Name),
    slug: slug(r.Slug),
    topic: clean(r.Topic),
    publishedAt: date(r['Published On']) ?? date(r['Created On']),
    mainImage: image(clean(r['Main Image']), clean(r.Name), r.Slug),
    body: richText(r['Post Body'], r.Slug),
  })
}

for (const r of casesCsv) {
  const serviceId = clean(r.Service) ? serviceBySlug.get(r.Service.trim()) : undefined
  if (clean(r.Service) && !serviceId) issue('unresolved-reference', r.Slug, `service "${r.Service}" not found`)
  const galleryUrls = list(r['Project Images'])
  docs.push({
    ...base(r, 'caseStudy'),
    title: clean(r.Name),
    slug: slug(r.Slug),
    heading: clean(r['Project Heading']),
    subheading: clean(r['Project Subheading']),
    description: clean(r['Project description']),
    service: serviceId ? {_type: 'reference', _ref: serviceId} : undefined,
    deliverables: refs(list(r.Deliverables), deliverableBySlug, 'deliverable', r.Slug),
    featured: isTrue(r['Featured Project?']),
    publishedAt: date(r['Published On']) ?? date(r['Created On']),
    thumbnail: image(clean(r.Thumbnail), clean(r['Thumnail Alt Text']) ?? clean(r.Name), r.Slug),
    gallery: galleryUrls.map((u, i) => ({...image(u, `${clean(r.Name)} — image ${i + 1}`, r.Slug), _key: key('g', i)})),
    process: richText(r['Process description'], r.Slug),
    impact: richText(r['Impact description'], r.Slug),
  })
  if (isDraft(r)) report.drafts.push({type: 'caseStudy', slug: r.Slug})
}

// Leave empty fields unset rather than null.
const strip = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)),
  )

const lines = docs.map((d) => JSON.stringify(strip(d)))
mkdirSync(resolve(ROOT, 'migration/transformed'), {recursive: true})
mkdirSync(resolve(ROOT, 'migration/reports'), {recursive: true})
writeFileSync(OUT, lines.join('\n') + '\n')

for (const d of docs) report.counts[d._type] = (report.counts[d._type] ?? 0) + 1
report.total = docs.length
report.assets = lines.join('\n').match(/_sanityAsset/g)?.length ?? 0
writeFileSync(REPORT, JSON.stringify(report, null, 2))

console.log(`wrote ${docs.length} documents -> ${OUT}`)
console.log('counts', report.counts)
console.log(`assets referenced: ${report.assets}, drafts: ${report.drafts.length}, issues: ${report.issues.length}`)
for (const i of report.issues) console.log('  !', i.type, i.slug, i.message)
