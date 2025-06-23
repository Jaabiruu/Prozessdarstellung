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
exports.UpdateProcessInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
let UpdateProcessInput = class UpdateProcessInput {
    id;
    title;
    description;
    duration;
    progress;
    status;
    x;
    y;
    color;
    reason;
};
exports.UpdateProcessInput = UpdateProcessInput;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Process ID is required' }),
    (0, class_validator_1.IsUUID)(4, { message: 'Invalid process ID format' }),
    __metadata("design:type", String)
], UpdateProcessInput.prototype, "id", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: 'Process title must be at least 2 characters long' }),
    (0, class_validator_1.MaxLength)(100, { message: 'Process title must not exceed 100 characters' }),
    __metadata("design:type", String)
], UpdateProcessInput.prototype, "title", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000, {
        message: 'Process description must not exceed 1000 characters',
    }),
    __metadata("design:type", String)
], UpdateProcessInput.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'Duration must be a valid number' }),
    (0, class_validator_1.Min)(1, { message: 'Duration must be at least 1 minute' }),
    (0, class_validator_1.Max)(525600, { message: 'Duration must not exceed 525600 minutes (1 year)' }),
    __metadata("design:type", Number)
], UpdateProcessInput.prototype, "duration", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'Progress must be a valid number' }),
    (0, class_validator_1.Min)(0, { message: 'Progress cannot be negative' }),
    (0, class_validator_1.Max)(100, { message: 'Progress cannot exceed 100%' }),
    __metadata("design:type", Number)
], UpdateProcessInput.prototype, "progress", void 0);
__decorate([
    (0, graphql_1.Field)(() => client_1.ProcessStatus, {
        nullable: true,
        description: 'New status of the process',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.ProcessStatus, { message: 'Invalid process status' }),
    __metadata("design:type", String)
], UpdateProcessInput.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'X coordinate must be a valid number' }),
    (0, class_validator_1.Min)(-10000, { message: 'X coordinate must be within reasonable bounds' }),
    (0, class_validator_1.Max)(10000, { message: 'X coordinate must be within reasonable bounds' }),
    __metadata("design:type", Number)
], UpdateProcessInput.prototype, "x", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float, { nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'Y coordinate must be a valid number' }),
    (0, class_validator_1.Min)(-10000, { message: 'Y coordinate must be within reasonable bounds' }),
    (0, class_validator_1.Max)(10000, { message: 'Y coordinate must be within reasonable bounds' }),
    __metadata("design:type", Number)
], UpdateProcessInput.prototype, "y", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsHexColor)({ message: 'Color must be a valid hex color (e.g., #4F46E5)' }),
    __metadata("design:type", String)
], UpdateProcessInput.prototype, "color", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Reason must not exceed 500 characters' }),
    __metadata("design:type", String)
], UpdateProcessInput.prototype, "reason", void 0);
exports.UpdateProcessInput = UpdateProcessInput = __decorate([
    (0, graphql_1.InputType)()
], UpdateProcessInput);
//# sourceMappingURL=update-process.input.js.map