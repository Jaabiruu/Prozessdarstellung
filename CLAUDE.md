# CLAUDE.md - REBUILD PROGRESS TRACKER

AI assistance context for pharmaceutical production management system - **REBUILD IN PROGRESS**

## 🚨 CURRENT REBUILD STATUS
**Phase**: ✅ **PHASE 2 COMPLETE - DATABASE & PRISMA FOUNDATION**  
**Progress**: 18% - Phase 2 Database Foundation (6/6 tasks complete)  
**Next**: Phase 3 Core Services (Auth, Audit, User management)  
**Previous Code**: ❌ LOST - 20+ hours of implementation destroyed  
**Rebuild Strategy**: ✅ ENHANCED with enterprise infrastructure security

## 🛡️ INFRASTRUCTURE SECURITY FOUNDATION (P0.0 - IN PROGRESS)
**Status**: ❌ NOT STARTED - HIGHEST PRIORITY  
**Requirement**: Eliminate manual operations to prevent future code loss

### P0.0 Implementation Checklist
- [ ] **GitHub Actions CI/CD Pipeline**: Automated deployments, no manual server access
- [ ] **Infrastructure as Code**: Docker compositions version-controlled
- [ ] **Branch Protection Rules**: Master branch protection, require PRs
- [ ] **Automated Environment Recreation**: Complete environment from git only
- [ ] **Zero Manual Operations Policy**: Technical prevention of manual server manipulation

## 📋 REBUILD PHASES (PENDING P0.0 COMPLETION)

### ✅ Phase 1: Project Foundation (COMPLETED)
- [x] apps/backend directory structure
- [x] package.json with NestJS dependencies
- [x] TypeScript configuration (strict mode)
- [x] ESLint, Prettier configuration
- [x] Docker infrastructure (PostgreSQL, Redis, Elasticsearch)
- [x] Main NestJS application module
- [x] Health check endpoints
- [x] Environment configuration
- [x] **Enterprise Configuration Standards**: readonly interfaces, union types, secure JWT handling
- [x] **Modular Architecture**: Proper dependency injection and barrel exports
- [x] **Type Safety**: Comprehensive interfaces and computed properties

### ✅ Phase 2: Database & Prisma (COMPLETED - 6/6 TASKS) 
- [x] ✅ **P2.1**: Prisma schema with core models and GxP versioning
- [x] ✅ **P2.2**: PrismaService with enterprise patterns and lifecycle management
- [x] ✅ **P2.3**: Enhanced database configuration with connection pooling
- [x] ✅ **P2.4**: Database migrations successfully executed and verified
- [x] ✅ **P2.5**: Secure data seeding script with environment-based passwords
- [x] ✅ **P2.6**: Module integration with app.module.ts and enhanced health checks

### ❌ Phase 3: Core Services (NOT STARTED)
- [ ] Prisma service with optimized connections
- [ ] Audit service with transaction support
- [ ] Authentication system (JWT + RBAC)
- [ ] Authorization guards and decorators
- [ ] User management service

### ❌ Phase 4: Production Entities (NOT STARTED)
- [ ] ProductionLine service with versioning
- [ ] Process service with pharmaceutical workflows
- [ ] GraphQL resolvers with DataLoader optimization
- [ ] Complete CRUD operations with audit trail

### ❌ Phase 5: Performance & Security (NOT STARTED)
- [ ] Redis caching with intelligent invalidation
- [ ] Database monitoring and optimization
- [ ] Audit archiving (PostgreSQL → Elasticsearch)
- [ ] Security headers and input sanitization
- [ ] Application monitoring and metrics

### ❌ Phase 6: Testing Infrastructure (NOT STARTED)
- [ ] Jest configuration and test utilities
- [ ] Authentication tests (33 tests target)
- [ ] Audit trail tests (21 tests target) 
- [ ] GraphQL API tests (31 tests target)
- [ ] Integration and E2E test suites

