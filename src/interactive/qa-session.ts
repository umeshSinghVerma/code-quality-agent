import type { QualityReport, CodeFile } from "../types.js"
import { GeminiClient } from "../ai/gemini-client.js"

export interface QAContext {
  report: QualityReport
  files: CodeFile[]
  conversationHistory: Array<{ question: string; answer: string }>
}

export class QASession {
  private geminiClient: GeminiClient
  private context: QAContext

  constructor(report: QualityReport, files: CodeFile[]) {
    this.geminiClient = new GeminiClient()
    this.context = {
      report,
      files,
      conversationHistory: [],
    }
  }

  async askQuestion(question: string): Promise<string> {
    try {
      const contextualPrompt = this.buildContextualPrompt(question)
      const answer = await this.geminiClient.askQuestion(contextualPrompt, question)

      // Store in conversation history
      this.context.conversationHistory.push({ question, answer })

      return answer
    } catch (error) {
      console.error("Q&A session error:", error)
      return "I'm sorry, I encountered an error while processing your question. Please try again."
    }
  }

  private buildContextualPrompt(question: string): string {
    const { report, files } = this.context

    // Build a comprehensive context
    const context = []

    // Add report summary
    context.push("=== CODE ANALYSIS REPORT ===")
    context.push(`Files analyzed: ${report.summary.totalFiles}`)
    context.push(`Total lines: ${report.summary.totalLines}`)
    context.push(`Languages: ${report.summary.languages.join(", ")}`)
    context.push(`Issues found: ${report.summary.issueCount}`)
    context.push("")

    // Add severity breakdown
    context.push("Issue Severity Breakdown:")
    Object.entries(report.summary.severityBreakdown).forEach(([severity, count]) => {
      context.push(`- ${severity}: ${count}`)
    })
    context.push("")

    // Add quality metrics
    context.push("Quality Metrics:")
    context.push(`- Code Complexity: ${report.metrics.codeComplexity}/10`)
    context.push(`- Test Coverage: ${report.metrics.testCoverage}%`)
    context.push(`- Code Duplication: ${report.metrics.duplicationPercentage}%`)
    context.push(`- Maintainability Index: ${report.metrics.maintainabilityIndex}/100`)
    context.push("")

    // Add top issues (limited to avoid token limits)
    context.push("Top Priority Issues:")
    report.issues.slice(0, 10).forEach((issue, index) => {
      context.push(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`)
      context.push(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ""}`)
      context.push(`   Type: ${issue.type}`)
      context.push(`   Description: ${issue.description}`)
      context.push(`   Suggestion: ${issue.suggestion}`)
      context.push("")
    })

    // Add file structure overview
    context.push("File Structure:")
    const filesByLanguage = this.groupFilesByLanguage(files)
    Object.entries(filesByLanguage).forEach(([language, langFiles]) => {
      context.push(`${language}: ${langFiles.length} files`)
      langFiles.slice(0, 5).forEach((file) => {
        context.push(`  - ${file.path}`)
      })
      if (langFiles.length > 5) {
        context.push(`  ... and ${langFiles.length - 5} more`)
      }
    })
    context.push("")

    // Add conversation history for context
    if (this.context.conversationHistory.length > 0) {
      context.push("Previous Conversation:")
      this.context.conversationHistory.slice(-3).forEach(({ question, answer }) => {
        context.push(`Q: ${question}`)
        context.push(`A: ${answer.slice(0, 200)}${answer.length > 200 ? "..." : ""}`)
        context.push("")
      })
    }

    return context.join("\n")
  }

  private groupFilesByLanguage(files: CodeFile[]): Record<string, CodeFile[]> {
    return files.reduce(
      (groups, file) => {
        if (!groups[file.language]) {
          groups[file.language] = []
        }
        groups[file.language].push(file)
        return groups
      },
      {} as Record<string, CodeFile[]>,
    )
  }

  getSuggestedQuestions(): string[] {
    const { report } = this.context
    const suggestions: string[] = []

    // Base suggestions
    suggestions.push("What are the most critical issues I should fix first?")
    suggestions.push("How can I improve the overall code quality?")
    suggestions.push("What files need the most attention?")

    // Context-specific suggestions based on issues found
    const issueTypes = new Set(report.issues.map((issue) => issue.type))

    if (issueTypes.has("security")) {
      suggestions.push("What security vulnerabilities were found?")
      suggestions.push("How can I make my code more secure?")
    }

    if (issueTypes.has("performance")) {
      suggestions.push("What performance issues should I address?")
      suggestions.push("How can I optimize the slow parts of my code?")
    }

    if (issueTypes.has("testing")) {
      suggestions.push("How can I improve test coverage?")
      suggestions.push("What parts of the code need more testing?")
    }

    if (issueTypes.has("complexity")) {
      suggestions.push("Which functions are too complex?")
      suggestions.push("How can I reduce code complexity?")
    }

    if (issueTypes.has("documentation")) {
      suggestions.push("What documentation is missing?")
      suggestions.push("How can I improve code documentation?")
    }

    // Metrics-based suggestions
    if (report.metrics.testCoverage < 50) {
      suggestions.push("Why is my test coverage so low?")
    }

    if (report.metrics.codeComplexity > 7) {
      suggestions.push("Why is my code complexity high?")
    }

    if (report.metrics.duplicationPercentage > 20) {
      suggestions.push("Where is the duplicated code?")
    }

    return suggestions.slice(0, 8) // Limit to 8 suggestions
  }

  getConversationHistory(): Array<{ question: string; answer: string }> {
    return [...this.context.conversationHistory]
  }

  clearHistory(): void {
    this.context.conversationHistory = []
  }
}
