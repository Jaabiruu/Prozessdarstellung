Pillar 1: Testing Atomicity & Data Integrity (REFACTOR-ATOM)
Goal: To prove that all data mutations are atomic and the system is resilient to race conditions.

Test ID: ATOM-001

Description: Transaction Rollback on Audit Failure.
Test Type: Integration
Preconditions: A valid user and input data exist.
Steps: 1. Mock the auditService.create method to throw an exception. 2. Call the productionLineService.create method.
Expected Result: The method must throw an error. A subsequent database query must confirm that NO new ProductionLine was created. The entire operation was rolled back.
Focus: [CRITICAL]
Test ID: ATOM-002

Description: Transaction Rollback on Service Failure.
Test Type: Integration
Preconditions: A valid user and input data exist.
Steps: 1. In a service method, start a transaction. 2. Create an entity record. 3. Intentionally throw an error after the first write but before the audit log write.
Expected Result: The method throws an error. A check of the database confirms that neither the entity record nor the audit log record were committed.
Focus: [CRITICAL]
Test ID: ATOM-003

Description: Race Condition Prevention on Create.
Test Type: E2E
Preconditions: A unique name RACE_TEST does not exist. User is authenticated.
Steps: 1. Use Promise.all to execute two identical createProductionLine GraphQL mutations with name: 'RACE_TEST' concurrently.
Expected Result: One mutation must succeed (HTTP 200). The other mutation must fail with a ConflictException (HTTP 409). A database query must confirm only one record named RACE_TEST exists.
Focus: [CRITICAL]
Test ID: ATOM-004

Description: Race Condition Prevention on Update.
Test Type: E2E
Preconditions: Two entities exist: A and B. User is authenticated.
Steps: 1. Use Promise.all to send two mutations concurrently: one updating A's name to "NEW_NAME", the other updating B's name to "NEW_NAME".
Expected Result: One mutation succeeds. The other fails with a ConflictException (409), proving the unique constraint is enforced correctly during updates.
Focus: [Edge Case]
Test ID: ATOM-005

Description: Successful creation is fully atomic.
Test Type: Integration
Preconditions: Valid input data.
Steps: 1. Call a create method in any refactored service.
Expected Result: The method succeeds. A database query confirms that both the new entity and its corresponding audit log entry were created successfully.
Focus: [Happy Path]