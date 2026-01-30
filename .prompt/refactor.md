1. **Analyze the file** - Read and understand the current implementation
2. **Identify issues** - Find code smells, type safety issues, and optimization opportunities
3. **Create a refactoring plan** - Generate a plan list of improvements
4. **Execute refactoring** - Make incremental changes following best practices
5. **Validate changes** - Run TypeScript compiler, linter, and tests
6. **Report results** - Summarize what was improved

## Refactoring Process

The command follows this systematic approach:

### Phase 0: Analysis
- Read the entire file and understand its purpose
- Check for existing tests
- Analyze dependencies and imports
- Identify related files in the same directory
- Check existing code style and conventions

## Phase 1: Redundancy & Duplicate-Code Check (Repo-wide)

Add this section between **Phase 1: Analysis** and **Phase 2: Issue Detection** to explicitly catch “this already exists somewhere else” situations.

### Goals

* Avoid creating a second implementation of the same behavior
* Prefer reuse/consolidation over new helpers
* Reduce long-term maintenance cost (bug fixes, edge cases, inconsistent behavior)

### What to check

* **Near-duplicate implementations**

  * Same logic with different names/parameters
  * Slightly different validation/error handling around the same core behavior
* **Overlapping utilities**

  * “utils”/“helpers” that solve the same problem in multiple places
* **Multiple wrappers around the same dependency**

  * Repeated API client wrappers, fetch wrappers, retry logic, logging wrappers
* **Type duplication**

  * Similar type aliases/interfaces declared in multiple modules rather than shared
* **Copy/paste patterns**

  * Repeated mapping/normalization/formatting blocks

### How to check (practical steps)

* Search for **key identifiers** from the file:

  * exported function/class names
  * constant strings (event names, endpoint paths, error messages)
  * domain nouns (e.g., `UserPreferences`, `BillingStatus`, `normalizeX`)
* Search for **signature patterns**:

  * distinctive conditional blocks
  * error handling messages
  * regex patterns
  * similar parameter lists
* Look for **parallel directories**:

  * `src/lib`, `src/utils`, `src/shared`, `src/common`, `src/services`, `src/api`
* Identify **existing abstractions**:

  * shared client(s), shared hooks, shared validators, shared mappers

### What to do when duplicates are found

* **Prefer reuse** if an existing implementation is correct and accessible

  * Replace local logic with imports + minimal adapters
* **Consolidate** if multiple versions exist and both are used

  * Create/choose a canonical module
  * Migrate call sites incrementally
  * Deprecate/remove the redundant implementation
* **Document divergence** if they must remain separate

  * Add comments/tests explaining why (different semantics, performance, legacy behavior)

### Output expectations (what to report)

* List suspected duplicates with:

  * file paths
  * brief similarity description
  * recommended action: reuse / consolidate / keep separate (with reason)


### Phase 2: Issue Detection
- **Critical Issues**
  - Any use of `any` type
  - Suppressed TypeScript errors (`@ts-ignore`)
  - Empty catch blocks
  - Hardcoded credentials or secrets

- **Code Smells**
  - Functions longer than 20 lines
  - Files longer than 200 lines
  - Deep nesting (>3 levels)
  - Duplicate code blocks
  - Mixed abstraction levels
  - Complex conditionals
  - Long parameter lists (>3)
  - Multiple unrelated functions in one file

- **Performance Issues**
  - Missing memoization in React components
  - Unnecessary re-renders
  - Inefficient loops or computations

### Phase 3: Refactoring Actions
- Extract long functions into smaller ones
- **Split large files into separate modules**
  - Move each major function to its own file
  - Group related utility functions together
  - Create barrel exports (index.ts) for clean imports
- Convert promises to async/await
- Replace magic values with constants
- Add proper TypeScript types
- Extract custom hooks (React)
- Simplify complex conditionals
- Apply dependency injection where needed
- Optimize performance bottlenecks

### Phase 4: Validation
- Run TypeScript compiler (`npx tsc --noEmit`)
- Run linter (`npm run lint`)
- Run tests if available (`npm test`)
- Check for unused imports
- Verify no console.logs were added

## Options

You can specify focus areas:

```
/refactor src/api.ts types        # Focus on type safety
/refactor src/Component.tsx perf   # Focus on performance
/refactor src/service.ts clean     # Focus on code cleanliness
```

## What gets refactored

Based on the refactor.md guide, the command will:

1. **Type Safety**
   - Remove all `any` types
   - Add proper type annotations
   - Use discriminated unions
   - Extract type aliases

2. **Code Organization**
   - Extract functions (>20 lines)
   - Apply single responsibility principle
   - Group related functionality
   - Use proper abstraction levels
   - **Break large files into separate modules**
     - Extract each major function to its own file
     - Keep logical groupings of related utility functions
     - Maintain overall file length under 200 lines
     - Create index files for re-exporting when needed

3. **Modern Patterns**
   - Convert callbacks to async/await
   - Use optional chaining and nullish coalescing
   - Apply functional programming where appropriate
   - Use const assertions for literals

4. **React Specific** (if applicable)
   - Extract custom hooks
   - Add proper memoization
   - Optimize re-renders
   - Split large components

5. **Performance**
   - Add appropriate memoization
   - Optimize loops and computations
   - Lazy load when beneficial
   - Remove unnecessary dependencies

## Safety Features

The command includes safety measures:
- Never create a todo list for complex refactors instead take the extra time to plan out the steps to solve the refacotr
- Makes incremental changes
- Validates after each major change
- Preserves existing functionality
- Follows existing code conventions
- Can rollback if issues arise

## Output

After refactoring, you'll receive:
- Summary of changes made
- List of improvements
- Any remaining issues that need manual review
- Test results (if tests exist)
- Performance impact (if measurable)