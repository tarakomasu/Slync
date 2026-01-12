Perfect Product Spec v1 (Mobile)

Product: Slide Player + Page-linked Subtitles (optionally Audio)

Primary outcome: Given a deck (slides as images/PDF) + page metadata + subtitles (grouped per page), an engineer (or AI) can implement a polished, bug-free mobile-first player that matches the intended UI and behavior.

Language: UI strings and spec are English-first.

⸻

1. Product intent

1.1 What this app is

A reading-first presentation player:
	•	Slides provide visual context.
	•	Subtitles are the primary narrative surface.
	•	Audio is optional (nice-to-have). The UX must remain excellent without audio.

1.2 Target UX principles
	•	Mobile-first, one-hand friendly (thumb reach, bottom controls).
	•	Minimal, clean (Zenn-like), with color used only to communicate state.
	•	Deterministic sync between slide page ↔ subtitle page group.

⸻

2. Scope & milestones

2.1 MVP (must ship)
	•	Player screen (mobile) with:
	•	Slide viewer (fixed at top)
	•	Subtitle area (scrollable)
	•	Bottom playback controls (fixed)
	•	Subtitles are page-linked:
	•	Exactly one subtitle component per slide page.
	•	Subtitle components are disclosures/accordions.
	•	Only the current slide page’s subtitle disclosure is open.
	•	Page navigation:
	•	Swipe/tap controls to move page
	•	Tap a collapsed subtitle row to jump to that page
	•	On page change: open the new page’s disclosure and scroll so its top aligns to the top of the subtitle viewport.
	•	Required data rule:
	•	Each page subtitle group MUST include a shortTitle shown when collapsed.

2.2 Audio (optional in MVP)
	•	If audio exists:
	•	Play/pause, seek, rate
	•	Highlight active chunk by time
	•	Derive active page by active chunk
	•	If audio is missing:
	•	UI remains fully usable; play button becomes disabled state.

2.3 Explicit non-goals for this spec
	•	Upload flow, editing UI, permissions
	•	Social features
	•	Embed
	•	Fully automated transcription pipeline

⸻

3. Terminology
	•	Deck: a single presentation.
	•	Page: slide page number (1-indexed).
	•	SubtitleGroup: the single disclosure component for a given page.
	•	Chunk: a line/paragraph of subtitle text within a page.
	•	Active page: page currently displayed in slide viewer.
	•	Active chunk: chunk corresponding to current audio time (if audio) or selection state (if no audio).

⸻

4. Data model (authoritative)

4.1 Types (recommended)

export type Deck = {
  id: string
  title: string
  authorName?: string

  // Slides
  pageCount: number
  pages: Array<{
    pageNumber: number // 1..pageCount
    imageUrl: string
    width?: number
    height?: number
  }>

  // Optional audio
  audioUrl?: string
  durationMs?: number
}

export type SubtitleChunk = {
  id: string
  text: string
  // Optional timing
  startMs?: number
  endMs?: number
}

export type SubtitleGroup = {
  pageNumber: number
  shortTitle: string // REQUIRED
  chunks: SubtitleChunk[] // can be empty, but the group still exists
}

4.2 Invariants (must hold)
	•	Deck.pageCount === Deck.pages.length (or pages array must include all page numbers).
	•	SubtitleGroup exists for every slide page 1..pageCount.
	•	SubtitleGroup.shortTitle is required and non-empty.
	•	If timing exists:
	•	For each chunk, startMs < endMs.
	•	Chunks within a group are sorted by startMs.

⸻

5. Screen: Player (mobile)

5.1 Layout (three regions)
	1.	Slide Viewer (fixed)

	•	Slide image sits directly on a white background (no matte stage).
	•	Slide viewer uses full device width; slide image fills the available width.
	•	No slide progress bar under the slide.
	•	No ellipsis / 3-dot menu in the slide area.

	2.	Subtitle Area (scrollable)

	•	Header row:
	•	Left: Subtitle (section title)
	•	Right: Index button (render button only in current scope)
	•	Below header: list of subtitle groups (one per page), disclosure-style.

	3.	Bottom Controls (fixed)

	•	Row 1: seek bar + speed label (e.g., 1.0x)
	•	Row 2: transport controls with a large central Play button
	•	Player fills the device viewport; no outer demo card frame.

5.2 Spacing & sizing (guidelines)
	•	Slide viewer height: ~38–45% of viewport on iPhone (keep subtitles visible).
	•	Subtitle header height: 44–52px.
	•	Collapsed subtitle row height: 52–60px (minimum 44px tap target).
	•	Expanded card padding: 12–16px.
	•	Chunk row height: content-driven, but maintain 10–14px vertical padding.

⸻

6. Subtitle UI spec (core)

6.1 Collapsed state (all pages except active)

