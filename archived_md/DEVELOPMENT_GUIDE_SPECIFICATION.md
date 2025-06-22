# 🛠️ Development Guide

**Comprehensive development workflows and standards for the pharmaceutical production management system**

---

## 📋 Table of Contents

1. [Enterprise Production Readiness](#-enterprise-production-readiness)
2. [Development Setup](#-development-setup)
3. [Coding Standards](#-coding-standards)
4. [Development Workflows](#-development-workflows)
5. [Testing Strategy](#-testing-strategy)
6. [Pharmaceutical Compliance](#-pharmaceutical-compliance)
7. [Troubleshooting](#-troubleshooting)

---

## 🚨 Enterprise Production Readiness

### **CURRENT STATUS: ❌ NOT PRODUCTION READY - GxP COMPLIANCE INCOMPLETE**

The system has technical foundation complete but **CRITICAL GxP compliance gaps** prevent pharmaceutical production deployment. See `COMPLIANCE-FIRST-PLAN.md` for required P0 implementations.

### **COMPLETED IMPLEMENTATIONS**

**✅ JWT Secret Management - COMPLETE**
```typescript
// ✅ IMPLEMENTED: SecurityService with validation
@Injectable()
export class SecurityService {
  getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error('Invalid JWT secret configuration');
    }
    return secret;
  }
}
```

**✅ HTTPS Enforcement - COMPLETE**
```typescript
// ✅ IMPLEMENTED in main.ts
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    }
  }
}));
```

**✅ Input Sanitization - COMPLETE**
```typescript
// ✅ IMPLEMENTED: Pharmaceutical validators
@IsPharmaceuticalSafe()
@IsProcessTitle()
title: string;

export function IsPharmaceuticalSafe() {
  return (object: Object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      validator: PharmaceuticalSafeValidator,
    });
  };
}
```

### **✅ PERFORMANCE & SCALABILITY - COMPLETE**

**✅ Audit Log Management - COMPLETE**
```typescript
// ✅ IMPLEMENTED: Elasticsearch tiered storage
@Injectable()
export class AuditArchiveService {
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async archiveOldLogs(): Promise<{ archived: number; errors: number }> {
    // PostgreSQL → Elasticsearch → S3 pipeline
    return this.archiveLogsBatch(cutoffDate);
  }
  
  async searchArchivedLogs(query: SearchQuery): Promise<SearchResult> {
    // Full-text search in Elasticsearch
  }
}
```

**✅ Caching Strategy - COMPLETE**
```typescript
// ✅ IMPLEMENTED: Redis with intelligent invalidation
@Injectable()
export class CacheService {
  async getProductionLines(): Promise<ProductionLine[]> {
    const cached = await this.cacheManager.get('production-lines');
    if (cached) return cached;
    
    const data = await this.prisma.productionLine.findMany();
    await this.cacheManager.set('production-lines', data, 300);
    return data;
  }
}
```

**✅ Performance Testing - COMPLETE**
```bash
# ✅ IMPLEMENTED: k6 comprehensive test suite
npm run test:performance

# Achieved results:
# ✅ P95 latency < 200ms
# ✅ P99 latency < 500ms  
# ✅ <2% transaction rollback rate
# ✅ Zero deadlocks under concurrent load
# ✅ >70% cache hit rate
```

### **❌ PRODUCTION DEPLOYMENT GATES - COMPLIANCE BLOCKED**

**✅ Gate 1: Technical Security - PASSED**
- ✅ JWT secret management with SecurityService
- ✅ HTTPS enforcement configured with Helmet
- ✅ Input sanitization implemented with pharmaceutical validators
- ✅ Security headers configured (HSTS, CSP, X-Frame-Options)

**✅ Gate 2: Performance Validation - PASSED**  
- ✅ Load testing completed (100+ concurrent users validated)
- ✅ Audit log archiving strategy implemented (Elasticsearch)
- ✅ Redis caching deployed with intelligent invalidation
- ✅ Database connection pooling optimized

**❌ Gate 3: GxP Compliance Verification - BLOCKED**
- ❌ **P0.1: Data Versioning** - Immutable historical records MISSING
- ❌ **P0.2: Complete Audit Trail** - Mandatory "Why" parameter MISSING
- ❌ **P0.3: GxP-Compliant RBAC** - Four-Eyes Principle MISSING
- ❌ **P0.4: Electronic Signatures** - 21 CFR Part 11 compliance MISSING

**⚠️ DEPLOYMENT STATUS**: **BLOCKED** until ALL P0 requirements complete

---

## 🚀 Development Setup

### Prerequisites Checklist
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 15+ available
- [ ] Docker installed (recommended)
- [ ] Git configured
- [ ] IDE with TypeScript support

### Initial Setup Procedure

```bash
# 1. Clone repository
git clone <repository-url>
cd pharma

# 2. Environment setup
cp .env.example .env  # Configure your environment variables

# 3. Database setup
docker-compose up -d  # Start PostgreSQL

# 4. Backend setup
cd apps/backend
npm install           # Install dependencies
npx prisma generate   # Generate Prisma client
npx prisma migrate dev # Run migrations
npm run seed         # Seed initial data

# 5. Verify setup
npm run test         # Run tests to verify everything works
npm run start:dev    # Start development server
```

### Development Environment Verification

```bash
# Check database connection
npx prisma db push

# Verify admin user exists
# Login at http://localhost:3000/graphql
# Email: admin@pharma.local
# Password: Admin123!

# Run comprehensive test suite
npm run test:cov     # Should show 100% coverage for core modules
```

---

## 📐 Coding Standards

### 1. Naming Conventions

#### Models (PascalCase, Singular)
```typescript
// ✅ Correct
User, ProductionLine, ProcessBlock, AuditLog

// ❌ Incorrect
user, Users, production_line, processBlocks
```

#### Fields (camelCase)
```typescript
// ✅ Correct
firstName, createdAt, productionLineId, ipAddress

// ❌ Incorrect
first_name, CreatedAt, production_line_id, IP_address
```

#### Enums (PascalCase name, UPPER_SNAKE_CASE values)
```typescript
// ✅ Correct
enum ProcessStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// ❌ Incorrect
enum processStatus {
  pending = 'pending',
  inProgress = 'in_progress'
}
```

### 2. Database Design Standards

#### Primary Keys
```typescript
// ✅ Always use CUID or UUID strings
id String @id @default(cuid())

// ❌ Avoid auto-incrementing numbers
id Int @id @default(autoincrement())
```

#### Timestamps
```typescript
// ✅ Required on all important models
model User {
  id        String   @id @default(cuid())
  // ... other fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Relations
```typescript
// ✅ Explicit relation definitions
model Process {
  id               String        @id @default(cuid())
  productionLineId String
  productionLine   ProductionLine @relation(fields: [productionLineId], references: [id], onDelete: Cascade)
}

model ProductionLine {
  id        String    @id @default(cuid())
  processes Process[]
}
```

### 3. TypeScript Standards

#### Strict Configuration
```json
// tsconfig.json - Always use strict mode
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

#### Interface Definitions
```typescript
// ✅ Explicit interfaces for complex objects
interface AuditMetadata {
  ipAddress?: string;
  userAgent?: string;
}

interface CreateProcessInput {
  title: string;
  duration: number;
  productionLineId: string;
  x: number;
  y: number;
  color: string;
}
```

### 4. NestJS Module Patterns

#### Service Implementation
```typescript
@Injectable()
export class ProcessService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService, // Always inject audit service
  ) {}

  async create(data: CreateProcessInput, userId: string): Promise<Process> {
    // Business logic
    const process = await this.prisma.process.create({ data });
    
    // Audit logging
    await this.auditService.log(
      userId,
      'PROCESS_CREATE',
      { processId: process.id, ...data }
    );
    
    return process;
  }
}
```

#### Resolver Implementation
```typescript
@Resolver(() => Process)
@UseGuards(JwtAuthGuard) // Global auth by default
export class ProcessResolver {
  constructor(private processService: ProcessService) {}

  @Mutation(() => Process)
  @Roles('OPERATOR') // Minimum role required
  async createProcess(
    @Args('data') data: CreateProcessInput,
    @CurrentUser() user: User,
  ): Promise<Process> {
    return this.processService.create(data, user.id);
  }
}
```

---

## 🔄 Development Workflows

### 1. Adding a New Entity

#### Step 1: Database Schema
```typescript
// 1. Update prisma/schema.prisma
model NewEntity {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      EntityStatus @default(ACTIVE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("new_entities")
}

enum EntityStatus {
  ACTIVE
  INACTIVE
}
```

#### Step 2: Migration
```bash
# 2. Create and apply migration
npx prisma migrate dev --name add_new_entity
npx prisma generate
```

#### Step 3: Service Layer
```typescript
// 3. Create src/new-entity/new-entity.service.ts
@Injectable()
export class NewEntityService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(data: CreateNewEntityInput, userId: string) {
    const entity = await this.prisma.newEntity.create({ data });
    
    await this.auditService.log(
      userId,
      'NEW_ENTITY_CREATE',
      { entityId: entity.id, ...data }
    );
    
    return entity;
  }

  async findAll() {
    return this.prisma.newEntity.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // ... other CRUD methods
}
```

#### Step 4: GraphQL Layer
```typescript
// 4. Create GraphQL entity and DTOs
@ObjectType()
export class NewEntity {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => EntityStatus)
  status: EntityStatus;
  
  // ... other fields
}

@InputType()
export class CreateNewEntityInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
```

#### Step 5: Resolver
```typescript
// 5. Create resolver with proper guards
@Resolver(() => NewEntity)
@UseGuards(JwtAuthGuard)
export class NewEntityResolver {
  constructor(private newEntityService: NewEntityService) {}

  @Query(() => [NewEntity])
  @Roles('OPERATOR')
  async newEntities(): Promise<NewEntity[]> {
    return this.newEntityService.findAll();
  }

  @Mutation(() => NewEntity)
  @Roles('MANAGER') // Higher privilege for creation
  async createNewEntity(
    @Args('data') data: CreateNewEntityInput,
    @CurrentUser() user: User,
  ): Promise<NewEntity> {
    return this.newEntityService.create(data, user.id);
  }
}
```

#### Step 6: Module & Testing
```typescript
// 6. Create module
@Module({
  imports: [PrismaModule, AuditModule],
  providers: [NewEntityService, NewEntityResolver],
})
export class NewEntityModule {}

// 7. Add comprehensive tests
describe('NewEntityService', () => {
  // Unit tests for service methods
});

describe('NewEntityResolver', () => {
  // Integration tests for GraphQL operations
});
```

### 2. Transaction Support Implementation Pattern

#### Standard Pattern for Atomic Operations
```typescript
async createProcessWithTransaction(
  data: CreateProcessInput,
  userId: string
): Promise<Process> {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Main business operation
    const process = await tx.process.create({ data });
    
    // 2. Related updates
    await tx.productionLine.update({
      where: { id: data.productionLineId },
      data: { processCount: { increment: 1 } }
    });
    
    // 3. Audit logging within transaction
    await tx.auditLog.create({
      data: {
        userId,
        action: 'PROCESS_CREATE_WITH_COUNTER',
        details: { processId: process.id, ...data }
      }
    });
    
    return process;
  });
}
```

### 3. Code Review Process

#### Pre-Review Checklist
- [ ] All tests passing (`npm run test`)
- [ ] Code follows naming conventions
- [ ] Audit logging implemented for data mutations
- [ ] Proper error handling and validation
- [ ] TypeScript strict mode compliance
- [ ] Documentation updated if needed

#### Review Criteria
1. **Security**: All endpoints properly protected
2. **Audit Trail**: Data changes logged appropriately
3. **Error Handling**: Comprehensive error scenarios covered
4. **Testing**: New functionality has test coverage
5. **Performance**: Efficient database queries (avoid N+1)

---

## 📊 Work Package Tracking

### Current Implementation Status

#### ⚠️ TECHNICAL FOUNDATION COMPLETE - GxP COMPLIANCE INCOMPLETE

##### Work Package 1-4: Foundation Complete ✅
- **Database Schema**: All core models with proper relations
- **Service Layer**: Complete CRUD operations with business logic
- **GraphQL API**: Production-ready with security and performance optimization
- **Testing**: Comprehensive test suite with 100+ tests

##### Work Package 5: Audit Trail Foundation ✅ COMPLETE
- **AuditLog Model**: Generic audit logging with flexible JSON details
- **AuditService**: Injectable service with comprehensive logging capabilities
- **Authentication Integration**: Login success/failure tracking
- **Test Coverage**: 21 audit-specific test cases

##### Work Package 6: Transaction Support ✅ COMPLETE
- **Transaction Implementation**: All CRUD operations use Prisma.$transaction
- **Audit Integration**: Transaction-aware audit logging
- **API Consistency**: Same public API with internal transaction support
- **Test Coverage**: Comprehensive transaction validation

#### ✅ ADDITIONAL ENTERPRISE ENHANCEMENTS COMPLETE

##### Priority 1: Security Baseline ✅ COMPLETE
- **JWT Management**: SecurityService with production-ready secret handling
- **HTTPS Enforcement**: Helmet integration with pharmaceutical CSP
- **Input Sanitization**: XSS/SQL injection prevention with pharmaceutical validators
- **Rate Limiting**: DDoS protection on authentication endpoints

##### Priority 2: Performance & Scalability ✅ COMPLETE
- **Performance Testing**: k6 comprehensive test suite (100+ users validated)
- **Caching Layer**: Redis with intelligent cache invalidation
- **Audit Archiving**: PostgreSQL → Elasticsearch → S3 tiered storage
- **Database Optimization**: Connection pooling and performance monitoring

**✅ PRODUCTION IMPLEMENTATION PATTERN ACHIEVED**:
```typescript
// All service methods now use transactions with audit logging
async createFromInput(
  input: CreateProcessInput,
  userId: string,
  metadata?: AuditMetadata,
): Promise<Process> {
  return await this.prisma.$transaction(async (tx) => {
    const process = await tx.process.create({
      data: { /* input fields */ },
      include: { productionLine: true },
    });

    await this.auditService.log(
      userId,
      'PROCESS_CREATE',
      { processId: process.id, ...input },
      metadata,
      tx, // ✅ Transaction-aware audit logging
    );

    return process;
  });
}

// Resolvers use existing method names with additional metadata
@Mutation(() => Process)
async createProcess(
  @Args('input') input: CreateProcessInput,
  @CurrentUser() user: User,
  @AuditMetadataParam() metadata: AuditMetadata,
): Promise<Process> {
  return this.processService.createFromInput(input, user.id, metadata);
}
```

**🎯 ARCHITECTURAL BENEFITS ACHIEVED**:
- ✅ Audit logging is mandatory for all data mutations
- ✅ Same public service API maintained (no breaking changes)
- ✅ All data mutations are atomic with rollback capability
- ✅ IP tracking and user context captured automatically
- ❌ **Pharmaceutical compliance requirements INCOMPLETE** - See P0 blockers
- ✅ Performance validated for 100+ concurrent users
- ✅ Enterprise security baseline implemented

#### 🚀 Future Work Packages

##### Work Package 7: Real-time Capabilities
- GraphQL Subscriptions for live process monitoring
- WebSocket integration for production updates
- Real-time audit event streaming

##### Work Package 8: Advanced Querying
- Server-side filtering and sorting
- Complex search capabilities
- Performance optimization for large datasets

---

## 🧪 Testing Strategy

### Test Structure and Coverage

#### Current Test Status: 54+ Comprehensive Tests
- **Unit Tests**: Service logic and business rules
- **Integration Tests**: Module interactions and database operations
- **E2E Tests**: Complete workflows with authentication

#### Testing Categories

##### 1. Authentication & Security Tests (33 tests)
```typescript
// Password policy validation
describe('Password Validation', () => {
  it('should reject passwords shorter than 12 characters');
  it('should require uppercase, lowercase, numbers, and symbols');
  it('should block common passwords from blacklist');
  it('should limit consecutive repeating characters');
});

// JWT and authentication flow
describe('Authentication Flow', () => {
  it('should generate valid JWT for correct credentials');
  it('should reject deactivated users');
  it('should handle rate limiting correctly');
});

// Role-based access control
describe('RBAC Authorization', () => {
  it('should allow ADMIN access to MANAGER endpoints');
  it('should deny OPERATOR access to ADMIN endpoints');
  it('should enforce hierarchical role inheritance');
});
```

##### 2. Audit Trail Tests (21 tests)
```typescript
// Audit service functionality
describe('AuditService', () => {
  it('should log actions with correct user context');
  it('should serialize complex objects correctly');
  it('should capture IP address and metadata');
});

// Integration with authentication
describe('Audit Integration', () => {
  it('should log successful login attempts');
  it('should log failed authentication attempts');
  it('should maintain audit trail consistency');
});
```

##### 3. GraphQL API Tests (31 tests)
```typescript
// CRUD operations
describe('GraphQL Operations', () => {
  it('should create process with valid input');
  it('should enforce input validation');
  it('should handle database errors gracefully');
});

// Performance and security
describe('GraphQL Security', () => {
  it('should limit query depth to prevent DoS');
  it('should analyze query complexity');
  it('should prevent N+1 query problems');
});
```

### Running Tests

#### Test Commands
```bash
# Run all tests
npm run test

# Run specific test categories
npm run test auth          # Authentication tests
npm run test audit         # Audit trail tests
npm run test process       # Process-related tests

# Run with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode for development
npm run test:watch
```

#### Test Environment Setup
```bash
# Ensure test database is available
docker-compose up -d

# Run tests with proper environment
NODE_ENV=test npm run test:e2e
```

### Testing Best Practices

#### 1. Test Structure
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ServiceName, PrismaService, AuditService],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.cleanDatabase();
  });

  describe('methodName', () => {
    it('should handle success scenario', async () => {
      // Arrange
      const testData = { /* test input */ };
      
      // Act
      const result = await service.methodName(testData);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });

    it('should handle error scenario', async () => {
      // Test error cases
      await expect(service.methodName(invalidData))
        .rejects.toThrow(ExpectedErrorType);
    });
  });
});
```

#### 2. Audit Trail Testing
```typescript
// Always verify audit logs in tests
it('should create audit log for data mutation', async () => {
  const result = await service.createEntity(data, userId);
  
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId, action: 'ENTITY_CREATE' }
  });
  
  expect(auditLogs).toHaveLength(1);
  expect(auditLogs[0].details).toMatchObject({
    entityId: result.id,
    ...data
  });
});
```

---

## 🏥 Pharmaceutical Compliance

### GxP Compliance Implementation

#### 1. Audit Trail Requirements
```typescript
// All data mutations must be audited
async updateProcess(id: string, data: UpdateProcessInput, userId: string) {
  // Capture original state for audit
  const originalProcess = await this.prisma.process.findUnique({
    where: { id }
  });
  
  // Perform update
  const updatedProcess = await this.prisma.process.update({
    where: { id },
    data
  });
  
  // Audit the change
  await this.auditService.log(
    userId,
    'PROCESS_UPDATE',
    {
      processId: id,
      originalState: originalProcess,
      newState: updatedProcess,
      changes: data
    }
  );
  
  return updatedProcess;
}
```

#### 2. Data Integrity Measures
- **Immutable Audit Logs**: No update or delete operations on audit records
- **Foreign Key Constraints**: Proper database relationships prevent orphaned records
- **Transaction Support**: Atomic operations ensure data consistency
- **Validation**: Comprehensive input validation at service and GraphQL levels

#### 3. Access Control for Compliance
```typescript
// Role-based access with compliance in mind
enum UserRole {
  OPERATOR = 'OPERATOR',    // Production line operators
  MANAGER = 'MANAGER',      // Production managers
  ADMIN = 'ADMIN'          // System administrators
}

