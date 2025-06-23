Pillar 4: Testing for Regressions & Type Safety (REFACTOR-REG)
Goal: To ensure the core functionality of the application remains intact and the codebase is fully type-safe.

Test ID: REG-001

Description: Full existing test suite passes.
Test Type: Unit / Integration
Preconditions: The refactoring is complete.
Steps: 1. Run the entire test suite for the project (npm run test or similar).
Expected Result: All previously written tests (for Auth, User, etc.), after being updated for the new architecture, must pass with 100% success.
Focus: [Regression]
Test ID: REG-002

Description: Codebase passes strict type checking.
Test Type: Static Analysis
Preconditions: The refactoring is complete.
Steps: 1. Run the TypeScript compiler in noEmit mode (npx tsc --noEmit).
Expected Result: The command completes with zero type errors.
Focus: [CRITICAL]
Test ID: REG-003

Description: End-to-end user flow remains functional.
Test Type: E2E
Preconditions: An ADMIN user exists.
Steps: 1. Login as ADMIN. 2. Create a new ProductionLine. 3. Update the name of that ProductionLine. 4. Query for the line and verify its new name. 5. Deactivate the line. 6. Query again and verify it is inactive.
Expected Result: All steps complete successfully with the expected HTTP status codes and data transformations.
Focus: [Happy Path]