### ❌ Phase 7: Performance Testing (NOT STARTED)
- [ ] k6 performance framework
- [ ] Load testing scenarios (100+ users target)
- [ ] Performance validation (P95 < 200ms target)
- [ ] Cache performance testing

### ❌ Phase 8: GxP Compliance (NOT STARTED)
- [ ] **P0.1**: Data versioning service (immutable records)
- [ ] **P0.2**: Complete audit trail (mandatory "Why" parameter)
- [ ] **P0.3**: ApprovalWorkflowService & QUALITY_ASSURANCE role
- [ ] **P0.4**: Electronic signatures (21 CFR Part 11)

## 🎯 REFERENCE SPECIFICATIONS
- **CLAUDE_SPECIFICATION.md**: Original system specification (20+ hours of work)
- **DEVELOPMENT_GUIDE_SPECIFICATION.md**: Original development workflows
- **COMPREHENSIVE_REBUILD_TODO.md**: Complete rebuild checklist (150+ items)
- **COMPLIANCE-FIRST-PLAN.md**: Enhanced compliance plan with infrastructure security

## 📊 REBUILD METRICS
**Total Items**: ~150+ major implementation items  
**Completed**: 18 items (Phase 1 + Phase 2 Complete)  
**Current Progress**: 18.0%  
**Infrastructure Security**: ❌ Not implemented (P0.0 pending)  
**Code Foundation**: ✅ Phase 1 Complete + Enterprise Standards  
**Database Foundation**: ✅ Phase 2 Complete (6/6 tasks)  
**Enterprise Standards**: ✅ Established and Implemented  
**GxP Compliance**: 🚧 Database schema ready, services pending

## 🚀 IMMEDIATE NEXT ACTIONS
1. **Phase 3 Planning**: Begin Core Services implementation (Auth, Audit, User management)
2. **P3.1 Authentication System**: JWT + RBAC with QUALITY_ASSURANCE role support
3. **P3.2 Audit Service**: Transaction-aware logging for GxP compliance
4. **P3.3 User Management**: CRUD operations with proper authorization

## 🏗️ SOFTWARE DEVELOPMENT LIFECYCLE (SDLC) POLICY

**Established**: June 21, 2025 - **MANDATORY for all development phases**

### 1. Configuration & Type Safety Standards

#### Configuration Immutability
```typescript
// ✅ DO: Use readonly properties
interface DatabaseConfig {
  readonly url: string;
  readonly maxConnections: readonly number;
}

// ❌ DON'T: Mutable configuration
interface DatabaseConfig {
  url: string;  // Can be accidentally modified
  maxConnections: number;
}
```

#### Type Safety Requirements
| DO ✅ | DON'T ❌ |
|-------|----------|
| `type NodeEnv = 'development' \| 'production' \| 'test'` | `nodeEnv: string` |
| `type UserRole = 'OPERATOR' \| 'MANAGER' \| 'ADMIN'` | `role: string` |
| `readonly port: number` | `port: number` |
| Use specific union types for enum-like values | Use generic `string` for constrained values |
| Leverage TypeScript compiler for error catching | Rely on runtime validation only |

#### Sensitive Data Handling
```typescript
// ✅ DO: Class with secure serialization
export class JwtConfig {
  readonly secret: string;
  readonly expiresIn: string;

  constructor(config: { secret: string; expiresIn: string }) {
    this.secret = config.secret;
    this.expiresIn = config.expiresIn;
  }

  toJSON() {
    return {
      expiresIn: this.expiresIn,
      secret: '[REDACTED]', // Prevents accidental logging
    };
  }
}

// ❌ DON'T: Interface for sensitive data
interface JwtConfig {
  secret: string; // Will be exposed in JSON.stringify()
  expiresIn: string;
}
```

### 2. NestJS Architecture Standards

