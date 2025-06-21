# 🚀 Performance Testing Infrastructure

**Priority 2 Performance & Scalability Testing Suite for Pharmaceutical Production Management System**

## 📋 Overview

This performance testing infrastructure validates that the pharmaceutical system meets production readiness requirements for handling 100+ concurrent users with P95 latency < 200ms.

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- k6 performance testing tool
- Running pharmaceutical application at `http://localhost:3000`
- Admin user credentials: `admin@pharma.local / Admin123!`

### Installation

```bash
# 1. Install k6 (Linux/WSL)
./k6-setup.sh

# 2. Start the application
cd ../apps/backend
npm run start:dev

# 3. Run performance tests
npm run test:performance
```

## 🧪 Test Suite

### Test Scripts

#### 1. GraphQL Authentication (`graphql-authentication.js`)
- **Purpose**: Tests JWT authentication and token management under load
- **Load Pattern**: Ramp up to 100 concurrent users over 5 minutes
- **Metrics**: Auth failure rate, token generation speed, session management
- **Thresholds**: 
  - P95 < 200ms, P99 < 500ms
  - < 5% authentication failures
  - < 1% HTTP failures

#### 2. GraphQL Mutations (`graphql-mutations.js`)
- **Purpose**: Tests CRUD operations and transaction performance
- **Load Pattern**: Two scenarios - steady load + spike test
- **Operations**: Process creation/updates, production line management, complex transactions
- **Metrics**: Transaction duration, rollback rate, audit log creation
- **Thresholds**:
  - P95 < 200ms, P99 < 500ms
  - < 2% mutation failures
  - < 10 total transaction rollbacks

#### 3. Application Monitoring (`application-monitoring.js`)
- **Purpose**: Tests application-level metrics (CPU, memory, event loop)
- **Load Pattern**: Baseline + memory stress + CPU intensive operations
- **Metrics**: CPU usage, memory consumption, event loop lag, connection count
- **Thresholds**:
  - CPU usage < 80%
  - Memory usage < 1GB
  - Event loop lag P95 < 100ms
  - < 2% application errors

### Test Runner (`run-tests.sh`)
- Automated test execution with reporting
- Validates application availability before testing
- Generates comprehensive performance reports
- Provides pass/fail status for deployment gates

## 📊 Monitoring Integration

### Application Metrics Endpoints

The system provides real-time monitoring through these endpoints:

```bash
# Application metrics (Admin only)
GET /metrics
Authorization: Bearer <jwt_token>

# Health status (All authenticated users)
GET /metrics/health
Authorization: Bearer <jwt_token>

# Performance summary (Admin only)
GET /metrics/performance
Authorization: Bearer <jwt_token>

# Public health check (No auth required)
GET /health
```

### Monitored Metrics

#### System-Level
- **CPU Usage**: Percentage utilization
- **Memory Usage**: Heap usage and percentage
- **Event Loop Lag**: Node.js event loop delay
- **Active Connections**: Current concurrent connections
- **Uptime**: Application uptime in milliseconds

#### Application-Level
- **Response Times**: P95/P99 latency measurements
- **Error Rates**: Application and HTTP error percentages
- **Transaction Performance**: Audit log creation, rollback rates
- **GraphQL Performance**: Query complexity, depth limits

## 🎯 Performance Gates

### Gate 2: Performance Validation (Current Phase)

**Requirements**:
- ✅ Load testing for 100+ concurrent users
- ✅ P95 latency < 200ms target
- ✅ P99 latency < 500ms target
- ✅ < 5% authentication failure rate
- ✅ < 2% mutation failure rate
- ✅ Application monitoring integration

**Success Criteria**:
```bash
# All tests pass with thresholds met
npm run test:performance
# Expected output: "✅ All performance tests passed!"
```

### Deployment Gates Progress

- **Gate 1 - Security**: ✅ PASSED (JWT, HTTPS, sanitization)
- **Gate 2 - Performance**: 🔄 IN PROGRESS (k6 testing implementation)
- **Gate 3 - Architecture**: ⏳ PENDING (event-driven audit, caching)

## 📈 Performance Reports

### Generated Reports

Test runs generate comprehensive reports in `./reports/`:

- `authentication_YYYYMMDD_HHMMSS.json` - Authentication test results
- `mutations_YYYYMMDD_HHMMSS.json` - CRUD operations performance
- `monitoring_YYYYMMDD_HHMMSS.json` - Application metrics test
- `performance_summary_YYYYMMDD_HHMMSS.md` - Consolidated summary

### Key Metrics Dashboard

After test completion, review these critical metrics:

```bash
# P95 Response Times
- Authentication: < 200ms ✅
- Process Creation: < 300ms ✅
- Complex Queries: < 2000ms ✅

# Error Rates
- Authentication Failures: < 5% ✅
- Mutation Failures: < 2% ✅
- HTTP Errors: < 1% ✅

# System Resources
- CPU Usage: < 80% ✅
- Memory Usage: < 1GB ✅
- Event Loop Lag: < 100ms ✅
```

## 🔄 Iterative Performance Optimization

### Performance Testing Workflow

1. **Baseline Testing**: Run initial performance tests
2. **Bottleneck Identification**: Analyze metrics and identify hot paths
3. **Optimization Implementation**: Apply caching, query optimization, etc.
4. **Validation Testing**: Re-run tests to measure improvements
5. **Iterate**: Repeat until performance gates are met

### Common Optimization Areas

Based on test results, focus optimization efforts on:

- **Database Queries**: Slow GraphQL resolvers, N+1 query problems
- **Memory Usage**: Large payload processing, inefficient data structures
- **CPU Usage**: Complex business logic, inefficient algorithms
- **I/O Operations**: File system access, external API calls

## 🚨 Troubleshooting

### Common Issues

#### k6 Installation Failed
```bash
# Check system compatibility
echo $OSTYPE

# Manual installation on Ubuntu/Debian
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Application Not Running
```bash
# Start the application
cd ../apps/backend
npm run start:dev

# Verify it's accessible
curl http://localhost:3000/health
```

#### Performance Tests Failing
```bash
# Check specific test results
k6 run --env BASE_URL=http://localhost:3000 graphql-authentication.js

# Review generated reports
cat reports/performance_summary_*.md
```

## 🎯 Next Phase: Caching Layer

Once Performance Gate 2 is achieved:

1. **Phase 2**: Redis caching implementation
2. **Phase 3**: Elasticsearch audit log archiving  
3. **Phase 4**: Database optimization and connection pooling

### Expected Performance Improvements

With caching layer implementation:
- **API Response Times**: 50-70% reduction for cached endpoints
- **Database Load**: 60-80% reduction in query volume
- **Concurrent User Capacity**: 300+ users with same latency targets

---

**Performance Testing Status**: 🔄 Ready for execution  
**Next Action**: Run `npm run test:performance` to validate system performance  
**Goal**: Achieve Performance Gate 2 for production deployment readiness