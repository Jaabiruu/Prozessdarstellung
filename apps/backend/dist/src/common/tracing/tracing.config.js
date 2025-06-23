"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('tracing', () => ({
    serviceName: process.env.OTEL_SERVICE_NAME || 'pharma-backend',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    jaegerEndpoint: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    consoleExporter: process.env.OTEL_CONSOLE_EXPORTER === 'true' || process.env.NODE_ENV === 'development',
    samplingRatio: parseFloat(process.env.OTEL_SAMPLING_RATIO || '1.0'),
    resourceAttributes: {
        'service.name': process.env.OTEL_SERVICE_NAME || 'pharma-backend',
        'service.version': process.env.OTEL_SERVICE_VERSION || '1.0.0',
        'deployment.environment': process.env.NODE_ENV || 'development',
        'service.instance.id': process.env.HOSTNAME || 'local-instance',
    },
}));
//# sourceMappingURL=tracing.config.js.map