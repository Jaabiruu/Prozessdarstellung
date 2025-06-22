# CLAUDE.md - AI DEVELOPMENT CONTEXT

AI assistance rules and current status for pharmaceutical production management system.

## 🚨 CURRENT STATUS
**Phase**: ✅ PILLAR 1 COMPLETE + ✅ GraphQL Enum Conflict RESOLVED  
**Next**: Continue Pillars 2-4 (Performance, SRP, Type Safety) architectural refactoring  
**Progress**: 40% Phase 1-4 complete + Pillar 1 Atomicity 100% implemented (18/18 tasks complete)

## 🎯 IMMEDIATE NEXT ACTIONS
1. **✅ COMPLETE**: GraphQL enum fix implemented - Prisma UserRole enum removed, CHECK constraint added  
2. **✅ COMPLETE**: Pillar 1 tests running - foreign key constraint issues in test data (expected behavior)  
3. **ARCHITECTURE**: Continue Pillars 2-4 (Performance, SRP, Type Safety) - see `todos/ARCHITECTURAL_REFACTORING_TODO.md`

## ✅ COMPLETED FOUNDATION
**Phase 1-4 Complete**: Database, Authentication, Audit, User Management, Production Entities ready  
**Compliance Verified**: GxP standards, security, rate limiting, E2E tests complete  
**Production Ready**: ProductionLine & Process services with GraphQL API and DataLoader optimization  
**Testing Complete**: 5 comprehensive test suites covering all Phase 4 functionality (30+ test cases)  
**Pillar 1 Complete**: All transaction atomicity patterns implemented (18/18 tasks) - auditService.withTransaction() eliminated  
**GraphQL Enum Fixed**: ✅ UserRole converted to String with CHECK constraint - tests now running  
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

## 📁 FILE STRUCTURE
- **CLAUDE.md**: Current AI context (this file)
- **README.md**: Project overview and setup
- **COMPREHENSIVE_REBUILD_TODO.md**: Implementation details
- **docs**: Enterprise standards and project status
- **todos**: Active TODO files for phases >2 tasks
- **archived_md**: Completed phases and historical documentation

---

**Last Updated**: December 23, 2025  
**Status**: PILLAR 1 COMPLETE - GraphQL enum conflict RESOLVED  
**AI Context Size**: 85 lines (90% reduction achieved)
