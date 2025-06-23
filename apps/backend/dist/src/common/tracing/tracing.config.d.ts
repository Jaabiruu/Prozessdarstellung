declare const _default: (() => {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    jaegerEndpoint: string;
    consoleExporter: boolean;
    samplingRatio: number;
    resourceAttributes: {
        'service.name': string;
        'service.version': string;
        'deployment.environment': string;
        'service.instance.id': string;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    serviceName: string;
    serviceVersion: string;
    environment: string;
    jaegerEndpoint: string;
    consoleExporter: boolean;
    samplingRatio: number;
    resourceAttributes: {
        'service.name': string;
        'service.version': string;
        'deployment.environment': string;
        'service.instance.id': string;
    };
}>;
export default _default;
