#!/bin/bash

# Setup Script for Cron Job Manager
# Tự động kiểm tra và cài đặt dependencies

clear
echo "🔧 CRON JOB MANAGER - SETUP SCRIPT"
echo "==================================="
echo "🎯 MacBook Pro M1 Optimized"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "📁 Working directory: $SCRIPT_DIR"
echo ""

# Check if Node.js is installed
echo "🔍 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "💡 Installing Node.js via Homebrew..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew is not installed."
        echo "💡 Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install Node.js
    brew install node
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Node.js."
        echo "💡 Please install Node.js manually from: https://nodejs.org/"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "✅ Node.js installed successfully."
else
    NODE_VERSION=$(node --version)
    echo "✅ Node.js is installed: $NODE_VERSION"
fi

# Check npm version
echo ""
echo "🔍 Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not available."
    read -p "Press Enter to exit..."
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo "✅ npm is installed: $NPM_VERSION"
fi

# Check if package.json exists
echo ""
echo "🔍 Checking project files..."
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Are you in the right directory?"
    read -p "Press Enter to exit..."
    exit 1
fi
echo "✅ package.json found."

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    echo "💡 Installing npm packages..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "✅ Dependencies installed successfully."
else
    echo "✅ Dependencies already installed."
    echo "💡 Updating dependencies..."
    npm update
fi

# Build the application
echo ""
echo "🔨 Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build application."
    echo "💡 Trying to clean and rebuild..."
    rm -rf dist node_modules
    npm install
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Please check the errors above."
        read -p "Press Enter to exit..."
        exit 1
    fi
fi
echo "✅ Application built successfully."

# Make all command files executable
echo ""
echo "🔧 Setting up command files..."
chmod +x *.command
echo "✅ Command files are now executable."

# Check system requirements
echo ""
echo "🔍 Checking system requirements..."
echo "✅ macOS version: $(sw_vers -productVersion)"
echo "✅ Architecture: $(uname -m)"

if [[ $(uname -m) == "arm64" ]]; then
    echo "✅ Apple Silicon (M1/M2) detected - Optimized!"
else
    echo "⚠️  Intel Mac detected - Still compatible"
fi

echo ""
echo "🎉 SETUP COMPLETED SUCCESSFULLY!"
echo "=================================="
echo ""
echo "🚀 You can now run the application using:"
echo "   👆 Double-click: quick_start.command (for development)"
echo "   👆 Double-click: start_cronjobmanager.command (for full mode)"
echo ""
echo "📚 For more information:"
echo "   👆 Double-click: HUONG_DAN_SU_DUNG.command"
echo ""
read -p "👆 Press Enter to exit setup..."

