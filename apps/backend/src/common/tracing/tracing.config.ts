import { registerAs } from '@nestjs/config';

export default registerAs('tracing', () => ({
  serviceName: process.env.OTEL_SERVICE_NAME || 'pharma-backend',
  serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  // Exporter configuration
  jaegerEndpoint: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  consoleExporter: process.env.OTEL_CONSOLE_EXPORTER === 'true' || process.env.NODE_ENV === 'development',
  
  // Sampling configuration
  samplingRatio: parseFloat(process.env.OTEL_SAMPLING_RATIO || '1.0'),
  
  // Resource attributes
  resourceAttributes: {
    'service.name': process.env.OTEL_SERVICE_NAME || 'pharma-backend',
    'service.version': process.env.OTEL_SERVICE_VERSION || '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
    'service.instance.id': process.env.HOSTNAME || 'local-instance',
  },
}));