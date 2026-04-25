# Week 1 Review — AA Intelligence RAG + Knowledge Repository Upgrade

Status: Not started  
Health: Green  
Risks logged: none yet  
Scope pages:
- `/brain/chat` → `src/pages/Brain.tsx`
- `/brain/repository` → `src/pages/Documents.tsx`

## Audit Summary

### What already works

- The AA Intelligence chat page is wired to the Supabase Edge Function `brain-chat` through `src/lib/brain.ts`.
- The production knowledge corpus exists in Supabase:
  - `knowledge_documents`: 588 rows
  - `knowledge_chunks`: 4,032 rows
  - `knowledge_queries`: 5 rows at audit time
- A live test query against `brain-chat` returned a valid answer, citations, model name, and query id.
- Core schema already exists for:
  - `knowledge_documents`
  - `knowledge_chunks`
  - `knowledge_queries`
  - `knowledge-documents` storage bucket
- RLS is already enabled and staff-scoped for knowledge documents/chunks.

### Main gaps

1. **Repository documents do not reliably open**
   - The repository tree is currently seeded from `AA_CURRENT_REPOSITORY` and persisted in `localStorage`.
   - Most document paths are local hard-drive paths such as `/Users/alex/Desktop/...`.
   - Opening `file://` paths from a deployed HTTPS app is blocked or unreliable in modern browsers.
   - Cloud file links are attempted via `app_files`, but the lookup is keyed only by `file_name`, which is collision-prone.
   - Cloud links are only passed to top-level `FileRow` nodes; nested child files do not receive the `cloudUrl` lookup, so most child docs still cannot open.

2. **Repository changes are local-only**
   - Add/edit/delete actions write to browser `localStorage`, not Supabase.
   - There is no durable repository management model.
   - There is no audit trail for who added, edited, linked, or deleted a document.

3. **No upload or link-to-ingestion flow**
   - Users cannot upload docs into the knowledge base from the UI.
   - Users cannot paste a Google Drive link and ingest it.
   - Uploaded files are not parsed, chunked, embedded, or indexed.

4. **RAG retrieval is not truly vector RAG yet**
   - `knowledge_chunks.embedding vector(1536)` exists but is not used by `brain-chat`.
   - Retrieval is lexical keyword scoring in TypeScript.
   - There is no embedding generation during import or query time.
   - There is no hybrid retrieval, similarity thresholding, or source freshness handling.

5. **AICOS reasoning is basic**
   - The chat prompt is useful, but short.
   - It forces “answer only from context,” which is good for factual grounding, but limits deeper strategic reasoning unless the context is retrieved well.
   - There is no conversation memory beyond optional `conversation_id` logging.
   - Query logs set `user_profile_id` to null.

6. **Knowledge corpus cache can go stale**
   - `brain-chat` caches the corpus globally in `corpusCache` and never invalidates it.
   - New uploads may not appear in chat until the Edge Function instance cold-starts or is redeployed.

## Recommended Build Sequence

### Phase 1 — Stabilize Repository Opening

Goal: make existing knowledge docs open from the deployed app.

Tasks:
1. Replace local `file://` launch behavior with a document detail drawer/modal.
2. Load documents from `knowledge_documents` instead of only `AA_CURRENT_REPOSITORY` / `localStorage`.
3. Add fields to display:
   - title
   - source type
   - status
   - tags
   - source path
   - Google Drive URL if present
   - body preview
   - indexed/chunk count
4. Add “Open Drive” button when `metadata.google_drive_url` or `external_url` exists.
5. Fix nested cloud links if the tree view is retained.
6. Remove or de-emphasize “Open local file” in production.

Acceptance checks:
- Searching repository returns Supabase knowledge docs.
- Clicking any repository item opens an in-app preview.
- Drive-linked docs open in a new tab.
- No deployed page depends on `file://` paths.

### Phase 2 — Add Upload + Link Intake UI

Goal: allow AA to grow the knowledge base from the app.

Tasks:
1. Add `KnowledgeUploader` component to `/brain/repository`.
2. Support:
   - file upload: PDF, DOCX, TXT, MD, HTML, CSV
   - URL/Google Drive link submission
   - manual text paste
3. Store uploaded files in the existing `knowledge-documents` bucket.
4. Insert a `knowledge_documents` row with status `processing`.
5. Call a new Supabase Edge Function: `knowledge-ingest`.
6. Show processing state and final indexed/chunk counts.

Acceptance checks:
- Admin can upload a document.
- Document appears in repository as `processing`, then `indexed`.
- Failed ingestion shows a clear error state.
- RLS still limits write access to staff.

### Phase 3 — Build Ingestion Pipeline

Goal: uploaded/linked docs become chunks in the knowledge base.

New Edge Function: `knowledge-ingest`

Responsibilities:
1. Require role: `admin`, later optionally `delivery` / `distribution`.
2. Accept one of:
   - `document_id`
   - `storage_path`
   - `drive_url`
   - `raw_text`
3. Extract text:
   - TXT/MD/HTML/CSV directly
   - PDF via parser service or server library
   - DOCX via conversion/parser
   - Google Drive docs via Drive export API where possible
4. Normalize text.
5. Chunk text with metadata:
   - `chunk_index`
   - token/character range
   - heading/path when available
   - source URL/path
6. Generate embeddings for each chunk.
7. Upsert chunks into `knowledge_chunks`.
8. Mark document `indexed`, set `indexed_at`, save `body`, metadata and counts.

