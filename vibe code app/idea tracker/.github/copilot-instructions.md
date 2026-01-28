# Idea Tracker - Copilot Instructions

## Project Overview
Full-stack web app for capturing, organizing, and rating ideas with user authentication and SQLite persistence. Frontend (React-like vanilla JS) communicates with Node.js/Express backend via REST API. Each user's ideas are isolated and encrypted password-protected.

**Key architectural choices**:
- Backend: Node.js/Express + SQLite with user/idea models
- Frontend: Vanilla HTML/CSS/JS in `public/index.html` with auth screens
- Auth: JWT tokens stored in `localStorage`, password hashed with bcryptjs
- Database: Two tables (users, ideas) with foreign key constraint

## Architecture & Data Flow

### Backend Structure
- **db.js**: SQLite database initialization with `users` and `ideas` tables
- **server.js**: Express app with authentication and idea CRUD routes
- **Authentication**: JWT-based; tokens issued on /register and /login; required for all idea endpoints
- **Database schema**:
  ```
  users: id, username (UNIQUE), password_hash, created_at
  ideas: id, user_id (FK), title, notes, categories, excitement (1-10), created_at
  ```

### API Endpoints
- `POST /api/register` - Create account (returns JWT token)
- `POST /api/login` - Authenticate user (returns JWT token)
- `GET /api/ideas` - Fetch all ideas for logged-in user (requires auth)
- `POST /api/ideas` - Create new idea (requires auth, categories parsed from comma-separated string)
- `PUT /api/ideas/:id` - Update idea (requires auth, checks user_id ownership)
- `DELETE /api/ideas/:id` - Delete idea (requires auth, checks user_id ownership)

### Frontend State Management
- **Auth state**: `authToken`, `currentUserId`, `currentUsername` in `localStorage`
- **UI screens**: `authScreen` (login/register) ↔ `appScreen` (ideas list + detail view)
- **API helper**: `apiCall(method, endpoint, body)` wraps fetch with auth header and auto-logout on 401
- **Data flow**: User input → API call → response parsed → UI re-render

## Developer Patterns & Conventions

### Backend (server.js)
- **Authentication middleware**: `authenticateToken` verifies JWT and extracts user; all protected routes use it
- **User isolation**: All queries include `WHERE user_id = req.user.id` to prevent cross-user data leaks
- **String parsing**: Categories stored as comma-separated in database; converted to/from arrays in API responses
- **Error handling**: API returns `{ error: string }` on failure; HTTP status indicates severity (400 bad input, 401 auth, 403 forbidden, 404 not found, 409 conflict, 500 server error)

### Frontend (public/index.html)
- **Auth flow**: User sees auth screen → login/register → token stored → app screen loads with API calls
- **Tab switching**: `.tab-btn` and `.auth-form` elements toggle visibility with `data-tab` attribute
- **API helper**: `apiCall()` handles auth header injection; auto-logout on 401 response
- **Password confirmation**: Register form validates matching passwords before API call
- **Object serialization**: `JSON.stringify(idea).replaceAll('"', '&quot;')` for embedding objects in onclick attributes
- **Two-panel UI**: Left panel (form + idea list), right panel (detail/edit/empty); `selectedIndex` tracks selected idea ID (not array index)

## Extending This App

### Adding Backend Features
- **New idea field**: Add column to ideas table migration → include in POST/PUT handlers → serialize in response → update frontend form/display
- **User profile**: Add columns to users table → expose in `/api/profile` endpoint → load on login
- **Rate limiting**: Use `express-rate-limit` middleware on `/api/login` and `/api/register` to prevent brute force
- **Database migrations**: Create versioned migration files for schema changes; run on server startup

### Adding Frontend Features
- **Idea search/filter**: Fetch all ideas → filter array client-side → `renderList()` with subset
- **Categories autocomplete**: Track unique categories from all user ideas; suggest on input
- **Export/import**: POST endpoint for JSON export; drag-drop import handler
- **Offline support**: Add Service Worker to cache API responses; queue mutations for sync

### Common Pitfalls
- Categories stored as strings in DB; always parse to arrays in responses and parse from arrays in requests
- Always include `user_id` check in PUT/DELETE queries to prevent unauthorized access
- JWT verification fails silently if `JWT_SECRET` changes; document env var in deployment
- `localStorage` cleared on logout; don't rely on cached state after auth changes
- Test with different users; verify ideas don't leak between accounts

## File Structure
```
.github/
  copilot-instructions.md  (this file)
src/
  idea tracker.html        (legacy file - not used in v2.0)
public/
  index.html              (frontend app with auth screens and two-panel UI)
db.js                     (SQLite setup)
server.js                 (Express app with auth + CRUD routes)
package.json              (dependencies: express, sqlite3, bcryptjs, jsonwebtoken)
ideas.db                  (SQLite database - auto-created on first run)
```

## Getting Started

1. Install dependencies: `npm install`
2. Start server: `npm start`
3. Open http://localhost:5000 in browser
4. Register a new account or login
5. Create and manage ideas