#### Module Structure
| DO ✅ | DON'T ❌ |
|-------|----------|
| Create feature modules (`UsersModule`, `ProcessModule`) | Put everything in `AppModule` |
| Use `@Global()` only for truly global services (Config, Logger) | Make every module global |
| Inject dependencies via constructor | Use `new MyService()` manually |
| Use DTOs for all API inputs/outputs | Use `any` or raw objects |
| Throw `HttpException` types (`NotFoundException`) | Let raw errors leak to API |

```typescript
// ✅ DO: Proper service structure
@Injectable()
export class ProcessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async createProcess(data: CreateProcessDto, userId: string, reason: string): Promise<Process> {
    // Business logic here
  }
}

// ❌ DON'T: Poor service structure
@Injectable()
export class ProcessService {
  private prisma = new PrismaClient(); // Manual instantiation
  
  async createProcess(data: any): Promise<any> { // No types
    // Logic mixed with HTTP concerns
  }
}
```

#### Dependency Injection Patterns
```typescript
// ✅ DO: Constructor injection
constructor(
  private readonly prisma: PrismaService,
  private readonly logger: Logger,
) {}

// ❌ DON'T: Property injection or manual instantiation
private prisma = new PrismaService();
@Inject(WINSTON_MODULE_PROVIDER) private logger;
```

### 3. Prisma & Database Standards

#### Schema Management
| DO ✅ | DON'T ❌ |
|-------|----------|
| Use `prisma migrate dev` for all schema changes | Manually modify database |
| Use `$transaction` for related operations | Execute related writes separately |
| Use `select` and `include` for specific fields | Always fetch complete entities |
| Create central `PrismaService` | Instantiate `PrismaClient` everywhere |
| Use `prisma.$disconnect()` in app lifecycle | Leave connections open |

```typescript
// ✅ DO: Transactional operations
async createProcessWithAudit(data: CreateProcessDto, userId: string, reason: string) {
  return this.prisma.$transaction(async (tx) => {
    const process = await tx.process.create({ data });
    await tx.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'Process',
        entityId: process.id,
        userId,
        reason,
      },
    });
    return process;
  });
}

// ❌ DON'T: Separate operations
async createProcessWithAudit(data: CreateProcessDto, userId: string, reason: string) {
  const process = await this.prisma.process.create({ data });
  // Risk: If this fails, process exists without audit trail
  await this.prisma.auditLog.create({ /* ... */ });
  return process;
}
```

### 4. GraphQL API Standards

#### Schema Design
| DO ✅ | DON'T ❌ |
|-------|----------|
| Use specific mutations (`approveProcess`, `rejectProcess`) | Generic `updateProcess` for everything |
| Return modified object from mutations | Return only success boolean |
| Use Input types for mutation arguments | Long list of individual arguments |
| Handle errors with `GraphQLError` | Throw generic exceptions |
| Implement query depth/complexity limits | Leave API unprotected |

```typescript
// ✅ DO: Specific mutations
@Mutation(() => Process)
async approveProcess(
  @Args('input') input: ApproveProcessInput,
  @CurrentUser() user: User,
): Promise<Process> {
  return this.processService.approve(input.id, user.id, input.reason);
}

@Mutation(() => Process)
async rejectProcess(
  @Args('input') input: RejectProcessInput,
  @CurrentUser() user: User,
): Promise<Process> {
  return this.processService.reject(input.id, user.id, input.reason);
}

// ❌ DON'T: Generic mutation
@Mutation(() => Boolean)
async updateProcess(@Args() args: any): Promise<boolean> {
  // Unclear what action is being performed
  return true;
}
```

#### DataLoader for N+1 Prevention
```typescript
// ✅ DO: Use DataLoader for relationships
@ResolveField(() => [Step])
async steps(@Parent() process: Process): Promise<Step[]> {
  return this.stepsLoader.load(process.id);
}

// ❌ DON'T: Direct database queries in resolvers
@ResolveField(() => [Step])
async steps(@Parent() process: Process): Promise<Step[]> {
  return this.prisma.step.findMany({ where: { processId: process.id } });
}
```

