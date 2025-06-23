# 🏥 Pharmaceutical Production Management System

Enterprise pharmaceutical production management system with GraphQL-first architecture, comprehensive audit trails, and GxP compliance features. Built with TypeScript, NestJS, and PostgreSQL.

## 🚀 Current Status
- **Progress**: 80% complete (Foundation + Architectural Refactoring + Test Suite Refactoring COMPLETE)
- **Next Phase**: Phase 5.1 Caching Layer
- **Implementation Guide**: `COMPREHENSIVE_REBUILD_TODO.md` (single source of truth)

## 🛠️ Technology Stack
NestJS + TypeScript + PostgreSQL + Prisma ORM + GraphQL + Redis + JWT Authentication

## 🚀 Setup

### Prerequisites
Node.js 18+, Docker, Git

### Quick Start
```bash
# Start infrastructure
docker-compose up -d

# Install and start
cd apps/backend
npm install
cp .env.example .env
npm run start:dev
```

### Essential Commands
- `npm run build && npm run lint && npm run typecheck`
- `npx prisma generate && npx prisma migrate dev`

### Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@host:5432/pharma_control
REDIS_URL=redis://host:6379
JWT_SECRET=<secure-secret-minimum-32-characters>
```

---

**Status**: 80% Complete | **Next**: Phase 5.1 Caching Layer | **Guide**: `COMPREHENSIVE_REBUILD_TODO.md`