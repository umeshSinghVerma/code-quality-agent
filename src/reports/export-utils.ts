import { writeFile, mkdir } from "fs/promises"
import { join, dirname } from "path"
import type { QualityReport } from "../types.js"
import { ReportGenerator } from "./report-generator.js"

export class ReportExporter {
  private reportGenerator: ReportGenerator

  constructor() {
    this.reportGenerator = new ReportGenerator()
  }

  async exportReport(
    report: QualityReport,
    outputPath: string,
    format: "html" | "markdown" | "json" = "html",
  ): Promise<string> {
    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true })

    let content: string
    let filename: string

    switch (format) {
      case "html":
        content = this.reportGenerator.generateHTMLReport(report)
        filename = outputPath.endsWith(".html") ? outputPath : `${outputPath}.html`
        break
      case "markdown":
        content = this.reportGenerator.generateMarkdownReport(report)
        filename = outputPath.endsWith(".md") ? outputPath : `${outputPath}.md`
        break
      case "json":
        content = this.reportGenerator.generateJSONReport(report)
        filename = outputPath.endsWith(".json") ? outputPath : `${outputPath}.json`
        break
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    await writeFile(filename, content, "utf-8")
    return filename
  }

  async exportAllFormats(report: QualityReport, basePath: string): Promise<string[]> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const baseFilename = `code-quality-report-${timestamp}`

    const exports = await Promise.all([
      this.exportReport(report, join(basePath, `${baseFilename}.html`), "html"),
      this.exportReport(report, join(basePath, `${baseFilename}.md`), "markdown"),
      this.exportReport(report, join(basePath, `${baseFilename}.json`), "json"),
    ])

    return exports
  }

  generateSummaryStats(report: QualityReport): string {
    const stats = []

    stats.push(`📊 Analysis Summary:`)
    stats.push(`• ${report.summary.totalFiles} files analyzed`)
    stats.push(`• ${report.summary.totalLines.toLocaleString()} lines of code`)
    stats.push(`• ${report.summary.issueCount} issues found`)
    stats.push(`• ${report.summary.languages.length} programming languages`)

    const criticalIssues = report.summary.severityBreakdown.critical || 0
    const highIssues = report.summary.severityBreakdown.high || 0

    if (criticalIssues > 0) {
      stats.push(`🚨 ${criticalIssues} critical issues require immediate attention`)
    }

    if (highIssues > 0) {
      stats.push(`⚠️ ${highIssues} high-priority issues found`)
    }

    // Quality score calculation
    const totalIssues = report.summary.issueCount
    const qualityScore = Math.max(0, 100 - (totalIssues / report.summary.totalFiles) * 10)

    stats.push(`📈 Overall Quality Score: ${Math.round(qualityScore)}/100`)

    return stats.join("\n")
  }
}
