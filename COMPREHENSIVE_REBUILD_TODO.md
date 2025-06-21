# 🚨 COMPREHENSIVE REBUILD TODO - PHARMACEUTICAL SYSTEM

**CRITICAL**: This document captures all 20+ hours of implementation work that was lost.  
**Strategy**: Rebuild incrementally with frequent commits and verification.  
**Safety**: Commit after EVERY major item. Push immediately. Verify on GitHub.

---

## 🛡️ SAFETY PROTOCOL (MANDATORY BEFORE STARTING)

### Pre-Work Checklist
- [ ] Create backup: `cp -r /home/li/dev/projects/pharma /home/li/dev/projects/pharma-backup-$(date +%Y%m%d-%H%M%S)`
- [ ] Test git operations on dummy files first
- [ ] Verify GitHub repository is accessible
- [ ] Confirm working directory is clean: `git status`

### Commit Protocol (AFTER EACH ITEM)
```bash
# After completing each major item:
git add .
git status                    # Verify what's being committed
git commit -m "ITEM_NAME: Brief description"
git push origin master        # Push immediately
# Verify on GitHub that files exist
```

---

## 📋 PHASE 1: PROJECT FOUNDATION & INFRASTRUCTURE

### 1.1 Basic Project Structure
- [ ] **COMMIT SAFETY**: Create apps/backend directory structure
- [ ] **package.json**: Complete NestJS project configuration
  - Dependencies: @nestjs/core, @nestjs/common, @nestjs/graphql, apollo-server-express
  - DevDependencies: typescript, jest, eslint, prettier
  - Scripts: start:dev, build, test, test:e2e, test:performance
- [ ] **tsconfig.json**: TypeScript configuration with strict mode
- [ ] **tsconfig.build.json**: Build-specific TypeScript config
- [ ] **nest-cli.json**: NestJS CLI configuration
- [ ] **eslint.config.mjs**: ESLint configuration for code quality
- [ ] **.prettierrc**: Prettier formatting configuration
- [ ] **.gitignore**: Comprehensive ignore patterns (node_modules, dist, .env, coverage)
- [ ] **VERIFICATION**: `npm install` works, basic project structure exists
- [ ] **COMMIT**: "Project foundation: Basic NestJS structure and configuration"

### 1.2 Environment Configuration
- [ ] **.env.example**: Template environment variables
- [ ] **src/config/app.config.ts**: Application configuration service
- [ ] **src/config/database.config.ts**: Database connection configuration
- [ ] **src/config/validation.schema.ts**: Environment variable validation
- [ ] **src/config/database-optimization.config.ts**: DB performance settings
- [ ] **VERIFICATION**: Configuration loads without errors
- [ ] **COMMIT**: "Configuration: Environment and database setup"

### 1.3 Docker Infrastructure
- [ ] **docker-compose.yml**: PostgreSQL, Redis, Elasticsearch services
  - PostgreSQL 15+ with health checks
  - Redis 7+ with persistence
  - Elasticsearch 8+ with security disabled for dev
  - Volume mappings and network configuration
- [ ] **Docker verification**: `docker-compose up -d` starts all services
- [ ] **COMMIT**: "Infrastructure: Docker services for development"

---

## 📋 PHASE 2: DATABASE & PRISMA FOUNDATION

### 2.1 Prisma Schema - Core Models
- [ ] **prisma/schema.prisma**: Basic generator and datasource configuration
- [ ] **ProductionLineStatus enum**: active, inactive, maintenance
- [ ] **ProcessStatus enum**: pending, in_progress, completed, waiting
- [ ] **UserRole enum**: OPERATOR, MANAGER, ADMIN
- [ ] **ProductionLine model**: id, name, status, timestamps, processes relation
- [ ] **Process model**: id, title, duration, progress, status, x, y, color, productionLineId, timestamps
- [ ] **User model**: id, email, password, firstName, lastName, role, isActive, timestamps
- [ ] **AuditLog model**: id, userId, action, details (Json), ipAddress, userAgent, timestamps
- [ ] **User self-relations**: createdBy/createdUsers for audit trail
- [ ] **VERIFICATION**: `npx prisma generate` works without errors
- [ ] **COMMIT**: "Database: Core Prisma schema with all models"

