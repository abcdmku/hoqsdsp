# Agent Context: Foundation & Infrastructure

## Your Role
You are setting up the foundational infrastructure for the CamillaDSP Frontend application. Your work will be the base that all other agents build upon.

## Project Overview
CamillaDSP Frontend is a React-based web application for controlling CamillaDSP audio processing units via WebSocket. It provides real-time audio monitoring, filter configuration, and pipeline management.

## Tech Stack
- **React 19** with TypeScript 5.7+
- **Vite 7** for build tooling
- **Tailwind CSS 4** for styling
- **Radix UI** for accessible primitives
- **TanStack Query 5** for server state
- **Zustand 5** for client state
- **TanStack Form 1** for forms
- **Zod 3** for validation

## Task-Specific Instructions

### Task 1.1.1: Initialize React Project
```bash
npm create vite@latest . -- --template react-ts
```

Configure `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
```

### Task 1.1.2: ESLint & Prettier
Use ESLint 9 flat config. Key rules:
- `@typescript-eslint/strict`
- React hooks rules
- Import sorting

### Task 1.1.3: Testing Framework
- Vitest 3 for unit tests
- React Testing Library 16
- MSW 2 for API mocking

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

### Task 1.1.5: Tailwind & Radix UI
Install packages:
```bash
npm install tailwindcss @tailwindcss/vite postcss
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-tooltip
npm install clsx tailwind-merge class-variance-authority
npm install lucide-react
```

Custom DSP theme colors in tailwind.config.ts:
```ts
colors: {
  dsp: {
    bg: '#1a1a2e',
    surface: '#16213e',
    primary: '#0f3460',
    accent: '#e94560',
    meter: {
      green: '#4ade80',
      yellow: '#facc15',
      red: '#ef4444',
    },
  },
}
```

### Task 1.1.6: Project Structure
Create this folder structure:
```
src/
├── app/
├── components/
│   ├── ui/
│   ├── audio/
│   ├── filters/
│   ├── pipeline/
│   ├── matrix/
│   └── monitoring/
├── features/
│   ├── connection/
│   ├── configuration/
│   ├── devices/
│   └── realtime/
├── lib/
│   ├── websocket/
│   ├── dsp/
│   ├── yaml/
│   └── utils/
├── stores/
├── types/
├── hooks/
└── styles/
```

## Quality Requirements
- All TypeScript strict mode enabled
- No `any` types allowed
- All exports should be typed
- Create barrel files (index.ts) for clean imports

## Output Validation
After completing your task:
1. Run `npm run typecheck` - must pass
2. Run `npm run lint` - must pass
3. Run `npm test` - must pass (if tests exist)

## Dependencies
This phase has no dependencies on other agents' work.
