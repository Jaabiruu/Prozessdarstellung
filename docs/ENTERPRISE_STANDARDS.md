# 🏗️ ENTERPRISE SOFTWARE DEVELOPMENT LIFECYCLE (SDLC) STANDARDS

**Established**: June 21, 2025 - **MANDATORY for all development phases**

## 1. Configuration & Type Safety Standards

### Configuration Immutability
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

### Type Safety Requirements
| DO ✅ | DON'T ❌ |
|-------|----------|
| `type NodeEnv = 'development' \| 'production' \| 'test'` | `nodeEnv: string` |
| `type UserRole = 'OPERATOR' \| 'MANAGER' \| 'ADMIN'` | `role: string` |
| `readonly port: number` | `port: number` |
| Use specific union types for enum-like values | Use generic `string` for constrained values |
| Leverage TypeScript compiler for error catching | Rely on runtime validation only |

### Sensitive Data Handling
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

## 2. NestJS Architecture Standards

### Module Structure
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

### Dependency Injection Patterns
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

### Single Responsibility Principle for Services
| DO ✅ | DON'T ❌ |
|-------|----------|
| Keep services focused on their primary entity | Mix entity management in single service |
| Create dedicated services for each domain entity | Add cross-entity methods to existing services |
| Use composition to interact with other services | Embed other entity logic directly |

```typescript
// ✅ DO: Focused service responsibility
@Injectable()
export class ProductionLineService {
  async findAll(): Promise<ProductionLine[]> { /* ... */ }
  async create(data: CreateProductionLineDto): Promise<ProductionLine> { /* ... */ }
}

@Injectable()
export class ProcessService {
  async findByProductionLine(productionLineId: string): Promise<Process[]> { /* ... */ }
}

// ❌ DON'T: Mixed responsibilities
@Injectable()
export class ProductionLineService {
  async findProcessesByProductionLine(id: string): Promise<Process[]> {
    // This belongs in ProcessService
  }
}
```

## 3. Prisma & Database Standards

### Schema Management
| DO ✅ | DON'T ❌ |
|-------|----------|
| Use `prisma migrate dev` for all schema changes | Manually modify database |
| Use `$transaction` for related operations | Execute related writes separately |
| Use `select` and `include` for specific fields | Always fetch complete entities |
| Create central `PrismaService` | Instantiate `PrismaClient` everywhere |
| Use `prisma.$disconnect()` in app lifecycle | Leave connections open |

### Enum Handling (Single Source of Truth Pattern)
| DO ✅ | DON'T ❌ |
|-------|----------|
| Define enums once in `/src/common/enums/` as TypeScript enums | Define enums in `schema.prisma` file |
| Model enum fields as `String` in Prisma schema | Create competing enum definitions |
| Enforce integrity with `@@check` constraints | Rely only on application-level validation |
| Register TypeScript enum with GraphQL via `registerEnumType` | Allow invalid string values in database |

### Race Condition Prevention & Performance
| DO ✅ | DON'T ❌ |
|-------|----------|
| Enforce uniqueness with `@unique` constraint + P2002 error handling | Use `findFirst` check before `create` operations |
| Handle P2002 errors to detect constraint violations | Ignore Prisma error codes |
| Perform update/delete without redundant `findOne` calls | Check existence before every modification |
| Use single transactions for related operations | Split related operations across multiple queries |

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

## 4. GraphQL API Standards

### Schema Design (CRUD-Based Architecture)
| DO ✅ | DON'T ❌ |
|-------|----------|
| Use well-defined CRUD mutations (`updateProcess`) | Overly specific mutations for simple updates |
| Return modified object from mutations | Return only success boolean |
| Use Input types for mutation arguments | Long list of individual arguments |
| Handle errors with `GraphQLError` | Throw generic exceptions |
| Implement query depth/complexity limits | Leave API unprotected |