// Hierarchical permissions
const roleHierarchy = {
  ADMIN: ['ADMIN', 'MANAGER', 'OPERATOR'],
  MANAGER: ['MANAGER', 'OPERATOR'],
  OPERATOR: ['OPERATOR']
};
```

#### 4. Security Requirements
- **Password Policies**: Enterprise-grade password requirements
- **Session Management**: JWT with configurable expiration
- **IP Tracking**: Client IP address captured in audit logs
- **Rate Limiting**: Protection against brute force attacks

### Validation and Documentation

#### 1. System Validation Approach
```typescript
// Validation testing for compliance
describe('GxP Compliance Validation', () => {
  it('should maintain complete audit trail for all operations');
  it('should prevent unauthorized access to sensitive data');
  it('should ensure data integrity through transactions');
  it('should provide immutable audit records');
});
```

#### 2. Documentation Requirements
- **User Procedures**: Clear instructions for system usage
- **Technical Documentation**: Architecture and security measures
- **Validation Records**: Test results and compliance evidence
- **Change Control**: Version control and change documentation

---

## 🆘 Troubleshooting

### Common Development Issues

#### 1. Database Connection Problems
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart database
docker-compose down
docker-compose up -d

# Reset database if needed
npx prisma migrate reset
npm run seed
```

