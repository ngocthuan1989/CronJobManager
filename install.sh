#!/bin/bash

# Cron Job Manager - Installation Script for macOS
# This script installs dependencies and builds the application

echo "🚀 Cron Job Manager - Installation Script"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Build the application
echo ""
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build application"
    exit 1
fi

echo "✅ Application built successfully"

# Create DMG installer
echo ""
echo "📦 Creating macOS installer..."
npm run dist:mac

if [ $? -ne 0 ]; then
    echo "❌ Failed to create installer"
    exit 1
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "📁 Files created:"
echo "   - Application: dist/"
echo "   - Installer: release/"
echo ""
echo "🚀 To run the application:"
echo "   Development: npm run dev"
echo "   Production:  Open the .dmg file in release/ folder"
echo ""
echo "📖 For more information, see README.md"
