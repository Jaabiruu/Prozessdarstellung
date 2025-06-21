/**
 * k6 Performance Test - GraphQL Mutations (CRUD Operations)
 * Tests process and production line creation/updates under concurrent load
 * Validates transaction support and audit logging performance
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const mutationFailureRate = new Rate('mutation_failures');
const transactionDuration = new Trend('transaction_duration', true);
const auditLogCounter = new Counter('audit_logs_created');
const rollbackCounter = new Counter('transaction_rollbacks');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Steady load for CRUD operations
    crud_operations: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 25 },   // Ramp up to 25 users
        { duration: '3m', target: 50 },   // Increase to 50 users
        { duration: '3m', target: 100 },  // Peak at 100 users
        { duration: '1m', target: 0 },    // Ramp down
      ],
    },
    // Scenario 2: Spike test for transaction handling
    transaction_spike: {
      executor: 'constant-vus',
      vus: 150,
      duration: '30s',
      startTime: '4m', // Start after steady load stabilizes
    },
  },
  thresholds: {
    // Production readiness thresholds
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'mutation_failures': ['rate<0.02'], // < 2% mutation failures
    'transaction_rollbacks': ['count<10'], // < 10 rollbacks total
    'http_req_failed': ['rate<0.01'],
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const GRAPHQL_ENDPOINT = `${BASE_URL}/graphql`;

let authToken;

/**
 * Setup authentication token for the test
 */
export function setup() {
  console.log('🔧 Setting up GraphQL Mutations Performance Test');
  
  // Authenticate once for all scenarios
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
  const token = authData.data.login.accessToken;
  
  console.log('✅ Authentication successful');
  return { token };
}

/**
 * Main test function
 */
export default function(data) {
  authToken = data.token;
  
  // Randomize test operations to simulate real usage
  const operation = Math.random();
  
  if (operation < 0.4) {
    testProcessCreation();
  } else if (operation < 0.6) {
    testProcessUpdate();
  } else if (operation < 0.8) {
    testProductionLineCreation();
  } else {
    testComplexTransaction();
  }
  
  sleep(Math.random() * 2 + 1); // 1-3 second delay between operations
}

/**
 * Test process creation with audit logging
 */
