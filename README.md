# Sindyan Atlas — Client

The frontend for **Sindyan Atlas**, an internal project-management application. Built with React 19, Vite, and plain CSS, following a Linear-inspired dark design system.

## Features

- **Dashboard** — portfolio health score, KPIs, and attention items (overdue milestones, blocked tasks, high-severity risks)
- **Projects** — create, update, and delete projects; view tasks, milestones, team members, and planning links per project
- **Tasks** — Kanban-style task management with status, priority, assignee, and activity log
- **Finance** — budget lines, spend records, and per-project financial summaries
- **Vault** — encrypted credentials and markdown notes with tag system; file attachments via presigned S3 URLs
- **Resources** — capacity profiles, availability, member and asset allocations, workload view
- **Risks & Issues** — risk/issue tracking with severity, probability, progress, and owner
- **Team** — user directory, role management, invitation flow with token-based onboarding
- **Admin** — role-based access control (admin, project lead, team member), CSRF protection, session management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Bundler | Vite 8 |
| Linter | Oxlint |
| Server state | TanStack React Query 5 |
| Styling | Plain CSS with custom properties (Linear-inspired design tokens) |
| Routing | History API (no hash) |
| Language | JavaScript (JSX) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Vite serves the app on `http://localhost:5173` and proxies `/api` requests to the Express backend on `http://localhost:3001`.

### Production Build

```bash
npm run build
```

Output goes to `dist/`. In production, the Express server serves this folder directly.

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
  api/
    client.js          # Shared HTTP client (all fetch calls live here)
    queryKeys.js       # Centralized TanStack Query key factory
  auth/
    AuthProvider.jsx   # Session and CSRF state provider
    auth-context.js    # React context definition
    permissions.js     # Role-based permission helpers
    useAuth.js         # Hook for consuming auth context
  components/
    DashboardPage.jsx  # Portfolio overview
    ProjectPage.jsx    # Single project detail
    TasksPage.jsx      # Task list with filters
    TaskPage.jsx       # Single task detail
    VaultPage.jsx      # Encrypted vault entries
    ResourcesPage.jsx  # Capacity, allocations, assets
    TeamPage.jsx       # Team directory and invitations
    Sidebar.jsx        # Navigation sidebar
    ...                # Shared UI primitives (Dialog, FilterBar, StatusBadge, etc.)
  theme/
    ThemeProvider.jsx   # Light/dark theme context
  routing.js           # Route definitions
  constants.js         # Shared constants
  index.css            # Global styles and design tokens
  App.jsx              # Root component
  main.jsx             # Entry point
```

## Environment Variables

No client-side environment variables are required. The API base URL is `http://localhost:3001` in development and relative `/api` in production.

## Design System

All colors, spacing, radii, and typography tokens are defined as CSS custom properties in `src/index.css`. See `design.md` for the full visual and interaction guide.

## License

Proprietary — Sindyan / Naspire 2025.
