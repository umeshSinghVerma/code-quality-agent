import type { CodeFile, QualityIssue } from "../types.js"
import { GeminiClient } from "../ai/gemini-client.js"

export class AIQualityAnalyzer {
  private geminiClient: GeminiClient

  constructor() {
    // Lazily initialize only if API key is configured
    try {
      this.geminiClient = new GeminiClient()
    } catch (error) {
      this.geminiClient = null as unknown as GeminiClient
    }
  }

  async analyzeCodeQuality(files: CodeFile[]): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = []

    // Process files in batches to stay within API limits
    const batchSize = 3
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      const batchIssues = await this.analyzeBatch(batch)
      issues.push(...batchIssues)
    }

    return issues
  }

  private async analyzeBatch(files: CodeFile[]): Promise<QualityIssue[]> {
    const prompt = this.createAnalysisPrompt(files)

    try {
      if (!this.geminiClient) {
        // AI disabled (no API key); skip gracefully
        return []
      }
      const response = await this.geminiClient.analyzeCode(prompt)
      return this.parseAIResponse(response, files)
    } catch (error) {
      console.error("AI analysis failed:", error)
      return []
    }
  }

  private createAnalysisPrompt(files: CodeFile[]): string {
    const fileContents = files
      .map(
        (file) => `
File: ${file.path} (${file.language})
\`\`\`${file.language}
${file.content.slice(0, 2000)} ${file.content.length > 2000 ? "..." : ""}
\`\`\`
`,
      )
      .join("\n")

    return `
You are a senior code reviewer analyzing the following code files for quality issues. 

Please identify issues in these categories:
1. Security vulnerabilities
2. Performance problems  
3. Code duplication
4. Complexity issues
5. Testing gaps
6. Documentation problems
7. Maintainability concerns

For each issue found, provide:
- Type (security/performance/duplication/complexity/testing/documentation/maintainability)
- Severity (low/medium/high/critical)
- Title (brief description)
- Description (detailed explanation)
- File and line number (if applicable)
- Suggestion (how to fix)
- Impact (why it matters)
- Effort (low/medium/high to fix)

Format your response as JSON array of issues:
[
  {
    "type": "security",
    "severity": "high",
    "title": "Issue title",
    "description": "Detailed description",
    "file": "path/to/file.js",
    "line": 42,
    "suggestion": "How to fix this",
    "impact": "Why this matters",
    "effort": "medium"
  }
]

Files to analyze:
${fileContents}

Focus on real, actionable issues that would help developers improve their code quality.
`
  }

  private parseAIResponse(response: string, files: CodeFile[]): QualityIssue[] {
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.warn("No JSON found in AI response")
        return []
      }

      const issues = JSON.parse(jsonMatch[0])

      return issues.map((issue: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        type: issue.type || "maintainability",
        severity: issue.severity || "medium",
        title: issue.title || "Code Quality Issue",
        description: issue.description || "Issue detected by AI analysis",
        file: issue.file || files[0]?.path || "unknown",
        line: issue.line || undefined,
        suggestion: issue.suggestion || "Review and improve this code",
        impact: issue.impact || "May affect code quality",
        effort: issue.effort || "medium",
      }))
    } catch (error) {
      console.error("Failed to parse AI response:", error)
      return []
    }
  }

  async analyzeTestCoverage(files: CodeFile[]): Promise<QualityIssue[]> {
    const testFiles = files.filter(
      (f) =>
        f.path.includes("test") ||
        f.path.includes("spec") ||
        f.path.endsWith(".test.js") ||
        f.path.endsWith(".test.ts") ||
        f.path.endsWith(".spec.js") ||
        f.path.endsWith(".spec.ts"),
    )

    const sourceFiles = files.filter((f) => !testFiles.includes(f))

    if (testFiles.length === 0) {
      return [
        {
          id: "no-tests",
          type: "testing",
          severity: "high",
          title: "No Test Files Found",
          description: "No test files detected in the codebase.",
          file: "project",
          suggestion: "Add unit tests for your functions and components.",
          impact: "Lack of tests makes it difficult to catch bugs and refactor safely.",
          effort: "high",
        },
      ]
    }

    const testRatio = testFiles.length / sourceFiles.length
    const issues: QualityIssue[] = []

    if (testRatio < 0.3) {
      issues.push({
        id: "low-test-coverage",
        type: "testing",
        severity: "medium",
        title: "Low Test Coverage",
        description: `Only ${Math.round(testRatio * 100)}% of source files have corresponding tests.`,
        file: "project",
        suggestion: "Increase test coverage by adding tests for untested modules.",
        impact: "Insufficient testing increases the risk of bugs in production.",
        effort: "high",
      })
    }

    return issues
  }

  async analyzeDocumentation(files: CodeFile[]): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = []

    // Check for README
    const hasReadme = files.some((f) => f.path.toLowerCase().includes("readme"))
    if (!hasReadme) {
      issues.push({
        id: "no-readme",
        type: "documentation",
        severity: "medium",
        title: "Missing README",
        description: "No README file found in the project.",
        file: "project",
        suggestion: "Add a README.md file with project description, setup instructions, and usage examples.",
        impact: "Makes it difficult for new developers to understand and contribute to the project.",
        effort: "low",
      })
    }

    // Check for function documentation
    for (const file of files) {
      const lines = file.content.split("\n")
      const functionLines: number[] = []

      // Find function declarations
      lines.forEach((line, index) => {
        if (/\b(function|def|class)\s+\w+/.test(line)) {
          functionLines.push(index)
        }
      })

      // Check if functions have documentation
      const undocumentedFunctions = functionLines.filter((lineNum) => {
        const prevLines = lines.slice(Math.max(0, lineNum - 3), lineNum)
        return !prevLines.some((line) => line.includes("/**") || line.includes('"""') || line.includes("///"))
      })

      if (undocumentedFunctions.length > 0) {
        issues.push({
          id: `undocumented-functions-${file.path}`,
          type: "documentation",
          severity: "low",
          title: "Undocumented Functions",
          description: `${undocumentedFunctions.length} functions lack documentation in ${file.path}.`,
          file: file.path,
          line: undocumentedFunctions[0] + 1,
          suggestion: "Add JSDoc comments or docstrings to explain function purpose, parameters, and return values.",
          impact: "Makes code harder to understand and maintain.",
          effort: "low",
        })
      }
    }

    return issues
  }
}
