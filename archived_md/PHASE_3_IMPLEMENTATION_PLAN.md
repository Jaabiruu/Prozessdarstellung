# 🚀 PHASE 3: CORE SERVICES IMPLEMENTATION PLAN

**Strategic rebuild documentation for pharmaceutical production management system - Phase 3**

---

## 📊 CURRENT STATE ANALYSIS (December 22, 2025)

### ✅ FOUNDATION READY
- **Phase 1**: ✅ **COMPLETE** - Enterprise foundation with comprehensive SDLC standards
- **Phase 2**: ✅ **COMPLETE** - Database & Prisma foundation (6/6 tasks done)
- **Progress**: **18% complete (18/150 items)**
- **Database**: GxP-compliant schema with versioning, seeding complete
- **Configuration**: JWT config class with secure serialization ready

### 🛠️ TECHNICAL READINESS
- **Dependencies Installed**: @nestjs/jwt, passport, passport-jwt, bcrypt, @types/bcrypt
- **JWT Configuration**: JwtConfig class with toJSON() redaction (`config.interface.ts:19-34`)
- **User Roles Defined**: OPERATOR, MANAGER, ADMIN, QUALITY_ASSURANCE (`user-role.enum.ts`)
- **Database Schema**: User model with password field and audit relationships
- **Audit Infrastructure**: AuditLog table with userId, action, entityType, reason fields

### 🏗️ ENTERPRISE STANDARDS ESTABLISHED
- **SDLC Policy**: 14 comprehensive sections implemented in CLAUDE.md
- **Security Patterns**: Class-based config, readonly interfaces, union types
- **Database Patterns**: Transaction support, audit logging, connection pooling
- **Error Handling**: Structured patterns with context preservation
- **Testing Standards**: AAA pattern with comprehensive coverage requirements

---

## 🎯 PHASE 3 IMPLEMENTATION STRATEGY

### **GOAL**: Implement Core Services (Authentication, Authorization, Audit, User Management)
**Target Progress**: 18% → 25% (7% increase for Phase 3 completion)

### **APPROACH**: GraphQL-First Security with GxP Compliance
- **GraphQL-Only API**: No REST controllers, all operations via GraphQL mutations/queries
- **Stateful JWT Security**: Redis-based token blocklist for proper invalidation
- **Clean Architecture**: Guards for authorization, Interceptors for audit collection
- **GxP Compliance**: PII anonymization with audit trail preservation
- **Enterprise Patterns**: Transaction-aware operations with comprehensive audit logging

### **CRITICAL ARCHITECTURAL CORRECTIONS**
1. **GraphQL Consistency**: All user-facing operations via Apollo Server resolvers
2. **JWT Blocklist**: Redis-based stateful token invalidation with JTI claims
3. **Separation of Concerns**: Guards for auth decisions, Interceptors for audit side effects
4. **Audit Strategy**: Clear rules for automatic vs manual audit logging
5. **GxP Deactivation**: PII anonymization while preserving audit trail integrity

---

## 📋 P3.1: GRAPHQL AUTHENTICATION SYSTEM (JWT + STATEFUL INVALIDATION)

### **PURPOSE**: GraphQL-first authentication with stateful JWT invalidation

### **IMPLEMENTATION CHECKLIST**

#### ✅ Dependencies Ready
- [x] @nestjs/jwt installed and configured
- [x] passport and passport-jwt installed
- [x] bcrypt for password hashing
- [x] JwtConfig class with secure serialization
- [x] ioredis for JWT blocklist (already installed)

#### 🔨 Auth Module Structure
- [ ] **src/auth/auth.module.ts**
  - Configure JwtModule with ConfigService
  - Import PassportModule and RedisModule
  - Register strategies, guards, and token blocklist service
  - Export AuthService and TokenBlocklistService

- [ ] **src/auth/auth.service.ts**
  - `validateUser(email, password)` with bcrypt verification
  - `login(user)` with JWT token generation (includes JTI claim)
  - `logout(token)` with Redis blocklist addition
  - `validateUserById(id)` for JWT strategy
  - Rate limiting tracking (5 attempts per minute)
  - Comprehensive audit logging for all auth events

