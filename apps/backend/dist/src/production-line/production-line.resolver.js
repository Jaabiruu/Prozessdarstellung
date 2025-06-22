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
exports.ProductionLineResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const production_line_service_1 = require("./production-line.service");
const production_line_entity_1 = require("./entities/production-line.entity");
const create_production_line_input_1 = require("./dto/create-production-line.input");
const update_production_line_input_1 = require("./dto/update-production-line.input");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const client_1 = require("@prisma/client");
const user_entity_1 = require("../user/entities/user.entity");
let ProductionLineResolver = class ProductionLineResolver {
    productionLineService;
    constructor(productionLineService) {
        this.productionLineService = productionLineService;
    }
    async createProductionLine(createProductionLineInput, currentUser, context) {
        const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
        const userAgent = context.req?.get('user-agent');
        return this.productionLineService.create(createProductionLineInput, currentUser.id, ipAddress, userAgent);
    }
    async productionLines(limit, offset, isActive, status) {
        return this.productionLineService.findAll({
            limit,
            offset,
            ...(isActive !== undefined && { isActive }),
            ...(status && { status }),
        });
    }
    async productionLine(id) {
        return this.productionLineService.findOne(id);
    }
    async updateProductionLine(updateProductionLineInput, currentUser, context) {
        const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
        const userAgent = context.req?.get('user-agent');
        return this.productionLineService.update(updateProductionLineInput, currentUser.id, ipAddress, userAgent);
    }
    async removeProductionLine(id, reason, currentUser, context) {
        const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
        const userAgent = context.req?.get('user-agent');
        return this.productionLineService.remove(id, reason, currentUser.id, ipAddress, userAgent);
    }
    async creator(productionLine, context) {
        return context.dataloaders.userLoader.load(productionLine.createdBy);
    }
    async processes(productionLine, context) {
        return context.dataloaders.processesByProductionLineLoader.load(productionLine.id);
    }
    async processCount(productionLine, context) {
        const processes = await context.dataloaders.processesByProductionLineLoader.load(productionLine.id);
        return processes.length;
    }
};
exports.ProductionLineResolver = ProductionLineResolver;
__decorate([
    (0, graphql_1.Mutation)(() => production_line_entity_1.ProductionLine),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_production_line_input_1.CreateProductionLineInput, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductionLineResolver.prototype, "createProductionLine", null);
__decorate([
    (0, graphql_1.Query)(() => [production_line_entity_1.ProductionLine]),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.OPERATOR, user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.QUALITY_ASSURANCE),
    __param(0, (0, graphql_1.Args)('limit', { type: () => graphql_1.Int, nullable: true, defaultValue: 100 })),
    __param(1, (0, graphql_1.Args)('offset', { type: () => graphql_1.Int, nullable: true, defaultValue: 0 })),
    __param(2, (0, graphql_1.Args)('isActive', { type: () => Boolean, nullable: true })),
    __param(3, (0, graphql_1.Args)('status', { type: () => client_1.ProductionLineStatus, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Boolean, String]),
    __metadata("design:returntype", Promise)
], ProductionLineResolver.prototype, "productionLines", null);
__decorate([
    (0, graphql_1.Query)(() => production_line_entity_1.ProductionLine),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.OPERATOR, user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.QUALITY_ASSURANCE),
    __param(0, (0, graphql_1.Args)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductionLineResolver.prototype, "productionLine", null);
__decorate([
    (0, graphql_1.Mutation)(() => production_line_entity_1.ProductionLine),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_production_line_input_1.UpdateProductionLineInput, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductionLineResolver.prototype, "updateProductionLine", null);
__decorate([
    (0, graphql_1.Mutation)(() => production_line_entity_1.ProductionLine),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.MANAGER, user_role_enum_1.UserRole.ADMIN),
    __param(0, (0, graphql_1.Args)('id')),
    __param(1, (0, graphql_1.Args)('reason')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProductionLineResolver.prototype, "removeProductionLine", null);
__decorate([
    (0, graphql_1.ResolveField)(() => user_entity_1.User, { nullable: true }),
    __param(0, (0, graphql_1.Parent)()),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [production_line_entity_1.ProductionLine, Object]),
    __metadata("design:returntype", Promise)
], ProductionLineResolver.prototype, "creator", null);
__decorate([
    (0, graphql_1.ResolveField)(() => [Object], { nullable: true }),
    __param(0, (0, graphql_1.Parent)()),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [production_line_entity_1.ProductionLine, Object]),
    __metadata("design:returntype", Promise)
], ProductionLineResolver.prototype, "processes", null);
__decorate([
    (0, graphql_1.ResolveField)(() => graphql_1.Int, { nullable: true }),
    __param(0, (0, graphql_1.Parent)()),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [production_line_entity_1.ProductionLine, Object]),
    __metadata("design:returntype", Promise)
], ProductionLineResolver.prototype, "processCount", null);
exports.ProductionLineResolver = ProductionLineResolver = __decorate([
    (0, graphql_1.Resolver)(() => production_line_entity_1.ProductionLine),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [production_line_service_1.ProductionLineService])
], ProductionLineResolver);
//# sourceMappingURL=production-line.resolver.js.map