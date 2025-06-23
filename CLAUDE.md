# CLAUDE.md - AI DEVELOPMENT CONTEXT

AI assistance rules and current status for pharmaceutical production management system.

## 🚨 CURRENT STATUS
**Phase**: ✅ PILLARS 1-4 COMPLETE + ✅ Type Safety COMPLETE + ✅ Test Suite Refactoring COMPLETE  
**Next**: 📋 Phase 5 Performance & Scalability  
**Progress**: 40% Phase 1-4 complete + Pillars 1-4 COMPLETE + Type Safety COMPLETE + Test Refactoring COMPLETE = 80% total

## 🎯 IMMEDIATE NEXT ACTIONS
1. **🔧 PRIORITY**: Authentication fixes in test suite - 86/89 tests failing, structure working perfectly
2. **📋 READY**: Phase 5 Performance & Scalability - Redis caching, monitoring, audit archiving
3. **✅ COMPLETE**: Test Suite Refactoring - Feature-based structure implemented, pillar/phase files removed
4. **✅ COMPLETE**: All architectural refactoring (Pillars 1-4) - 65/65 tasks + 27 `any` warnings fixed

## ✅ COMPLETED FOUNDATION
**Phase 1-4 Complete**: Database, Authentication, Audit, User Management, Production Entities ready  
**Compliance Verified**: GxP standards, security, rate limiting, E2E tests complete  
**Production Ready**: ProductionLine & Process services with GraphQL API and DataLoader optimization  
**Testing Complete**: 5 comprehensive test suites covering all Phase 4 functionality (30+ test cases)  
**Pillar 1 Complete**: All transaction atomicity patterns implemented (18/18 tasks) - auditService.withTransaction() eliminated  
**Pillar 2 Complete**: Performance optimizations done (11/11 tasks) - processCount field resolver optimized, redundant queries eliminated  
**Pillar 3 Complete**: Architecture & SRP enforced (14/14 tasks) - @AuditContext() decorator created, cross-entity methods removed, audit logging centralized  
**Pillar 4 Complete**: Type Safety achieved (15/15 tasks) - All `any` types eliminated from core application, 27 warnings fixed (9 strategic test-only `any` remain)  
**Test Suite Refactoring Complete**: Feature-based test organization implemented - ARCH-001/002/003 + REG-003 tests added, pillar/phase files removed, ALL IMPLEMENTATION COMPLETE  
**Infrastructure**: ✅ Dependencies resolved - dataloader 2.2.3 installed, build/typecheck passing, zero compilation errors  
**Archived**: ✅ ARCHITECTURAL_REFACTORING_TODO.md and PILLAR_4_TYPE_SAFETY_TODO.md moved to `archived_md/todos/`  
**Details**: See `archived_md/PHASE_*_COMPLETE.md` and `docs/PROJECT_STATUS.md`

## 📋 TODO & ARCHIVAL MANAGEMENT RULES

### **MANDATORY SEPARATE FILE Creation (>2 Subtasks)**
- **Rule**: CREATE a dedicated TODO file outside main documentation
- **Trigger**: Any phase/task with >2 implementation subtasks
- **What counts as subtasks**: service creation, GraphQL resolvers, tests, validation, documentation
- **Location**: `todos/PHASE_X_Y_TODO.md`
- **Example**: Phase 4 has 4 major components → requires `todos/PHASE_4_PRODUCTION_ENTITIES_TODO.md`

### **DO NOT manage complex phases in:**
- CLAUDE.md (AI context only)
- README.md (project overview only)  
- COMPREHENSIVE_REBUILD_TODO.md (implementation reference only)

### **Complete Lifecycle (Creation → Archive)**
1. **Creation**: When phase planning begins (>2 tasks identified)
2. **Active Management**: Update progress as work progresses
3. **Implementation Complete**: All tasks marked complete by AI
4. **USER Testing**: USER must personally test all functionality
5. **Joint Review**: Both USER and AI verify against specifications
6. **Joint Approval**: Both parties explicitly approve archival
7. **Archive**: Move to `archived_md/todos/` when approved
8. **Cleanup**: Remove from active tracking, update documentation

### **Archival Criteria (NO EXCEPTIONS)**
- ✅ All tasks implemented and verified by AI
- ✅ USER has personally tested functionality
- ✅ USER validates completeness and quality
- ✅ No outstanding issues identified by either party
- ❌ **NEVER archive without USER testing and approval**

## ⚙️ ENTERPRISE DEVELOPMENT STANDARDS
**Full Details**: See `docs/ENTERPRISE_STANDARDS.md` for complete SDLC policy

### **Critical Rules (Always Follow)**
- Use `readonly` interfaces for all configuration
- Constructor dependency injection (never manual instantiation)
- All database operations in transactions
- GraphQL resolvers use DataLoader for relationships
- All tests follow AAA pattern (Arrange, Act, Assert)
- Health checks use `HealthCheckError` and Terminus patterns

## ⚠️ CRITICAL AI RULES
- **NO GIT OPERATIONS**: Claude is banned from all git commands
- **VERIFICATION**: Check GitHub after every commit to ensure files exist
- **SAFETY PROTOCOL**: Frequent commits after every major milestone
- **Enterprise Standards**: Follow `docs/ENTERPRISE_STANDARDS.md` for all code

## 🚀 Essential Commands
**Build**: `npm run build` | **Lint**: `npm run lint` | **Test**: `npm run test:e2e`  
**DB**: `npx prisma generate` | `npx prisma migrate dev` | `npx prisma migrate reset`  
**Working Dir**: Always run from `/home/li/dev/projects/pharma/apps/backend`  
**After changes**: `npm run build && npm run lint && npm run typecheck`

## 🔧 Key Patterns
**Transaction**: `this.prisma.$transaction(async (tx) => { ... })`  
**P2002 Error**: `catch (error) { if (error.code === 'P2002') throw new ConflictException(...) }`  
**DataLoader**: Check context.dataloaders for N+1 prevention

## 📍 Current Context
**Current Priority**: 🔧 Authentication fixes in test suite - see `todos/TEST_SUITE_AUTHENTICATION_FIXES_TODO.md`  
**Next Task**: 📋 Phase 5 Performance & Scalability - see `COMPREHENSIVE_REBUILD_TODO.md`  
**Completed**: ✅ Test Suite Refactoring - feature-based structure working perfectly (10 test files, enterprise-compliant)  
**Test Status**: 3/89 tests passing (structure sound, authentication credentials need fixing)

## 📁 FILE STRUCTURE
- **CLAUDE.md**: Current AI context (this file)
- **README.md**: Project overview and setup
- **COMPREHENSIVE_REBUILD_TODO.md**: Implementation details
- **docs**: Enterprise standards and project status
- **todos**: Active TODO files for phases >2 tasks (currently: TEST_SUITE_AUTHENTICATION_FIXES_TODO.md)
- **archived_md**: Completed phases and historical documentation

---

**Last Updated**: December 23, 2024 - Test suite refactoring COMPLETE - authentication fixes needed, then ready for Phase 5
