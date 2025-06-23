# CLAUDE.md - AI DEVELOPMENT CONTEXT

AI assistance rules and current status for pharmaceutical production management system.

## 🚨 CURRENT STATUS
**Phase**: ✅ PILLARS 1-4 COMPLETE + ✅ Type Safety COMPLETE + ✅ Test Suite Refactoring COMPLETE  
**Next**: 📋 Phase 5 Performance & Scalability  
**Progress**: 40% Phase 1-4 complete + Pillars 1-4 COMPLETE + Type Safety COMPLETE + Test Refactoring COMPLETE = 80% total

## 🎯 IMMEDIATE NEXT ACTIONS
1. **📋 WORKFLOW**: Check todos/ folder for active work OR identify next subtask from COMPREHENSIVE_REBUILD_TODO.md
2. **📋 READY**: Phase 5.1 Caching Layer (per COMPREHENSIVE_REBUILD_TODO.md) - Redis integration implementation
3. **✅ COMPLETE**: Test Suite Refactoring - Feature-based structure implemented, pillar/phase files removed
4. **✅ COMPLETE**: All architectural refactoring (Pillars 1-4) - 65/65 tasks + 27 `any` warnings fixed

## ✅ COMPLETED FOUNDATION
**Foundation**: Phase 1-4 complete with enterprise architecture, authentication, audit trails, and production entities  
**Architecture**: Pillars 1-4 complete - atomicity, performance, SRP, and type safety all implemented  
**Test Suite**: Feature-based organization working perfectly with 10 test files and enterprise compliance  
**Details**: See `docs/PROJECT_STATUS.md` for complete progress tracking

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
**Workflow**: Check todos/ folder for active work, or reference COMPREHENSIVE_REBUILD_TODO.md for next subtask  
**Next Ready**: Phase 5.1 Caching Layer (Redis integration) - see `COMPREHENSIVE_REBUILD_TODO.md`  
**Completed**: ✅ Test Suite Refactoring - feature-based structure implemented (10 test files, enterprise-compliant)  
**AI Instruction**: Create detailed TODO files for COMPREHENSIVE_REBUILD_TODO.md subtasks when needed and get user approval

## 📁 FILE STRUCTURE
- **CLAUDE.md**: Current AI context (this file)
- **README.md**: Project overview and setup
- **COMPREHENSIVE_REBUILD_TODO.md**: **SINGLE SOURCE OF TRUTH** for all implementation phases
- **docs**: Enterprise standards and project status
- **todos**: Active TODO files or empty (AI creates TODOs from COMPREHENSIVE_REBUILD_TODO.md when needed)
- **archived_md**: Completed phases and historical documentation

---

**Last Updated**: December 23, 2024 - Generalized AI handoff workflow - COMPREHENSIVE_REBUILD_TODO.md is single source of truth
