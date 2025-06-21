/**
 * k6 Performance Test - Application-Level Monitoring
 * Tests CPU, memory, event loop lag, and application metrics
 * Provides comprehensive monitoring beyond database performance
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Application-level custom metrics
const cpuUsage = new Gauge('app_cpu_usage_percent');
const memoryUsage = new Gauge('app_memory_usage_mb');
const eventLoopLag = new Trend('app_event_loop_lag_ms');
const activeConnections = new Gauge('app_active_connections');
const responseSize = new Trend('response_size_bytes');
const concurrentUsers = new Gauge('concurrent_users');

// Error tracking
const errorRate = new Rate('application_errors');
const timeoutRate = new Rate('timeout_errors');

// Test configuration for application monitoring
export const options = {
  scenarios: {
    // Baseline monitoring - steady load
    baseline_monitoring: {
      executor: 'constant-vus',
      vus: 25,
      duration: '2m',
    },
    // Memory stress test
    memory_stress: {
      executor: 'ramping-vus',
      startTime: '2m30s',
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 150 },
        { duration: '30s', target: 0 },
      ],
    },
    // CPU intensive operations
    cpu_intensive: {
      executor: 'constant-vus',
      vus: 75,
      duration: '1m',
      startTime: '5m',
    },
  },
  thresholds: {
    // Application performance thresholds
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'app_cpu_usage_percent': ['value<80'], // CPU usage < 80%
    'app_memory_usage_mb': ['value<1024'], // Memory usage < 1GB
    'app_event_loop_lag_ms': ['p(95)<100'], // Event loop lag < 100ms
    'application_errors': ['rate<0.02'], // < 2% application errors
    'timeout_errors': ['rate<0.01'], // < 1% timeout errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const GRAPHQL_ENDPOINT = `${BASE_URL}/graphql`;
const METRICS_ENDPOINT = `${BASE_URL}/metrics`; // Assuming metrics endpoint

let authToken;

export function setup() {
  console.log('📊 Starting Application-Level Monitoring Test');
  
  // Authenticate
  const loginResponse = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          accessToken
        }
      }
    `,
    variables: {
      email: 'admin@pharma.local',
      password: 'Admin123!'
    }
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const authData = JSON.parse(loginResponse.body);
  return { token: authData.data.login.accessToken };
}

export default function(data) {
  authToken = data.token;
  
  // Update concurrent users metric
  concurrentUsers.add(__VU);
  
  // Collect application metrics
  collectApplicationMetrics();
  
  // Perform various operations to stress different parts of the system
  const operation = Math.random();
  
  if (operation < 0.3) {
    performCPUIntensiveOperation();
  } else if (operation < 0.6) {
    performMemoryIntensiveOperation();
  } else {
    performIOIntensiveOperation();
  }
  
  sleep(1);
}

/**
 * Collect application-level metrics
 */
function collectApplicationMetrics() {
  // Try to get metrics from application (if metrics endpoint exists)
  const metricsResponse = http.get(METRICS_ENDPOINT, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '5s',
  });
  
  if (metricsResponse.status === 200) {
    try {
      const metrics = JSON.parse(metricsResponse.body);
      
      // Update custom metrics based on application response
      if (metrics.cpu) cpuUsage.add(metrics.cpu.usage);
      if (metrics.memory) memoryUsage.add(metrics.memory.used / 1024 / 1024); // Convert to MB
      if (metrics.eventLoop) eventLoopLag.add(metrics.eventLoop.lag);
      if (metrics.connections) activeConnections.add(metrics.connections.active);
      
    } catch (e) {
      console.warn('Failed to parse metrics response:', e);
    }
  }
  
  // Simulate metric collection through response analysis
  responseSize.add(metricsResponse.body ? metricsResponse.body.length : 0);
}

/**
 * CPU-intensive operation test
 */
