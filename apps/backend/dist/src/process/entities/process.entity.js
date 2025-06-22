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
exports.Process = void 0;
const graphql_1 = require("@nestjs/graphql");
const client_1 = require("@prisma/client");
const user_entity_1 = require("../../user/entities/user.entity");
const production_line_entity_1 = require("../../production-line/entities/production-line.entity");
(0, graphql_1.registerEnumType)(client_1.ProcessStatus, {
    name: 'ProcessStatus',
    description: 'Status of the process',
});
let Process = class Process {
    id;
    title;
    description;
    duration;
    progress;
    status;
    x;
    y;
    color;
    version;
    isActive;
    parentId;
    productionLineId;
    createdAt;
    updatedAt;
    createdBy;
    reason;
    creator;
    productionLine;
};
exports.Process = Process;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], Process.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], Process.prototype, "title", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], Process.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    __metadata("design:type", Number)
], Process.prototype, "duration", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], Process.prototype, "progress", void 0);
__decorate([
    (0, graphql_1.Field)(() => client_1.ProcessStatus),
    __metadata("design:type", String)
], Process.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], Process.prototype, "x", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], Process.prototype, "y", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], Process.prototype, "color", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    __metadata("design:type", Number)
], Process.prototype, "version", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Boolean)
], Process.prototype, "isActive", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    __metadata("design:type", String)
], Process.prototype, "parentId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], Process.prototype, "productionLineId", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Process.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Date)
], Process.prototype, "updatedAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], Process.prototype, "createdBy", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], Process.prototype, "reason", void 0);
__decorate([
    (0, graphql_1.Field)(() => user_entity_1.User, { nullable: true }),
    __metadata("design:type", user_entity_1.User)
], Process.prototype, "creator", void 0);
__decorate([
    (0, graphql_1.Field)(() => production_line_entity_1.ProductionLine, { nullable: true }),
    __metadata("design:type", production_line_entity_1.ProductionLine)
], Process.prototype, "productionLine", void 0);
exports.Process = Process = __decorate([
    (0, graphql_1.ObjectType)()
], Process);
//# sourceMappingURL=process.entity.js.map