```typescript
// ✅ DO: Well-defined CRUD mutations
@Mutation(() => Process)
async updateProcess(
  @Args('input') input: UpdateProcessInput,
  @CurrentUser() user: User,
): Promise<Process> {
  return this.processService.update(input.id, input.data, user.id);
}

@Mutation(() => Process)
async createProcess(
  @Args('input') input: CreateProcessInput,
  @CurrentUser() user: User,
): Promise<Process> {
  return this.processService.create(input.data, user.id);
}

// ❌ DON'T: Generic mutation without proper typing
@Mutation(() => Boolean)
async updateProcess(@Args() args: any): Promise<boolean> {
  return true;
}
```

### Resolver Single Responsibility & DRY Principles
| DO ✅ | DON'T ❌ |
|-------|----------|
| Keep resolvers focused on their primary entity | Add cross-entity queries to resolvers |
| Use custom decorators for repetitive logic | Duplicate IP/User-Agent extraction code |
| Create dedicated resolvers for each domain entity | Mix entity queries in single resolver |

```typescript
// ✅ DO: Custom decorator for repetitive logic
@Decorator()
export const ExtractClientInfo = createParamDecorator(
  (data: unknown, ctx: GqlExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };
  },
);

// Usage in resolver
@Query(() => [Process])
async processes(@ExtractClientInfo() clientInfo: ClientInfo): Promise<Process[]> {
  return this.processService.findAll(clientInfo);
}

// ❌ DON'T: Repetitive logic in every resolver method
@Query(() => [Process])
async processes(@Context() context): Promise<Process[]> {
  const ip = context.req.ip;
  const userAgent = context.req.headers['user-agent'];
  // Duplicated across multiple methods
}
```

### DataLoader for N+1 Prevention
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

## 5. Security & Error Handling Standards

### Secret Management
| DO ✅ | DON'T ❌ |
|-------|----------|
| Use environment variables for all secrets | Hardcode secrets in code |
| Use class-based config with `toJSON()` redaction | Store secrets in plain interfaces |
| Use `getOrThrow()` for required configuration | Allow undefined secrets |
| Validate configuration on app startup | Discover missing config at runtime |

### Error Handling Patterns
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

## 6. Testing Standards

### Test Structure (AAA Pattern)
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

## 7. Class vs Interface Decision Matrix

| Use Class When | Use Interface When |
|----------------|-------------------|
| You need methods or computed properties | Pure data structure |
| You need custom serialization (`toJSON()`) | Simple type definition |
| You're handling sensitive data | Public configuration |
| You need inheritance or polymorphism | Contract definition |
| You need runtime behavior | Compile-time type checking only |

## 8. Health Check & Monitoring Standards

### Health Check Implementation Patterns
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

## 9. Enterprise DevSecOps & Governance Standards

### Static Code Analysis & Quality Gates
| DO ✅ | DON'T ❌ |
|-------|----------|
| Implement SonarQube with mandatory quality gates | Rely only on manual code review |
| Set coverage threshold minimum 80% for critical paths | Allow untested code in production |
| Configure security hotspot detection and resolution | Ignore automated security findings |
| Block merges when quality gate fails | Override quality gates without documentation |
| Generate quality reports for regulatory audits | Skip documentation of quality metrics |

### Dependency Security & SBOM Management
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

## 10. Code Review Enforcement Checklist

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
- [ ] **Single Source of Truth enum pattern**: TypeScript enums in `/src/common/enums/` with Prisma `String` fields and `@@check` constraints
- [ ] **Race condition prevention**: Uniqueness enforced by `@unique` constraints with P2002 error handling, no `findFirst` before `create`
- [ ] **Performance optimization**: Update/delete operations without redundant `findOne` calls, single transactions for related operations
- [ ] **Service SRP**: Services focused on primary entity only, no cross-entity methods (e.g., no `findProcessesByProductionLine` in `ProductionLineService`)
- [ ] **Resolver SRP**: Resolvers focused on primary entity only, no cross-entity top-level queries
- [ ] **DRY principle**: Repetitive logic (IP/User-Agent extraction) encapsulated in custom decorators

**Enforcement**: Any code not meeting these standards will be rejected in code review and must be refactored before merge.

---

**Last Updated**: December 22, 2025  
**Purpose**: Maintain enterprise-grade code quality and pharmaceutical compliance standards  
**Scope**: All development phases and code contributions