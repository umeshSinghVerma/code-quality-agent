# Code Quality Intelligence Agent

AI-powered, developer-friendly code quality analysis with actionable insights, interactive Q&A, and a lightweight web UI. Powered by Google Gemini.

## ✨ What it does (Current Capabilities)

- Multi-language analysis: JavaScript, TypeScript, Python, Java, C/C++, C#, PHP, Ruby, Go, Rust, Swift, Kotlin
- Quality categories detected:
  - Security vulnerabilities
  - Performance bottlenecks
  - Complexity issues
  - Testing gaps (basic heuristics)
  - Documentation issues
  - Duplicate code: experimental (metrics support; AI may surface duplication issues)
- Reports: Prioritized issues with severity, impact, and concrete suggestions
- Interactive Q&A: Ask natural-language questions about your code and the report
- CLI + Web: Analyze local folders via CLI, or GitHub repos via the web UI

## 🚀 Quick Start

1) Install dependencies
bash
npm install


2) Set environment variables
- Gemini API (required for AI features)
  - Get a free key from Google AI Studio: https://makersuite.google.com/app/apikey
  - Set in your shell (example):
bash
export GEMINI_API_KEY="your-gemini-key"


- GitHub token (optional, but recommended for web GitHub analysis)
  - Increases API rate limit from 60 to 5000 req/hour
  - Generate a classic token at https://github.com/settings/tokens (no scopes needed for public repos; add repo for private)
  - Put in a .env file (for the web server) at the project root:
env
GITHUB_TOKEN=your_github_token


3) Build
bash
npm run build


## 🧰 Usage

### CLI
Analyze a local file or directory:
bash
# Using npm script (tsx runner)
npm run analyze /path/to/code

# Or using the compiled CLI (after build)
node dist/cli.js analyze /path/to/code

# Flags
#   -o, --output <path>   Output directory for reports
#   -f, --format <fmt>    console|html|markdown|json|all (default: console)
#   -i, --interactive     Start Q&A after analysis
#   -q, --question <q>    Ask a single question about the codebase
#       --no-ai           Run without Gemini (static analysis only)


Other CLI commands:
bash
# Quick summary (no detailed report)
node dist/cli.js quick /path/to/code

# Show environment/config info
node dist/cli.js config


### Web (GitHub repo analysis)
bash
# Start the web server
npm run web

# Open the UI
# http://localhost:3000


Paste a GitHub repository URL (public or private with token) and run the analysis in your browser. The server will log whether a GitHub token is detected at startup.

API endpoints (served by the web server):
- POST /api/analyze/github { repoUrl }
- POST /api/qa/:sessionId/ask { question }
- GET  /api/qa/:sessionId/suggestions
- GET  /api/qa/:sessionId/history
- GET  /api/health

## 🔎 How it works (Architecture)


               ┌──────────────────────┐
               │        CLI           │
               │  (src/cli.ts)        │
               └─────────┬────────────┘
                         │
                 ┌───────▼────────┐          ┌───────────────────────┐
                 │  QualityEngine  │          │        Web UI         │
                 │ (core/quality-  │          │ (src/web-server.tsx)  │
                 │   engine.ts)    │◄────────►│ + REST API (sessions) │
                 └───────┬────────┘          └───────────┬───────────┘
                         │                               │
            ┌────────────▼────────────┐      ┌───────────▼───────────┐
            │    FileAnalyzer         │      │   GitHubFetcher       │
            │ (utils/file-utils.ts)   │      │ (web/github-fetcher)  │
            └────────────┬────────────┘      └───────────┬───────────┘
                         │                               │
      ┌──────────────────▼──────────────────┐  ┌──────────▼─────────┐
      │   Static analyzers (analyzers/*)    │  │   AI (Gemini)      │
      │  - SecurityAnalyzer                 │  │ (ai/gemini-client) │
      │  - PerformanceAnalyzer              │  │                    │
      │  - ComplexityAnalyzer               │  └────────────────────┘
      │  - AIQualityAnalyzer (calls Gemini) │
      └─────────────────────────────────────┘

      ┌─────────────────────────────────────────────────────────────┐
      │         Reports (reports/report-generator.tsx)               │
      │    - Console/Markdown/HTML/JSON outputs                      │
      └─────────────────────────────────────────────────────────────┘


Key modules:
- FileAnalyzer: globs source files, filters by size/type, reads contents
- SecurityAnalyzer, PerformanceAnalyzer, ComplexityAnalyzer: rule-based checks
- AIQualityAnalyzer: batched prompts to Gemini for higher-level insights
- ReportGenerator: console, Markdown, HTML, JSON report generators
- WebQAInterface and QASession: interactive Q&A memory and suggestions
- GitHubFetcher: recursively fetches repo contents via GitHub API (uses GITHUB_TOKEN if set)

## ⚙ Configuration

Environment variables:
- GEMINI_API_KEY (required for AI features)
- GITHUB_TOKEN (optional; recommended for GitHub analysis on web server)

Create .env (for the web server) from .env copy.example:
env
GEMINI_API_KEY=your_gemini_key
GITHUB_TOKEN=your_github_token


## 🧪 What gets detected

- Security: SQLi patterns, XSS sinks, hardcoded secrets, path traversal, command injection, insecure randomness
- Performance: nested loops, inefficient data ops, sync I/O, large literals, potential leaks
- Complexity: long functions, high cyclomatic complexity, deep nesting, many parameters
- Testing: low coverage heuristic (based on presence of test files)
- Docs: missing README, missing function-level documentation
- Duplication: experimental duplicate block detection (metrics + AI surface)

## 🧩 Troubleshooting

- GitHub “rate limit exceeded” in web analysis
  - Ensure .env contains GITHUB_TOKEN and restart the server
  - On startup, the server logs whether a token is detected
  - Public repos work unauthenticated but are limited to 60 req/hour

- Gemini key required
  - CLI: set GEMINI_API_KEY in your shell (CLI doesn’t auto-load .env)
  - Web: .env is auto-loaded; ensure it exists in the project root

- Windows PowerShell env vars
powershell
$env:GEMINI_API_KEY = "your-key"
$env:GITHUB_TOKEN   = "your-token"


## 📦 Build & Run

bash
# Build TypeScript → dist/
npm run build

# CLI example (compiled)
node dist/cli.js analyze ./

# Web UI (dev mode)
npm run web


## 🧭 Roadmap (Next Up)

- Richer duplication reporting and dependency graphs
- Optional AST parsing for precise structural analysis
- RAG for very large repositories
- Automated severity scoring calibration
- PR review integration (GitHub app/Checks API)
- Visual dashboards (hotspots, trends)

## 📝 License

MIT