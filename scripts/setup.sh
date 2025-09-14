#!/bin/bash

echo "🔧 Setting up Code Quality Intelligence Agent..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo ""
    echo "⚠️  GEMINI_API_KEY environment variable is not set"
    echo "📝 To complete setup:"
    echo "1. Get a free API key from: https://makersuite.google.com/app/apikey"
    echo "2. Set the environment variable:"
    echo "   export GEMINI_API_KEY='your-api-key-here'"
    echo "3. Add it to your shell profile (~/.bashrc, ~/.zshrc, etc.) to persist"
    echo ""
else
    echo "✅ GEMINI_API_KEY is configured"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📚 Usage examples:"
echo "  codeql analyze ./my-project"
echo "  codeql analyze ./my-project --interactive"
echo "  codeql analyze ./my-project --output ./reports --format html"
echo "  codeql quick ./my-project"
echo ""
echo "💡 Run 'codeql --help' for all available commands"