### 2.2 GxP Data Versioning Schema (NEW REQUIREMENT)
- [ ] **ProductionLine versioning fields**: currentVersion, isActive
- [ ] **Process versioning fields**: currentVersion, isActive
- [ ] **ProductionLineVersion model**: entityId, version, name, status, audit fields, reason
- [ ] **ProcessVersion model**: entityId, version, all process fields, audit fields, reason
- [ ] **AuditLog reason field**: reason (String?) for GxP compliance
- [ ] **User versioning relations**: productionLineVersionsCreated, processVersionsCreated
- [ ] **Unique constraints**: [entityId, version] for both version tables
- [ ] **VERIFICATION**: Schema generates without conflicts
- [ ] **COMMIT**: "GxP Compliance: Data versioning schema for immutable records"

### 2.3 Database Migrations & Seeding
- [ ] **Migration**: `npx prisma migrate dev --name init`
- [ ] **prisma/seed.ts**: Comprehensive seed script
  - Admin user: admin@pharma.local / Admin123!
  - Sample ProductionLines with proper statuses
  - Sample Processes with realistic data
  - Initial audit log entries
- [ ] **Database verification**: `npm run seed` creates sample data
- [ ] **COMMIT**: "Database: Migrations and seed data"

---

## 📋 PHASE 3: CORE SERVICES & BUSINESS LOGIC

### 3.1 Prisma Service
- [ ] **src/prisma/prisma.module.ts**: Prisma module configuration
- [ ] **src/prisma/prisma.service.ts**: 
  - Database connection with optimization settings
  - Connection pooling configuration
  - Query logging and error handling
  - Transaction support methods
- [ ] **VERIFICATION**: Database connects successfully
- [ ] **COMMIT**: "Core: Prisma service with optimized database connection"

### 3.2 Audit Service (CRITICAL FOR COMPLIANCE)
- [ ] **src/audit/audit.service.ts**:
  - `log(userId, action, details, metadata?, tx?)` method
  - Transaction-aware logging
  - IP address and user agent capture
  - JSON serialization for complex objects
  - Reason parameter support (GxP requirement)
- [ ] **src/audit/audit.module.ts**: Module configuration with global scope
- [ ] **AuditMetadata interface**: ipAddress, userAgent typing
- [ ] **VERIFICATION**: Audit logging works in transactions
- [ ] **COMMIT**: "Audit: Transaction-aware audit service for GxP compliance"

### 3.3 Authentication System
- [ ] **src/auth/auth.service.ts**:
  - `login(email, password)` with bcrypt verification
  - JWT token generation with user context
  - Rate limiting for failed attempts
  - Audit logging for authentication events
- [ ] **src/auth/auth.resolver.ts**: GraphQL login mutation
- [ ] **src/auth/dto/login.input.ts**: Login input validation
- [ ] **src/auth/dto/auth-payload.ts**: JWT response structure
- [ ] **src/auth/strategies/jwt.strategy.ts**: JWT strategy for Passport
- [ ] **VERIFICATION**: Login works, JWT tokens validate
- [ ] **COMMIT**: "Authentication: Complete JWT-based auth system"

### 3.4 Authorization Guards & Decorators
- [ ] **src/auth/guards/jwt-auth.guard.ts**: JWT validation guard
- [ ] **src/auth/guards/roles.guard.ts**: Role-based access control
- [ ] **src/auth/guards/login-throttle.guard.ts**: Rate limiting guard
- [ ] **src/common/decorators/roles.decorator.ts**: @Roles() decorator
- [ ] **src/common/decorators/current-user.decorator.ts**: @CurrentUser() decorator
- [ ] **src/common/decorators/audit-metadata.decorator.ts**: @AuditMetadataParam() decorator
- [ ] **src/common/decorators/public.decorator.ts**: @Public() for open endpoints
- [ ] **VERIFICATION**: Guards work correctly, roles enforced
- [ ] **COMMIT**: "Authorization: RBAC guards and decorators"

