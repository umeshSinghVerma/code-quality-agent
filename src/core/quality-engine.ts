import type { CodeFile, QualityReport, QualityIssue } from "../types.js"
import { FileAnalyzer } from "../utils/file-utils.js"
import { CodeParser } from "../analyzers/code-parser.js"
import { SecurityAnalyzer } from "../analyzers/security-analyzer.js"
import { PerformanceAnalyzer } from "../analyzers/performance-analyzer.js"
import { ComplexityAnalyzer } from "../analyzers/complexity-analyzer.js"
import { AIQualityAnalyzer } from "../analyzers/ai-quality-analyzer.js"

export class QualityEngine {
  private fileAnalyzer: FileAnalyzer
  private codeParser: CodeParser
  private securityAnalyzer: SecurityAnalyzer
  private performanceAnalyzer: PerformanceAnalyzer
  private complexityAnalyzer: ComplexityAnalyzer
  private aiAnalyzer: AIQualityAnalyzer

  constructor() {
    this.fileAnalyzer = new FileAnalyzer()
    this.codeParser = new CodeParser()
    this.securityAnalyzer = new SecurityAnalyzer()
    this.performanceAnalyzer = new PerformanceAnalyzer()
    this.complexityAnalyzer = new ComplexityAnalyzer()
    this.aiAnalyzer = new AIQualityAnalyzer()
  }

  async analyzeDirectory(dirPath: string): Promise<QualityReport> {
    console.log(`Analyzing directory: ${dirPath}`)
    const files = await this.fileAnalyzer.analyzeDirectory(dirPath)
    return this.analyzeFiles(files)
  }

  async analyzeFiles(files: CodeFile[]): Promise<QualityReport> {
    console.log(`Analyzing ${files.length} provided files`)

    if (files.length === 0) {
      throw new Error("No supported code files provided")
    }

    // Step 2: Run all analyzers
    const allIssues: QualityIssue[] = []

    // Static analysis
    for (const file of files) {
      allIssues.push(...this.securityAnalyzer.analyzeFile(file))
      allIssues.push(...this.performanceAnalyzer.analyzeFile(file))
      allIssues.push(...this.complexityAnalyzer.analyzeFile(file))
    }

    // AI-powered analysis
    console.log("Running AI analysis...")
    const aiIssues = await this.aiAnalyzer.analyzeCodeQuality(files)
    allIssues.push(...aiIssues)

    // Test coverage analysis
    const testIssues = await this.aiAnalyzer.analyzeTestCoverage(files)
    allIssues.push(...testIssues)

    // Documentation analysis
    const docIssues = await this.aiAnalyzer.analyzeDocumentation(files)
    allIssues.push(...docIssues)

    // Step 3: Calculate metrics
    const metrics = this.calculateMetrics(files, allIssues)

    // Step 4: Generate recommendations
    const recommendations = this.generateRecommendations(allIssues)

    // Step 5: Create report
    const report: QualityReport = {
      summary: {
        totalFiles: files.length,
        totalLines: this.fileAnalyzer.getTotalLines(files),
        languages: Object.keys(this.fileAnalyzer.getLanguageStats(files)),
        issueCount: allIssues.length,
        severityBreakdown: this.getSeverityBreakdown(allIssues),
      },
      issues: this.prioritizeIssues(allIssues),
      metrics,
      recommendations,
      timestamp: new Date().toISOString(),
    }

    return report
  }

  private calculateMetrics(files: CodeFile[], issues: QualityIssue[]) {
    const totalLines = this.fileAnalyzer.getTotalLines(files)
    const complexityIssues = issues.filter((i) => i.type === "complexity")
    const securityIssues = issues.filter((i) => i.type === "security")
    const testIssues = issues.filter((i) => i.type === "testing")

    // Simple metrics calculation
    const codeComplexity = Math.min(10, (complexityIssues.length / files.length) * 10)
    const testCoverage = Math.max(0, 100 - testIssues.length * 20)
    const duplicationPercentage = Math.min(50, issues.filter((i) => i.type === "duplication").length * 5)
    const maintainabilityIndex = Math.max(0, 100 - (issues.length / files.length) * 10)

    return {
      codeComplexity: Math.round(codeComplexity),
      testCoverage: Math.round(testCoverage),
      duplicationPercentage: Math.round(duplicationPercentage),
      maintainabilityIndex: Math.round(maintainabilityIndex),
    }
  }

  private getSeverityBreakdown(issues: QualityIssue[]): Record<string, number> {
    const breakdown: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }

    issues.forEach((issue) => {
      breakdown[issue.severity]++
    })

    return breakdown
  }

  private prioritizeIssues(issues: QualityIssue[]): QualityIssue[] {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }

    return issues.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff

      // Secondary sort by type priority
      const typePriority = { security: 4, performance: 3, complexity: 2, testing: 1 }
      return (
        (typePriority[b.type as keyof typeof typePriority] || 0) -
        (typePriority[a.type as keyof typeof typePriority] || 0)
      )
    })
  }

  private generateRecommendations(issues: QualityIssue[]): string[] {
    const recommendations: string[] = []
    const issuesByType = this.groupIssuesByType(issues)

    if (issuesByType.security?.length > 0) {
      recommendations.push("🔒 Address security vulnerabilities immediately - they pose the highest risk")
    }

    if (issuesByType.performance?.length > 0) {
      recommendations.push("⚡ Optimize performance bottlenecks to improve user experience")
    }

    if (issuesByType.testing?.length > 0) {
      recommendations.push("🧪 Increase test coverage to catch bugs early and enable safe refactoring")
    }

    if (issuesByType.complexity?.length > 0) {
      recommendations.push("🔧 Refactor complex code to improve maintainability")
    }

    if (issuesByType.documentation?.length > 0) {
      recommendations.push("📚 Improve documentation to help team members understand the codebase")
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ Great job! Your code quality looks good overall")
    }

    return recommendations
  }

  private groupIssuesByType(issues: QualityIssue[]): Record<string, QualityIssue[]> {
    return issues.reduce(
      (groups, issue) => {
        if (!groups[issue.type]) {
          groups[issue.type] = []
        }
        groups[issue.type].push(issue)
        return groups
      },
      {} as Record<string, QualityIssue[]>,
    )
  }
}
