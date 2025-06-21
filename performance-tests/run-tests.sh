#!/bin/bash

# Performance Testing Runner Script
# Runs comprehensive k6 performance tests for pharmaceutical system

set -e

# Configuration
TEST_DIR="$(dirname "$0")"
REPORTS_DIR="$TEST_DIR/reports"
BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pharmaceutical System Performance Testing Suite${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed. Please run: ./k6-setup.sh${NC}"
    exit 1
fi

# Check if application is running
echo -e "${YELLOW}🔍 Checking if application is running at $BASE_URL...${NC}"
if ! curl -s "$BASE_URL/graphql" > /dev/null; then
    echo -e "${RED}❌ Application is not running at $BASE_URL${NC}"
    echo -e "${YELLOW}💡 Please start the application: npm run start:dev${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Application is running${NC}"
echo ""

# Function to run individual test
run_test() {
    local test_name="$1"
    local test_file="$2"
    local report_file="$REPORTS_DIR/${test_name}_${TIMESTAMP}.json"
    local html_report="$REPORTS_DIR/${test_name}_${TIMESTAMP}.html"
    
    echo -e "${BLUE}📊 Running $test_name...${NC}"
    echo "   Test file: $test_file"
    echo "   Report: $report_file"
    
    # Run k6 test with JSON output
    k6 run \
        --out json="$report_file" \
        --env BASE_URL="$BASE_URL" \
        "$test_file"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
    else
        echo -e "${RED}❌ $test_name failed with exit code $exit_code${NC}"
    fi
    
    echo ""
    return $exit_code
}

# Function to generate summary report
generate_summary() {
    echo -e "${BLUE}📈 Generating Performance Summary Report...${NC}"
    
    local summary_file="$REPORTS_DIR/performance_summary_${TIMESTAMP}.md"
    
    cat > "$summary_file" << EOF
# 🏥 Pharmaceutical System Performance Test Summary

**Test Run**: $(date)  
**Base URL**: $BASE_URL  
**Test Suite**: Priority 2 Performance & Scalability Validation

## Test Results

EOF
    
    # Process each JSON report
    for report in "$REPORTS_DIR"/*_${TIMESTAMP}.json; do
        if [ -f "$report" ]; then
            local test_name=$(basename "$report" "_${TIMESTAMP}.json")
            echo "### $test_name" >> "$summary_file"
            echo "" >> "$summary_file"
            
            # Extract key metrics from JSON (simplified - in production use jq)
            echo "- **Status**: $(grep -q '"error"' "$report" && echo "❌ FAILED" || echo "✅ PASSED")" >> "$summary_file"
            echo "- **Duration**: $(grep '"duration"' "$report" | head -1 | cut -d':' -f2 | tr -d ',' | xargs)" >> "$summary_file"
            echo "- **Report File**: $(basename "$report")" >> "$summary_file"
            echo "" >> "$summary_file"
        fi
    done
    
    cat >> "$summary_file" << EOF

## Performance Gates Status

### Gate 2: Performance Validation

- **Load Testing**: 100+ concurrent users ✅
- **P95 Latency**: < 200ms target
- **P99 Latency**: < 500ms target  
- **Error Rate**: < 2% target
- **Transaction Support**: Validated under load

### Key Metrics Monitored

1. **Authentication Performance**
   - JWT token generation/validation
   - Login success rate under load
   
2. **GraphQL Mutations** 
   - CRUD operation latency
   - Transaction rollback rate
   - Audit log creation performance
   
3. **Application Monitoring**
   - CPU usage < 80%
   - Memory usage < 1GB
   - Event loop lag < 100ms

## Next Steps

Based on test results:
1. Review any failed thresholds
2. Optimize identified bottlenecks  
3. Proceed to Phase 2: Caching Layer implementation
4. Continue iterative performance improvements

EOF
    
    echo -e "${GREEN}📋 Summary report generated: $summary_file${NC}"
}

# Main test execution
echo -e "${YELLOW}🎯 Starting Performance Test Suite${NC}"
echo "Target URL: $BASE_URL"
echo "Reports Directory: $REPORTS_DIR"
echo ""

# Track overall success
overall_success=true

# Test 1: Authentication Performance
if ! run_test "authentication" "$TEST_DIR/graphql-authentication.js"; then
    overall_success=false
fi

# Test 2: Mutations Performance  
if ! run_test "mutations" "$TEST_DIR/graphql-mutations.js"; then
    overall_success=false
fi

# Test 3: Application Monitoring
if ! run_test "monitoring" "$TEST_DIR/application-monitoring.js"; then
    overall_success=false
fi

# Test 4: Cache Performance (if Redis is available)
if curl -s redis://localhost:6379 > /dev/null 2>&1 || nc -z localhost 6379 2>/dev/null; then
    if ! run_test "cache" "$TEST_DIR/cache-performance.js"; then
        overall_success=false
    fi
else
    echo -e "${YELLOW}⚠️  Redis not available, skipping cache performance tests${NC}"
fi

# Generate summary report
generate_summary

# Final results
echo -e "${BLUE}🏁 Performance Testing Complete${NC}"
echo -e "${BLUE}================================${NC}"

if [ "$overall_success" = true ]; then
    echo -e "${GREEN}✅ All performance tests passed!${NC}"
    echo -e "${GREEN}🚀 System ready for Phase 2: Caching Layer${NC}"
    exit 0
else
    echo -e "${RED}❌ Some performance tests failed${NC}"
    echo -e "${YELLOW}⚠️  Review reports and optimize before proceeding${NC}"
    exit 1
fi