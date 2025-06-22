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
exports.ProcessResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const process_service_1 = require("./process.service");
const process_entity_1 = require("./entities/process.entity");
const create_process_input_1 = require("./dto/create-process.input");
const update_process_input_1 = require("./dto/update-process.input");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const client_1 = require("@prisma/client");
const user_entity_1 = require("../user/entities/user.entity");
const production_line_entity_1 = require("../production-line/entities/production-line.entity");
let ProcessResolver = class ProcessResolver {
    processService;
    constructor(processService) {
        this.processService = processService;
    }
    async createProcess(createProcessInput, currentUser, context) {
        const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
        const userAgent = context.req?.get('user-agent');
        return this.processService.create(createProcessInput, currentUser.id, ipAddress, userAgent);
    }
    async processes(limit, offset, isActive, status, productionLineId) {
        return this.processService.findAll({
            limit,
            offset,
            ...(isActive !== undefined && { isActive }),
            ...(status && { status }),
            ...(productionLineId && { productionLineId }),
        });
    }
    async process(id) {
        return this.processService.findOne(id);
    }
    async processesByProductionLine(productionLineId, limit, offset, isActive, status) {
        return this.processService.findAllByProductionLine(productionLineId, {
            limit,
            offset,
            ...(isActive !== undefined && { isActive }),
            ...(status && { status }),
        });
    }
    async updateProcess(updateProcessInput, currentUser, context) {
        const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
        const userAgent = context.req?.get('user-agent');
        return this.processService.update(updateProcessInput, currentUser.id, ipAddress, userAgent);
    }
    async removeProcess(id, reason, currentUser, context) {
        const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
        const userAgent = context.req?.get('user-agent');
        return this.processService.remove(id, reason, currentUser.id, ipAddress, userAgent);
    }
    async creator(process, context) {
        return context.dataloaders.userLoader.load(process.createdBy);
    }
    async productionLine(process, context) {
        return context.dataloaders.productionLineLoader.load(process.productionLineId);
    }
};
exports.ProcessResolver = ProcessResolver;
__decorate([
    (0, graphql_1.Mutation)(() => process_entity_1.Process),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.OPERATOR, user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_process_input_1.CreateProcessInput, Object, Object]),
    __metadata("design:returntype", Promise)
], ProcessResolver.prototype, "createProcess", null);
__decorate([
    (0, graphql_1.Query)(() => [process_entity_1.Process]),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.OPERATOR, user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.QUALITY_ASSURANCE),
    __param(0, (0, graphql_1.Args)('limit', { type: () => graphql_1.Int, nullable: true, defaultValue: 100 })),
    __param(1, (0, graphql_1.Args)('offset', { type: () => graphql_1.Int, nullable: true, defaultValue: 0 })),
    __param(2, (0, graphql_1.Args)('isActive', { type: () => Boolean, nullable: true })),
    __param(3, (0, graphql_1.Args)('status', { type: () => client_1.ProcessStatus, nullable: true })),
    __param(4, (0, graphql_1.Args)('productionLineId', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Boolean, String, String]),
    __metadata("design:returntype", Promise)
], ProcessResolver.prototype, "processes", null);
__decorate([
    (0, graphql_1.Query)(() => process_entity_1.Process),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.OPERATOR, user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.QUALITY_ASSURANCE),
    __param(0, (0, graphql_1.Args)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProcessResolver.prototype, "process", null);
__decorate([
    (0, graphql_1.Query)(() => [process_entity_1.Process]),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.OPERATOR, user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.QUALITY_ASSURANCE),
    __param(0, (0, graphql_1.Args)('productionLineId')),
    __param(1, (0, graphql_1.Args)('limit', { type: () => graphql_1.Int, nullable: true, defaultValue: 100 })),
    __param(2, (0, graphql_1.Args)('offset', { type: () => graphql_1.Int, nullable: true, defaultValue: 0 })),
    __param(3, (0, graphql_1.Args)('isActive', { type: () => Boolean, nullable: true })),
    __param(4, (0, graphql_1.Args)('status', { type: () => client_1.ProcessStatus, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Boolean, String]),
    __metadata("design:returntype", Promise)
], ProcessResolver.prototype, "processesByProductionLine", null);
__decorate([
    (0, graphql_1.Mutation)(() => process_entity_1.Process),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.OPERATOR, user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_process_input_1.UpdateProcessInput, Object, Object]),
    __metadata("design:returntype", Promise)
], ProcessResolver.prototype, "updateProcess", null);
__decorate([
    (0, graphql_1.Mutation)(() => process_entity_1.Process),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('id')),
    __param(1, (0, graphql_1.Args)('reason')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProcessResolver.prototype, "removeProcess", null);
__decorate([
    (0, graphql_1.ResolveField)(() => user_entity_1.User, { nullable: true }),
    __param(0, (0, graphql_1.Parent)()),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [process_entity_1.Process, Object]),
    __metadata("design:returntype", Promise)
], ProcessResolver.prototype, "creator", null);
__decorate([
    (0, graphql_1.ResolveField)(() => production_line_entity_1.ProductionLine, { nullable: true }),
    __param(0, (0, graphql_1.Parent)()),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [process_entity_1.Process, Object]),
    __metadata("design:returntype", Promise)
], ProcessResolver.prototype, "productionLine", null);
exports.ProcessResolver = ProcessResolver = __decorate([
    (0, graphql_1.Resolver)(() => process_entity_1.Process),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [process_service_1.ProcessService])
], ProcessResolver);
//# sourceMappingURL=process.resolver.js.map