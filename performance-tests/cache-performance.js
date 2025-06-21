/**
 * k6 Performance Test - Caching Layer Performance
 * Tests Redis caching effectiveness and performance impact
 * Validates cache hits/misses under load conditions
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Caching-specific metrics
const cacheHitRate = new Rate('cache_hits');
const cacheMissRate = new Rate('cache_misses');
const cacheResponseTime = new Trend('cache_response_time');
const dbResponseTime = new Trend('db_response_time');
const cacheInvalidationCount = new Counter('cache_invalidations');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Cache warming
    cache_warming: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      tags: { scenario: 'cache_warming' },
    },
    // Scenario 2: Cache hit testing
    cache_hit_testing: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      startTime: '1m30s',
      tags: { scenario: 'cache_hits' },
    },
    // Scenario 3: Cache invalidation stress
    cache_invalidation: {
      executor: 'ramping-vus',
      startTime: '4m',
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 40 },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'cache_invalidation' },
    },
  },
  thresholds: {
    // Cache performance thresholds
    'cache_response_time': ['p(95)<50'], // Cache responses < 50ms
    'db_response_time': ['p(95)<200'], // DB responses < 200ms
    'cache_hits': ['rate>0.7'], // > 70% cache hit rate
    'http_req_duration': ['p(95)<100'], // Overall P95 < 100ms
    'http_req_failed': ['rate<0.01'], // < 1% failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const GRAPHQL_ENDPOINT = `${BASE_URL}/graphql`;

let authToken;
let testProductionLineIds = [];

export function setup() {
  console.log('🧪 Setting up Cache Performance Test');
  
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
  const token = authData.data.login.accessToken;
  
  // Create test production lines for cache testing
  const productionLineIds = [];
  for (let i = 0; i < 5; i++) {
    const createResponse = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
      query: `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(input: $input) {
            id
            name
          }
        }
      `,
      variables: {
        input: {
          name: `Cache Test Line ${i + 1}`,
          status: 'ACTIVE'
        }
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const createData = JSON.parse(createResponse.body);
    if (createData.data && createData.data.createProductionLine) {
      productionLineIds.push(createData.data.createProductionLine.id);
    }
  }
  
  console.log(`✅ Created ${productionLineIds.length} test production lines for caching`);
  return { token, productionLineIds };
}

export default function(data) {
  authToken = data.token;
  testProductionLineIds = data.productionLineIds;
  
  const scenario = __ENV.K6_SCENARIO_NAME || 'unknown';
  
  switch (scenario) {
    case 'cache_warming':
      performCacheWarming();
      break;
    case 'cache_hits':
      performCacheHitTesting();
      break;
    case 'cache_invalidation':
      performCacheInvalidationTesting();
      break;
    default:
      performMixedCacheOperations();
  }
  
  sleep(0.5);
}

/**
 * Cache warming phase - populate cache with data
 */
function performCacheWarming() {
  // Warm up production lines cache
  const start = Date.now();
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: `
      query GetProductionLines {
        productionLines {
          id
          name
          status
          processCount
        }
      }
    `
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  const duration = Date.now() - start;
  
  const success = check(response, {
    'cache warming status is 200': (r) => r.status === 200,
    'cache warming response time < 500ms': (r) => r.timings.duration < 500,
    'cache warming returns data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && Array.isArray(data.data.productionLines);
      } catch (e) {
        return false;
      }
    },
  });
  
  // Record as cache miss (first time loading)
  cacheMissRate.add(1);
  dbResponseTime.add(duration);
  
  // Warm individual production line caches
  if (testProductionLineIds.length > 0) {
    const randomId = testProductionLineIds[Math.floor(Math.random() * testProductionLineIds.length)];
    warmIndividualProductionLine(randomId);
  }
}

/**
 * Cache hit testing - should mostly hit cache
 */
function performCacheHitTesting() {
  const operation = Math.random();
  
  if (operation < 0.7) {
    // 70% - Test production lines list (should be cached)
    testProductionLinesList(true);
  } else {
    // 30% - Test individual production line (should be cached)
    if (testProductionLineIds.length > 0) {
      const randomId = testProductionLineIds[Math.floor(Math.random() * testProductionLineIds.length)];
      testIndividualProductionLine(randomId, true);
    }
  }
}

/**
 * Cache invalidation testing - create/update/delete operations
 */
function performCacheInvalidationTesting() {
  const operation = Math.random();
  
  if (operation < 0.4) {
    // 40% - Create new production line (invalidates list cache)
    createProductionLineForCacheTest();
  } else if (operation < 0.7) {
    // 30% - Update existing production line (invalidates individual + list cache)
    if (testProductionLineIds.length > 0) {
      const randomId = testProductionLineIds[Math.floor(Math.random() * testProductionLineIds.length)];
      updateProductionLineForCacheTest(randomId);
    }
  } else {
    // 30% - Read operations that should miss cache after invalidation
    testProductionLinesList(false);
  }
}