### 3.5 User Service
- [ ] **src/user/user.service.ts**:
  - Complete CRUD operations with audit logging
  - Password hashing and validation
  - Role management and validation
  - Transaction support for all mutations
- [ ] **src/user/user.resolver.ts**: GraphQL queries and mutations
- [ ] **src/user/entities/user.entity.ts**: GraphQL User type
- [ ] **src/user/dto/create-user.input.ts**: User creation validation
- [ ] **src/user/user.module.ts**: Module configuration
- [ ] **VERIFICATION**: User CRUD works with proper audit trail
- [ ] **COMMIT**: "Users: Complete user management with audit trail"

---

## 📋 PHASE 4: PRODUCTION ENTITIES & SERVICES

### 4.1 ProductionLine Service
- [ ] **src/production-line/production-line.service.ts**:
  - `create(data)`, `createFromInput(input, userId, metadata)` methods
  - `findAll(pagination?)`, `findOne(id)` methods
  - `update(id, data)`, `updateFromInput(id, input, userId, metadata)` methods
  - `remove(id, userId, metadata)` method
  - Transaction support for all mutations
  - Audit logging with complete context
- [ ] **src/production-line/entities/production-line.entity.ts**: GraphQL type
- [ ] **VERIFICATION**: All CRUD operations work with audit trail
- [ ] **COMMIT**: "ProductionLine: Complete service with transaction support"

### 4.2 ProductionLine GraphQL Layer
- [ ] **src/production-line/production-line.resolver.ts**:
  - @Query findAll with pagination support
  - @Query findOne with proper error handling
  - @Mutation createProductionLine with role validation
  - @Mutation updateProductionLine with role validation
  - @Mutation removeProductionLine with manager role requirement
  - @ResolveField processes with DataLoader optimization
- [ ] **src/graphql/dto/production-line/create-production-line.input.ts**: Validation
- [ ] **src/graphql/dto/production-line/update-production-line.input.ts**: Partial validation
- [ ] **VERIFICATION**: GraphQL operations work with proper security
- [ ] **COMMIT**: "ProductionLine: GraphQL API with security and validation"

### 4.3 Process Service (CORE ENTITY)
- [ ] **src/process/process.service.ts**:
  - Complete CRUD operations with transaction support
  - `createFromInput(input, userId, metadata)` method
  - `updateFromInput(id, input, userId, metadata)` method
  - `findAllByProductionLine(lineId, pagination?)` method
  - Pagination with 100-item limit enforcement
  - Proper relation handling with productionLine
- [ ] **src/process/entities/process.entity.ts**: GraphQL type with all fields
- [ ] **VERIFICATION**: Process operations work with proper audit trail
- [ ] **COMMIT**: "Process: Complete service with pharmaceutical workflow support"

### 4.4 Process GraphQL Layer
- [ ] **src/process/process.resolver.ts**:
  - @Query processes with pagination
  - @Query process with error handling
  - @Query processesByProductionLine with filtering
  - @Mutation createProcess with validation
  - @Mutation updateProcess with selective field updates
  - @Mutation removeProcess with manager role requirement
  - @ResolveField productionLine with DataLoader optimization
- [ ] **src/graphql/dto/process/create-process.input.ts**: Complete validation
- [ ] **src/graphql/dto/process/update-process.input.ts**: Partial update validation
- [ ] **VERIFICATION**: All GraphQL operations work correctly
- [ ] **COMMIT**: "Process: GraphQL API with DataLoader optimization"

---

## 📋 PHASE 5: PERFORMANCE & SCALABILITY

### 5.1 Caching Layer
- [ ] **src/cache/cache.service.ts**:
  - Redis integration with intelligent invalidation
  - `getProductionLines()` with caching
  - `invalidateCache(pattern)` method
  - TTL management and cache statistics
- [ ] **src/cache/cache.module.ts**: Redis configuration
- [ ] **Cache integration**: Add to ProductionLine and Process services
- [ ] **VERIFICATION**: Cache hit rates >70% for common queries
- [ ] **COMMIT**: "Performance: Redis caching with intelligent invalidation"