### 5. Security & Error Handling Standards

#### Secret Management
| DO ✅ | DON'T ❌ |
|-------|----------|
| Use environment variables for all secrets | Hardcode secrets in code |
| Use class-based config with `toJSON()` redaction | Store secrets in plain interfaces |
| Use `getOrThrow()` for required configuration | Allow undefined secrets |
| Validate configuration on app startup | Discover missing config at runtime |

#### Error Handling Patterns
```typescript
// ✅ DO: Structured error handling
try {
  const result = await this.dangerousOperation();
  return result;
} catch (error) {
  this.logger.error('Operation failed', {
    operation: 'dangerousOperation',
    error: error.message,
    userId: user.id,
  });
  throw new InternalServerErrorException('Operation failed');
}

// ❌ DON'T: Poor error handling
try {
  return await this.dangerousOperation();
} catch (error) {
  console.log(error); // No context, poor logging
  throw error; // Raw error leaks internal details
}
```

### 6. Testing Standards

#### Test Structure (AAA Pattern)
```typescript
// ✅ DO: Clear test structure
describe('ProcessService', () => {
  it('should create process with audit trail', async () => {
    // Arrange
    const createDto = { name: 'Test Process', description: 'Test' };
    const userId = 'user-123';
    const reason = 'Testing process creation';

    // Act
    const result = await service.createProcess(createDto, userId, reason);

    // Assert
    expect(result).toBeDefined();
    expect(result.name).toBe(createDto.name);
    expect(mockAuditService.create).toHaveBeenCalledWith({
      action: 'CREATE',
      entityType: 'Process',
      userId,
      reason,
    });
  });
});

// ❌ DON'T: Unclear test structure
it('should work', async () => {
  const result = await service.createProcess({ name: 'Test' }, 'user', 'reason');
  expect(result.name).toBe('Test');
  // No clear arrangement, mixed concerns
});
```

### 7. Class vs Interface Decision Matrix

| Use Class When | Use Interface When |
|----------------|-------------------|
| You need methods or computed properties | Pure data structure |
| You need custom serialization (`toJSON()`) | Simple type definition |
| You're handling sensitive data | Public configuration |
| You need inheritance or polymorphism | Contract definition |
| You need runtime behavior | Compile-time type checking only |

### 8. Code Review Enforcement Checklist

**Before any code is merged, verify:**
- [ ] All configuration interfaces use `readonly` properties
- [ ] No generic `string` types where union types are appropriate
- [ ] Sensitive data uses class-based config with `toJSON()` redaction
- [ ] All modules have proper barrel exports (`index.ts`)
- [ ] All services use constructor dependency injection
- [ ] All database operations use transactions where appropriate
- [ ] All GraphQL resolvers use DataLoader for relationships
- [ ] All tests follow AAA pattern (Arrange, Act, Assert)
- [ ] No hardcoded secrets or configuration values
- [ ] Error handling provides meaningful context without exposing internals
- [ ] Health checks use `HealthCheckError` and proper Terminus patterns
- [ ] Environment variables validated on startup with clear error messages
- [ ] Global modules documented with architectural justification
- [ ] Logging follows structured patterns with appropriate levels
- [ ] No log spam from successful routine operations

**Enforcement**: Any code not meeting these standards will be rejected in code review and must be refactored before merge.

## 🛡️ ENTERPRISE DEVSECOPS & GOVERNANCE STANDARDS

**Regulatory Context**: Pharmaceutical software requires validated processes beyond code quality

### 9. DevSecOps Automation Requirements

#### Static Code Analysis & Quality Gates
| DO ✅ | DON'T ❌ |
|-------|----------|
| Implement SonarQube with mandatory quality gates | Rely only on manual code review |
| Set coverage threshold minimum 80% for critical paths | Allow untested code in production |
| Configure security hotspot detection and resolution | Ignore automated security findings |
| Block merges when quality gate fails | Override quality gates without documentation |
| Generate quality reports for regulatory audits | Skip documentation of quality metrics |