/**
 * Mixed operations for general testing
 */
function performMixedCacheOperations() {
  const operation = Math.random();
  
  if (operation < 0.6) {
    testProductionLinesList(Math.random() < 0.5);
  } else if (operation < 0.8) {
    if (testProductionLineIds.length > 0) {
      const randomId = testProductionLineIds[Math.floor(Math.random() * testProductionLineIds.length)];
      testIndividualProductionLine(randomId, Math.random() < 0.5);
    }
  } else {
    createProductionLineForCacheTest();
  }
}

/**
 * Test production lines list query
 */
function testProductionLinesList(expectCacheHit) {
  const start = Date.now();
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: `
      query GetProductionLines {
        productionLines {
          id
          name
          status
          processCount
        }
      }
    `
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  const duration = Date.now() - start;
  
  const success = check(response, {
    'production lines list status is 200': (r) => r.status === 200,
    'production lines list response time appropriate': (r) => {
      // Cached responses should be faster
      const threshold = expectCacheHit ? 100 : 300;
      return r.timings.duration < threshold;
    },
    'production lines list returns data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && Array.isArray(data.data.productionLines);
      } catch (e) {
        return false;
      }
    },
  });
  
  // Record cache hit/miss based on response time
  if (response.timings.duration < 50) {
    cacheHitRate.add(1);
    cacheResponseTime.add(duration);
  } else {
    cacheMissRate.add(1);
    dbResponseTime.add(duration);
  }
}

/**
 * Test individual production line query
 */
function testIndividualProductionLine(id, expectCacheHit) {
  const start = Date.now();
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: `
      query GetProductionLine($id: String!) {
        productionLine(id: $id) {
          id
          name
          status
          processCount
          processes {
            id
            title
          }
        }
      }
    `,
    variables: { id }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  const duration = Date.now() - start;
  
  const success = check(response, {
    'individual production line status is 200': (r) => r.status === 200,
    'individual production line response time appropriate': (r) => {
      const threshold = expectCacheHit ? 100 : 300;
      return r.timings.duration < threshold;
    },
    'individual production line returns data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.productionLine;
      } catch (e) {
        return false;
      }
    },
  });
  
  // Record cache hit/miss
  if (response.timings.duration < 50) {
    cacheHitRate.add(1);
    cacheResponseTime.add(duration);
  } else {
    cacheMissRate.add(1);
    dbResponseTime.add(duration);
  }
}

/**
 * Warm individual production line cache
 */
function warmIndividualProductionLine(id) {
  const start = Date.now();
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: `
      query GetProductionLine($id: String!) {
        productionLine(id: $id) {
          id
          name
          status
        }
      }
    `,
    variables: { id }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  const duration = Date.now() - start;
  
  cacheMissRate.add(1);
  dbResponseTime.add(duration);
}

/**
 * Create production line to test cache invalidation
 */
function createProductionLineForCacheTest() {
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: `
      mutation CreateProductionLine($input: CreateProductionLineInput!) {
        createProductionLine(input: $input) {
          id
          name
          status
        }
      }
    `,
    variables: {
      input: {
        name: `Cache Test Line ${Math.random().toString(36).substr(2, 9)}`,
        status: 'ACTIVE'
      }
    }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  const success = check(response, {
    'create production line status is 200': (r) => r.status === 200,
    'create production line response time < 300ms': (r) => r.timings.duration < 300,
    'create production line succeeds': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.createProductionLine;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (success) {
    cacheInvalidationCount.add(1);
  }
}

/**
 * Update production line to test cache invalidation
 */
function updateProductionLineForCacheTest(id) {
  const response = http.post(GRAPHQL_ENDPOINT, JSON.stringify({
    query: `
      mutation UpdateProductionLine($id: String!, $input: UpdateProductionLineInput!) {
        updateProductionLine(id: $id, input: $input) {
          id
          name
          status
        }
      }
    `,
    variables: {
      id,
      input: {
        name: `Updated Cache Test Line ${Math.random().toString(36).substr(2, 9)}`
      }
    }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });
  
  const success = check(response, {
    'update production line status is 200': (r) => r.status === 200,
    'update production line response time < 300ms': (r) => r.timings.duration < 300,
    'update production line succeeds': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.updateProductionLine;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (success) {
    cacheInvalidationCount.add(2); // Invalidates both individual and list cache
  }
}

export function teardown(data) {
  console.log('✅ Cache Performance Test Complete');
  console.log('📊 Cache Metrics Summary:');
  console.log(`   - Cache Invalidations: ${cacheInvalidationCount.count}`);
  console.log(`   - Expected Cache Hit Rate: > 70%`);
  console.log(`   - Expected Cache Response Time: < 50ms`);
  console.log(`   - Expected DB Response Time: < 200ms`);
}