- [ ] **src/auth/services/token-blocklist.service.ts**
  ```typescript
  @Injectable()
  export class TokenBlocklistService {
    constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

    async addToBlocklist(jti: string, exp: number): Promise<void> {
      const ttl = Math.max(0, exp - Math.floor(Date.now() / 1000));
      if (ttl > 0) {
        await this.redis.setex(`blocklist:${jti}`, ttl, '1');
      }
    }

    async isBlocked(jti: string): Promise<boolean> {
      const result = await this.redis.get(`blocklist:${jti}`);
      return result === '1';
    }
  }
  ```

- [ ] **src/auth/auth.resolver.ts** (GRAPHQL ONLY - NO CONTROLLERS)
  - `@Mutation() login(loginInput)` with rate limiting
  - `@Mutation() logout()` with token blocklist
  - Input validation with GraphQL input types
  - Audit logging for all authentication events

#### 🔑 Authentication Strategies
- [ ] **src/auth/strategies/local.strategy.ts**
  - Validate email/password credentials
  - Return user object without password
  - Handle authentication failures gracefully

- [ ] **src/auth/strategies/jwt.strategy.ts** (ENHANCED WITH BLOCKLIST)
  ```typescript
  @Injectable()
  export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
      private config: ConfigService,
      private tokenBlocklist: TokenBlocklistService,
    ) {
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: config.jwt.secret,
      });
    }

    async validate(payload: JwtPayload) {
      // Check if token is on blocklist
      if (payload.jti && await this.tokenBlocklist.isBlocked(payload.jti)) {
        throw new UnauthorizedException('Token has been invalidated');
      }
      
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    }
  }
  ```

#### 📝 GraphQL Input Types and DTOs
- [ ] **src/auth/dto/login.input.ts** (GRAPHQL INPUT TYPE)
  ```typescript
  @InputType()
  export class LoginInput {
    @Field()
    @IsEmail()
    email: string;

    @Field()
    @IsString()
    @MinLength(6)
    password: string;
  }
  ```

- [ ] **src/auth/dto/auth-response.dto.ts** (GRAPHQL OBJECT TYPE)
  ```typescript
  @ObjectType()
  export class AuthResponse {
    @Field()
    accessToken: string;

    @Field(() => User)
    user: User;
  }
  ```

- [ ] **src/auth/interfaces/jwt-payload.interface.ts** (ENHANCED WITH JTI)
  ```typescript
  export interface JwtPayload {
    sub: string; // user id
    email: string;
    role: UserRole;
    jti: string; // JWT ID for blocklist tracking
    iat?: number;
    exp?: number;
  }
  ```

#### 🔐 Security Implementation
- [ ] **Password Hashing**: bcrypt with 12 salt rounds minimum
- [ ] **JWT Configuration**: Secret from environment, 24h expiration, JTI claims
- [ ] **Token Invalidation**: Redis-based blocklist with proper TTL
- [ ] **Rate Limiting**: 5 failed attempts per minute per IP (GraphQL context)
- [ ] **Audit Logging**: Every login/logout attempt with token tracking
- [ ] **Error Handling**: No information leakage in GraphQL responses

#### 🔄 JWT Blocklist Strategy
- [ ] **Token Generation**: Include unique `jti` (JWT ID) in every token
- [ ] **Logout Implementation**: Add `jti` to Redis with TTL matching token expiration
- [ ] **Validation Enhancement**: Check blocklist in JWT strategy before accepting token
- [ ] **TTL Management**: Automatic cleanup when tokens naturally expire
- [ ] **Performance**: O(1) Redis lookup for blocklist checking

#### ✅ Verification & Testing
- [ ] Unit tests for AuthService methods
- [ ] Integration tests for login flow
- [ ] Security tests for rate limiting
- [ ] JWT token validation tests
- [ ] **COMMIT**: "P3.1 Complete: JWT authentication with rate limiting and audit"

---

## 🛡️ P3.2: CLEAN AUTHORIZATION ARCHITECTURE

### **PURPOSE**: GraphQL authorization with clear separation of concerns

### **ARCHITECTURAL PRINCIPLE**: Guards for Authorization Only, Interceptors for Audit