#### 2. Prisma Issues
```bash
# Regenerate Prisma client
npx prisma generate

# Fix migration conflicts
npx prisma migrate resolve --applied <migration_name>

# View database state
npx prisma studio
```

#### 3. Authentication Problems
```bash
# Verify admin user exists
npm run seed

# Check JWT secret configuration
echo $JWT_SECRET

# Test authentication in GraphQL playground
# Use login mutation first, then copy token to headers
```

#### 4. Test Failures
```bash
# Clear test database
NODE_ENV=test npx prisma migrate reset

# Run tests with verbose output
npm run test -- --verbose

# Run specific failing test
npm run test -- --testNamePattern="specific test name"
```

#### 5. Build and TypeScript Issues
```bash
# Clean build
npm run build

# Check TypeScript errors
npx tsc --noEmit

# Fix import issues
npm run lint -- --fix
```

### Performance Debugging

#### 1. Database Query Analysis
```bash
# Enable Prisma query logging
DEBUG="prisma:query" npm run start:dev

# Use Prisma Studio for query analysis
npx prisma studio
```

#### 2. GraphQL Performance
```typescript
// Monitor resolver performance
@Resolver(() => ProductionLine)
export class ProductionLineResolver {
  @ResolveField(() => [Process])
  async processes(@Parent() productionLine: ProductionLine) {
    // Use DataLoader to prevent N+1 queries
    return this.processDataLoader.load(productionLine.id);
  }
}
```

