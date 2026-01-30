# Refactor Plan (Next Agent)

## Stop condition
- All non-test `src/**/*.ts(x)` files are **<= 200 lines**.
- No functions exceed **20 lines** unless explicitly justified.
- No `any` types in non-test code.
- No `@ts-ignore` or empty `catch` blocks in non-test code.
- No `console.log` in production code.
- Shared helpers are consolidated (no duplicates for port keys, endpoint comparisons, color utilities, etc.).

---

## Phase 0: Analysis
- Read each target file end-to-end and understand its responsibilities.
- Check for existing tests and related files in the same directory.
- Review imports/dependencies and align with local code style/conventions.

---

## Phase 1: Redundancy & Duplicate-Code Check (Repo-wide)
- Regenerate list of non-test `src/**/*.ts(x)` >= 100 lines.
- For each candidate, search for overlapping helpers/types in `src/lib`, `src/utils`, and nearby component utils.
- Decide per overlap: **reuse / consolidate / keep separate** (with reason).
### What to check
- Near-duplicate implementations (same logic, different names).
- Overlapping utilities and wrappers around the same dependency.
- Duplicate types/interfaces and copy/paste patterns.

### How to check (practical steps)
- Search for key identifiers (exported names, event strings, endpoint paths).
- Search for signature patterns (distinctive conditionals, regexes, error messages).
- Review parallel directories (`src/lib`, `src/utils`, `src/shared`, `src/common`, `src/services`, `src/api`).
- Identify existing abstractions (shared clients, hooks, validators, mappers).

### Output expectations
- List suspected duplicates with file paths, brief similarity description, and recommended action.

---

## Phase 2: Batch 1 (Largest Editors)
Files:
- `src/components/filters/ConvolutionEditor.tsx`
- `src/components/devices/DeviceConfigSection.tsx`

Goals:
- Split into subcomponents (sections, tables, panels).
- Extract heavy logic into `utils.ts` or `hooks.ts` near the file or in `src/lib/...` if shared.
- Remove any debug logging.

---

## Phase 3: Batch 2 (Signal-Flow UI)
Files:
- `src/components/signal-flow/ChannelCard.tsx`
- `src/components/signal-flow/ChannelEditorDrawer.tsx`

Goals:
- Extract filter mutation helpers into `src/lib/signalflow/...` if reusable.
- Split UI into subcomponents where possible.

---

## Phase 4: Batch 3 (Monitoring + Dashboards)
Files:
- `src/components/monitoring/VolumeMeter.tsx`
- `src/components/monitoring/LevelMeter.tsx`
- `src/pages/Dashboard.tsx`

Goals:
- Extract render-heavy subcomponents.
- Move formatting/math to `src/lib/monitoring/...` utilities.

---

## Phase 5: Batch 4 (Core Modules)
Files:
- `src/lib/websocket/WebSocketManager.ts`
- `src/lib/config/validation.ts`
- `src/features/realtime/useLevels.ts`

Goals:
- Extract helpers and tighten types.
- Reduce long functions and clarify responsibilities.

---

## Phase 6: Validation
- `npm run typecheck`
- `npm run lint`
- Relevant tests (`npm test` or targeted suite)
- Re-check line/function limits.

---

## Safety guardrails
- Do not create a “TODO list” for complex refactors; take time to plan the steps.
- Make incremental changes and preserve behavior.
- Validate after each major change and follow existing conventions.

---

# Per-file Refactor Checklist

1) **Analysis**
- Read file end-to-end; note responsibilities and boundaries.
- Identify related files, dependencies, and existing utilities.
- Check for existing tests and established code style.

2) **Duplicate scan**
- Search for similar helpers in `src/lib`, `src/utils`, `src/components/**/utils`.
- Use key identifiers/signature patterns to detect overlaps.
- Decide: **reuse / consolidate / keep separate** (and why), and record file paths.

3) **Issues checklist**
- `any`, `@ts-ignore`, empty `catch`, `console.log`.
- Functions >20 lines.
- Deep nesting >3.
- Complex conditionals.
- Long parameter lists (>3).
- Mixed responsibilities.
- File >200 lines.

4) **Refactor actions**
- Extract helpers to `utils.ts` or `lib/...`.
- Split UI into subcomponents.
- Extract hooks for side effects.
- Replace magic values with constants.
- Preserve behavior and types.

5) **Validate**
- `npm run typecheck`
- `npm run lint`
- Related tests

6) **Report**
- What changed, remaining issues, tests run.