#### 🚪 Security Guards (AUTHORIZATION ONLY)
- [ ] **src/auth/guards/jwt-auth.guard.ts** (GRAPHQL-AWARE)
  ```typescript
  @Injectable()
  export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
      super();
    }

    getRequest(context: ExecutionContext) {
      const ctx = GqlExecutionContext.create(context);
      return ctx.getContext().req;
    }

    canActivate(context: ExecutionContext) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        'isPublic',
        [context.getHandler(), context.getClass()],
      );
      
      if (isPublic) return true;
      return super.canActivate(context);
    }
  }
  ```

- [ ] **src/auth/guards/roles.guard.ts** (GRAPHQL-AWARE)
  ```typescript
  @Injectable()
  export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
      const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
        'roles',
        [context.getHandler(), context.getClass()],
      );

      if (!requiredRoles) return true;

      const ctx = GqlExecutionContext.create(context);
      const { user } = ctx.getContext().req;
      return requiredRoles.some((role) => user.role === role);
    }
  }
  ```

- [ ] **REMOVED: gxp-audit.guard.ts** - Audit collection moved to interceptors

#### 🏷️ GraphQL-Aware Security Decorators
- [ ] **src/common/decorators/current-user.decorator.ts** (GRAPHQL-AWARE)
  ```typescript
  export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
      const gqlCtx = GqlExecutionContext.create(ctx);
      return gqlCtx.getContext().req.user;
    },
  );
  ```

- [ ] **src/common/decorators/roles.decorator.ts**
  ```typescript
  export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
  ```

- [ ] **src/common/decorators/public.decorator.ts**
  ```typescript
  export const Public = () => SetMetadata('isPublic', true);
  ```

- [ ] **src/common/decorators/gxp-reason.decorator.ts** (GRAPHQL INPUT EXTRACTION)
  ```typescript
  export const GxpReason = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
      const gqlCtx = GqlExecutionContext.create(ctx);
      const args = gqlCtx.getArgs();
      
      // Extract reason from input object
      const reason = args.input?.reason || args.reason;
      if (!reason) {
        throw new BadRequestException('Reason is required for this GxP operation');
      }
      
      return reason;
    },
  );
  ```

#### 🔍 Audit Interceptor (SEPARATED FROM GUARDS)
- [ ] **src/audit/audit.interceptor.ts** (AUDIT SIDE EFFECTS HERE)
  ```typescript
  @Injectable()
  export class AuditInterceptor implements NestInterceptor {
    constructor(private audit: AuditService) {}

    intercept(context: ExecutionContext, next: CallHandler) {
      const gqlCtx = GqlExecutionContext.create(context);
      const { req } = gqlCtx.getContext();
      
      return next.handle().pipe(
        tap(async (result) => {
          // Log successful GraphQL mutations automatically
          if (req.user && context.getHandler().name.includes('Mutation')) {
            await this.audit.log({
              userId: req.user.id,
              action: AuditAction.UPDATE,
              entityType: 'GraphQLMutation',
              entityId: context.getHandler().name,
              reason: 'Automatic audit log',
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
            });
          }
        }),
      );
    }
  }
  ```

#### 🔒 Global Security Configuration
- [ ] **Update app.module.ts**: Apply JwtAuthGuard globally
- [ ] **Update main.ts**: Enable global validation pipes
- [ ] **Rate Limiting**: Configure throttler for authentication endpoints

#### ✅ Verification & Testing
- [ ] Unit tests for each guard
- [ ] Integration tests for role enforcement
- [ ] Security tests for unauthorized access
- [ ] Decorator functionality tests
- [ ] **COMMIT**: "P3.2 Complete: RBAC guards and security decorators"

---

## 📊 P3.3: COMPREHENSIVE AUDIT STRATEGY

### **PURPOSE**: Clear audit strategy with automatic and manual logging

### **AUDIT STRATEGY DEFINITION**
- **Automatic Auditing**: Interceptor logs generic successful mutations ("User X executed mutation Y")
- **Manual Auditing**: Service methods log rich, contextual business logic details
- **No Double Logging**: Clear rules prevent overlapping audit entries

### **IMPLEMENTATION CHECKLIST**

