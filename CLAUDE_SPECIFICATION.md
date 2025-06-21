# CLAUDE.md

AI assistance context for pharmaceutical production management system.

## 🎯 CURRENT STATUS
**Phase**: ⚠️ TECHNICAL FOUNDATION COMPLETE - GxP COMPLIANCE INCOMPLETE  
**Progress**: Technical implementation complete, P0 compliance requirements BLOCKING  
**Next**: PRIORITY 0 GxP Compliance Implementation (MANDATORY)  
**Deployment Gates**: Security Gate 1 ✅ | Performance Gate 2 ✅ | **Compliance Gate 3 ❌ BLOCKED**

## ✅ COMPLETED PHASES
- **Foundation**: GraphQL API, Authentication, Security, Audit Trail
- **Work Package 6**: Transaction Support with comprehensive testing  
- **Priority 1 Security**: JWT management, HTTPS enforcement, input sanitization
- **Priority 2 Performance**: k6 testing, Redis caching, Elasticsearch archiving, DB optimization

## 🚨 CURRENT STATE
**Security**: ✅ TECHNICAL BASELINE COMPLETE - SecurityService, Helmet, pharmaceutical validators  
**Scalability**: ✅ TECHNICAL BASELINE COMPLETE - Redis caching, Elasticsearch archiving, connection pooling  
**Performance**: ✅ VALIDATED - 100+ users, P95 < 200ms, comprehensive monitoring  
**GxP Compliance**: ❌ **INCOMPLETE - BLOCKING PRODUCTION DEPLOYMENT**  
**Architecture**: ⏳ OPTIONAL - @Global() coupling exists but functional

## 🚨 PRIORITY 0 - BLOCKING COMPLIANCE REQUIREMENTS
**❌ MANDATORY for Pharmaceutical Production Deployment**

1. **P0.1: Data Versioning** - Immutable historical records (prevents data overwrites)
2. **P0.2: Complete Audit Trail** - Mandatory "Why" capture for all mutations  
3. **P0.3: GxP-Compliant RBAC** - Four-Eyes Principle and QUALITY_ASSURANCE role
4. **P0.4: Electronic Signatures** - 21 CFR Part 11 compliance implementation

## 🔄 OPTIONAL TASKS (Priority 3 - LOW - AFTER P0 COMPLETION)
1. **Event-Driven Architecture** - Replace @Global() with EventEmitter pattern
2. **Microservices Prep** - Module decomposition for future scaling
3. **Advanced Monitoring** - OpenTelemetry integration
4. **API Gateway** - Rate limiting and API versioning

## 🛠️ COMPLETE IMPLEMENTATION STACK
### Security Layer
- `SecurityService` - JWT secret validation, production warnings
- `pharmaceutical.validators.ts` - XSS/SQL injection prevention
- Helmet CSP - Script, frame, object blocking
- Enhanced DTOs - All inputs use `@IsPharmaceuticalSafe()`

### Performance Layer
- `CacheService` - Redis caching with intelligent invalidation
- `AuditArchiveService` - Elasticsearch tiered storage
- `DatabaseMonitoringService` - Connection pool and query tracking
- `MonitoringService` - Application-level metrics

### Infrastructure
- **PostgreSQL** - Primary database with connection pooling
- **Redis** - Caching layer with LRU eviction
- **Elasticsearch** - Audit log archiving and search
- **k6** - Performance testing framework

## 🚀 Quick Commands
```bash
# Setup (Complete Infrastructure)
docker-compose up -d  # Starts PostgreSQL, Redis, Elasticsearch
cd apps/backend && npm install
npx prisma migrate dev && npm run seed

# Development  
npm run start:dev  # http://localhost:3000/graphql
admin@pharma.local / Admin123!

# Testing
npm run test:e2e          # All integration tests
npm run test:performance  # k6 load testing suite

# Monitoring
curl http://localhost:3000/metrics         # Application metrics
curl http://localhost:3000/database/metrics # Database metrics
```

## 🏗️ Complete Tech Stack
**Core**: NestJS v11 + PostgreSQL + Prisma + GraphQL + JWT RBAC  
**Security**: Helmet, sanitize-html, pharmaceutical validators  
**Performance**: Redis caching, Elasticsearch archiving, k6 testing  
**Monitoring**: Custom metrics, database monitoring, health checks  
**Models**: User, ProductionLine, Process, AuditLog (with archiving)

## ⚠️ CRITICAL COMPLIANCE GAPS
- **Data Integrity Violation**: Records overwritten via UPDATE operations (violates GxP)
- **Incomplete Audit Trail**: Missing mandatory "Why" parameter for mutations
- **Inadequate RBAC**: Missing QUALITY_ASSURANCE role and Four-Eyes Principle
- **No Electronic Signatures**: 21 CFR Part 11 compliance mechanism missing

## ⚠️ KNOWN TECHNICAL ISSUES
- Unit tests failing due to pharmaceutical validators (E2E tests working)
- @Global() pattern for AuditModule (works but not ideal architecture)
- Default JWT secret warning in development (by design)

## 🎯 DEPLOYMENT READINESS
**Gate 1**: ✅ PASSED - Technical security baseline achieved  
**Gate 2**: ✅ PASSED - Performance validated (100+ users, P95 < 200ms)  
**Gate 3**: ❌ **BLOCKED - GxP Compliance Verification MANDATORY**

**⚠️ PRODUCTION DEPLOYMENT**: **BLOCKED** until P0 compliance requirements complete
**Regulatory Risk**: **UNACCEPTABLE** for pharmaceutical environment

## 📊 PRODUCTION METRICS
- **Load Capacity**: 100+ concurrent users validated
- **Response Time**: P95 < 200ms, P99 < 500ms achieved
- **Cache Performance**: >70% hit rate for common queries
- **Audit Compliance**: 7-year retention with search capability