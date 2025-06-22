
### **Phase 4 Test Case Scenarios: Production Entities (Non-GxP CRUD)**

**Objective:** To validate the standard CRUD operations, role-based authorization, and performance optimizations for the `ProductionLine` and `Process` entities.

---

#### **1. Entity CRUD Operations (ENTITY-CRUD)**
**Goal:** Verify that the basic create, read, update, and deactivate (soft-delete) operations function correctly.

| Test ID    | Description                                                     | Test Type   | Preconditions                                    | Steps                                                               | Expected Result                                                                                                                   | Focus        |
| :--------- | :-------------------------------------------------------------- | :---------- | :----------------------------------------------- | :------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **CRUD-001** | A user can create a `ProductionLine`.                           | Integration | User is authenticated with a role that can create.   | 1. Send `createProductionLine` mutation with valid input.           | 200 OK. The new `ProductionLine` is returned. A record exists in the database. `createdAt` and `updatedAt` fields are set.         | [Happy Path] |
| **CRUD-002** | A user can update a `Process`.                                  | Integration | A `Process` record exists. User is authenticated. | 1. Note the initial `updatedAt` timestamp. 2. Send `updateProcess` mutation with new data. | 200 OK. The record in the database reflects the new data. The `updatedAt` timestamp is more recent than the initial one.          | [Happy Path] |
| **CRUD-003** | A user can deactivate (soft-delete) a `ProductionLine`.         | Integration | A `ProductionLine` with `isActive: true` exists. | 1. Send `deactivateProductionLine` mutation (or similar name).      | 200 OK. The returned object has `isActive: false`. Querying for active lines no longer returns this record.                      | [Happy Path] |
| **CRUD-004** | Attempting to update a non-existent entity fails gracefully.  | Integration | A `Process` with ID 'non-existent-id' does not exist. | 1. Send `updateProcess` mutation targeting 'non-existent-id'.       | A GraphQL error is returned (e.g., `NotFoundException`), indicating the record was not found. No database changes are made.       | [Error Case] |
| **CRUD-005** | `findAll` query respects pagination parameters.                 | Integration | 15 `ProductionLine` records exist.               | 1. Send `productionLines` query with `limit: 5`, `offset: 10`.      | The response contains exactly 5 records, starting from the 11th record created.                                                 | [Edge Case]  |

---

#### **2. Authorization & Access Control (ENTITY-RBAC)**
**Goal:** Verify that the `RolesGuard` correctly protects the new mutations.

| Test ID    | Description                                       | Test Type   | Preconditions                               | Steps                                         | Expected Result                          | Focus      |
| :--------- | :------------------------------------------------ | :---------- | :------------------------------------------ | :-------------------------------------------- | :--------------------------------------- | :--------- |
| **RBAC-001** | A `MANAGER` can update a `Process`.               | Integration | A `Process` exists. User is logged in as `MANAGER`. | 1. Send `updateProcess` mutation.             | 200 OK. The operation succeeds.          | [Happy Path] |
| **RBAC-002** | An `OPERATOR` is denied from updating a `Process`. | Integration | A `Process` exists. User is logged in as `OPERATOR`. | 1. Attempt to send `updateProcess` mutation.  | A `ForbiddenException` (403) error is returned. | [Security]   |

---

#### **3. Performance & Optimization (ENTITY-PERF)**
**Goal:** Verify that the GraphQL resolvers are performant and do not suffer from the N+1 query problem.

| Test ID    | Description                                             | Test Type   | Preconditions                                                               | Steps                                                                                                                              | Expected Result                                                                                                                                      | Focus        |
| :--------- | :------------------------------------------------------ | :---------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| **PERF-001** | **DataLoader prevents N+1 queries on nested relationships.** | Integration | Create 5 `ProductionLine` records. For each line, create 3 `Process` records. Enable Prisma query logging. | 1. Execute a single GraphQL query that fetches all 5 `ProductionLine`s and their nested `processes` fields. | **Exactly 2** database queries are executed: 1 to fetch the `ProductionLine`s, and 1 batch query to fetch all 15 `Process`es. | **[CRITICAL]** |
| **PERF-002** | DataLoader correctly maps children to parents.          | Integration | Same as PERF-001.                                                           | 1. Execute the same query as PERF-001.                                                                                             | The returned JSON is correct. Each `ProductionLine` object contains an array with its 3 correct `Process` children.                            | [Happy Path] |

---

#### **4. Data Integrity & Audit Trail (ENTITY-AUDIT)**
**Goal:** Ensure that all data modifications are atomic with their audit log entries.

| Test ID    | Description                                              | Test Type   | Preconditions                                             | Steps                                                                                                                           | Expected Result                                                                                                                                         | Focus        |
| :--------- | :------------------------------------------------------- | :---------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------- |
| **AUDIT-001**| A successful `update` mutation creates a correct audit log. | Integration | A `Process` exists. User is logged in.                    | 1. Send `updateProcess` mutation.                         | A single `AuditLog` record is created. It correctly references the user ID and the updated `Process` ID. The `details` field contains the payload. | [Happy Path] |
| **AUDIT-002**| **A failed Audit Log rolls back the parent data change.** | Integration | N/A. Requires mocking the `AuditService`.                 | 1. In a test environment, mock `auditService.create` to throw an error. 2. Call the `updateProcess` service method. | The method throws an error. A subsequent check of the database confirms the `Process` record **was not updated** and retains its original state. | **[CRITICAL]** |