#### 🏗️ Audit Module Structure
- [ ] **src/audit/audit.module.ts**
  - Global module for universal audit access
  - Export AuditService and AuditInterceptor
  - Configure for transaction support

- [ ] **src/audit/audit.service.ts**
  ```typescript
  @Injectable()
  export class AuditService {
    constructor(private readonly prisma: PrismaService) {}

    async log(auditData: CreateAuditLogDto, tx?: PrismaTransaction): Promise<void> {
      const client = tx || this.prisma;
      
      await client.auditLog.create({
        data: {
          userId: auditData.userId,
          action: auditData.action,
          entityType: auditData.entityType,
          entityId: auditData.entityId,
          details: auditData.details,
          reason: auditData.reason,
          ipAddress: auditData.ipAddress,
          userAgent: auditData.userAgent,
        },
      });
    }

    async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
      return this.prisma.auditLog.findMany({
        where: { entityType, entityId },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    async findByUser(userId: string, pagination?: PaginationDto): Promise<AuditLog[]> {
      return this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: pagination?.offset || 0,
        take: pagination?.limit || 50,
      });
    }
  }
  ```

#### 🔍 Audit Interceptor (AUTOMATIC LOGGING)
- [ ] **src/audit/audit.interceptor.ts**
  ```typescript
  @Injectable()
  export class AuditInterceptor implements NestInterceptor {
    constructor(private audit: AuditService) {}

    intercept(context: ExecutionContext, next: CallHandler) {
      const gqlCtx = GqlExecutionContext.create(context);
      const { req } = gqlCtx.getContext();
      const handlerName = context.getHandler().name;
      
      return next.handle().pipe(
        tap(async (result) => {
          // AUTOMATIC: Log generic successful GraphQL mutations
          if (req.user && this.isMutation(handlerName)) {
            await this.audit.log({
              userId: req.user.id,
              action: this.getActionFromMutation(handlerName),
              entityType: 'GraphQLOperation',
              entityId: handlerName,
              reason: 'Automatic audit log for GraphQL mutation',
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              details: { mutation: handlerName, timestamp: new Date() },
            });
          }
        }),
        catchError((error) => {
          // Log failed operations
          if (req.user) {
            this.audit.log({
              userId: req.user.id,
              action: AuditAction.UPDATE,
              entityType: 'GraphQLError',
              entityId: handlerName,
              reason: 'Failed GraphQL operation',
              details: { error: error.message, mutation: handlerName },
            }).catch(() => {}); // Don't let audit failure break the operation
          }
          throw error;
        }),
      );
    }

    private isMutation(handlerName: string): boolean {
      return ['create', 'update', 'delete', 'login', 'logout'].some(action => 
        handlerName.toLowerCase().includes(action)
      );
    }
  }
  ```

#### 📋 Manual Audit Strategy
- [ ] **Business Logic Auditing**: Service methods make explicit `auditService.log()` calls
- [ ] **Rich Context**: Manual audits include before/after state, specific business details
- [ ] **GxP Operations**: Complex workflows requiring detailed audit trails
- [ ] **No Overlap**: Manual audits replace automatic ones using metadata flags

#### 📝 Audit DTOs and Interfaces
- [ ] **src/audit/dto/create-audit-log.dto.ts**
  ```typescript
  export class CreateAuditLogDto {
    @IsString()
    userId: string;

    @IsEnum(AuditAction)
    action: AuditAction;

    @IsString()
    entityType: string;

    @IsString()
    entityId: string;

    @IsOptional()
    @IsObject()
    details?: Record<string, any>;

    @IsString()
    reason: string;

    @IsOptional()
    @IsString()
    ipAddress?: string;

    @IsOptional()
    @IsString()
    userAgent?: string;
  }
  ```

- [ ] **src/audit/interfaces/audit-context.interface.ts**
  ```typescript
  export interface AuditContext {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
  }

  export interface PaginationDto {
    offset?: number;
    limit?: number;
  }
  ```

#### 🔗 Transaction Integration
- [ ] **Transaction Support**: AuditService participates in existing transactions
- [ ] **Consistency**: Audit logs created atomically with business operations
- [ ] **Rollback Safety**: Audit logs roll back if main operation fails