function testProcessCreation() {
  const processData = {
    title: `Performance Test Process ${Math.random().toString(36).substr(2, 9)}`,
    duration: Math.floor(Math.random() * 60) + 30, // 30-90 minutes
    productionLineId: generateProductionLineId(),
    x: Math.floor(Math.random() * 800),
    y: Math.floor(Math.random() * 600),
    color: getRandomColor(),
  };
  
  const mutation = `
    mutation CreateProcess($input: CreateProcessInput!) {
      createProcess(input: $input) {
        id
        title
        duration
        status
        auditLogs {
          id
          action
        }
      }
    }
  `;
  
  const start = Date.now();
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: mutation,
    variables: { input: processData }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  const duration = Date.now() - start;
  
  transactionDuration.add(duration);
  
  const success = check(response, {
    'process creation status is 200': (r) => r.status === 200,
    'process creation response time < 300ms': (r) => r.timings.duration < 300,
    'process created successfully': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.createProcess && data.data.createProcess.id;
      } catch (e) {
        return false;
      }
    },
    'audit log created': (r) => {
      try {
        const data = JSON.parse(r.body);
        const hasAuditLog = data.data.createProcess.auditLogs && 
                           data.data.createProcess.auditLogs.length > 0;
        if (hasAuditLog) auditLogCounter.add(1);
        return hasAuditLog;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    mutationFailureRate.add(1);
    if (response.body.includes('rollback') || response.body.includes('transaction')) {
      rollbackCounter.add(1);
    }
  } else {
    mutationFailureRate.add(0);
  }
}

/**
 * Test process update operations
 */
function testProcessUpdate() {
  // First, get an existing process to update
  const queryResponse = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: `
      query GetProcesses {
        processes(limit: 1) {
          id
          title
        }
      }
    `
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  const queryData = JSON.parse(queryResponse.body);
  if (!queryData.data || !queryData.data.processes || queryData.data.processes.length === 0) {
    // No processes to update, skip this test
    return;
  }
  
  const processId = queryData.data.processes[0].id;
  
  const updateData = {
    title: `Updated Process ${Math.random().toString(36).substr(2, 9)}`,
    duration: Math.floor(Math.random() * 120) + 30,
  };
  
  const mutation = `
    mutation UpdateProcess($id: String!, $input: UpdateProcessInput!) {
      updateProcess(id: $id, input: $input) {
        id
        title
        duration
        updatedAt
      }
    }
  `;
  
  const start = Date.now();
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: mutation,
    variables: { id: processId, input: updateData }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  const duration = Date.now() - start;
  
  transactionDuration.add(duration);
  
  const success = check(response, {
    'process update status is 200': (r) => r.status === 200,
    'process update response time < 250ms': (r) => r.timings.duration < 250,
    'process updated successfully': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.updateProcess;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) mutationFailureRate.add(1);
  else mutationFailureRate.add(0);
}

/**
 * Test production line creation
 */
function testProductionLineCreation() {
  const productionLineData = {
    name: `Performance Test Line ${Math.random().toString(36).substr(2, 9)}`,
    description: `Load testing production line created at ${new Date().toISOString()}`,
  };
  
  const mutation = `
    mutation CreateProductionLine($input: CreateProductionLineInput!) {
      createProductionLine(input: $input) {
        id
        name
        description
        status
        processCount
      }
    }
  `;
  
  const start = Date.now();
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: mutation,
    variables: { input: productionLineData }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  const duration = Date.now() - start;
  
  transactionDuration.add(duration);
  
  const success = check(response, {
    'production line creation status is 200': (r) => r.status === 200,
    'production line creation response time < 200ms': (r) => r.timings.duration < 200,
    'production line created successfully': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.createProductionLine;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) mutationFailureRate.add(1);
  else mutationFailureRate.add(0);
}

/**
 * Test complex transaction with multiple operations
 */
function testComplexTransaction() {
  // Create production line and immediately add a process to it
  const productionLineData = {
    name: `Complex Test Line ${Math.random().toString(36).substr(2, 9)}`,
    description: 'Complex transaction test',
  };
  
  const createLineResponse = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: `
      mutation CreateProductionLine($input: CreateProductionLineInput!) {
        createProductionLine(input: $input) {
          id
          name
        }
      }
    `,
    variables: { input: productionLineData }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  const lineData = JSON.parse(createLineResponse.body);
  if (!lineData.data || !lineData.data.createProductionLine) {
    mutationFailureRate.add(1);
    return;
  }
  
  const lineId = lineData.data.createProductionLine.id;
  
  // Now create a process for this line
  const processData = {
    title: 'Complex Transaction Process',
    duration: 45,
    productionLineId: lineId,
    x: 100,
    y: 100,
    color: '#FF6B6B',
  };
  
  const start = Date.now();
  const processResponse = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: `
      mutation CreateProcess($input: CreateProcessInput!) {
        createProcess(input: $input) {
          id
          title
          productionLine {
            id
            processCount
          }
        }
      }
    `,
    variables: { input: processData }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  const duration = Date.now() - start;
  
  transactionDuration.add(duration);
  
  const success = check(processResponse, {
    'complex transaction status is 200': (r) => r.status === 200,
    'complex transaction response time < 400ms': (r) => r.timings.duration < 400,
    'process count updated': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data.createProcess.productionLine.processCount > 0;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) mutationFailureRate.add(1);
  else mutationFailureRate.add(0);
}

/**
 * Helper functions
 */
function generateProductionLineId() {
  // In a real test, you'd want to use actual production line IDs
  // For now, we'll create new ones or use a mock ID
  return 'default-line-id';
}

function getRandomColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F06292'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function teardown(data) {
  console.log('✅ GraphQL Mutations Performance Test Complete');
  console.log(`📊 Audit logs created: ${auditLogCounter.count}`);
  console.log(`⚠️ Transaction rollbacks: ${rollbackCounter.count}`);
}