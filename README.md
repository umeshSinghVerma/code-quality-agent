# Code Quality Intelligence Agent

An AI-powered code analysis tool that uses Google's Gemini API to analyze codebases and provide actionable insights for improving code quality.

## Features

- **Multi-language Support**: Analyze JavaScript, TypeScript, Python, Java, C++, and more
- **Comprehensive Analysis**: Detects security vulnerabilities, performance issues, code duplication, complexity problems, testing gaps, and documentation issues
- **Interactive Q&A**: Ask natural language questions about your codebase
- **Detailed Reports**: Get prioritized, actionable recommendations
- **CLI Interface**: Simple command-line tool for local analysis
- **Web Interface**: Analyze GitHub repositories directly from the web

## Setup

1. **Install Dependencies**:
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up Gemini API Key**:
   - Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Set the environment variable:
     \`\`\`bash
     export GEMINI_API_KEY="your-api-key-here"
     \`\`\`

3. **Build the Project**:
   \`\`\`bash
   npm run build
   \`\`\`

## Usage

### CLI Analysis
\`\`\`bash
# Analyze a local directory
npm run analyze /path/to/your/code

# Or use the built binary
./dist/cli.js analyze /path/to/your/code
\`\`\`

### Web Interface
\`\`\`bash
# Start the web server
npm run web

# Visit http://localhost:3000 to analyze GitHub repos
\`\`\`

### Interactive Mode
After analysis, you can ask questions about your codebase:
- "What are the most critical security issues?"
- "How can I improve performance?"
- "Which files have the most duplication?"

## Architecture

- **File Analysis System**: Scans and parses code files
- **AI Quality Analyzer**: Uses Gemini API for intelligent code analysis
- **Report Generator**: Creates comprehensive quality reports
- **Interactive Q&A**: Conversational interface for codebase questions
- **Web Interface**: GitHub repository analysis via web UI

## Supported Languages

- JavaScript/TypeScript
- Python
- Java
- C/C++
- C#
- PHP
- Ruby
- Go
- Rust
- Swift
- Kotlin

## Free Tier Usage

This tool is designed to work within free API limits:
- Uses Google Gemini API (generous free tier)
- No external paid services required
- Efficient token usage with smart chunking
