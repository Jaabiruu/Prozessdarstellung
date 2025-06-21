# 🛠️ Development Guide - REBUILD EDITION

**Strategic rebuild development workflows for the pharmaceutical production management system**

---

## 🚨 REBUILD STATUS: INFRASTRUCTURE SECURITY FOUNDATION REQUIRED

### **CURRENT STATUS: ❌ INFRASTRUCTURE INSECURE - P0.0 REQUIRED**

The system experienced complete code loss due to manual operations. Before ANY development begins, we must implement bulletproof infrastructure security to prevent future incidents.

**Root Cause**: Manual git operations on development server led to environment destruction  
**Solution**: Eliminate all manual operations through automation  
**Strategy**: Infrastructure-first rebuild with enterprise-grade security

---

## 🛡️ PHASE 0: INFRASTRUCTURE SECURITY FOUNDATION (MANDATORY FIRST)

### **P0.0.1: GitHub Actions CI/CD Pipeline - ❌ NOT IMPLEMENTED**

**Purpose**: Eliminate manual deployments and server operations

```yaml
# .github/workflows/deploy.yml (TO BE CREATED)
name: Pharmaceutical System CI/CD
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd apps/backend && npm install
      - name: Run tests
        run: cd apps/backend && npm run test
      - name: Run E2E tests
        run: cd apps/backend && npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to environment
        run: echo "Automated deployment pipeline"
```

### **P0.0.2: Infrastructure as Code - ❌ NOT IMPLEMENTED**

**Purpose**: Version-controlled environment definitions

```yaml
# docker-compose.prod.yml (TO BE CREATED)
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pharma_control
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  elasticsearch:
    image: elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
```

### **P0.0.3: Branch Protection Rules - ❌ NOT IMPLEMENTED**

**GitHub Repository Settings Required**:
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Restrict pushes that create files larger than 100MB
- ✅ Restrict force pushes
- ✅ Require signed commits (recommended)

### **P0.0.4: Zero Manual Operations Policy - ❌ NOT ESTABLISHED**

**Technical Controls**:
- Server SSH access restricted to CI/CD service accounts only
- Manual git operations prohibited on production/staging servers
- All deployments through automated pipelines
- Environment recreation fully automated from git repository

---

## 📋 REBUILD DEVELOPMENT WORKFLOW (POST-P0.0)

### **Current Rebuild Approach**
1. **Infrastructure First**: Complete P0.0 before any code development
2. **Safety Protocols**: Frequent commits with immediate GitHub verification
3. **Specification-Driven**: Build against preserved original documentation
4. **Progress Tracking**: Update CLAUDE.md after every major milestone

### **Development Environment Setup (NOT YET AVAILABLE)**
```bash
# Will be available after P0.0 completion:
# 1. Clone repository
git clone https://github.com/Jaabiruu/Prozessdarstellung.git
cd Prozessdarstellung

# 2. Automated environment setup (via docker-compose)
docker-compose up -d  # Will start all services

# 3. Backend setup (when apps/backend exists)
cd apps/backend
npm install
npx prisma migrate dev
npm run seed

# 4. Development server
npm run start:dev  # Will be: http://localhost:3000/graphql
```

---

## 🏗️ PLANNED ARCHITECTURE (TO BE REBUILT)

### **Technical Stack (TARGET)**
- **Core**: NestJS v11 + PostgreSQL + Prisma + GraphQL
- **Security**: JWT + RBAC + Helmet + pharmaceutical validators
- **Performance**: Redis + Elasticsearch + k6 testing framework
- **Monitoring**: Custom metrics + database monitoring + health checks
- **Testing**: Jest (100+ tests target) + E2E validation + Performance tests

### **GxP Compliance Architecture (ENHANCED DESIGN)**
```typescript
// ApprovalWorkflowService (NEW - Clean Architecture)
class ApprovalWorkflowService {
  async submitForApproval(entityId: string, userId: string): Promise<ApprovalWorkflow>
  async approve(workflowId: string, approverId: string): Promise<ApprovalWorkflow>
  async reject(workflowId: string, approverId: string, reason: string): Promise<ApprovalWorkflow>
}

// State Machine Pattern for Approval Transitions
enum ApprovalState {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED', 
  REJECTED = 'REJECTED'
}
```

---

## 📊 DEVELOPMENT READINESS GATES

### **❌ Gate 0: Infrastructure Security - BLOCKED**
- [ ] GitHub Actions CI/CD pipeline operational
- [ ] Infrastructure as Code implemented
- [ ] Branch protection rules active
- [ ] Zero manual operations policy enforced

### **❌ Gate 1: Foundation Ready - PENDING**
- [ ] Project structure created
- [ ] Database schema with versioning
- [ ] Core services implemented
- [ ] Authentication system functional

### **❌ Gate 2: Feature Complete - PENDING**
- [ ] Production entities (Process, ProductionLine)
- [ ] Performance optimization (Redis, DataLoader)
- [ ] Security hardening complete
- [ ] Testing infrastructure operational

### **❌ Gate 3: GxP Compliance - PENDING**
- [ ] Data versioning service (P0.1)
- [ ] Complete audit trail (P0.2) 
- [ ] ApprovalWorkflowService & QUALITY_ASSURANCE role (P0.3)
- [ ] Electronic signatures (P0.4)

---

## 🎯 REFERENCE DOCUMENTATION

### **Specification Documents (PRESERVED)**
- **CLAUDE_SPECIFICATION.md**: Original system state before loss
- **DEVELOPMENT_GUIDE_SPECIFICATION.md**: Original development workflows
- **COMPREHENSIVE_REBUILD_TODO.md**: Complete 150+ item rebuild checklist

### **Progress Tracking (ACTIVE)**
- **CLAUDE.md**: Live rebuild progress tracker
- **DEVELOPMENT_GUIDE.md**: This document - rebuilt development guide
- **COMPLIANCE-FIRST-PLAN.md**: Enhanced compliance plan with infrastructure security

---

## 🚀 IMMEDIATE ACTIONS REQUIRED

### **For USER (Git Operations)**
```bash
# Commit this documentation update
git add .
git status
git commit -m "Development Guide: Rebuild edition with infrastructure security foundation

Strategic rebuild approach including:
- Phase 0: Infrastructure security requirements
- Zero manual operations policy
- Enhanced GxP compliance architecture
- Specification-driven development approach

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin master
```

### **For CLAUDE (Development)**
1. **WAIT**: No development until P0.0 infrastructure security complete
2. **IMPLEMENT**: P0.0.1 GitHub Actions pipeline
3. **CREATE**: P0.0.2 Infrastructure as Code
4. **CONFIGURE**: P0.0.3 Branch protection rules
5. **VERIFY**: P0.0.4 Zero manual operations enforcement

---

**Status**: 🚧 **INFRASTRUCTURE PREPARATION PHASE**  
**Next**: 🛡️ **P0.0 Infrastructure Security Foundation**  
**Risk**: 🔴 **HIGH - Manual operations still possible**  
**Last Updated**: June 21, 2025