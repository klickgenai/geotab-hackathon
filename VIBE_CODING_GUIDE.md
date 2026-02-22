# Production-Grade CLAUDE.md Template

> Drop this into any project. Point Claude at it. Every line of code it writes will be reliable, consistent, and production-ready.

## How to Use

1. Copy the template below into a file called `CLAUDE.md` at your project root
2. Fill in the `[PLACEHOLDERS]` with your project's specifics
3. Claude Code automatically reads `CLAUDE.md` at the start of every session
4. Every AI session now follows your architecture rules, coding standards, and safety constraints

That's it. No special setup. No plugins. Claude follows what's written.

---

## Why This Exists

AI writes code fast. But fast code without constraints becomes unmaintainable code. This template enforces:
- **Architecture rules** so modules don't become spaghetti
- **Type safety** so data shapes stay consistent across your entire codebase
- **Feature isolation** so one change doesn't break three other things
- **Verification steps** so bugs are caught at compile time, not at demo time
- **Edge case awareness** so the AI doesn't just write the happy path

This template was battle-tested building a 30,000+ line TypeScript platform (50+ APIs, real-time voice AI, autonomous agents) in 5 days. It scales.

---

# START OF TEMPLATE - COPY EVERYTHING BELOW INTO YOUR CLAUDE.md

---

```markdown
# CLAUDE.md - [YOUR PROJECT NAME]

## Project Overview
[2-3 sentences: what this project does, who it's for, what problem it solves]

## Architecture

### Stack
- **Backend**: [e.g., Express + TypeScript on port 3000]
- **Frontend**: [e.g., Next.js + React on port 3001]
- **Database**: [e.g., PostgreSQL via Prisma]
- **AI/ML**: [if applicable]
- **External APIs**: [list any third-party integrations]

### Folder Structure
```
/backend    - [describe]
/frontend   - [describe]
/shared     - [describe if applicable]
```

### Dev Commands
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

# Type check
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

---

## !!! MANDATORY RULES - READ EVERY SESSION !!!

### Rule 1: Do NOT Break Existing Features
This is the #1 rule. A new feature that breaks an existing one is worse than no feature at all.

**Before modifying ANY existing file:**
- Read the ENTIRE file first (not just the section you're changing)
- Understand what other features depend on it
- Check who imports it: grep for the filename across the codebase
- If a function signature changes, update ALL callers

**High-risk files (touch with extreme care):**
| File | Why | Who depends on it |
|------|-----|-------------------|
| [your main server file] | All routes, middleware | Every frontend page |
| [your type definitions] | Central types | Every component |
| [your API client] | All API calls | Every page |
| [your layout/shell] | Wraps every page | All pages |

### Rule 2: Verify After Every Change
- Backend compiles: `cd backend && npx tsc --noEmit`
- Frontend compiles: `cd frontend && npx tsc --noEmit`
- If you touched a route, test it: `curl http://localhost:[PORT]/api/...`
- If you touched a UI component, verify it renders in browser
- If you touched shared logic, verify all consumers still work

### Rule 3: Do NOT Over-Engineer
- Do NOT add libraries, state management, or abstractions unless explicitly asked
- Do NOT refactor code you weren't asked to touch
- Do NOT add features beyond what was requested
- Do NOT create helpers or utilities for one-time operations
- Three similar lines of code is better than a premature abstraction
- Only add comments where the logic isn't self-evident

### Rule 4: Do NOT Guess - Read First
- Never modify a file you haven't read in this session
- Never assume a function signature - check it
- Never assume an import path - verify it exists
- Never assume a type shape - look it up

---

## Coding Standards

### Naming Conventions
| Thing | Convention | Example |
|-------|-----------|---------|
| Functions | camelCase, verb-prefixed | `calculateRisk()`, `fetchUsers()` |
| Types/Interfaces | PascalCase | `UserProfile`, `ApiResponse` |
| Components | PascalCase | `DashboardCard`, `UserTable` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| Files (backend) | kebab-case | `user-service.ts`, `auth-middleware.ts` |
| Files (components) | PascalCase | `DashboardCard.tsx`, `UserTable.tsx` |
| API routes | kebab-case paths | `/api/users/:id/reset-password` |

### Import Rules
[Customize these for your stack]

**Backend:**
```typescript
// [Add your specific import rules]
// Example for ESM: ALWAYS use .js extension in imports
import { something } from '../utils/helper.js';
```

**Frontend:**
```typescript
// [Add your specific import rules]
// Example for Next.js: Use @/ path aliases
import { api } from '@/lib/api';
import type { User } from '@/types';

// Import order: React -> third-party -> internal -> types
```

### Exports
- Use named exports (not default exports)
- Define a Props interface directly above every component
- Export types from a central types file

---

## Architecture Rules

