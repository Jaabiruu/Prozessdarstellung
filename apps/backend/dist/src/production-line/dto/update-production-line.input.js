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
exports.UpdateProductionLineInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
let UpdateProductionLineInput = class UpdateProductionLineInput {
    id;
    name;
    status;
    reason;
};
exports.UpdateProductionLineInput = UpdateProductionLineInput;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Production line ID is required' }),
    (0, class_validator_1.IsUUID)(4, { message: 'Invalid production line ID format' }),
    __metadata("design:type", String)
], UpdateProductionLineInput.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, {
        message: 'Production line name must be at least 2 characters long',
    }),
    (0, class_validator_1.MaxLength)(100, {
        message: 'Production line name must not exceed 100 characters',
    }),
    __metadata("design:type", String)
], UpdateProductionLineInput.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(() => client_1.ProductionLineStatus, {
        nullable: true,
        description: 'New status of the production line',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ProductionLineStatus, { message: 'Invalid production line status' }),
    __metadata("design:type", String)
], UpdateProductionLineInput.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Reason must not exceed 500 characters' }),
    __metadata("design:type", String)
], UpdateProductionLineInput.prototype, "reason", void 0);
exports.UpdateProductionLineInput = UpdateProductionLineInput = __decorate([
    (0, graphql_1.InputType)()
], UpdateProductionLineInput);
//# sourceMappingURL=update-production-line.input.js.map