### 5.2 DataLoader Optimization
- [ ] **src/common/dataloader/production-line.dataloader.ts**: N+1 prevention
- [ ] **src/common/dataloader/process.dataloader.ts**: Batch loading
- [ ] **src/common/dataloader/dataloader.module.ts**: Module configuration
- [ ] **src/common/interfaces/graphql-context.interface.ts**: Context typing
- [ ] **GraphQL Context**: Integration with main app
- [ ] **VERIFICATION**: No N+1 queries in GraphQL operations
- [ ] **COMMIT**: "Performance: DataLoader optimization for GraphQL"

### 5.3 Database Monitoring
- [ ] **src/database/database-monitoring.service.ts**:
  - Connection pool monitoring
  - Query performance tracking
  - Slow query detection
  - Health check endpoints
- [ ] **src/database/database-monitoring.controller.ts**: Metrics endpoints
- [ ] **src/database/database.module.ts**: Module configuration
- [ ] **VERIFICATION**: Monitoring endpoints return valid metrics
- [ ] **COMMIT**: "Monitoring: Database performance and health monitoring"

### 5.4 Audit Archiving System
- [ ] **src/audit/audit-archive.service.ts**:
  - PostgreSQL → Elasticsearch migration
  - Cron job for daily archiving
  - Full-text search capabilities
  - 7-year retention compliance
- [ ] **src/audit/audit-archive.controller.ts**: Archive management endpoints
- [ ] **Elasticsearch integration**: Index mapping and search queries
- [ ] **VERIFICATION**: Audit logs can be archived and searched
- [ ] **COMMIT**: "Compliance: Audit archiving with 7-year retention"

---

## 📋 PHASE 6: SECURITY & COMPLIANCE

### 6.1 Security Service
- [ ] **src/common/security/security.service.ts**:
  - JWT secret validation (minimum 32 characters)
  - Production warnings for weak secrets
  - Security configuration management
- [ ] **src/common/security/security.module.ts**: Module configuration
- [ ] **main.ts integration**: Security service initialization
- [ ] **VERIFICATION**: Security warnings work in development
- [ ] **COMMIT**: "Security: JWT secret validation and production warnings"

### 6.2 Input Sanitization & Validation
- [ ] **src/common/validators/pharmaceutical.validators.ts**:
  - `@IsPharmaceuticalSafe()` decorator
  - `@IsProcessTitle()` decorator
  - XSS and SQL injection prevention
  - Pharmaceutical-specific validation rules
- [ ] **src/common/pipes/sanitization.pipe.ts**: Input sanitization pipeline
- [ ] **DTO Integration**: Add validators to all input DTOs
- [ ] **VERIFICATION**: Malicious inputs are properly sanitized
- [ ] **COMMIT**: "Security: Pharmaceutical input validation and sanitization"

### 6.3 Helmet Security Headers
- [ ] **main.ts security configuration**:
  - HSTS with 1-year max age
  - Content Security Policy for pharmaceutical environments
  - X-Frame-Options denial
  - X-Content-Type-Options nosniff
- [ ] **VERIFICATION**: Security headers present in responses
- [ ] **COMMIT**: "Security: Helmet security headers for pharmaceutical compliance"

### 6.4 Application Monitoring
- [ ] **src/monitoring/monitoring.service.ts**:
  - CPU, memory, event loop monitoring
  - Request/response metrics
  - Error rate tracking
  - Performance baseline establishment
- [ ] **src/monitoring/monitoring.controller.ts**: Metrics endpoints
- [ ] **src/monitoring/monitoring.interceptor.ts**: Request tracking
- [ ] **VERIFICATION**: Metrics endpoints return valid data
- [ ] **COMMIT**: "Monitoring: Application performance and health metrics"

---

## 📋 PHASE 7: TESTING INFRASTRUCTURE

