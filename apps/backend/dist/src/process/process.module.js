"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessModule = void 0;
const common_1 = require("@nestjs/common");
const process_service_1 = require("./process.service");
const process_resolver_1 = require("./process.resolver");
const prisma_module_1 = require("../database/prisma.module");
const audit_module_1 = require("../audit/audit.module");
let ProcessModule = class ProcessModule {
};
exports.ProcessModule = ProcessModule;
exports.ProcessModule = ProcessModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, audit_module_1.AuditModule],
        providers: [process_resolver_1.ProcessResolver, process_service_1.ProcessService],
        exports: [process_service_1.ProcessService],
    })
], ProcessModule);
//# sourceMappingURL=process.module.js.map