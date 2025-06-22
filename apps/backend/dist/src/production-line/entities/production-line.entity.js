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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionLine = void 0;
const graphql_1 = require("@nestjs/graphql");
const client_1 = require("@prisma/client");
const user_entity_1 = require("../../user/entities/user.entity");
const process_entity_1 = require("../../process/entities/process.entity");
(0, graphql_1.registerEnumType)(client_1.ProductionLineStatus, {
    name: 'ProductionLineStatus',
    description: 'Status of the production line',
});
let ProductionLine = class ProductionLine {
    id;
    name;
    status;
    version;
    isActive;
    parentId;
    createdAt;
    updatedAt;
    createdBy;
    reason;
    creator;
    processes;
    processCount;
};
exports.ProductionLine = ProductionLine;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], ProductionLine.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], ProductionLine.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(() => client_1.ProductionLineStatus),
    __metadata("design:type", String)
], ProductionLine.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], ProductionLine.prototype, "version", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Boolean)
], ProductionLine.prototype, "isActive", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    __metadata("design:type", String)
], ProductionLine.prototype, "parentId", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], ProductionLine.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], ProductionLine.prototype, "updatedAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], ProductionLine.prototype, "createdBy", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], ProductionLine.prototype, "reason", void 0);
__decorate([
    (0, graphql_1.Field)(() => user_entity_1.User, { nullable: true }),
    __metadata("design:type", user_entity_1.User)
], ProductionLine.prototype, "creator", void 0);
__decorate([
    (0, graphql_1.Field)(() => [process_entity_1.Process], { nullable: true }),
    __metadata("design:type", Array)
], ProductionLine.prototype, "processes", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    __metadata("design:type", Number)
], ProductionLine.prototype, "processCount", void 0);
exports.ProductionLine = ProductionLine = __decorate([
    (0, graphql_1.ObjectType)()
], ProductionLine);
//# sourceMappingURL=production-line.entity.js.map