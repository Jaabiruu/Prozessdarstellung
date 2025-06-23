# 🏛️ PILLAR 3: ARCHITECTURAL CLEANLINESS & SEPARATION OF CONCERNS TODO

**Created**: December 23, 2024  
**Status**: Active  
**Scope**: Architectural refactoring - Single Responsibility Principle and DRY principles  
**Progress**: 0/14 tasks complete

## 📋 Executive Summary

**Objective**: Improve separation of concerns, eliminate repetitive code patterns, and enforce Single Responsibility Principle across all services and resolvers.

**Total Tasks**: 14 architectural improvements  
**Priority**: HIGH - Critical for enterprise-grade architecture  
**Estimated Effort**: 4-5 hours

## 🎯 Task List

### 3.1 Enforce Single Responsibility Principle (SRP) - 8 tasks

- [ ] **P3.1.1**: Remove `findProcessesByProductionLine()` method from ProductionLineService (lines 330-373)
  - **Why**: ProductionLineService should not contain Process-related methods
  - **Impact**: Enforces SRP - each service manages only its own entity
  
- [ ] **P3.1.2**: Remove `processesByProductionLine` query from ProductionLineResolver (lines 100-113)
  - **Why**: ProductionLineResolver should only return ProductionLine entities
  - **Impact**: Clear separation between resolvers
  
- [ ] **P3.1.3**: Remove duplicate `processesByProductionLine` query from ProcessResolver (lines 64-79)
  - **Why**: Duplicate functionality violates DRY principle
  - **Impact**: Single source of truth for Process queries
  
- [ ] **P3.1.4**: Verify ProductionLineService only contains ProductionLine management methods
  - **Check**: No Process, User, or other entity methods
  - **Expected**: Only create, update, remove, findOne, findAll for ProductionLine
  
- [ ] **P3.1.5**: Verify ProductionLineResolver only contains queries returning ProductionLine/ProductionLine[]
  - **Check**: All queries and mutations return ProductionLine types
  - **Expected**: No cross-entity queries
  
- [ ] **P3.1.6**: Verify UserService only contains User management methods
  - **Check**: No cross-entity operations
  - **Expected**: Only user-specific CRUD and authentication support
  
- [ ] **P3.1.7**: Verify AuthService only contains authentication/authorization methods
  - **Check**: No user management or other entity operations
  - **Expected**: Only login, logout, token management
  
- [ ] **P3.1.8**: Verify AuditService only contains audit logging methods
  - **Check**: No business logic or entity management
  - **Expected**: Only audit creation and querying

### 3.2 Encapsulate Repetitive Logic - Create @AuditContext() Decorator - 6 tasks

- [ ] **P3.2.1**: Create custom @AuditContext() parameter decorator
  - **Location**: `src/common/decorators/audit-context.decorator.ts`
  - **Purpose**: Extract IP address and User-Agent from GraphQL context
  - **Pattern**: Similar to existing @CurrentUser() decorator
  ```typescript
  export interface AuditContext {
    ipAddress: string | null;
    userAgent: string | null;
  }
  ```

- [ ] **P3.2.2**: Replace IP/User-Agent extraction in AuthResolver mutations (2 locations)
  - **Methods**: login() and logout()
  - **Current**: Manual extraction with `context.req?.ip` and `context.req?.get('user-agent')`
  - **New**: `@AuditContext() audit: AuditContext`

- [ ] **P3.2.3**: Replace IP/User-Agent extraction in UserResolver mutations (5 locations)
  - **Methods**: createUser, updateUser, deactivateUser, changePassword, testTransactionRollback
  - **Impact**: Eliminate 10+ lines of repetitive code

- [ ] **P3.2.4**: Replace IP/User-Agent extraction in ProductionLineResolver mutations (3 locations)
  - **Methods**: createProductionLine, updateProductionLine, removeProductionLine
  - **Impact**: Cleaner resolver methods

- [ ] **P3.2.5**: Replace IP/User-Agent extraction in ProcessResolver mutations (3 locations)
  - **Methods**: createProcess, updateProcess, removeProcess
  - **Impact**: Consistent pattern across all resolvers

- [ ] **P3.2.6**: Test @AuditContext() decorator functionality across all resolvers
  - **Test**: Verify correct extraction of IP and User-Agent
  - **Test**: Handle null/undefined values gracefully
  - **Test**: Work with different GraphQL contexts

### 3.3 Remove Direct Audit Logging from Services - 2 tasks

- [ ] **P3.3.1**: Remove direct audit logging from AuthService (should use audit interceptor/decorator)
  - **Review**: Check if AuthService creates audit logs directly
  - **Action**: Ensure audit logging goes through proper patterns

- [ ] **P3.3.2**: Ensure all audit logging goes through proper transactional patterns
  - **Verify**: All audit logs created within transactions
  - **Pattern**: Use tx parameter from $transaction()

## 📁 Files to Modify

### New Files to Create
1. `src/common/decorators/audit-context.decorator.ts` - Custom parameter decorator

### Services to Modify (2 files)
1. `src/production-line/production-line.service.ts` - Remove cross-entity method
2. `src/auth/auth.service.ts` - Review audit patterns

### Resolvers to Modify (4 files)
1. `src/auth/auth.resolver.ts` - Use @AuditContext() (2 mutations)
2. `src/user/user.resolver.ts` - Use @AuditContext() (5 mutations)
3. `src/production-line/production-line.resolver.ts` - Use @AuditContext() (3 mutations), remove cross-entity query
4. `src/process/process.resolver.ts` - Use @AuditContext() (3 mutations), remove duplicate query

## 🧪 Acceptance Criteria

### SRP Compliance
- [ ] Each service manages only its own entity type
- [ ] No cross-entity methods in any service
- [ ] Each resolver returns only its primary entity type
- [ ] No duplicate queries across resolvers

### Code Quality
- [ ] @AuditContext() decorator eliminates 16+ repetitive code blocks
- [ ] Consistent audit context extraction pattern
- [ ] All resolver mutations use the new decorator
- [ ] Clean separation of concerns maintained

### Testing
- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Type check passes: `npm run typecheck`
- [ ] All GraphQL queries/mutations still work correctly

## 🚀 Implementation Order

1. **First**: Create @AuditContext() decorator
2. **Second**: Update all resolvers to use the decorator
3. **Third**: Remove cross-entity methods from services
4. **Fourth**: Test all changes

## 📈 Progress Tracking

- **Total Tasks**: 14
- **Completed**: 0
- **In Progress**: 0
- **Blocked**: 0

### Task Status
- [ ] P3.1.1 - P3.1.8: SRP enforcement (8 tasks)
- [ ] P3.2.1 - P3.2.6: @AuditContext() decorator (6 tasks)
- [ ] P3.3.1 - P3.3.2: Clean audit patterns (2 tasks)

---

**Last Updated**: December 23, 2024  
**Next Steps**: Begin with creating @AuditContext() decorator (P3.2.1)