#### ✅ Verification & Testing
- [ ] Unit tests for AuditService methods
- [ ] Transaction rollback tests
- [ ] Audit trail query tests
- [ ] Interceptor functionality tests
- [ ] **COMMIT**: "P3.3 Complete: Transaction-aware audit service with GxP compliance"

---

## 👥 P3.4: GXP-COMPLIANT USER MANAGEMENT

### **PURPOSE**: GraphQL user management with PII anonymization

### **GXP DEACTIVATION STRATEGY**
- **Problem**: Simple `isActive = false` leaves PII in database (compliance risk)
- **Solution**: Anonymize PII while preserving audit trail integrity
- **Method**: Replace personal data with anonymized values, keep userId for foreign keys

### **IMPLEMENTATION CHECKLIST**

#### 🏗️ User Module Structure
- [ ] **src/user/user.module.ts**
  - Import AuditModule for audit logging
  - Configure UserService with proper dependencies
  - Export UserService for other modules

- [ ] **src/user/user.service.ts**
  ```typescript
  @Injectable()
  export class UserService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly audit: AuditService,
    ) {}

    async create(createUserDto: CreateUserDto, currentUserId: string, auditMetadata: AuditMetadata): Promise<User> {
      return this.prisma.$transaction(async (tx) => {
        const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
        
        const user = await tx.user.create({
          data: {
            ...createUserDto,
            password: hashedPassword,
          },
        });

        await this.audit.log({
          userId: currentUserId,
          action: AuditAction.CREATE,
          entityType: 'User',
          entityId: user.id,
          reason: auditMetadata.reason,
          ipAddress: auditMetadata.ipAddress,
          userAgent: auditMetadata.userAgent,
          details: { email: user.email, role: user.role },
        }, tx);

        return user;
      });
    }

    async findAll(pagination?: PaginationDto): Promise<User[]> {
      return this.prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: pagination?.offset || 0,
        take: pagination?.limit || 50,
        orderBy: { createdAt: 'desc' },
      });
    }

    async findOne(id: string): Promise<User | null> {
      return this.prisma.user.findUnique({
        where: { id, isActive: true },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    async update(id: string, updateUserDto: UpdateUserDto, currentUserId: string, auditMetadata: AuditMetadata): Promise<User> {
      return this.prisma.$transaction(async (tx) => {
        const updateData: any = { ...updateUserDto };
        
        if (updateUserDto.password) {
          updateData.password = await bcrypt.hash(updateUserDto.password, 12);
        }

        const user = await tx.user.update({
          where: { id },
          data: updateData,
        });

        await this.audit.log({
          userId: currentUserId,
          action: AuditAction.UPDATE,
          entityType: 'User',
          entityId: user.id,
          reason: auditMetadata.reason,
          ipAddress: auditMetadata.ipAddress,
          userAgent: auditMetadata.userAgent,
          details: updateUserDto,
        }, tx);

        return user;
      });
    }

    async deactivate(id: string, currentUserId: string, auditMetadata: AuditMetadata): Promise<User> {
      return this.prisma.$transaction(async (tx) => {
        // GXP COMPLIANCE: Anonymize PII while preserving audit trail
        const user = await tx.user.update({
          where: { id },
          data: {
            isActive: false,
            // Anonymize PII for compliance
            firstName: 'Deactivated',
            lastName: 'User',
            email: `deactivated-user-${id}@pharma.local`,
            // Keep userId unchanged for foreign key integrity
          },
        });

        await this.audit.log({
          userId: currentUserId,
          action: AuditAction.DELETE,
          entityType: 'User',
          entityId: user.id,
          reason: auditMetadata.reason,
          ipAddress: auditMetadata.ipAddress,
          userAgent: auditMetadata.userAgent,
          details: {
            deactivationType: 'PII_ANONYMIZED',
            originalEmail: '[REDACTED_FOR_COMPLIANCE]',
            preservedUserId: id,
          },
        }, tx);

        return user;
      });
    }
  }
  ```