```yaml
# ✅ DO: SonarQube quality gate configuration
sonar.coverage.minimum=80
sonar.security.hotspots.required.review=true
sonar.pullrequest.provider=github
sonar.qualitygate.wait=true
```

#### Dependency Security & SBOM Management
```typescript
// ✅ DO: Automated dependency scanning workflow
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        with:
          args: --severity-threshold=medium
      - name: Generate SBOM
        run: |
          npx @cyclonedx/cyclonedx-npm --output-file sbom.json
          # Store SBOM for regulatory compliance
```

| DO ✅ | DON'T ❌ |
|-------|----------|
| Scan dependencies on every commit | Manual vulnerability checking |
| Maintain Software Bill of Materials (SBOM) | Unknown dependency inventory |
| Auto-create security patches via Dependabot | Ignore security updates |
| Set vulnerability severity thresholds | Allow any vulnerable dependencies |
| Document all dependency approvals | Use dependencies without validation |

#### Infrastructure as Code (Mandatory)
```hcl
# ✅ DO: Terraform infrastructure definition
resource "aws_rds_instance" "pharma_db" {
  identifier = "pharma-production-db"
  engine     = "postgres"
  engine_version = "15.3"
  
  # Compliance: All changes tracked in version control
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Security: Encrypted at rest for GxP compliance
  storage_encrypted = true
  kms_key_id       = aws_kms_key.pharma_key.arn
  
  tags = {
    Environment = "production"
    Compliance  = "GxP"
    BackupTested = timestamp()
  }
}
```

| DO ✅ | DON'T ❌ |
|-------|----------|
| Define ALL infrastructure in code | Manual server configuration |
| Version control infrastructure changes | Click-and-configure in cloud console |
| Test infrastructure deployment in staging | Deploy directly to production |
| Document disaster recovery procedures | Assume backups work without testing |
| Encrypt all data at rest and in transit | Store unencrypted sensitive data |

#### Monitoring & Compliance Alerting
```typescript
// ✅ DO: Compliance-aware monitoring
const complianceAlerts = {
  auditLogFailure: {
    condition: 'audit_log_errors > 0',
    severity: 'critical',
    notification: ['compliance-team@company.com', 'oncall@company.com'],
    documentation: 'Immediate investigation required for GxP compliance'
  },
  dataIntegrityViolation: {
    condition: 'data_version_conflicts > 0',
    severity: 'critical',
    action: 'auto-lock affected records'
  },
  unauthorizedAccess: {
    condition: 'failed_auth_attempts > 10 in 5m',
    severity: 'high',
    action: 'auto-block IP, notify security team'
  }
};
```

### 10. Enterprise Governance Framework

#### Definition of Done (DoD) for GxP Features
**A feature is NOT complete until ALL criteria are met:**

```markdown
## Definition of Done Checklist
- [ ] **Code Complete**: All functionality implemented and reviewed
- [ ] **Unit Tests**: Coverage ≥80% for new code paths
- [ ] **Integration Tests**: End-to-end workflows validated
- [ ] **Security Review**: No high/critical vulnerabilities
- [ ] **Compliance Review**: GxP requirements validated
- [ ] **Documentation**: API docs and user guides updated
- [ ] **Performance**: Meets P95 <200ms requirement
- [ ] **Audit Trail**: All changes properly logged with "reason"
- [ ] **Data Versioning**: Immutable record pattern followed
- [ ] **Authorization**: Proper role-based access controls
- [ ] **Backup Testing**: New data structures included in DR testing
- [ ] **Regulatory Sign-off**: QA approval for production deployment
```

