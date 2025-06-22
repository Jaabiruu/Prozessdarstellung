
### **Phase 3 Test Case Scenarios: Core Services**

**Objective:** To verify the correctness, security, robustness, and GxP compliance of the Authentication, Authorization, Audit, and User Management services.

---

#### **1. Authentication System (AUTH)**
**Goal:** Verify the entire authentication lifecycle, including login, logout, JWT validation, rate limiting, and the Redis blocklist for token invalidation.

| Test ID | Description | Test Type | Preconditions | Steps | Expected Result | Focus |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-001** | User can log in with valid credentials. | Integration | An active user `test@pharma.local` exists. | 1. Send `login` mutation with correct email/password. | 200 OK. Response contains a valid `accessToken` and user object. Token payload (`sub`, `email`, `role`, `jti`) is correct. | [Happy Path] |
| **AUTH-002** | User cannot log in with an incorrect password. | Integration | An active user `test@pharma.local` exists. | 1. Send `login` mutation with correct email and wrong password. | `UnauthorizedException` (or similar 4xx error). Audit log records a `LOGIN_FAILURE` event. | [Error Case] |
| **AUTH-003** | User cannot log in with a non-existent email. | Integration | No user with email `nouser@pharma.local` exists. | 1. Send `login` mutation with `nouser@pharma.local`. | `UnauthorizedException`. The error message must be generic and not reveal whether the user exists or not. | [Error Case] |
| **AUTH-004** | User cannot log in with a deactivated account. | Integration | A user exists but has `isActive: false`. | 1. Send `login` mutation with the deactivated user's credentials. | `UnauthorizedException`. | [Edge Case] |
| **AUTH-005** | Login attempts are rate-limited. | E2E | No specific user state needed. | 1. Send 6 consecutive `login` mutation attempts with invalid credentials from the same IP. | The first 5 attempts fail with an auth error. The 6th attempt fails with a "Too Many Requests" error (e.g., 429). | [Security] |
| **AUTH-006** | User can log out, invalidating their token. | Integration | User is logged in with a valid JWT. | 1. Extract the `jti` from the token. 2. Send `logout` mutation. 3. Check Redis for key `blocklist:<jti>`. | `logout` returns success. The `jti` key exists in Redis with a TTL > 0. | [Happy Path] |
| **AUTH-007** | A blocklisted (logged out) token cannot be used. | Integration | User has logged out (their token's `jti` is in Redis). | 1. Attempt to access a protected endpoint using the now-blocklisted token. | `UnauthorizedException` with a message like "Token has been invalidated". | [Edge Case] |
| **AUTH-008** | An expired token is rejected. | Integration | N/A | 1. Generate a token with a 1-second lifespan. 2. Wait 2 seconds. 3. Attempt to use the token. | `UnauthorizedException` due to expiration. | [Error Case] |

---

#### **2. Authorization System (RBAC)**
**Goal:** Verify that the `RolesGuard` correctly enforces access control based on user roles.

| Test ID | Description | Test Type | Preconditions | Steps | Expected Result | Focus |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RBAC-001** | An `ADMIN` user can access an admin-only endpoint. | Integration | User is logged in with `ADMIN` role. | 1. Send a request to an `@Roles('ADMIN')` protected mutation. | 200 OK. The operation succeeds. | [Happy Path] |
| **RBAC-002** | An `OPERATOR` user is denied access to an admin-only endpoint. | Integration | User is logged in with `OPERATOR` role. | 1. Send a request to an `@Roles('ADMIN')` protected mutation. | `ForbiddenException` (403). The operation is denied. | [Error Case] |
| **RBAC-003** | A `MANAGER` is denied access to an admin-only endpoint. | Integration | User is logged in with `MANAGER` role. | 1. Send a request to an `@Roles('ADMIN')` protected mutation. | `ForbiddenException` (403). | [Error Case] |
| **RBAC-004** | An unauthenticated user is denied access to any protected endpoint. | Integration | No `Authorization` header is sent. | 1. Send a request to any endpoint that is not marked `@Public()`. | `UnauthorizedException` (401). | [Security] |
| **RBAC-005** | An endpoint with no `@Roles` decorator is accessible by any authenticated user. | Integration | User is logged in with the lowest-privilege (`OPERATOR`) role. | 1. Send a request to a protected endpoint that has no specific role requirement. | 200 OK. The operation succeeds. | [Edge Case] |

---

#### **3. Audit Trail System (AUDIT)**
**Goal:** Verify that all auditable actions are logged correctly, transactionally, and with the required GxP context.

| Test ID | Description | Test Type | Preconditions | Steps | Expected Result | Focus |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUDIT-001** | A successful mutation creates an audit log via the interceptor. | Integration | User is logged in. | 1. Execute any simple, successful mutation (e.g., `updateUserProfile`). | An audit log entry is created automatically with action, user ID, IP, user-agent, and a generic reason. | [Happy Path] |
| **AUDIT-002** | A service-level call to `auditService.log()` creates a detailed log. | Integration | User is logged in. | 1. Execute a mutation that triggers a manual log (e.g., `createUser`). | A single, detailed audit log is created containing the rich context provided by the service (not a duplicate log from the interceptor). | [Happy Path] |
| **AUDIT-003** | **Transaction Rollback Test.** | Integration | N/A | 1. In a service method, start a `$transaction`. 2. Create a User record within the transaction. 3. Create an audit log for that user within the transaction. 4. **Intentionally throw an error** to force a rollback. | **Crucially:** The database must contain **NO** new User record and **NO** new AuditLog record. The entire atomic operation must be unwound. | [GxP Edge Case] |
| **AUDIT-004** | A mutation requiring a `reason` fails if none is provided. | Integration | User is logged in. | 1. Call a GxP-critical mutation (e.g., `updateUser`) without providing the `reason` field in the input. | `BadRequestException` (400) with a message indicating the reason is required. No database change occurs. No audit log is created. | [Error Case] |

---

#### **4. User Management System (USER)**
**Goal:** Verify the full, GxP-compliant lifecycle of a user entity.

| Test ID | Description | Test Type | Preconditions | Steps | Expected Result | Focus |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **USER-001** | An `ADMIN` can create a new user. | Integration | User is logged in as `ADMIN`. | 1. Send `createUser` mutation with valid data and a reason. | 200 OK. A new user is created in the database. A detailed audit log for the creation exists. The response payload does not contain the password hash. | [Happy Path] |
| **USER-002** | A `MANAGER` cannot create a new user. | Integration | User is logged in as `MANAGER`. | 1. Attempt to send `createUser` mutation. | `ForbiddenException` (403). No user is created. | [Security] |
| **USER-003** | Cannot create a user with a pre-existing email. | Integration | A user with email `existing@pharma.local` exists. | 1. `ADMIN` sends `createUser` mutation with email `existing@pharma.local`. | A database-level error (e.g., `PrismaClientKnownRequestError` for unique constraint) is caught and returned as a user-friendly `ConflictException` (409). | [Error Case] |
| **USER-004** | **GxP Deactivation & Anonymization Test.** | Integration | An active user `pii-test@pharma.local` exists with PII. User is logged in as `ADMIN`. | 1. Send `deactivateUser` mutation for `pii-test@pharma.local` with a reason. | 1. The user's `isActive` flag is now `false`. 2. The `firstName`, `lastName`, and `email` fields are overwritten with anonymized, non-PII values. 3. The user's `id` remains unchanged. 4. A detailed audit log for the deactivation is created. 5. An immediate `login` attempt with the original credentials for this user fails with `UnauthorizedException`. | [GxP Edge Case] |