### 7.1 Unit Test Foundation
- [ ] **jest.config.js**: Comprehensive Jest configuration
- [ ] **test/jest-e2e.json**: E2E testing configuration
- [ ] **Test utilities**: Database cleanup, test data factories
- [ ] **Coverage configuration**: 100% coverage targets for core modules
- [ ] **VERIFICATION**: `npm run test` runs without errors
- [ ] **COMMIT**: "Testing: Jest configuration and test utilities"

### 7.2 Authentication Tests (33 tests)
- [ ] **src/auth/auth.service.spec.ts**: 
  - Password policy validation (12+ chars, complexity)
  - JWT generation and validation
  - Rate limiting behavior
  - Authentication flow testing
- [ ] **src/auth/guards/*.spec.ts**: Guard behavior testing
- [ ] **VERIFICATION**: All auth tests pass
- [ ] **COMMIT**: "Testing: Authentication system test suite (33 tests)"

### 7.3 Audit Trail Tests (21 tests)
- [ ] **src/audit/audit.service.spec.ts**:
  - Audit logging with user context
  - Complex object serialization
  - IP address and metadata capture
  - Transaction integration testing
- [ ] **test/audit-logging.e2e-spec.ts**: End-to-end audit testing
- [ ] **VERIFICATION**: All audit tests pass
- [ ] **COMMIT**: "Testing: Audit trail test suite (21 tests)"

### 7.4 GraphQL API Tests (31 tests)
- [ ] **test/graphql-process.e2e-spec.ts**: Process CRUD operations
- [ ] **test/graphql-production-line.e2e-spec.ts**: ProductionLine operations
- [ ] **test/graphql-user.e2e-spec.ts**: User management operations
- [ ] **Security testing**: Query depth limits, complexity analysis
- [ ] **Performance testing**: N+1 query prevention validation
- [ ] **VERIFICATION**: All GraphQL tests pass
- [ ] **COMMIT**: "Testing: GraphQL API test suite (31 tests)"

### 7.5 Integration & E2E Tests
- [ ] **test/app.e2e-spec.ts**: Application startup and health
- [ ] **test/prisma.e2e-spec.ts**: Database integration testing
- [ ] **test/cache-integration.e2e-spec.ts**: Redis caching testing
- [ ] **test/audit-archiving.e2e-spec.ts**: Elasticsearch archiving
- [ ] **VERIFICATION**: Full E2E test suite passes
- [ ] **COMMIT**: "Testing: Complete integration and E2E test suite"

---

## 📋 PHASE 8: PERFORMANCE TESTING

### 8.1 k6 Performance Framework
- [ ] **performance-tests/k6-setup.sh**: k6 installation script
- [ ] **performance-tests/run-tests.sh**: Test execution script
- [ ] **performance-tests/README.md**: Performance testing documentation
- [ ] **VERIFICATION**: k6 installs and basic tests run
- [ ] **COMMIT**: "Performance: k6 testing framework setup"

### 8.2 Load Testing Scenarios
- [ ] **performance-tests/graphql-authentication.js**: Auth performance testing
- [ ] **performance-tests/graphql-mutations.js**: Mutation performance testing
- [ ] **performance-tests/cache-performance.js**: Cache hit rate testing
- [ ] **performance-tests/application-monitoring.js**: System metrics testing
- [ ] **Target validation**: 100+ concurrent users, P95 < 200ms
- [ ] **VERIFICATION**: Performance targets achieved
- [ ] **COMMIT**: "Performance: Complete k6 test suite with validation"

---

## 📋 PHASE 9: DOCUMENTATION & FINAL SETUP

### 9.1 API Documentation
- [ ] **src/schema.gql**: Generated GraphQL schema
- [ ] **GraphQL Playground**: Working at http://localhost:3000/graphql
- [ ] **API endpoint documentation**: Health, metrics, database endpoints
- [ ] **VERIFICATION**: All endpoints documented and accessible
- [ ] **COMMIT**: "Documentation: Complete API documentation"

### 9.2 Development Scripts & Tools
- [ ] **package.json scripts**: All development, testing, and deployment scripts
- [ ] **Database scripts**: Migration, seeding, reset procedures
- [ ] **Performance scripts**: Load testing, monitoring setup
- [ ] **VERIFICATION**: All scripts work correctly
- [ ] **COMMIT**: "Development: Complete script suite and tooling"

### 9.3 Main Application Bootstrap
- [ ] **src/main.ts**: Complete application bootstrap
  - Security headers (Helmet)
  - Global guards and pipes
  - GraphQL configuration
  - Error handling
  - Health checks
- [ ] **src/app.module.ts**: Complete module configuration
- [ ] **VERIFICATION**: Application starts and all endpoints work
- [ ] **COMMIT**: "Application: Complete bootstrap and module configuration"

---

## 📋 PHASE 10: GXP COMPLIANCE IMPLEMENTATION

### 10.1 Data Versioning Service (P0.1)
- [ ] **src/versioning/versioning.service.ts**:
  - Replace UPDATE operations with versioned INSERT pattern
  - `createProcessVersion(entityId, data, userId, reason)` method
  - `createProductionLineVersion(entityId, data, userId, reason)` method
  - Temporal query methods for version history
  - Version integrity validation
- [ ] **VERIFICATION**: No UPDATE operations on GxP-critical tables
- [ ] **COMMIT**: "GxP P0.1: Data versioning service for immutable records"

### 10.2 Enhanced Audit Trail (P0.2)
- [ ] **Service method updates**: Add mandatory `reason: string` parameter
- [ ] **GraphQL input updates**: Add reason field to all mutation inputs
- [ ] **Reason validation**: Prevent empty/invalid reason entries
- [ ] **Complete audit logging**: "Who, What, When, Why" for all mutations
- [ ] **VERIFICATION**: All mutations require and capture reason
- [ ] **COMMIT**: "GxP P0.2: Complete audit trail with mandatory reason capture"

### 10.3 QUALITY_ASSURANCE Role (P0.3)
- [ ] **UserRole enum update**: Add QUALITY_ASSURANCE role
- [ ] **Role hierarchy update**: Proper permission levels
- [ ] **Four-Eyes Principle**: Independent review workflow for critical operations
- [ ] **Approval workflow**: Multi-stage approval for process changes
- [ ] **VERIFICATION**: QA role and Four-Eyes Principle enforced
- [ ] **COMMIT**: "GxP P0.3: QUALITY_ASSURANCE role and Four-Eyes Principle"

### 10.4 Electronic Signatures (P0.4)
- [ ] **Re-authentication system**: Password confirmation for critical actions
- [ ] **Digital signature capture**: 21 CFR Part 11 compliant mechanism
- [ ] **Signature audit trail**: Complete signature event logging
- [ ] **Signature verification**: Integrity checking and validation
- [ ] **VERIFICATION**: Electronic signatures meet 21 CFR Part 11 standards
- [ ] **COMMIT**: "GxP P0.4: Electronic signatures for 21 CFR Part 11 compliance"

---

## 🎯 VERIFICATION & DEPLOYMENT READINESS

### Final Integration Testing
- [ ] **All P0 requirements**: Data versioning, audit trail, RBAC, e-signatures
- [ ] **Regulatory audit simulation**: Complete data lineage reconstruction
- [ ] **Performance validation**: 100+ users, P95 < 200ms maintained
- [ ] **Security validation**: All security gates passing
- [ ] **Compliance testing**: GxP requirements fully met

### Production Deployment Gates
- [ ] **Gate 1**: ✅ Technical Security - JWT, HTTPS, input sanitization
- [ ] **Gate 2**: ✅ Performance Validation - Load testing completed
- [ ] **Gate 3**: ❌ GxP Compliance - P0.1-P0.4 implementation required

---

## 📊 PROGRESS TRACKING

**Total Estimated Items**: ~150+ major items  
**Current Progress**: 0% (Post-rebuild start)  
**Target Timeline**: 8-11 weeks for complete GxP compliance  
**Immediate Priority**: Phase 1-3 foundation (Core functionality restore)

---

**REMEMBER**: Commit after EVERY major item. Push immediately. Verify on GitHub.  
**SAFETY FIRST**: When in doubt, create backup and verify before proceeding.