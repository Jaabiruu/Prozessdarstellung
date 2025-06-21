#!/bin/bash

# k6 Installation Script for Pharmaceutical Performance Testing
# This script installs k6 and validates the installation

echo "🚀 Installing k6 performance testing tool..."

# Check if running on Linux/WSL
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "📦 Installing k6 on Linux/WSL..."
    
    # Add k6 repository key
    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    
    # Add k6 repository
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    
    # Update and install k6
    sudo apt-get update
    sudo apt-get install k6
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📦 Installing k6 on macOS..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew not found. Please install Homebrew first: https://brew.sh/"
        exit 1
    fi
    
    # Install k6 using Homebrew
    brew install k6
    
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "Please install k6 manually from: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Verify installation
echo "✅ Verifying k6 installation..."
k6 version

if [ $? -eq 0 ]; then
    echo "🎉 k6 successfully installed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Run performance tests: npm run test:performance"
    echo "2. View results in the generated reports/"
    echo "3. Check performance dashboard at http://localhost:3000/performance"
else
    echo "❌ k6 installation failed. Please check the error messages above."
    exit 1
fi