#### 🌐 GraphQL User Resolver (NO CONTROLLERS)
- [ ] **src/user/user.resolver.ts**
  ```typescript
  @Resolver(() => User)
  export class UserResolver {
    constructor(private userService: UserService) {}

    @Query(() => [User])
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async users(@Args('pagination', { nullable: true }) pagination?: PaginationInput): Promise<User[]> {
      return this.userService.findAll(pagination);
    }

    @Query(() => User, { nullable: true })
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async user(@Args('id') id: string): Promise<User | null> {
      return this.userService.findOne(id);
    }

    @Mutation(() => User)
    @Roles(UserRole.ADMIN)
    async createUser(
      @Args('input') input: CreateUserInput,
      @CurrentUser() currentUser: User,
      @GxpReason() reason: string,
    ): Promise<User> {
      return this.userService.create(input, currentUser.id, { reason, ...auditMetadata });
    }

    @Mutation(() => User)
    @Roles(UserRole.ADMIN)
    async updateUser(
      @Args('id') id: string,
      @Args('input') input: UpdateUserInput,
      @CurrentUser() currentUser: User,
      @GxpReason() reason: string,
    ): Promise<User> {
      return this.userService.update(id, input, currentUser.id, { reason, ...auditMetadata });
    }

    @Mutation(() => User)
    @Roles(UserRole.ADMIN)
    async deactivateUser(
      @Args('id') id: string,
      @CurrentUser() currentUser: User,
      @GxpReason() reason: string,
    ): Promise<User> {
      return this.userService.deactivate(id, currentUser.id, { reason, ...auditMetadata });
    }
  }
  ```

#### 📝 User DTOs
- [ ] **src/user/dto/create-user.dto.ts**
  ```typescript
  export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must contain uppercase, lowercase, and number',
    })
    password: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsEnum(UserRole)
    role: UserRole;

    @IsString()
    reason: string; // GxP compliance
  }
  ```

- [ ] **src/user/dto/update-user.dto.ts**
  ```typescript
  export class UpdateUserDto extends PartialType(
    OmitType(CreateUserDto, ['password', 'email'] as const),
  ) {
    @IsOptional()
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Password must contain uppercase, lowercase, and number',
    })
    password?: string;

    @IsString()
    reason: string; // GxP compliance
  }
  ```

- [ ] **src/user/dto/user-response.dto.ts**
  ```typescript
  export class UserResponseDto {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  ```

#### 🔐 Security Implementation
- [ ] **Role Validation**: Only ADMIN can assign ADMIN or QUALITY_ASSURANCE roles
- [ ] **Password Security**: bcrypt with 12 rounds, strength validation
- [ ] **User Deactivation**: Soft delete pattern (isActive: false)
- [ ] **Audit Trail**: Complete audit log for all user operations
- [ ] **Data Protection**: Never return password in responses

#### ✅ Verification & Testing
- [ ] Unit tests for UserService methods
- [ ] Integration tests for user CRUD operations
- [ ] Security tests for role-based access
- [ ] Password hashing and validation tests
- [ ] Audit trail verification tests
- [ ] **COMMIT**: "P3.4 Complete: User management with RBAC and comprehensive audit"

---

## 🔗 INTEGRATION & MODULE UPDATES

### **APP MODULE INTEGRATION** (GRAPHQL-FIRST)
- [ ] **Update src/app.module.ts**:
  ```typescript
  @Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      PrismaModule, // Global database access
      GraphQLModule.forRootAsync<ApolloDriverConfig>({
        driver: ApolloDriver,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          autoSchemaFile: true,
          sortSchema: true,
          playground: configService.isDevelopment,
          introspection: true,
          context: ({ req, res }: { req: any; res: any }) => {
            // Enhanced GraphQL context for auth and audit
            return {
              req,
              res,
              user: req.user, // From JWT authentication
              auditMetadata: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
              },
            };
          },
        }),
      }),
      AuthModule,   // P3.1 - GraphQL authentication
      AuditModule,  // P3.3 - Global audit with interceptors
      UserModule,   // P3.4 - GraphQL user management
      HealthModule,
    ],
    providers: [
      {
        provide: APP_GUARD,
        useClass: JwtAuthGuard, // Global GraphQL authentication
      },
      {
        provide: APP_GUARD,
        useClass: RolesGuard, // Global GraphQL authorization
      },
      {
        provide: APP_INTERCEPTOR,
        useClass: AuditInterceptor, // Global audit logging
      },
    ],
  })
  export class AppModule {}
  ```

