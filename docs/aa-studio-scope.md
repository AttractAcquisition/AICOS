# aa-studio Scope

## Purpose

aa-studio is the **content production layer** of AICOS.

AICOS already covers the business system, client delivery, knowledge base, SOPs, templates, CRM, portal, and reporting. aa-studio should complete the system by turning strategy, proof, and offers into publishable content.

## What aa-studio is

- The place where ideas become content
- The production room for short-form and long-form content
- The system for turning proof into repeatable content assets
- The workspace for drafting, revising, approving, versioning, and repurposing content

## What aa-studio is not

- Not the CRM
- Not the client portal
- Not the SOP library
- Not the knowledge repository
- Not the general admin console
- Not a generic chat app

## Core modules

### 1. Content Briefs
Turn raw inputs into production-ready briefs.

Inputs:
- offer
- audience
- proof
- angle
- goal
- platform
- CTA

Outputs:
- content brief
- hook ideas
- script direction
- deliverable checklist

### 2. Content Strategy
Plan what gets made and why.

Functions:
- content pillars
- campaign themes
- weekly calendar
- batch planning
- angle testing
- content priorities

### 3. Content Production
Create the actual assets.

Asset types:
- reels scripts
- talking-head scripts
- carousel copy
- captions
- email drafts
- ad copy
- landing page copy
- hook banks
- CTA variants

### 4. Repurposing Engine
Convert one input into many outputs.

Example sources:
- client results
- call notes
- testimonials
- SOPs
- offer docs
- recorded voice notes
- long-form articles

Example outputs:
- reel script
- carousel
- caption
- email
- ad angle
- quote post

### 5. Review and QA
Keep content on-brand and accurate.

Checks:
- brand voice
- offer consistency
- factual accuracy
- CTA clarity
- platform fit
- repetition / duplication

### 6. Asset Library
Store and retrieve production assets.

Should track:
- source
- version
- status
- owner
- platform
- performance
- tags

### 7. Performance Feedback
Close the loop.

Should track:
- views
- saves
- comments
- replies
- CTR
- leads
- booked calls
- winners / losers

## Main screens

### Studio Home
- today’s queue
- drafts in progress
- approvals needed
- winning assets
- recent briefs

### Brief Builder
- create new content brief
- choose offer / pillar / goal
- generate angles and hooks

### Calendar
- batch plan
- scheduled content themes
- weekly production queue

### Asset Editor
- draft content
- edit variants
- save versions
- attach source proof

### Repurpose View
- one source in
- many content outputs out
- export by channel

### Review Queue
- pending approvals
- edit notes
- approve / reject / revise

### Library
- search all assets
- filter by platform, pillar, offer, status, owner
- open source links and versions

### Performance
- content metrics
- winner analysis
- angle comparison
- content learnings

## Database objects

Recommended canonical tables:

- `content_projects`
- `content_briefs`
- `content_assets`
- `content_asset_versions`
- `content_asset_sources`
- `content_reviews`
- `content_calendar_items`
- `content_publish_jobs`
- `content_metrics`
- `content_tags`
- `content_asset_tag_map`
- `content_playbooks`

## Suggested object behavior

### `content_projects`
A content workstream or campaign container.

### `content_briefs`
The structured input that starts production.

### `content_assets`
The canonical content record.

### `content_asset_versions`
Track every draft and revision.

### `content_asset_sources`
Link each asset back to its proof, notes, or source file.

### `content_reviews`
Capture approval status, feedback, and sign-off.

### `content_calendar_items`
Track planned publish dates and production batches.

### `content_publish_jobs`
Track export / handoff / distribution tasks.

### `content_metrics`
Store content performance and outcome data.

## External integrations

aa-studio should lean on:

- **Supabase** for auth, storage, and content records
- **Google Drive / file system** for source media and raw files
- **GitHub** for versioned templates, prompts, and system docs
- **N8N** for automations and routing
- **Slack / Gmail** for review, approvals, and handoff
- **AICOS RAG** for source retrieval and proof lookup

## Recommended workflow

1. capture source material
2. generate brief
3. draft content
4. review and revise
5. approve
6. export / handoff
7. measure performance
8. feed learnings back into strategy

## Core principle

aa-studio should be the **content manufacturing layer** of AICOS, not just a writer.
It should turn strategy, proof, and offers into a repeatable content system.