### Development Environment Issues

#### 1. Node.js Version Problems
```bash
# Check Node.js version
node --version  # Should be 18+

# Use nvm to manage versions
nvm use 18
nvm alias default 18
```

#### 2. Package Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. Environment Configuration
```bash
# Verify environment variables
cat .env

# Check required variables
echo $DATABASE_URL
echo $JWT_SECRET
```

---

## 📚 Additional Resources

### Development Tools
- **Database Management**: Prisma Studio (`npx prisma studio`)
- **API Testing**: GraphQL Playground (`http://localhost:3000/graphql`)
- **Code Quality**: ESLint and Prettier configurations
- **Testing**: Jest with comprehensive test utilities

### External Documentation
- **NestJS**: [Official NestJS Documentation](https://docs.nestjs.com/)
- **Prisma**: [Prisma Documentation](https://www.prisma.io/docs/)
- **GraphQL**: [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- **GxP Compliance**: [21 CFR Part 11 Guidelines](https://www.fda.gov/regulatory-information/search-fda-guidance-documents)

### Team Communication
- Follow established code review process
- Use descriptive commit messages
- Document significant architectural decisions
- Maintain test coverage for all new features

---

**Last Updated**: June 21, 2025  
**Version**: 2.0  
**Status**: ❌ **NOT PRODUCTION READY** - Critical GxP Compliance Gaps  
**See**: `COMPLIANCE-FIRST-PLAN.md` for mandatory P0 requirements