#### Pull Request Compliance Template
```markdown
## GxP Compliance Checklist (Mandatory)
**Reviewer must verify ALL items before approval:**

### Data Integrity
- [ ] All database mutations use transactions
- [ ] Audit logging includes: who, what, when, why
- [ ] Data versioning preserves historical records
- [ ] No direct UPDATE/DELETE on GxP-critical tables

### Security & Authorization
- [ ] All endpoints protected by appropriate guards
- [ ] Role-based access control properly implemented
- [ ] Sensitive data handling follows class-based config pattern
- [ ] No hardcoded secrets or credentials

### Performance & Monitoring
- [ ] N+1 queries prevented with DataLoader
- [ ] Database queries optimized and indexed
- [ ] Monitoring alerts configured for new functionality
- [ ] Error handling prevents information leakage

### Testing & Documentation
- [ ] Unit tests cover new business logic
- [ ] Integration tests validate complete workflows
- [ ] API documentation updated (GraphQL schema)
- [ ] Regulatory documentation updated if required

**Reviewer Signature**: [Name] - [Date] - [Compliance Role]
```

#### Release Management Process
| Phase | Requirements | Responsible Party | Validation |
|-------|-------------|-------------------|------------|
| **Development Complete** | All DoD criteria met | Engineering Team | Automated CI/CD checks |
| **Release Candidate** | Staging environment deployment | DevOps Team | Performance & security testing |
| **QA Validation** | Compliance testing complete | QA Team | GxP validation protocols |
| **Security Review** | Penetration testing passed | Security Team | Vulnerability assessment |
| **Regulatory Approval** | Change control documentation | Compliance Team | Risk assessment review |
| **Production Deployment** | Formal go/no-go decision | Release Manager | Deployment validation |

#### Incident Response Plan (GxP-Specific)
```markdown
## Security Incident Response (15-minute activation)

### Immediate Response (0-15 minutes)
1. **Detect**: Automated monitoring alerts or manual report
2. **Assess**: Determine if patient data or GxP records affected
3. **Contain**: Isolate affected systems, preserve evidence
4. **Notify**: Alert incident response team and compliance officer

### Investigation Phase (15 minutes - 4 hours)
1. **Evidence Collection**: Preserve all logs and audit trails
2. **Impact Assessment**: Determine scope of data exposure
3. **Root Cause Analysis**: Identify vulnerability and attack vector
4. **Regulatory Assessment**: Determine if FDA/EMA notification required

### Resolution Phase (4 hours - 24 hours)
1. **Remediation**: Fix vulnerability and restore service
2. **Validation**: Confirm security and data integrity restored
3. **Documentation**: Complete incident report for regulatory filing
4. **Communication**: Notify affected parties per regulatory requirements

### Post-Incident (24-72 hours)
1. **Lessons Learned**: Update security controls and procedures
2. **Regulatory Filing**: Submit required compliance reports
3. **Process Improvement**: Update incident response procedures
4. **Training Update**: Revise security awareness training
```

### 11. Regulatory Compliance Integration

#### Change Control Documentation
```typescript
// ✅ DO: Every production change requires formal documentation
interface ChangeControlRecord {
  readonly changeId: string;
  readonly title: string;
  readonly description: string;
  readonly riskAssessment: RiskLevel;
  readonly businessJustification: string;
  readonly technicalDetails: string;
  readonly rollbackPlan: string;
  readonly validationProtocol: string;
  readonly approvals: {
    readonly engineering: ApprovalRecord;
    readonly qa: ApprovalRecord;
    readonly compliance: ApprovalRecord;
    readonly management: ApprovalRecord;
  };
  readonly implementationDate: Date;
  readonly validationResults: ValidationRecord[];
}
```

#### Audit Trail Requirements (21 CFR Part 11)
| Requirement | Implementation | Validation |
|-------------|----------------|------------|
| **Electronic Records** | All data changes logged with digital signature | Cryptographic hash validation |
| **Electronic Signatures** | Re-authentication for critical actions | Password confirmation + audit log |
| **Audit Trail** | Immutable log of all system activities | Hash chain integrity verification |
| **Data Integrity** | Original data preserved through versioning | Historical record reconstruction |
| **Access Controls** | Role-based authentication and authorization | Regular access review and certification |

