# CLAUDE.md - AI CONTEXT

## 🚨 STATUS
**Progress**: 80% complete (Foundation + Architecture + Test Suite COMPLETE)  
**Next**: Phase 5.1 Caching Layer (per COMPREHENSIVE_REBUILD_TODO.md)

## 🎯 WORKFLOW
1. Check todos/ folder for active work
2. If empty: Read COMPREHENSIVE_REBUILD_TODO.md → Propose detailed TODO → Get approval → Execute

## ⚠️ CRITICAL AI RULES
- **NO GIT OPERATIONS**: User handles all git commands
- **Use TodoWrite**: Track progress frequently
- **Enterprise Standards**: Follow `docs/ENTERPRISE_STANDARDS.md`

## 🚀 Essential Commands
- **Build/Check**: `npm run build && npm run lint && npm run typecheck`
- **Database**: `npx prisma generate && npx prisma migrate dev`
- **Working Dir**: `/home/li/dev/projects/pharma/apps/backend`

## 🔧 Key Patterns
- **Transaction**: `this.prisma.$transaction(async (tx) => { ... })`
- **DataLoader**: Check context.dataloaders for N+1 prevention

## 📁 FILES
- **COMPREHENSIVE_REBUILD_TODO.md**: SINGLE SOURCE OF TRUTH for implementation
- **todos/**: Active work or empty (AI creates TODOs when needed)

---

**Last Updated**: December 23, 2024
