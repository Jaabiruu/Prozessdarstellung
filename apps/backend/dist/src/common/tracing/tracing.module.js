"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracingModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const tracing_service_1 = require("./tracing.service");
const tracing_config_1 = __importDefault(require("./tracing.config"));
let TracingModule = class TracingModule {
};
exports.TracingModule = TracingModule;
exports.TracingModule = TracingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forFeature(tracing_config_1.default),
        ],
        providers: [tracing_service_1.TracingService],
        exports: [tracing_service_1.TracingService],
    })
], TracingModule);
//# sourceMappingURL=tracing.module.js.map