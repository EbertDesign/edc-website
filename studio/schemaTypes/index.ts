import {blockContent} from './blockContent'
import {deliverable} from './deliverable'
import {service} from './service'
import {teamMember} from './teamMember'
import {post} from './post'
import {caseStudy} from './caseStudy'

/**
 * The five Webflow collections, one document type each, plus the rich-text
 * type they share. Leaf types first: `deliverable` is referenced by `service`
 * and `caseStudy`, and `service` by `caseStudy`.
 */
export const schemaTypes = [blockContent, deliverable, service, teamMember, post, caseStudy]
