# Agent Guidelines for multiplayer-agent-treasury

This is a Next.js 16+ project with TypeScript, Tailwind CSS v4, and React 19.

## Build/Lint/Test Commands

```bash
# Development
pnpm dev              # Start development server on localhost:3000

# Build
pnpm build            # Create production build
pnpm start            # Start production server



**Note:** This project does not currently have a test framework configured. If adding tests, prefer Vitest or Jest with React Testing Library.

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - Always use proper types, no `any` without justification
- Use explicit return types on exported functions
- Prefer `interface` over `type` for object shapes
- Use union types for literal values (e.g., `'APPROVE' | 'REVIEW' | 'REJECT'`)
- Path alias: Use `@/` prefix for imports from project root (e.g., `import { Foo } from '@/app/types'`)

### Imports

- Group imports: 1) React/Next, 2) Third-party libraries, 3) Local modules
- Use single quotes for strings
- Use semicolons
- Example:
  ```typescript
  import type { Metadata } from "next";
  import { Geist } from "next/font/google";
  import { GoogleGenerativeAI } from '@google/generative-ai';
  import { InvoiceData } from '@/app/types';
  ```

### Naming Conventions

- **Files**: Use kebab-case for service files (e.g., `geminiService.ts`, `pdfService.ts`)
- **Components**: PascalCase for React components (e.g., `AgentWorkflow.tsx`)
- **Functions**: camelCase for regular functions, PascalCase for React components
- **Types/Interfaces**: PascalCase (e.g., `InvoiceData`, `SecurityScan`)
- **Constants**: UPPER_SNAKE_CASE for true constants

### Error Handling

- Always use try/catch for async operations
- Log errors with descriptive messages using console.error with emoji prefixes:
  - `❌` for errors
  - `⚠️` for warnings
  - `✅` for success
  - `📄` for document processing
  - `🔍` for scanning operations
  - `🤖` for AI operations
- Throw specific error messages, not generic ones
- Provide fallback behavior for AI service failures (see `generateCFORecommendation`)

### React/Next.js

#### Core Principles

- **DRY (Don't Repeat Yourself)**: Extract reusable logic into custom hooks, utility functions, or shared components. If you see the same pattern 2+ times, refactor it.
- **Server Components by default**: Use `'use client'` directive only when you need interactivity, browser APIs, or React hooks
- Use App Router (app directory structure)

#### ⚠️ AVOID useEffect — Use Better Alternatives

`useEffect` is often misused and leads to bugs, race conditions, and unnecessary complexity. Follow these patterns instead:

| Instead of useEffect for... | Use This |
|----------------------------|----------|
| Fetching data | Server Components, React Query, SWR, or `use()` hook |
| Syncing with external store | `useSyncExternalStore` |
| Derived/computed state | Calculate during render (no hook needed) |
| Responding to prop changes | Calculate during render or use `key` prop to reset |
| Subscribing to events | `useSyncExternalStore` or event handlers |
| Form state | `useActionState`, controlled inputs, or form libraries |
| URL state | `useSearchParams`, `useParams` from Next.js |

```typescript
// ❌ BAD: useEffect for derived state
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ GOOD: Calculate during render
const fullName = `${firstName} ${lastName}`;
```

```typescript
// ❌ BAD: useEffect for data fetching in client component
useEffect(() => {
  fetch('/api/data').then(res => res.json()).then(setData);
}, []);

// ✅ GOOD: Server Component (preferred)
async function Page() {
  const data = await fetchData();
  return <Component data={data} />;
}

// ✅ GOOD: React Query for client-side
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });
```

#### Custom Hooks — The DRY Solution

Extract reusable stateful logic into custom hooks:

```typescript
// ✅ Reusable hook instead of duplicating logic
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  // This is one of the FEW valid useEffect cases
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

#### State Management

- **Lift state up** only as far as necessary
- **Colocate state** — keep state close to where it's used
- Use **URL state** (`useSearchParams`) for shareable/bookmarkable state
- Use **React Context** sparingly — prefer prop drilling for 1-2 levels
- For complex state, consider **Zustand** or **Jotai** over Context

#### Component Patterns

- **Composition over props**: Use children and slots instead of prop drilling
- **Render props / Headless components** for reusable logic with flexible UI
- **Compound components** for related component groups
- Keep components **small and focused** — max ~100 lines
- **Extract early, extract often** — don't wait for duplication

```typescript
// ✅ Composition pattern
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>

// ❌ Prop drilling
<Card title="Title" body="Content" headerClass="..." bodyClass="..." />
```

#### Next.js Specific

- Use `next/font` for font loading (self-hosted, zero layout shift)
- Use `next/image` for optimized images with proper `width`/`height` or `fill`
- Use **Server Actions** for mutations instead of API routes when possible
- Use **Route Handlers** (`app/api/`) only for webhooks or external API consumption
- Leverage **Parallel Routes** and **Intercepting Routes** for complex UIs
- Use **`loading.tsx`** and **`error.tsx`** for loading/error states
- Prefer **Static Generation** over SSR when data doesn't change per-request

#### Props & Types

- Props interface naming: `{ComponentName}Props` (e.g., `ButtonProps`)
- Use `Readonly<>` wrapper: `function Button({ label }: Readonly<ButtonProps>)`
- Prefer `interface` for props, `type` for unions and complex types
- Always type event handlers explicitly

### Styling (Tailwind CSS v4)

- Use `@import "tailwindcss"` in globals.css
- Use CSS variables for theming (see globals.css for pattern)
- Prefer Tailwind utility classes over custom CSS
- Support dark mode with `dark:` prefix
- Use `className` for styling (not `style` prop)

### Services/Utilities

- Place service files in `app/lib/services/`
- Place shared types in `app/types/`
- Services should be pure functions with clear inputs/outputs
- Use Zod for runtime validation when needed
- Environment variables: Use `process.env.VAR_NAME` with fallback to empty string

### Comments

- Use JSDoc for exported functions (see existing services for examples)
- Include file-level comment with brief description
- Comment complex business logic
- Avoid redundant comments

### Environment Variables

Required environment variables (create `.env.local`):
- `GOOGLE_API_KEY` - For Gemini AI integration
- `ETHERSCAN_API_KEY` - For Etherscan API

## Project Structure

```
app/
├── lib/services/     # Business logic services (gemini, etherscan, pdf)
├── types/            # TypeScript interfaces and types
├── globals.css       # Global styles with Tailwind
├── layout.tsx        # Root layout with fonts
└── page.tsx          # Home page
public/               # Static assets
prompts/              # AI prompts
```

## Key Dependencies

- Next.js 16.1.6 with App Router
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4
- Google Generative AI (@google/generative-ai)
- LangChain (@langchain/core, @langchain/langgraph)
- Zod for validation
- Lucide React for icons