### 12. Quality Assurance Gates

#### Pre-Merge Validation Pipeline
```yaml
# ✅ DO: Comprehensive validation before any merge
name: GxP Validation Pipeline
on:
  pull_request:
    branches: [main, develop]

jobs:
  compliance-validation:
    runs-on: ubuntu-latest
    steps:
      - name: Code Quality Gate
        run: sonar-scanner -Dsonar.qualitygate.wait=true
      
      - name: Security Scan
        run: |
          snyk test --severity-threshold=medium
          npm audit --audit-level moderate
      
      - name: GxP Compliance Tests
        run: |
          npm run test:audit-trail
          npm run test:data-versioning
          npm run test:authorization
      
      - name: Performance Validation
        run: |
          k6 run performance-tests/critical-paths.js
          # Fail if P95 > 200ms
      
      - name: Documentation Check
        run: |
          # Verify API documentation is updated
          # Check compliance documentation completeness
```

#### Regulatory Documentation Maintenance
| Document Type | Update Trigger | Responsible Party | Review Cycle |
|---------------|----------------|-------------------|--------------|
| **System Documentation** | Any architecture change | Engineering Lead | Quarterly |
| **Validation Protocols** | New feature deployment | QA Team | Per release |
| **Risk Assessments** | Security or compliance change | Compliance Officer | Annually |
| **Standard Operating Procedures** | Process modification | Process Owner | Annually |
| **Training Materials** | System functionality change | Training Coordinator | Per major release |

### 13. Enforcement & Compliance Verification

#### Automated Compliance Monitoring
```typescript
// ✅ DO: Continuous compliance monitoring
const complianceMonitoring = {
  dataIntegrity: {
    check: 'All historical versions preserved',
    frequency: 'hourly',
    alert: 'immediate'
  },
  auditCompleteness: {
    check: 'All mutations have corresponding audit entries',
    frequency: 'realtime',
    alert: 'immediate'
  },
  accessControl: {
    check: 'No unauthorized role assignments',
    frequency: 'daily',
    alert: 'within 4 hours'
  },
  backupValidation: {
    check: 'Backup restoration test successful',
    frequency: 'weekly',
    alert: 'within 24 hours'
  }
};
```

**Final Enforcement Rule**: No code reaches production without passing ALL governance, security, and compliance validations. Any attempt to bypass these controls must be documented as a formal deviation with executive approval and regulatory risk assessment.

### 14. Health Check & Monitoring Standards

#### Health Check Implementation Patterns
| DO ✅ | DON'T ❌ |
|-------|----------|
| Use `HealthCheckError` for health check failures | Throw generic `Error` in health checks |
| Let Terminus framework handle HTTP error responses | Manually throw errors that override Terminus |
| Implement real connectivity tests (ping, query) | Use configuration-only checks |
| Log only failures and errors | Log every successful health check |
| Return structured status objects | Return boolean or generic responses |

```typescript
// ✅ DO: Proper Terminus health check pattern
async checkDatabase(): Promise<HealthIndicatorResult> {
  const key = 'database';
  try {
    await this.databaseService.ping(); // Real connectivity test
    return this.getStatus(key, true, { responseTime: '15ms' });
  } catch (error) {
    this.logger.error(`${key} health check failed`, error.stack);
    throw new HealthCheckError('Database connection failed', 
      this.getStatus(key, false, { message: error.message }));
  }
}

// ❌ DON'T: Anti-pattern with manual error handling
async checkDatabase(): Promise<HealthIndicatorResult> {
  try {
    const isConfigured = !!this.config.databaseUrl; // Config-only check
    if (!isConfigured) {
      throw new Error('Database not configured'); // Generic throw
    }
    this.logger.log('Database health check passed'); // Log spam
    return this.getStatus('database', true);
  } catch (error) {
    throw new Error('Health check failed'); // Loses context
  }
}
```