Each SubtitleGroup renders as one single-line row:
	•	Left: page number pill (e.g., 1) aligned vertically with list
	•	Middle: shortTitle (single line, truncates with ellipsis)
	•	Right: chevron indicating “expand”
	•	Background: white
	•	Divider: subtle gray line between rows

6.2 Expanded state (only active page)

The active page’s SubtitleGroup expands into a card-like block:

Card header (single line):
	•	Left: page number pill
	•	Middle: shortTitle
	•	Right: chevron pointing up (collapse)

Card body (multi-line content):
	•	A vertical list of chunks.
	•	Each chunk row contains:
	•	Left: page number pill (same page number) OR a minimal marker aligned to the list’s left column.
	•	Right: chunk text (1–3 lines typical; wrap naturally).
	•	Active chunk highlight (if any):
	•	Light blue rounded background behind the chunk row
	•	Optional left accent bar

6.3 Required content rules
	•	shortTitle is mandatory and must remain visible in collapsed state.
	•	Chunks can be empty; if empty show a small placeholder text inside the expanded card:
	•	No subtitles available for this page.

⸻

7. Navigation & interaction model

7.1 Page → subtitles (primary sync)

Whenever activePage changes (by any method):
	1.	Close any currently expanded subtitle group.
	2.	Expand the SubtitleGroup for activePage.
	3.	Scroll the subtitle list so that the expanded card’s top edge aligns with the top of the subtitle viewport just below the “Subtitle / Index” header.
	4.	(If audio + time is known) ensure active chunk is visible inside the expanded card.

Scroll alignment rule:
	•	The expanded card should sit at the top; collapsed rows for other pages appear below.

7.2 Subtitles → page (secondary navigation)
	•	Tapping a collapsed subtitle row:
	•	Sets activePage to that row’s page
	•	Triggers the page→subtitles sync above
	•	Tapping the expanded card header:
	•	Optional: collapses it. (However, product rule says only active page is open; if collapsed, immediately re-open OR allow temporary collapse but keep active page unchanged.)

Recommended behavior:
	•	Keep the active page group always open for stability; tapping header does nothing or provides subtle feedback.

7.3 Slide interactions
	•	Swipe left/right on slide to change page.
	•	Optional tap zones: left edge = previous page, right edge = next page.
	•	Page changes trigger sync (Section 7.1).

7.4 Index button
	•	For current request: render the Index button only.
	•	Future behavior (defined for completeness): tapping opens a right-side table-of-contents sheet with pageNumber + shortTitle.

⸻

8. Audio behavior (optional)

8.1 Playback states
	•	If Deck.audioUrl exists:
	•	Play/Pause works
	•	Seek works
	•	Playback rate cycles (1.0x → 1.25x → 1.5x → 2.0x)
	•	If missing:
	•	Play is disabled; show disabled styling and no errors.

8.2 Active chunk by time

If chunks have startMs/endMs, compute:
	•	activeChunk = first chunk where startMs <= t < endMs.
	•	activePage = page containing activeChunk.
	•	On activePage changes due to time, apply page→subtitle sync.

8.3 Seek behavior
	•	Seek updates currentTimeMs.
	•	After seek, update active chunk/page, open corresponding subtitle group, and scroll to it.

⸻

9. State management

9.1 Player state (recommended)

export type PlayerState = {
  activePage: number
  currentTimeMs: number
  isPlaying: boolean
  playbackRate: number

  // Derived
  activeChunkId?: string

  // Prevent feedback loops
  syncLock: { mode: 'none' | 'fromPageChange' | 'fromSubtitleTap' | 'fromAudioTime'; untilTs: number }
}

9.2 Sync lock rules

Goal: avoid “scroll fights” and rapid toggling.
	•	When page changes by swipe/tap: set lock fromPageChange for ~400ms.
	•	When user taps a subtitle row: set lock fromSubtitleTap for ~400ms.
	•	When audio time advances triggers page change: set lock fromAudioTime for ~200ms.
	•	During a lock window, ignore redundant scroll-driven updates.

⸻