### **BARREL EXPORTS UPDATES**
- [ ] **Update src/auth/index.ts**: Export all auth services and guards
- [ ] **Update src/audit/index.ts**: Export AuditService and related types
- [ ] **Update src/user/index.ts**: Export UserService and DTOs
- [ ] **Update src/common/index.ts**: Export all decorators and guards

---

## 🧪 COMPREHENSIVE TESTING STRATEGY

### **UNIT TESTS** (Target: >80% coverage)
- [ ] AuthService login validation
- [ ] JWT token generation and validation
- [ ] Password hashing with bcrypt
- [ ] Role-based access control logic
- [ ] Audit logging with transaction support
- [ ] User CRUD operations with proper audit

### **INTEGRATION TESTS**
- [ ] Complete authentication flow (login → JWT → protected endpoint)
- [ ] Role-based access enforcement
- [ ] Audit trail creation and querying
- [ ] User management with role validation
- [ ] Transaction rollback with audit consistency

### **E2E TESTS**
- [ ] User registration by admin
- [ ] User login and token usage
- [ ] Protected endpoint access with different roles
- [ ] Complete user lifecycle (create → update → deactivate)

### **SECURITY TESTS**
- [ ] Brute force protection (rate limiting)
- [ ] Unauthorized access attempts
- [ ] Role escalation prevention
- [ ] JWT token tampering detection
- [ ] Password strength enforcement

---

## 📈 PROGRESS TRACKING

### **PHASE 3 COMPLETION CRITERIA**
- [ ] **P3.1**: Authentication system fully functional with JWT and rate limiting
- [ ] **P3.2**: Authorization guards enforcing RBAC with QUALITY_ASSURANCE support
- [ ] **P3.3**: Audit service providing comprehensive GxP-compliant logging
- [ ] **P3.4**: User management supporting complete lifecycle with security

### **TESTING MILESTONES**
- [ ] All unit tests passing with >80% coverage
- [ ] Integration tests validating complete workflows
- [ ] E2E tests confirming user journeys
- [ ] Security tests verifying authorization controls

### **DOCUMENTATION UPDATES**
- [ ] Update CLAUDE.md progress from 18% to 25%
- [ ] Update DEVELOPMENT_GUIDE.md with Phase 3 completion
- [ ] Update README.md with new authentication endpoints
- [ ] Document API endpoints and usage examples

---

## 🚀 DEPLOYMENT CHECKLIST

### **ENVIRONMENT VARIABLES REQUIRED**
```bash
# Authentication (Required for Phase 3)
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=24h

# Database (Already configured)
DATABASE_URL=postgresql://username:password@localhost:5432/pharma_control

# Existing variables from Phase 1 & 2
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
```

### **SECURITY VALIDATION**
- [ ] JWT_SECRET is cryptographically secure (>32 characters)
- [ ] No hardcoded secrets in source code
- [ ] All passwords properly hashed with bcrypt
- [ ] Rate limiting configured for authentication endpoints
- [ ] Audit logging enabled for all security events

### **PERFORMANCE CONSIDERATIONS**
- [ ] Database queries optimized with proper indexes
- [ ] JWT token size minimized (essential claims only)
- [ ] Audit logging doesn't block main operations
- [ ] User queries properly paginated
- [ ] bcrypt work factor appropriate for production

---

## 🔄 COMMIT STRATEGY

### **P3.1 Commit**
```bash
git add src/auth/
git commit -m "P3.1 Complete: GraphQL authentication with stateful JWT invalidation

- GraphQL-first authentication via resolvers (no REST controllers)
- Stateful JWT invalidation using Redis blocklist with JTI claims
- Enhanced JWT strategy checking token blocklist on every request
- bcrypt password hashing with 12 salt rounds
- Rate limiting protection integrated with GraphQL context
- Comprehensive audit logging for login/logout events
- Enterprise security patterns with environment-based configuration

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### **P3.2 Commit**
```bash
git add src/auth/guards/ src/common/decorators/ src/audit/audit.interceptor.ts
git commit -m "P3.2 Complete: Clean authorization architecture with GraphQL support

