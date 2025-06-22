"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionLineModule = void 0;
const common_1 = require("@nestjs/common");
const production_line_service_1 = require("./production-line.service");
const production_line_resolver_1 = require("./production-line.resolver");
const prisma_module_1 = require("../database/prisma.module");
const audit_module_1 = require("../audit/audit.module");
let ProductionLineModule = class ProductionLineModule {
};
exports.ProductionLineModule = ProductionLineModule;
exports.ProductionLineModule = ProductionLineModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, audit_module_1.AuditModule],
        providers: [production_line_resolver_1.ProductionLineResolver, production_line_service_1.ProductionLineService],
        exports: [production_line_service_1.ProductionLineService],
    })
], ProductionLineModule);
//# sourceMappingURL=production-line.module.js.map