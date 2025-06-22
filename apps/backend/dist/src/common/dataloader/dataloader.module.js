"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLoaderModule = void 0;
const common_1 = require("@nestjs/common");
const production_line_dataloader_1 = require("./production-line.dataloader");
const process_dataloader_1 = require("./process.dataloader");
const prisma_module_1 = require("../../database/prisma.module");
let DataLoaderModule = class DataLoaderModule {
};
exports.DataLoaderModule = DataLoaderModule;
exports.DataLoaderModule = DataLoaderModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [production_line_dataloader_1.ProductionLineDataLoader, process_dataloader_1.ProcessDataLoader],
        exports: [production_line_dataloader_1.ProductionLineDataLoader, process_dataloader_1.ProcessDataLoader],
    })
], DataLoaderModule);
//# sourceMappingURL=dataloader.module.js.map