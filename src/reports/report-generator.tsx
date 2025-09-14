import type { QualityReport, QualityIssue } from "../types.js"
import { marked } from "marked"
import chalk from "chalk"

export class ReportGenerator {
  generateConsoleReport(report: QualityReport): string {
    const output: string[] = []

    // Header
    output.push(chalk.bold.blue("\n🔍 Code Quality Intelligence Report"))
    output.push(chalk.gray("=".repeat(50)))
    output.push("")

    // Summary
    output.push(chalk.bold.yellow("📊 Summary"))
    output.push(`Files analyzed: ${chalk.cyan(report.summary.totalFiles)}`)
    output.push(`Total lines: ${chalk.cyan(report.summary.totalLines.toLocaleString())}`)
    output.push(`Languages: ${chalk.cyan(report.summary.languages.join(", "))}`)
    output.push(`Issues found: ${chalk.cyan(report.summary.issueCount)}`)
    output.push("")

    // Severity breakdown
    output.push(chalk.bold.yellow("⚠️  Issue Severity"))
    const { severityBreakdown } = report.summary
    output.push(`${chalk.red("Critical")}: ${severityBreakdown.critical || 0}`)
    output.push(`${chalk.magenta("High")}: ${severityBreakdown.high || 0}`)
    output.push(`${chalk.yellow("Medium")}: ${severityBreakdown.medium || 0}`)
    output.push(`${chalk.green("Low")}: ${severityBreakdown.low || 0}`)
    output.push("")

    // Metrics
    output.push(chalk.bold.yellow("📈 Quality Metrics"))
    output.push(`Code Complexity: ${this.getMetricColor(report.metrics.codeComplexity, true)}`)
    output.push(`Test Coverage: ${this.getMetricColor(report.metrics.testCoverage, false)}%`)
    output.push(`Code Duplication: ${this.getMetricColor(report.metrics.duplicationPercentage, true)}%`)
    output.push(`Maintainability Index: ${this.getMetricColor(report.metrics.maintainabilityIndex, false)}`)
    output.push("")

    // Top issues
    const topIssues = report.issues.slice(0, 10)
    if (topIssues.length > 0) {
      output.push(chalk.bold.yellow("🚨 Top Priority Issues"))
      topIssues.forEach((issue, index) => {
        const severityColor = this.getSeverityColor(issue.severity)
        const typeIcon = this.getTypeIcon(issue.type)

        output.push(`${index + 1}. ${typeIcon} ${severityColor(issue.severity.toUpperCase())} - ${issue.title}`)
        output.push(`   📁 ${chalk.gray(issue.file)}${issue.line ? `:${issue.line}` : ""}`)
        output.push(`   💡 ${chalk.dim(issue.suggestion)}`)
        output.push("")
      })
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      output.push(chalk.bold.yellow("💡 Recommendations"))
      report.recommendations.forEach((rec) => {
        output.push(`• ${rec}`)
      })
      output.push("")
    }

    output.push(chalk.gray(`Generated at: ${new Date(report.timestamp).toLocaleString()}`))

    return output.join("\n")
  }

