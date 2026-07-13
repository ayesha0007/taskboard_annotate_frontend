# Flowdeck — Frontend

Next.js (App Router) + TypeScript frontend for Flowdeck: a Kanban task
board with a per-task document editor, and an image annotation workspace.

## Tech Stack

- Next.js 14 (App Router), TypeScript
- Tailwind CSS
- Zustand for state management
- @dnd-kit for drag-and-drop
- Axios, with a JWT auth + refresh interceptor
- date-fns
- lucide-react

## Getting Started

### Prerequisites

- Node.js v24.15.0 or later
- npm
- The backend running locally (see the backend README)

### Setup

```bash
git clone <frontend-repo-url>
cd <frontend-repo>
npm install
cp .env.local.example .env.local
npm run dev
```

The app is available at `http://localhost:3000`.

### Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the backend API. Defaults to `http://127.0.0.1:8000/api/v1`. |

## Project Structure
frontend/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── src/
├── app/
│   ├── login/page.tsx
│   ├── tasks/
│   │   ├── page.tsx          # Kanban board
│   │   └── [id]/page.tsx     # per-task document editor
│   ├── annotate/page.tsx     # annotation workspace
│   └── layout.tsx
├── components/
│   ├── tasks/                # Board, Column, TaskCard, TaskModal,
│   │                         # DateSelector, DeadlineNotifier
│   ├── annotate/             # AnnotationCanvas, AnnotationToolbar,
│   │                         # ImageCarousel, PolygonList, AnnotationStats
│   └── ui/                   # Navbar, Footer, Modal, Button, Input,
│                             # AuthGuard, ThemeProvider/Toggle
├── store/                    # taskStore, annotationStore, dateStore (Zustand)
├── lib/                      # api.ts (axios + JWT refresh), auth.ts
└── types/                    # task.ts, annotation.ts
## Pages

- `/login` — email/password authentication
- `/tasks` — Kanban board (To Do / In Progress / Done); an optional
  date filter (defaults to showing all tasks across every deadline),
  deadline date+time picker, drag-and-drop between columns
- `/tasks/[id]` — full-page document editor for a single task: rich text
  formatting, image insertion, and a freehand sketch layer; saving
  auto-advances a task from To Do to In Progress once it has content,
  and a Done button moves it straight to the Done column
- `/annotate` — image upload, scrollable carousel, box/polygon/pen
  annotation with zoom/pan/undo/redo, click-to-select shapes, per-class
  management, and an "annotated basket" view with cropped image export

## Key Components

- `<DateSelector />` — standalone date-filter widget, fully decoupled
  from task state (subscribes to its own Zustand store)
- `<Board />`, `<Column />`, `<TaskCard />` — Kanban board structure
- `<DeadlineNotifier />` — deadline-urgency indicator with a reminders panel
- `<AnnotationCanvas />`, `<AnnotationToolbar />`, `<ImageCarousel />` — annotation workspace

## Challenges & Solutions

**Cropped annotation thumbnails misaligned.** Bounding boxes for the
"annotated basket" thumbnails were initially computed in the display
canvas's coordinate space, which letterboxes non-16:9 images. Since the
thumbnail's own aspect ratio differed from the canvas, the crop math
didn't line up. Fixed by normalizing annotation points against the
image's actual rendered content instead of the container, so both the
live overlay and any derived crop use the same coordinate space.

**Board filtering conflicted with arbitrary deadlines.** The board
originally always scoped tasks to a single selected day. Once tasks could
carry a deadline on any future date, new tasks appeared to vanish if
their deadline didn't match the day being viewed. Resolved by making the
date filter optional, defaulting to an unfiltered "all tasks" view, with
the create/edit form jumping the view to a task's deadline day when a
filter is active.

**Editor content silently dropped on first open.** The per-task document
editor's content-loading effect was keyed only on the task ID, which
could resolve while the page was still in a loading state — before the
editor's DOM node existed — silently discarding the load. Fixed with a
ref-guarded effect that loads content exactly once per task, checked
against both the task ID and the actual presence of the editor element,
rather than relying on a dependency array alone.

**Diagnosing "disappearing" tasks.** A reported data-loss bug turned out
to be tasks with deadlines outside the currently filtered board day —
confirmed by checking the rows directly via the Django shell before
concluding it was a frontend filtering issue rather than a save failure,
which shaped the eventual fix (making the filter optional) rather than
a speculative patch.

**Zoom/pan without breaking coordinate math.** Annotation drawing
coordinates are derived from `getBoundingClientRect()` of the image
container. Rather than using CSS transforms for zoom (which would require
re-deriving pointer math), the container's own width is scaled via an
inline style inside a scrollable viewport — so existing coordinate
normalization kept working unchanged, and panning is just native scroll
offset manipulation.

**Undo/redo across an async API.** Since annotations are persisted
per-action rather than as a single document, undo/redo tracks a local
stack of add/delete operations and replays them against the API
(re-creating a deleted shape, or deleting a re-added one) rather than
maintaining a client-side-only history, keeping the database as the
source of truth after every step.

## Development Notes

Parts of this project were built with the assistance of Claude (Anthropic)
for scaffolding, debugging, and code review, alongside the official
Next.js, Zustand, and dnd-kit documentation for App Router data flow,
state management, and drag-and-drop behavior. All generated code was
reviewed, tested, and adjusted before being committed.

#
# taskboard_annotate_frontend
