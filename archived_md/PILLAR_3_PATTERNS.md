# 🏛️ PILLAR 3 ARCHITECTURAL PATTERNS - REFERENCE GUIDE

**Created**: December 23, 2024  
**Purpose**: Key patterns established during Pillar 3 Architecture & SRP implementation  
**Status**: Reference for future AI instances and development

## 🎯 @AuditContext() Decorator Pattern

**Location**: `src/common/decorators/audit-context.decorator.ts`

### Implementation
```typescript
export interface AuditContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export const AuditContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuditContext => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    
    return {
      ipAddress: request?.ip || null,
      userAgent: request?.get('user-agent') || null,
    };
  },
);
```

### Usage Pattern
```typescript
// ✅ DO: Use @AuditContext() in all mutations requiring audit trail
@Mutation(() => User)
async createUser(
  @Args('input') input: CreateUserInput,
  @CurrentUser() currentUser: PrismaUser,
  @AuditContext() auditContext: AuditContextType,
): Promise<User> {
  return this.userService.create(
    input,
    currentUser.id,
    auditContext.ipAddress,
    auditContext.userAgent,
  );
}

// ❌ DON'T: Manual context extraction
@Mutation(() => User)
async createUser(
  @Args('input') input: CreateUserInput,
  @CurrentUser() currentUser: PrismaUser,
  @Context() context: any,
): Promise<User> {
  const ipAddress = context.req?.ip; // Repetitive code
  const userAgent = context.req?.get('user-agent');
  // ...
}
```

**Impact**: Eliminated 16+ repetitive code blocks across all resolvers

## 🎯 Single Responsibility Principle (SRP) Enforcement

### Service SRP Rules
```typescript
// ✅ DO: Services manage only their primary entity
@Injectable()
export class ProductionLineService {
  async create(): Promise<ProductionLine> { /* ... */ }
  async findAll(): Promise<ProductionLine[]> { /* ... */ }
  async findOne(): Promise<ProductionLine> { /* ... */ }
  async update(): Promise<ProductionLine> { /* ... */ }
  async remove(): Promise<ProductionLine> { /* ... */ }
}

// ❌ DON'T: Cross-entity methods in services
@Injectable()
export class ProductionLineService {
  async findProcessesByProductionLine() { /* VIOLATION */ }
  // This belongs in ProcessService
}
```

### Resolver SRP Rules
```typescript
// ✅ DO: Field resolvers for relationships
@ResolveField(() => [Process])
async processes(@Parent() productionLine: ProductionLine): Promise<Process[]> {
  return this.dataloader.processesByProductionLineLoader.load(productionLine.id);
}

// ❌ DON'T: Top-level cross-entity queries
@Query(() => [Process])
async processesByProductionLine(@Args('id') id: string): Promise<Process[]> {
  // This violates SRP - belongs in ProcessResolver
}
```

## 🎯 Centralized Audit Logging Pattern

### Service Integration
```typescript
// ✅ DO: Use injected AuditService
@Injectable()
export class AuthService {
  constructor(
    private readonly auditService: AuditService, // Inject centralized service
  ) {}

  async login(input: LoginInput, ip?: string, userAgent?: string) {
    // ... authentication logic
    
    await this.auditService.create({
      userId: user.id,
      action: AuditAction.VIEW,
      entityType: 'Authentication',
      entityId: user.id,
      reason: 'User login',
      ipAddress: ip,
      userAgent,
    });
  }
}

// ❌ DON'T: Private audit methods
@Injectable()
export class AuthService {
  private async createAuditLog() { /* VIOLATION - duplicates AuditService */ }
}
```

### Module Dependencies
```typescript
// ✅ DO: Import AuditModule where needed
@Module({
  imports: [AuditModule], // Required for AuditService injection
  providers: [AuthService],
})
export class AuthModule {}
```

## 🎯 GraphQL Architecture Patterns

### Correct Relationship Handling
```typescript
// ✅ DO: Field resolvers with DataLoader
@ResolveField(() => User)
async creator(@Parent() productionLine: ProductionLine): Promise<User> {
  return this.dataloaders.userLoader.load(productionLine.createdBy);
}

@ResolveField(() => [Process])
async processes(@Parent() productionLine: ProductionLine): Promise<Process[]> {
  return this.dataloaders.processesByProductionLineLoader.load(productionLine.id);
}
```

### Query Organization
```typescript
// ✅ DO: Entity-specific top-level queries
@Resolver(() => Process)
export class ProcessResolver {
  @Query(() => [Process])
  async processes(
    @Args('productionLineId', { nullable: true }) productionLineId?: string
  ): Promise<Process[]> {
    return this.processService.findAll({ productionLineId });
  }
}
```

## 🎯 Key Achievements Summary

1. **DRY Principle Applied**: @AuditContext() decorator eliminated repetitive IP/User-Agent extraction
2. **SRP Enforced**: All services focus only on their primary entity
3. **Centralized Audit**: Single source of truth for audit logging through AuditService
4. **Clean Architecture**: Proper separation between resolvers, services, and data access
5. **Enterprise Patterns**: Consistent dependency injection and modular design

## 🎯 Future Development Guidelines

- **Always use @AuditContext()** for mutations requiring audit trails
- **Maintain SRP** - services manage only their primary entity
- **Use centralized AuditService** for all audit logging
- **Field resolvers for relationships** - not top-level cross-entity queries
- **Follow established patterns** to maintain architectural consistency

---

**Reference**: Created after successful completion of Pillar 3 Architecture & SRP (14/14 tasks)  
**Next Phase**: Pillar 4 Type Safety - Remove all `any` types across codebase