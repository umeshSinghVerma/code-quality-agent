import express from "express"
import cors from "cors"
import multer from "multer"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { QualityEngine } from "../core/quality-engine.js"
import { ReportGenerator } from "../reports/report-generator.js"
import { WebQAInterface } from "../interactive/web-qa.js"
import { GitHubFetcher } from "./github-fetcher.js"
import { FileAnalyzer } from "../utils/file-utils.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app: express.Express = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: "10mb" }))
app.use(express.static(join(__dirname, "public")))

// File upload configuration
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

// Global instances
const qualityEngine = new QualityEngine()
const reportGenerator = new ReportGenerator()
const webQA = new WebQAInterface()
const githubFetcher = new GitHubFetcher()

// Routes

// Serve the main web interface
app.get("/", (req, res) => {
  res.send(generateWebInterface())
})

// Analyze GitHub repository
app.post("/api/analyze/github", async (req, res) => {
  try {
    const { repoUrl } = req.body

    if (!repoUrl) {
      return res.status(400).json({ error: "Repository URL is required" })
    }

    console.log(`Analyzing GitHub repository: ${repoUrl}`)

    // Fetch repository files
    const files = await githubFetcher.fetchRepository(repoUrl)

    if (files.length === 0) {
      return res.status(400).json({ error: "No supported code files found in repository" })
    }

    // Run quality analysis on fetched files directly
    const report = await qualityEngine.analyzeFiles(files)

    // Create Q&A session
    const sessionId = `github-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    webQA.createSession(sessionId, report, files)

    // Generate HTML report
    const htmlReport = reportGenerator.generateHTMLReport(report)

    res.json({
      success: true,
      sessionId,
      report,
      htmlReport,
      fileCount: files.length,
      repoUrl,
    })
  } catch (error) {
    console.error("GitHub analysis error:", error)
    res.status(500).json({
      error: "Analysis failed",
      message: error instanceof Error ? error.message : String(error),
    })
  }
})

// Ask question about analyzed code
app.post("/api/qa/:sessionId/ask", async (req, res) => {
  try {
    const { sessionId } = req.params
    const { question } = req.body

    if (!question) {
      return res.status(400).json({ error: "Question is required" })
    }

    const response = await webQA.askQuestion(sessionId, question)
    res.json(response)
  } catch (error) {
    console.error("Q&A error:", error)
    res.status(500).json({
      error: "Failed to process question",
      message: error instanceof Error ? error.message : String(error),
    })
  }
})

// Get suggested questions
app.get("/api/qa/:sessionId/suggestions", async (req, res) => {
  try {
    const { sessionId } = req.params
    const suggestions = webQA.getSuggestions(sessionId)
    res.json({ suggestions })
  } catch (error) {
    res.status(404).json({ error: "Session not found" })
  }
})

// Get conversation history
app.get("/api/qa/:sessionId/history", async (req, res) => {
  try {
    const { sessionId } = req.params
    const history = webQA.getHistory(sessionId)
    res.json({ history })
  } catch (error) {
    res.status(404).json({ error: "Session not found" })
  }
})

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
})

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Server error:", error)
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
  })
})

// Start server
app.listen(port, () => {
  console.log(`🚀 Code Quality Intelligence Agent web server running at http://localhost:${port}`)
  console.log(`📊 Ready to analyze GitHub repositories!`)

  if (!process.env.GEMINI_API_KEY) {
    console.log(`⚠️  Warning: GEMINI_API_KEY not set. Set it to enable AI analysis.`)
  }
})

function generateWebInterface(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Quality Intelligence Agent</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .main-content {
            padding: 40px;
        }
        
        .analyze-section {
            margin-bottom: 40px;
        }
        
        .input-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        input[type="url"] {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        input[type="url"]:focus {
            outline: none;
            border-color: #3498db;
        }
        
        .btn {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(52, 152, 219, 0.3);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .results {
            display: none;
            margin-top: 40px;
        }
        
        .report-container {
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .qa-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .qa-input {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .qa-input input {
            flex: 1;
        }
        
        .suggestions {
            margin-bottom: 20px;
        }
        
        .suggestion-btn {
            background: #ecf0f1;
            border: 1px solid #bdc3c7;
            padding: 8px 12px;
            margin: 4px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        .suggestion-btn:hover {
            background: #d5dbdb;
        }
        
        .conversation {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            padding: 20px;
            background: white;
        }
        
        .message {
            margin-bottom: 20px;
            padding: 12px;
            border-radius: 8px;
        }
        
        .question {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
        }
        
        .answer {
            background: #f1f8e9;
            border-left: 4px solid #4caf50;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 40px;
        }
        
        .feature {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .error {
            background: #ffebee;
            color: #c62828;
            padding: 12px;
            border-radius: 8px;
            margin: 10px 0;
            border-left: 4px solid #f44336;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Code Quality Intelligence Agent</h1>
            <p>AI-powered code analysis for GitHub repositories</p>
        </div>
        
        <div class="main-content">
            <div class="analyze-section">
                <h2>Analyze GitHub Repository</h2>
                <div class="input-group">
                    <label for="repoUrl">GitHub Repository URL:</label>
                    <input 
                        type="url" 
                        id="repoUrl" 
                        placeholder="https://github.com/username/repository"
                        value=""
                    >
                </div>
                <button class="btn" onclick="analyzeRepository()">
                    🚀 Analyze Code Quality
                </button>
            </div>
            
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Analyzing repository... This may take a few minutes.</p>
            </div>
            
            <div class="results" id="results">
                <h2>Analysis Results</h2>
                <div class="report-container" id="reportContainer"></div>
                
                <div class="qa-section">
                    <h3>🤖 Ask Questions About Your Code</h3>
                    <div class="qa-input">
                        <input 
                            type="text" 
                            id="questionInput" 
                            placeholder="Ask about security issues, performance, or any code quality concerns..."
                        >
                        <button class="btn" onclick="askQuestion()">Ask</button>
                    </div>
                    
                    <div class="suggestions" id="suggestions">
                        <p><strong>Suggested questions:</strong></p>
                    </div>
                    
                    <div class="conversation" id="conversation"></div>
                </div>
            </div>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h3>Security Analysis</h3>
                    <p>Detect vulnerabilities, injection flaws, and security anti-patterns</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <h3>Performance Insights</h3>
                    <p>Identify bottlenecks, inefficient algorithms, and optimization opportunities</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🧪</div>
                    <h3>Testing & Quality</h3>
                    <p>Analyze test coverage, complexity, and maintainability metrics</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🤖</div>
                    <h3>AI-Powered Q&A</h3>
                    <p>Ask natural language questions about your codebase and get intelligent answers</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentSessionId = null;

        async function analyzeRepository() {
            const repoUrl = document.getElementById('repoUrl').value.trim();
            
            if (!repoUrl) {
                alert('Please enter a GitHub repository URL');
                return;
            }

            const loading = document.getElementById('loading');
            const results = document.getElementById('results');
            const analyzeBtn = document.querySelector('.btn');
            
            // Show loading state
            loading.style.display = 'block';
            results.style.display = 'none';
            analyzeBtn.disabled = true;

            try {
                const response = await fetch('/api/analyze/github', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ repoUrl }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Analysis failed');
                }

                currentSessionId = data.sessionId;
                
                // Display results
                document.getElementById('reportContainer').innerHTML = data.htmlReport;
                
                // Load suggestions
                loadSuggestions();
                
                // Show results
                loading.style.display = 'none';
                results.style.display = 'block';
                
            } catch (error) {
                loading.style.display = 'none';
                showError('Analysis failed: ' + error.message);
            } finally {
                analyzeBtn.disabled = false;
            }
        }

        async function askQuestion() {
            if (!currentSessionId) {
                alert('Please analyze a repository first');
                return;
            }

            const questionInput = document.getElementById('questionInput');
            const question = questionInput.value.trim();
            
            if (!question) {
                alert('Please enter a question');
                return;
            }

            // Add question to conversation
            addToConversation(question, 'question');
            questionInput.value = '';

            try {
                const response = await fetch(\`/api/qa/\${currentSessionId}/ask\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ question }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to get answer');
                }

                // Add answer to conversation
                addToConversation(data.answer, 'answer');
                
            } catch (error) {
                addToConversation('Sorry, I encountered an error: ' + error.message, 'answer');
            }
        }

        async function loadSuggestions() {
            if (!currentSessionId) return;

            try {
                const response = await fetch(\`/api/qa/\${currentSessionId}/suggestions\`);
                const data = await response.json();

                const suggestionsContainer = document.getElementById('suggestions');
                const buttonsHtml = data.suggestions.map(suggestion => 
                    \`<button class="suggestion-btn" onclick="askSuggestedQuestion('\${suggestion.replace(/'/g, "\\'")}')">
                        \${suggestion}
                    </button>\`
                ).join('');
                
                suggestionsContainer.innerHTML = '<p><strong>Suggested questions:</strong></p>' + buttonsHtml;
                
            } catch (error) {
                console.error('Failed to load suggestions:', error);
            }
        }

        function askSuggestedQuestion(question) {
            document.getElementById('questionInput').value = question;
            askQuestion();
        }

        function addToConversation(message, type) {
            const conversation = document.getElementById('conversation');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            messageDiv.innerHTML = \`<strong>\${type === 'question' ? '❓ You:' : '🤖 AI:'}</strong><br>\${message}\`;
            conversation.appendChild(messageDiv);
            conversation.scrollTop = conversation.scrollHeight;
        }

        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = message;
            document.querySelector('.main-content').insertBefore(errorDiv, document.querySelector('.analyze-section').nextSibling);
            
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }

        // Allow Enter key to submit questions
        document.getElementById('questionInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                askQuestion();
            }
        });
    </script>
</body>
</html>
`
}

export default app