### API Route Pattern
Every backend route must follow this structure:
```typescript
app.get('/api/resource/:id', (req, res) => {
  try {
    // 1. Validate input
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    // 2. Call business logic
    const result = processResource(id);
    if (!result) return res.status(404).json({ error: 'Not found' });

    // 3. Return JSON
    res.json(result);
  } catch (error) {
    // 4. Generic error (never leak internals)
    res.status(500).json({ error: 'Failed to process request' });
  }
});
```

### Frontend Component Pattern
Every component must follow this structure:
```typescript
'use client'; // if interactive (useState, useEffect, event handlers)

import { useState } from 'react';
import type { SomeType } from '@/types';

interface MyComponentProps {
  data: SomeType;
  onAction: (id: string) => void;
}

export function MyComponent({ data, onAction }: MyComponentProps) {
  // state, effects, handlers
  // return JSX
}
```

### Data Fetching Pattern
```typescript
const [data, setData] = useState<SomeType | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const fetchedRef = useRef(false); // Prevent double-fetch in strict mode

useEffect(() => {
  if (fetchedRef.current) return;
  fetchedRef.current = true;
  async function load() {
    try {
      const result = await api.fetchSomething();
      setData(result);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }
  load();
}, []);
```

### Business Logic Must Be Pure Functions
Scoring engines, calculators, transformers - anything with business logic:
- No side effects, no external state mutation, no API calls
- Take typed parameters, return typed objects
- Return null on invalid input - never throw for validation
- Can be called from routes, tools, tests, or background jobs safely

---

## Module Dependency Rules (No Circular Dependencies)

```
Business Logic / Pure Functions (no imports from routes, controllers, or UI)
    ^
  Service Layer (calls business logic, handles external APIs)
    ^
  Routes / Controllers (expose via HTTP, call services)
    ^
  Frontend Pages (consume via API client)
```

**Rules:**
- Business logic must NEVER import from routes, controllers, or services
- Services must NEVER import from routes
- Components must NEVER import from pages
- If you find yourself importing "upward" in this chain, your design is wrong

---

## Type Safety

### Single Source of Truth
All shared types live in ONE file: `[your types file path]`
- Backend responses must match these types
- Frontend consumers must use these types
- NEVER create inline types when a reusable interface exists

### When Changing a Type
1. Update the interface in the types file
2. Grep for all usages across the codebase
3. Update every file that uses the changed fields
4. Update the backend route/function that returns this shape
5. Verify both backend and frontend compile

### API Contract
- Backend returns JSON matching TypeScript interfaces
- Frontend API client methods return typed promises
- If you add a field to a response, add it to the interface
- If you remove a field, make it optional first, update all consumers, then remove

---

## Edge Cases the AI Must Handle

### Race Conditions
- React strict mode double-fires effects. Use useRef guards to prevent duplicate API calls
- Concurrent async operations can overwrite each other. Use generation counters or abort controllers
- setInterval without cleanup = memory leak. Always return cleanup in useEffect

### Error Boundaries
- Every API call must have try/catch
- Every page must have loading and error states
- Network failures must show user-friendly messages, not stack traces
- Missing data must render gracefully (optional chaining, fallback values)

### Graceful Degradation
- What happens when an API key is missing? Fall back, don't crash
- What happens when an external service is down? Show cached data or a clear message
- What happens when the user's input is unexpected? Validate at boundaries

---

## Feature Addition Checklist

### New Backend Endpoint
1. Define return type in your types file
2. Add route with try-catch pattern
3. Add API client method in frontend
4. Test: `curl http://localhost:[PORT]/api/your/endpoint`
5. Verify existing routes still work

### New Frontend Page
1. Create the page file
2. Add 'use client' if interactive
3. Follow data fetching pattern with loading/error states
4. Add to navigation if applicable
5. Verify other pages still render

### New Component
1. Create in appropriate components/ subdirectory
2. Define Props interface
3. Named export only
4. Keep under 200 lines - extract sub-components if larger

---

## Common Mistakes to Avoid

| Mistake | What to do instead |
|---------|-------------------|
| Editing a file without reading it first | Read the entire file, understand dependencies |
| Changing a type without updating consumers | Grep for the type name, update ALL usages |
| Adding imports without checking paths | Verify the path exists, use correct extensions |
| Forgetting loading/error states | Every page gets loading spinner + error message |
| Mutating state in business logic | Business logic must be pure - return new objects |
| Using `git add .` or `git add -A` | Stage specific files by name |
| Creating new abstractions for one-off code | Inline it. Three similar lines > premature abstraction |
| Adding npm packages without asking | Use existing packages first, ask before adding new ones |
| Not testing after changes | Always verify: type check + manual test of affected features |
| Writing only happy path | Handle null, undefined, empty arrays, network errors |

---

## [ADD YOUR PROJECT-SPECIFIC SECTIONS BELOW]

### Color Palette / Design System
[If you have a UI, define your colors, spacing, typography here]

### Environment Variables
[List required env vars and what they do]

### Key Business Logic
[Domain-specific rules the AI needs to know]

### Test Credentials / Demo Data
[If applicable, how to test the app]
```

# END OF TEMPLATE
