/**
 * Every Sanity query the site makes, in one place, so TypeGen can find them
 * (`npm run typegen`) and so a page never carries GROQ of its own.
 *
 * Queries project only what the pages render. Lists are ordered the way the
 * Webflow site ordered them: services by their fixed `sortOrder`, cases and
 * posts newest first.
 */
import { sanityClient } from "sanity:client";
import { createImageUrlBuilder } from "@sanity/image-url";
import { defineQuery } from "groq";

const builder = createImageUrlBuilder(sanityClient);

/** Build an image URL from a Sanity image field. Respects hotspot and crop. */
export const urlFor = (source: Parameters<typeof builder.image>[0]) =>
  builder.image(source).auto("format");

/** The image projection every query uses: asset URL, size, blur placeholder, alt. */
const imageFields = /* groq */ `
  asset->{ _id, url, metadata { lqip, dimensions { width, height } } },
  alt, hotspot, crop
`;

/** A case as it appears in a list — on the homepage, /work, and a service page. */
const caseCardFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  heading,
  subheading,
  thumbnail { ${imageFields} },
  service->{ title, "slug": slug.current }
`;

export const CASES_LIST_QUERY = defineQuery(/* groq */ `
  *[_type == "caseStudy" && defined(slug.current)] | order(publishedAt desc) {
    ${caseCardFields}
  }
`);

export const CASE_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "caseStudy" && defined(slug.current)]{ "slug": slug.current }
`);

export const CASE_DETAIL_QUERY = defineQuery(/* groq */ `
  *[_type == "caseStudy" && slug.current == $slug][0]{
    ${caseCardFields},
    description,
    process,
    impact,
    gallery[]{ _key, ${imageFields} },
    deliverables[]->{ _id, title, "slug": slug.current, subtitle, description, image { ${imageFields} } },
    "next": *[_type == "caseStudy" && defined(slug.current) && publishedAt < ^.publishedAt]
      | order(publishedAt desc)[0]{ ${caseCardFields} }
  }
`);

export const SERVICES_LIST_QUERY = defineQuery(/* groq */ `
  *[_type == "service" && defined(slug.current)] | order(sortOrder asc) {
    _id,
    title,
    "slug": slug.current,
    heading,
    description,
    label,
    image { ${imageFields} }
  }
`);

export const SERVICE_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "service" && defined(slug.current)]{ "slug": slug.current }
`);

export const SERVICE_DETAIL_QUERY = defineQuery(/* groq */ `
  *[_type == "service" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    heading,
    description,
    label,
    image { ${imageFields} },
    deliverables[]->{ _id, title, "slug": slug.current, subtitle, description, image { ${imageFields} } },
    "cases": *[_type == "caseStudy" && defined(slug.current) && service._ref == ^._id]
      | order(publishedAt desc){ ${caseCardFields} }
  }
`);

export const DELIVERABLE_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "deliverable" && defined(slug.current)]{ "slug": slug.current }
`);

export const DELIVERABLE_DETAIL_QUERY = defineQuery(/* groq */ `
  *[_type == "deliverable" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    subtitle,
    description,
    image { ${imageFields} }
  }
`);

export const TEAM_LIST_QUERY = defineQuery(/* groq */ `
  *[_type == "teamMember" && defined(slug.current)] | order(_createdAt asc) {
    _id,
    name,
    "slug": slug.current,
    jobTitle,
    photo { ${imageFields} }
  }
`);

export const TEAM_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "teamMember" && defined(slug.current)]{ "slug": slug.current }
`);

export const TEAM_DETAIL_QUERY = defineQuery(/* groq */ `
  *[_type == "teamMember" && slug.current == $slug][0]{
    _id,
    name,
    "slug": slug.current,
    jobTitle,
    bio,
    photo { ${imageFields} }
  }
`);

export const POSTS_LIST_QUERY = defineQuery(/* groq */ `
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    "slug": slug.current,
    topic,
    publishedAt,
    mainImage { ${imageFields} }
  }
`);

export const POST_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "post" && defined(slug.current)]{ "slug": slug.current }
`);

export const POST_DETAIL_QUERY = defineQuery(/* groq */ `
  *[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    topic,
    publishedAt,
    mainImage { ${imageFields} },
    body[]{
      ...,
      _type == "image" => { ${imageFields}, caption }
    }
  }
`);

export { sanityClient };