function performCPUIntensiveOperation() {
  // Complex GraphQL query that requires computation
  const complexQuery = `
    query ComplexAnalytics {
      productionLines {
        id
        name
        processCount
        processes {
          id
          title
          duration
          status
          createdAt
          updatedAt
        }
        auditLogs {
          id
          action
          createdAt
          user {
            email
            role
          }
        }
      }
      auditLogs(limit: 100) {
        id
        action
        details
        createdAt
        user {
          email
          firstName
          lastName
          role
        }
      }
    }
  `;
  
  const start = Date.now();
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: complexQuery
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '10s',
  });
  
  const duration = Date.now() - start;
  
  const success = check(response, {
    'CPU intensive query status is 200': (r) => r.status === 200,
    'CPU intensive query response time < 2s': (r) => r.timings.duration < 2000,
    'CPU intensive query returns data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && (data.data.productionLines || data.data.auditLogs);
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    errorRate.add(1);
    if (response.timings.duration > 10000) {
      timeoutRate.add(1);
    }
  } else {
    errorRate.add(0);
    timeoutRate.add(0);
  }
  
  // Record response size for memory tracking
  responseSize.add(response.body ? response.body.length : 0);
}

/**
 * Memory-intensive operation test
 */
function performMemoryIntensiveOperation() {
  // Create multiple processes with large descriptions to test memory usage
  const largeMutation = `
    mutation CreateProcessWithLargeData($input: CreateProcessInput!) {
      createProcess(input: $input) {
        id
        title
        description
        createdAt
      }
    }
  `;
  
  // Generate large description to test memory handling
  const largeDescription = 'Performance test description '.repeat(100); // ~2.7KB
  
  const processData = {
    title: `Memory Test Process ${Math.random().toString(36).substr(2, 9)}`,
    description: largeDescription,
    duration: 60,
    productionLineId: 'default-line-id',
    x: Math.floor(Math.random() * 800),
    y: Math.floor(Math.random() * 600),
    color: '#4ECDC4',
  };
  
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: largeMutation,
    variables: { input: processData }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '5s',
  });
  
  const success = check(response, {
    'Memory intensive mutation status is 200': (r) => r.status === 200,
    'Memory intensive mutation response time < 1s': (r) => r.timings.duration < 1000,
    'Memory intensive mutation succeeds': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.createProcess;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) errorRate.add(1);
  else errorRate.add(0);
  
  responseSize.add(response.body ? response.body.length : 0);
}

/**
 * I/O intensive operation test
 */
function performIOIntensiveOperation() {
  // Test database I/O with multiple sequential queries
  const queries = [
    'query { productionLines { id name processCount } }',
    'query { processes(limit: 20) { id title status productionLine { name } } }',
    'query { auditLogs(limit: 50) { id action createdAt user { email } } }',
  ];
  
  queries.forEach((query, index) => {
    const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({ query }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: '3s',
    });
    
    check(response, {
      [`I/O query ${index + 1} status is 200`]: (r) => r.status === 200,
      [`I/O query ${index + 1} response time < 500ms`]: (r) => r.timings.duration < 500,
    });
    
    responseSize.add(response.body ? response.body.length : 0);
    
    // Small delay between I/O operations
    sleep(0.1);
  });
}

/**
 * Monitor specific NestJS application metrics
 */
function monitorNestJSMetrics() {
  // Health check endpoint
  const healthResponse = http.get(`${BASE_URL}/health`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    timeout: '2s',
  });
  
  check(healthResponse, {
    'Health check status is 200': (r) => r.status === 200,
    'Health check response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  // Simulate event loop lag measurement (in real implementation, this would come from the app)
  const eventLoopStart = Date.now();
  setTimeout(() => {
    const lag = Date.now() - eventLoopStart;
    eventLoopLag.add(lag);
  }, 0);
}

export function teardown(data) {
  console.log('✅ Application-Level Monitoring Test Complete');
  console.log('📊 Key Metrics Summary:');
  console.log('   - CPU Usage: Monitor for values > 80%');
  console.log('   - Memory Usage: Monitor for values > 1GB');
  console.log('   - Event Loop Lag: Monitor P95 > 100ms');
  console.log('   - Error Rate: Monitor for values > 2%');
}