Schema additions recommended:
- `knowledge_documents.external_url text`
- `knowledge_documents.drive_file_id text`
- `knowledge_documents.storage_path text`
- `knowledge_documents.mime_type text`
- `knowledge_documents.processing_status text`
- `knowledge_documents.processing_error text`
- `knowledge_documents.chunk_count integer default 0`
- `knowledge_documents.embedding_model text`
- `knowledge_chunks.token_count integer`

Acceptance checks:
- Same file uploaded twice either updates the same document or creates a version intentionally.
- Chunks are deleted/replaced when a document is re-indexed.
- Chunk count is visible in repository.

### Phase 4 — Upgrade Chat to Real RAG

Goal: make AICOS reason over AA knowledge with better retrieval.

Tasks:
1. Add SQL RPC function, e.g. `match_knowledge_chunks(query_embedding vector(1536), match_count int, filter jsonb)`.
2. Use vector similarity with `ivfflat` or `hnsw` index once corpus grows.
3. Generate query embedding inside `brain-chat`.
4. Retrieve top chunks by vector similarity.
5. Add hybrid scoring:
   - vector similarity
   - keyword/title boost
   - document status/version boost
   - recent/uploaded doc boost only if useful
6. Return citations with document id, title, chunk number, similarity, and source URL.
7. Remove or shorten global `corpusCache`; cache only lightweight metadata or add invalidation.
8. Log `user_profile_id` from `auth.uid()` / JWT subject.

Acceptance checks:
- Chat answers cite uploaded docs within one query after indexing.
- Newly uploaded docs are immediately searchable.
- Retrieval metadata says `vector` or `hybrid`, not `lexical`.
- Bad/no-context queries clearly say what context is missing.

### Phase 5 — Improve AICOS Reasoning Layer

Goal: make AICOS a strategic AA intelligence assistant, not just a document Q&A bot.

Tasks:
1. Update system prompt to include operating mode:
   - cite facts from knowledge base
   - distinguish fact vs recommendation
   - produce operational next steps
   - surface source gaps
   - prefer AA’s Proof × Volume × Consistency logic
2. Add chat mode selector:
   - Ask Knowledge Base
   - Draft Asset
   - Audit Funnel
   - Build SOP
   - Strategic Recommendation
3. Add optional source filters:
   - Proof Sprint
   - Proof Brand
   - Authority Brand
   - SOPs
   - Templates
   - Client docs
4. Add answer quality controls:
   - “show sources” default on
   - copy answer
   - open source doc
   - query history panel

Acceptance checks:
- Same question can produce grounded answer + actionable recommendation.
- Sources are clickable to repository detail view.
- Chat mode affects answer structure without hallucinating beyond sources.

## Lovable Build Sequence

Use this sequence to avoid breaking core ops/RLS.

### Lovable Prompt 1 — Repository Supabase Rewrite

Build `/brain/repository` around Supabase `knowledge_documents` and `knowledge_chunks` instead of localStorage. Add search, status filters, document preview drawer, chunk count, metadata, and Drive URL button. Keep the existing AICOS dark styling. Do not remove RLS. Do not expose service-role keys in frontend.

### Lovable Prompt 2 — Upload/Link UI

Add a Knowledge Upload panel to `/brain/repository` with three tabs: Upload File, Add Google Drive Link, Paste Text. On submit, create a `knowledge_documents` row with status `processing`, upload files to `knowledge-documents` storage, and call a Supabase Edge Function named `knowledge-ingest`. Show progress, success, and error states.

### Lovable Prompt 3 — Ingestion Edge Function + Migration

Create a migration for document ingestion metadata fields and add a Supabase Edge Function `knowledge-ingest`. It must require staff role, extract text, chunk documents, generate embeddings, upsert `knowledge_chunks`, and mark documents indexed. Use OpenAI embeddings with a 1536-dimensional model compatible with the existing vector column.

### Lovable Prompt 4 — Vector RAG Upgrade

Add a Postgres RPC function for vector chunk search. Update `brain-chat` from lexical retrieval to hybrid vector retrieval. Generate a query embedding, retrieve top chunks, build cited context, and log queries with the authenticated user id. Ensure newly indexed docs are searchable immediately.

### Lovable Prompt 5 — AICOS Reasoning UX

Improve `/brain/chat` with mode selector, source filters, clickable citations, query history, and stronger AA-specific reasoning prompt. Keep all factual claims grounded in retrieved context and label recommendations clearly.

## Dependencies / Prerequisites

### Required secrets
- `OPENAI_API_KEY` for chat and embeddings.
- Supabase URL + anon key in frontend env.
- Supabase service role only inside Edge Functions/server-side environments.
- Google Drive OAuth/service account credentials if Drive export ingestion is required.

### Required packages/services
- Supabase Edge Functions deployed.
- `pgvector` extension already present.
- File parser strategy for PDF/DOCX:
  - preferably server-side parser service or Edge-compatible parser,
  - fallback: accept text/markdown/html first, then add PDF/DOCX.

### Security constraints
- Never put service-role keys in Vite/frontend code.
- Keep knowledge docs/chunks staff-only unless intentionally exposing client-specific subsets.
- For Google Drive links, avoid making private Drive files public by default; store link metadata and open through authorized Drive access where possible.
- Add audit events for upload, re-index, delete, and link changes.

## Priority Recommendation

Build in this order:
1. Repository open/preview fix.
2. Upload/link intake.
3. Ingestion + chunking.
4. Vector/hybrid RAG.
5. AICOS reasoning UX.

This keeps the system stable while turning the existing corpus into a live, growing AA intelligence layer.