  generateMarkdownReport(report: QualityReport): string {
    const output: string[] = []

    // Header
    output.push("# 🔍 Code Quality Intelligence Report")
    output.push("")
    output.push(`**Generated:** ${new Date(report.timestamp).toLocaleString()}`)
    output.push("")

    // Summary
    output.push("## 📊 Summary")
    output.push("")
    output.push("| Metric | Value |")
    output.push("|--------|-------|")
    output.push(`| Files Analyzed | ${report.summary.totalFiles} |`)
    output.push(`| Total Lines | ${report.summary.totalLines.toLocaleString()} |`)
    output.push(`| Languages | ${report.summary.languages.join(", ")} |`)
    output.push(`| Issues Found | ${report.summary.issueCount} |`)
    output.push("")

    // Severity breakdown
    output.push("## ⚠️ Issue Severity Breakdown")
    output.push("")
    const { severityBreakdown } = report.summary
    output.push("| Severity | Count |")
    output.push("|----------|-------|")
    output.push(`| 🔴 Critical | ${severityBreakdown.critical || 0} |`)
    output.push(`| 🟠 High | ${severityBreakdown.high || 0} |`)
    output.push(`| 🟡 Medium | ${severityBreakdown.medium || 0} |`)
    output.push(`| 🟢 Low | ${severityBreakdown.low || 0} |`)
    output.push("")

    // Metrics
    output.push("## 📈 Quality Metrics")
    output.push("")
    output.push("| Metric | Score | Status |")
    output.push("|--------|-------|--------|")
    output.push(
      `| Code Complexity | ${report.metrics.codeComplexity}/10 | ${this.getMetricStatus(report.metrics.codeComplexity, true)} |`,
    )
    output.push(
      `| Test Coverage | ${report.metrics.testCoverage}% | ${this.getMetricStatus(report.metrics.testCoverage, false)} |`,
    )
    output.push(
      `| Code Duplication | ${report.metrics.duplicationPercentage}% | ${this.getMetricStatus(report.metrics.duplicationPercentage, true)} |`,
    )
    output.push(
      `| Maintainability Index | ${report.metrics.maintainabilityIndex}/100 | ${this.getMetricStatus(report.metrics.maintainabilityIndex, false)} |`,
    )
    output.push("")

    // Issues by type
    const issuesByType = this.groupIssuesByType(report.issues)
    output.push("## 🔍 Issues by Category")
    output.push("")

    Object.entries(issuesByType).forEach(([type, issues]) => {
      const typeIcon = this.getTypeIcon(type)
      output.push(`### ${typeIcon} ${type.charAt(0).toUpperCase() + type.slice(1)} (${issues.length})`)
      output.push("")

      issues.slice(0, 5).forEach((issue) => {
        output.push(`**${issue.title}** (${issue.severity})`)
        output.push(`- **File:** \`${issue.file}\`${issue.line ? ` (Line ${issue.line})` : ""}`)
        output.push(`- **Description:** ${issue.description}`)
        output.push(`- **Suggestion:** ${issue.suggestion}`)
        output.push(`- **Impact:** ${issue.impact}`)
        output.push(`- **Effort:** ${issue.effort}`)
        output.push("")
      })

      if (issues.length > 5) {
        output.push(`*... and ${issues.length - 5} more ${type} issues*`)
        output.push("")
      }
    })

    // Recommendations
    if (report.recommendations.length > 0) {
      output.push("## 💡 Recommendations")
      output.push("")
      report.recommendations.forEach((rec) => {
        output.push(`- ${rec}`)
      })
      output.push("")
    }

    // Detailed issues
    output.push("## 📋 All Issues")
    output.push("")
    output.push("| Priority | Type | Severity | Title | File | Line |")
    output.push("|----------|------|----------|-------|------|------|")

    report.issues.forEach((issue, index) => {
      const typeIcon = this.getTypeIcon(issue.type)
      output.push(
        `| ${index + 1} | ${typeIcon} ${issue.type} | ${issue.severity} | ${issue.title} | \`${issue.file}\` | ${issue.line || "-"} |`,
      )
    })

    return output.join("\n")
  }

  generateHTMLReport(report: QualityReport): string {
    const markdownContent = this.generateMarkdownReport(report)

    const htmlContent = marked(markdownContent)

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Quality Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 { color: #2c3e50; }
        h1 { border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #ecf0f1; padding-bottom: 5px; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        tr:hover { background-color: #f5f5f5; }
        code {
            background-color: #f1f2f6;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        .metric-good { color: #27ae60; font-weight: bold; }
        .metric-warning { color: #f39c12; font-weight: bold; }
        .metric-danger { color: #e74c3c; font-weight: bold; }
        .severity-critical { color: #e74c3c; font-weight: bold; }
        .severity-high { color: #fd79a8; font-weight: bold; }
        .severity-medium { color: #fdcb6e; font-weight: bold; }
        .severity-low { color: #00b894; font-weight: bold; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        ${htmlContent}
    </div>
</body>
</html>
`
  }

  generateJSONReport(report: QualityReport): string {
    return JSON.stringify(report, null, 2)
  }

  private getSeverityColor(severity: string) {
    switch (severity) {
      case "critical":
        return chalk.red.bold
      case "high":
        return chalk.magenta.bold
      case "medium":
        return chalk.yellow.bold
      case "low":
        return chalk.green.bold
      default:
        return chalk.white
    }
  }

  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      security: "🔒",
      performance: "⚡",
      complexity: "🔧",
      duplication: "📋",
      testing: "🧪",
      documentation: "📚",
      maintainability: "🛠️",
    }
    return icons[type] || "❓"
  }

  private getMetricColor(value: number, isReverse: boolean) {
    const threshold1 = isReverse ? 7 : 30
    const threshold2 = isReverse ? 4 : 70

    if (isReverse) {
      if (value <= threshold2) return chalk.green(value.toString())
      if (value <= threshold1) return chalk.yellow(value.toString())
      return chalk.red(value.toString())
    } else {
      if (value >= threshold2) return chalk.green(value.toString())
      if (value >= threshold1) return chalk.yellow(value.toString())
      return chalk.red(value.toString())
    }
  }

  private getMetricStatus(value: number, isReverse: boolean): string {
    const threshold1 = isReverse ? 7 : 30
    const threshold2 = isReverse ? 4 : 70

    if (isReverse) {
      if (value <= threshold2) return "✅ Good"
      if (value <= threshold1) return "⚠️ Warning"
      return "❌ Poor"
    } else {
      if (value >= threshold2) return "✅ Good"
      if (value >= threshold1) return "⚠️ Warning"
      return "❌ Poor"
    }
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