- GraphQL-aware JWT authentication guard with context extraction
- Role-based access control supporting all user roles
- Clean separation: Guards for authorization, Interceptors for audit
- GraphQL-aware security decorators for user and reason extraction
- Audit interceptor for automatic mutation logging
- Removed guard anti-pattern for audit side effects

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### **P3.3 Commit**
```bash
git add src/audit/
git commit -m "P3.3 Complete: Comprehensive audit strategy with clear separation

- Clear audit strategy: Automatic interceptor vs manual service logging
- Transaction-aware audit service for business logic contexts
- GraphQL-aware audit interceptor for automatic mutation logging
- Mandatory reason parameter validation for GxP compliance
- IP address and user agent capture integrated with GraphQL context
- Error handling that doesn't break main operations
- Prevents double-logging with clear strategy documentation

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### **P3.4 Final Commit**
```bash
git add src/user/ src/app.module.ts
git commit -m "P3.4 Complete: GxP-compliant user management via GraphQL

- GraphQL-only user management (no REST controllers)
- GxP-compliant user deactivation with PII anonymization
- Preserves audit trail integrity while anonymizing personal data
- ADMIN-only role assignment for security roles
- Password strength validation and secure hashing
- Complete GraphQL schema with proper input/output types
- Enhanced GraphQL context for audit metadata
- Integration with automatic and manual audit strategies

Phase 3 Core Services COMPLETE: GraphQL Authentication, Clean Authorization, 
Comprehensive Audit Strategy, GxP-Compliant User Management
Progress: 18% → 25% (Phase 3 implementation complete)

ARCHITECTURAL CORRECTIONS IMPLEMENTED:
✅ GraphQL-first consistency (no REST/GraphQL hybrid)
✅ Stateful JWT invalidation via Redis blocklist
✅ Clean separation: Guards for auth, Interceptors for audit
✅ Clear audit strategy preventing double-logging
✅ GxP-compliant PII anonymization with audit preservation

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 📋 IMPLEMENTATION TIMELINE

### **Estimated Effort Distribution**
- **P3.1 Authentication System**: 3-4 hours
  - Auth module, service, strategies: 2 hours
  - Controllers, DTOs, testing: 1-2 hours

- **P3.2 Authorization Guards**: 1-2 hours
  - Guards implementation: 1 hour
  - Decorators and global config: 1 hour

- **P3.3 Audit Service**: 2-3 hours
  - Audit service and transaction support: 2 hours
  - Interceptor and integration: 1 hour

- **P3.4 User Management**: 2-3 hours
  - User service with RBAC: 2 hours
  - Controllers, DTOs, testing: 1 hour

### **TOTAL ESTIMATED TIME**: 8-12 hours

### **DEPENDENCIES**
- Phase 1 & 2 must be complete (✅ Done)
- JWT dependencies installed (✅ Ready)
- Database schema available (✅ Ready)
- Enterprise standards established (✅ Ready)

---

## 🎯 SUCCESS METRICS

### **FUNCTIONAL REQUIREMENTS MET**
1. ✅ Users can authenticate with email/password
2. ✅ JWT tokens generated and validated
3. ✅ Role-based access control enforced
4. ✅ All operations have audit trails
5. ✅ User lifecycle management complete
6. ✅ Password security and validation
7. ✅ Rate limiting and brute force protection
8. ✅ GxP compliance with mandatory reason parameters

### **NON-FUNCTIONAL REQUIREMENTS MET**
1. ✅ Enterprise coding standards followed
2. ✅ Security-first implementation approach
3. ✅ Transaction integrity maintained
4. ✅ Comprehensive test coverage >80%
5. ✅ Performance optimized (bcrypt work factor, query optimization)
6. ✅ Audit trail comprehensive and searchable
7. ✅ Error handling with meaningful messages
8. ✅ No sensitive data exposure

---

**File Created**: December 22, 2025  
**Purpose**: Complete implementation guide for Phase 3 Core Services  
**Context**: Strategic rebuild of pharmaceutical production management system  
**Next Phase**: Phase 4 Production Entities (Process, ProductionLine services)