/**
 * k6 Performance Test - GraphQL Authentication
 * Tests JWT authentication and token management under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const authFailureRate = new Rate('auth_failures');
const authDuration = new Trend('auth_duration', true);

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users over 30s
    { duration: '1m', target: 50 },   // Ramp up to 50 users over 1m
    { duration: '2m', target: 100 },  // Ramp up to 100 users over 2m
    { duration: '2m', target: 100 },  // Stay at 100 users for 2m
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    // Performance Gate 2 requirements
    'http_req_duration': ['p(95)<200', 'p(99)<500'], // P95 < 200ms, P99 < 500ms
    'auth_failures': ['rate<0.05'], // < 5% authentication failures
    'http_req_failed': ['rate<0.01'], // < 1% HTTP failures
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const GRAPHQL_ENDPOINT = `${BASE_URL}/graphql`;

// Test user credentials
const TEST_CREDENTIALS = {
  email: 'admin@pharma.local',
  password: 'Admin123!'
};

/**
 * Main test function - executed by each virtual user
 */
export default function() {
  // Step 1: Authenticate and get JWT token
  const authStart = Date.now();
  const token = authenticate();
  const authEnd = Date.now();
  
  authDuration.add(authEnd - authStart);
  
  if (!token) {
    authFailureRate.add(1);
    return; // Skip rest of test if auth fails
  }
  
  authFailureRate.add(0);
  
  // Step 2: Test authenticated GraphQL queries
  testUserProfile(token);
  testProductionLines(token);
  testAuditLogs(token);
  
  // Step 3: Simulate realistic user behavior
  sleep(1); // 1 second between requests
}

/**
 * Authenticate user and return JWT token
 */
function authenticate() {
  const loginMutation = `
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        accessToken
        user {
          id
          email
          role
        }
      }
    }
  `;
  
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: loginMutation,
    variables: TEST_CREDENTIALS
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
    'login returns token': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.login && data.data.login.accessToken;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    console.error('Authentication failed:', response.body);
    return null;
  }
  
  try {
    const data = JSON.parse(response.body);
    return data.data.login.accessToken;
  } catch (e) {
    console.error('Failed to parse auth response:', e);
    return null;
  }
}

/**
 * Test user profile query
 */
function testUserProfile(token) {
  const profileQuery = `
    query Me {
      me {
        id
        email
        firstName
        lastName
        role
      }
    }
  `;
  
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: profileQuery
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  check(response, {
    'profile query status is 200': (r) => r.status === 200,
    'profile query response time < 200ms': (r) => r.timings.duration < 200,
    'profile query returns data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.me;
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * Test production lines query
 */
function testProductionLines(token) {
  const productionLinesQuery = `
    query ProductionLines {
      productionLines {
        id
        name
        description
        status
        processCount
        processes {
          id
          title
          status
        }
      }
    }
  `;
  
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: productionLinesQuery
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  check(response, {
    'production lines query status is 200': (r) => r.status === 200,
    'production lines query response time < 200ms': (r) => r.timings.duration < 200,
    'production lines query returns array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.data.productionLines);
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * Test audit logs query (admin only)
 */
function testAuditLogs(token) {
  const auditLogsQuery = `
    query AuditLogs($limit: Int) {
      auditLogs(limit: $limit) {
        id
        action
        userId
        ipAddress
        createdAt
        user {
          email
          role
        }
      }
    }
  `;
  
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: auditLogsQuery,
    variables: { limit: 10 }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  check(response, {
    'audit logs query status is 200': (r) => r.status === 200,
    'audit logs query response time < 300ms': (r) => r.timings.duration < 300,
    'audit logs query returns array': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data.data.auditLogs);
      } catch (e) {
        return false;
      }
    },
  });
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
  console.log('🚀 Starting GraphQL Authentication Performance Test');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('📊 Metrics: P95 < 200ms, P99 < 500ms, <5% auth failures');
  return {};
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  console.log('✅ GraphQL Authentication Performance Test Complete');
}