#### Environment-Based Security Configuration
| DO ✅ | DON'T ❌ |
|-------|----------|
| Load all secrets from environment variables | Hardcode any secrets in source code |
| Validate required environment variables on startup | Discover missing config at runtime |
| Use bracket notation for environment access | Use dot notation that may not exist |
| Provide clear error messages for missing config | Fail silently or with generic errors |
| Document environment variables in .env.example | Leave configuration undocumented |

```typescript
// ✅ DO: Secure environment-based configuration
export class SecureConfig {
  readonly jwtSecret: string;
  readonly adminPassword: string;

  constructor() {
    this.jwtSecret = this.getRequiredEnv('JWT_SECRET');
    this.adminPassword = this.getRequiredEnv('DEFAULT_ADMIN_PASSWORD');
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set. Check .env.example for guidance.`);
    }
    return value;
  }

  toJSON() {
    return {
      jwtSecret: '[REDACTED]',
      adminPassword: '[REDACTED]',
    };
  }
}

// ❌ DON'T: Insecure configuration patterns
export class InsecureConfig {
  jwtSecret = 'hardcoded-secret'; // Hardcoded secret
  adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'; // Default fallback
  
  // No toJSON override - secrets will be logged
}
```

#### Global Module Architecture Patterns
| DO ✅ | DON'T ❌ |
|-------|----------|
| Use `@Global()` for truly universal services | Make every module global |
| Document architectural trade-offs explicitly | Use global modules without justification |
| Apply global pattern consistently | Mix global and explicit import patterns |
| Consider dependency visibility implications | Ignore hidden dependency issues |

```typescript
// ✅ DO: Justified global module for universal service
/**
 * Global Database Module
 * 
 * ARCHITECTURAL DECISION: This module is global because:
 * - Database access is required by 90%+ of feature modules
 * - Reduces boilerplate across the application
 * - Centralizes connection management
 * 
 * TRADE-OFF: Less explicit dependencies, but acceptable for foundational services
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}

// ❌ DON'T: Unjustified global module
@Global() // No justification provided
@Module({
  providers: [EmailService], // Not universally needed
  exports: [EmailService],
})
export class EmailModule {} // Should be explicitly imported where needed
```

#### Log Management & Monitoring
| DO ✅ | DON'T ❌ |
|-------|----------|
| Log failures, errors, and significant events | Log routine successful operations |
| Use structured logging with context | Use simple string messages |
| Include stack traces for debugging | Log only error messages |
| Set appropriate log levels | Use same level for all logs |
| Sanitize sensitive data in logs | Log raw user data or secrets |

```typescript
// ✅ DO: Structured logging with appropriate levels
this.logger.error('Database operation failed', {
  operation: 'createUser',
  userId: user.id,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
});

this.logger.debug('Database query executed', {
  query: 'SELECT COUNT(*) FROM users',
  duration: '15ms',
});

// ❌ DON'T: Poor logging practices
this.logger.log('Health check passed'); // Creates log noise
this.logger.error(`Error: ${error}`); // No context
console.log('User data:', userData); // May expose sensitive info
```

## ⚠️ CRITICAL REMINDERS
- **NO GIT OPERATIONS**: Claude is banned from all git commands
- **INFRASTRUCTURE FIRST**: P0.0 must be completed before any code development
- **SAFETY PROTOCOL**: Frequent commits after every major milestone
- **VERIFICATION**: Check GitHub after every commit to ensure files exist
- **ENTERPRISE STANDARDS**: All code MUST follow the established coding standards above

---

**Last Updated**: June 21, 2025 - 23:20  
**Status**: ✅ PHASE 2 COMPLETE - DATABASE FOUNDATION ESTABLISHED  
**Risk Level**: 🔴 HIGH - No infrastructure automation yet (P0.0 pending)  
**Current Tasks**: Phase 3 Planning → Core Services Implementation  
**Next Milestone**: Phase 3 Core Services (Auth, Audit, User Management)