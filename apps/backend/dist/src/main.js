"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const config_1 = require("./config");
const tracing_1 = require("./common/tracing");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        const configService = app.get(config_1.ConfigService);
        const tracingService = app.get(tracing_1.TracingService);
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }));
        app.enableCors({
            origin: configService.isDevelopment ? true : false,
            credentials: true,
        });
        const port = configService.port;
        await app.listen(port);
        logger.log(`🚀 Pharmaceutical Backend running on http://localhost:${port}`);
        logger.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
        logger.log(`🏥 Health Check: http://localhost:${port}/health`);
        logger.log(`🌍 Environment: ${configService.nodeEnv}`);
        logger.log(`📡 OpenTelemetry tracing enabled`);
    }
    catch (error) {
        logger.error('Failed to start application', error);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map