10. Visual design tokens (implementation-friendly)
	•	Background: #FFFFFF
	•	Text primary: near-black (#111)
	•	Text secondary: gray (#666)
	•	Dividers: very light gray (#EAEAEA)
	•	Matte behind slide: deep gray (#2F3640 to #3A404A range)
	•	Accent blue (state): iOS-like blue (#2F80FF range)
	•	Active highlight background: very light blue (#EAF2FF range)
	•	Corner radius:
	•	Slide card: 12–16
	•	Expanded subtitle card: 12–16
	•	Page number pill: 10–12

Exact colors can be implemented via Tailwind tokens and adjusted visually; keep the single-accent philosophy.

⸻

11. Component specs

11.1 SlideViewer

Props:
	•	pages, activePage, onChangePage(nextPage)
Behavior:
	•	Renders current page image with aspect-fit
	•	Preload activePage ± 1 images
	•	Swipe gestures change page

11.2 SubtitleHeader

Props:
	•	none or onIndex()
UI:
	•	Title “Subtitle” left
	•	Index button right (button only)

11.3 SubtitleGroupRow (collapsed)

Props:
	•	pageNumber, shortTitle, isActive, onTap()
UI:
	•	Single line; chevron

11.4 SubtitleGroupCard (expanded)

Props:
	•	pageNumber, shortTitle, chunks, activeChunkId, onChunkTap?(chunkId)
UI:
	•	Card container with header + chunk list
	•	Active chunk highlight

11.5 BottomControls

Props:
	•	isPlaying, onPlayPause, currentTimeMs, durationMs?, onSeek, playbackRate, onChangeRate, onPrevPage, onNextPage
Behavior:
	•	If duration missing, hide seek thumb or render disabled track

⸻

12. Scroll & positioning (precise behavior)

12.1 Subtitle viewport definition
	•	The subtitle scroll container begins below SlideViewer and includes:
	•	SubtitleHeader
	•	Subtitle groups list
	•	When aligning after page change:
	•	Target Y = top of expanded card
	•	The top of expanded card should sit immediately under SubtitleHeader.

12.2 Implementation approach
	•	Use refs for each group container.
	•	On activePage change, call scrollIntoView({ block: 'start', behavior: 'smooth' }) on the expanded card container, then adjust with scrollTop -= headerHeight if needed.
	•	PDF rendering should load pdfjs client-side to avoid server evaluation of DOMMatrix.
	•	When calling pdfjs render, include the canvas element in the render parameters.

⸻

13. Accessibility
	•	Tap targets ≥ 44x44px.
	•	Respect Dynamic Type (font scaling); multiline chunks reflow.
	•	Contrast: active highlight must not rely on color alone; add a left border or bold text for active chunk.

⸻

14. Loading & error states

14.1 Loading
	•	Slide: skeleton rectangle in slide card.
	•	Subtitles: show 6–10 placeholder rows.
	•	Audio: play button shows loading spinner or disabled until metadata loaded.

14.2 Errors
	•	Slide image load fails: show placeholder with retry.
	•	Subtitles missing: render groups with shortTitle and “No subtitles available…” in expanded state.

⸻

15. Acceptance criteria (must pass)

Visual
	•	No slide progress bar under slide.
	•	No 3-dot menu in slide area.
	•	All UI strings in English.
	•	Web Google Translate is disabled by default.
	•	Subtitle list shows one row per page when collapsed.
	•	Active page group expands into card with multiple chunk lines.
	•	Index button is visible on the right of the Subtitle header (button only).

Behavior
	•	Swiping slide changes page.
	•	Changing page opens that page’s subtitle card and closes others.
	•	On page change, the expanded card snaps/scrolls so its top aligns under the Subtitle header.
	•	Tapping a collapsed page row jumps to that page and expands it.
	•	If audio absent, app remains usable and does not error.

⸻

16. Open choices (safe defaults provided)

These are not blockers; defaults below are recommended.
	1.	Chunk tap behavior (default): tap highlights chunk only; if audio exists, optionally seek to chunk start.
	2.	Can active page card be manually collapsed? (default): no; active page stays open.
	3.	Index panel (future): right-side sheet with page list.

⸻

17. Minimal example JSON

{
  "deck": {
    "id": "demo",
    "title": "Demo Talk",
    "pageCount": 6,
    "pages": [
      { "pageNumber": 1, "imageUrl": "/slides/1.png" },
      { "pageNumber": 2, "imageUrl": "/slides/2.png" },
      { "pageNumber": 3, "imageUrl": "/slides/3.png" },
      { "pageNumber": 4, "imageUrl": "/slides/4.png" },
      { "pageNumber": 5, "imageUrl": "/slides/5.png" },
      { "pageNumber": 6, "imageUrl": "/slides/6.png" }
    ],
    "audioUrl": null,
    "durationMs": null
  },
  "subtitleGroups": [
    {
      "pageNumber": 1,
      "shortTitle": "Intro & Context",
      "chunks": [
        { "id": "1-1", "text": "Here is the overview of today’s presentation." },
        { "id": "1-2", "text": "We’ll focus on reading-first UX for slides." }
      ]
    },
    {
      "pageNumber": 2,
      "shortTitle": "Problem",
      "chunks": [
        { "id": "2-1", "text": "Video is efficient, but hard to skim." },
        { "id": "2-2", "text": "Slides alone lack narrative continuity." }
      ]
    }
  ]
}

17.1 Demo asset note
	•	The current demo deck uses /public/demo.pdf with 9 pages.
	•	The demo subtitleGroups are generated to match those 9 pages.
