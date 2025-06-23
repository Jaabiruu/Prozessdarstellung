"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResolver = exports.TransactionTestResult = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const user_service_1 = require("./user.service");
const user_entity_1 = require("./entities/user.entity");
const create_user_input_1 = require("./dto/create-user.input");
const update_user_input_1 = require("./dto/update-user.input");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const audit_context_decorator_1 = require("../common/decorators/audit-context.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
let TransactionTestResult = class TransactionTestResult {
    success;
    message;
};
exports.TransactionTestResult = TransactionTestResult;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Boolean)
], TransactionTestResult.prototype, "success", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], TransactionTestResult.prototype, "message", void 0);
exports.TransactionTestResult = TransactionTestResult = __decorate([
    (0, graphql_1.ObjectType)()
], TransactionTestResult);
let UserResolver = class UserResolver {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async createUser(createUserInput, currentUser, auditContext) {
        return this.userService.create(createUserInput, currentUser.id, auditContext.ipAddress, auditContext.userAgent);
    }
    async users(limit, offset, isActive, role) {
        return this.userService.findAll({
            limit,
            offset,
            ...(isActive !== undefined && { isActive }),
            ...(role && { role }),
        });
    }
    async user(id) {
        return this.userService.findOne(id);
    }
    async me(currentUser) {
        return this.userService.findOne(currentUser.id);
    }
    async updateUser(updateUserInput, currentUser, auditContext) {
        return this.userService.update(updateUserInput, currentUser.id, currentUser.role, auditContext.ipAddress, auditContext.userAgent);
    }
    async deactivateUser(id, reason, currentUser, auditContext) {
        return this.userService.deactivate(id, reason, currentUser.id, auditContext.ipAddress, auditContext.userAgent);
    }
    async changePassword(userId, newPassword, reason, currentUser, auditContext) {
        return this.userService.changePassword(userId, newPassword, reason, currentUser.id, auditContext.ipAddress, auditContext.userAgent);
    }
    async testTransactionRollback(testUserEmail, shouldFail, currentUser) {
        return this.userService.testTransactionRollback(testUserEmail, currentUser.id, shouldFail);
    }
};
exports.UserResolver = UserResolver;
__decorate([
    (0, graphql_1.Mutation)(() => user_entity_1.User),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, audit_context_decorator_1.AuditContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_input_1.CreateUserInput, Object, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "createUser", null);
__decorate([
    (0, graphql_1.Query)(() => [user_entity_1.User]),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.MANAGER),
    __param(0, (0, graphql_1.Args)('limit', { type: () => Number, nullable: true, defaultValue: 100 })),
    __param(1, (0, graphql_1.Args)('offset', { type: () => Number, nullable: true, defaultValue: 0 })),
    __param(2, (0, graphql_1.Args)('isActive', { type: () => Boolean, nullable: true })),
    __param(3, (0, graphql_1.Args)('role', { type: () => String, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Boolean, String]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "users", null);
__decorate([
    (0, graphql_1.Query)(() => user_entity_1.User),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.MANAGER),
    __param(0, (0, graphql_1.Args)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "user", null);
__decorate([
    (0, graphql_1.Query)(() => user_entity_1.User),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "me", null);
__decorate([
    (0, graphql_1.Mutation)(() => user_entity_1.User),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.MANAGER),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, audit_context_decorator_1.AuditContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_user_input_1.UpdateUserInput, Object, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "updateUser", null);
__decorate([
    (0, graphql_1.Mutation)(() => user_entity_1.User),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('id')),
    __param(1, (0, graphql_1.Args)('reason')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, audit_context_decorator_1.AuditContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "deactivateUser", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('userId')),
    __param(1, (0, graphql_1.Args)('newPassword')),
    __param(2, (0, graphql_1.Args)('reason')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, audit_context_decorator_1.AuditContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "changePassword", null);
__decorate([
    (0, graphql_1.Mutation)(() => TransactionTestResult),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('testUserEmail')),
    __param(1, (0, graphql_1.Args)('shouldFail', { type: () => Boolean, defaultValue: true })),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Object]),
    __metadata("design:returntype", Promise)
], UserResolver.prototype, "testTransactionRollback", null);
exports.UserResolver = UserResolver = __decorate([
    (0, graphql_1.Resolver)(() => user_entity_1.User),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserResolver);
//# sourceMappingURL=user.resolver.js.map