import type { CodeFile, QualityIssue } from "../types.js"

export class ComplexityAnalyzer {
  analyzeFile(file: CodeFile): QualityIssue[] {
    const issues: QualityIssue[] = []
    const lines = file.content.split("\n")

    issues.push(...this.checkFunctionLength(file, lines))
    issues.push(...this.checkCyclomaticComplexity(file, lines))
    issues.push(...this.checkNestingDepth(file, lines))
    issues.push(...this.checkParameterCount(file, lines))

    return issues
  }

  private checkFunctionLength(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    let currentFunction: { name: string; startLine: number; lineCount: number } | null = null
    let braceCount = 0

    lines.forEach((line, index) => {
      const functionMatch = line.match(/\b(?:function|def|class)\s+(\w+)/)

      if (functionMatch && !currentFunction) {
        currentFunction = {
          name: functionMatch[1],
          startLine: index,
          lineCount: 0,
        }
        braceCount = 0
      }

      if (currentFunction) {
        currentFunction.lineCount++

        // Count braces to detect function end
        braceCount += (line.match(/\{/g) || []).length
        braceCount -= (line.match(/\}/g) || []).length

        if (braceCount <= 0 && currentFunction.lineCount > 1) {
          if (currentFunction.lineCount > 50) {
            issues.push({
              id: `long-function-${currentFunction.startLine}`,
              type: "complexity",
              severity: currentFunction.lineCount > 100 ? "high" : "medium",
              title: "Long Function",
              description: `Function '${currentFunction.name}' is ${currentFunction.lineCount} lines long.`,
              file: file.path,
              line: currentFunction.startLine + 1,
              suggestion: "Break down large functions into smaller, more focused functions.",
              impact: "Long functions are harder to understand, test, and maintain.",
              effort: "medium",
            })
          }
          currentFunction = null
        }
      }
    })

    return issues
  }

  private checkCyclomaticComplexity(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    let currentFunction: { name: string; startLine: number; complexity: number } | null = null
    let braceCount = 0

    lines.forEach((line, index) => {
      const functionMatch = line.match(/\b(?:function|def|class)\s+(\w+)/)

      if (functionMatch && !currentFunction) {
        currentFunction = {
          name: functionMatch[1],
          startLine: index,
          complexity: 1, // Base complexity
        }
        braceCount = 0
      }

      if (currentFunction) {
        // Count complexity-increasing constructs
        const complexityPatterns = /\b(if|else|while|for|switch|case|catch|&&|\|\||\?|try)\b/g
        const matches = line.match(complexityPatterns)
        if (matches) {
          currentFunction.complexity += matches.length
        }

        braceCount += (line.match(/\{/g) || []).length
        braceCount -= (line.match(/\}/g) || []).length

        if (braceCount <= 0 && currentFunction.complexity > 1) {
          if (currentFunction.complexity > 10) {
            issues.push({
              id: `high-complexity-${currentFunction.startLine}`,
              type: "complexity",
              severity: currentFunction.complexity > 20 ? "high" : "medium",
              title: "High Cyclomatic Complexity",
              description: `Function '${currentFunction.name}' has cyclomatic complexity of ${currentFunction.complexity}.`,
              file: file.path,
              line: currentFunction.startLine + 1,
              suggestion:
                "Reduce complexity by extracting methods, using early returns, or simplifying conditional logic.",
              impact: "High complexity makes code harder to understand and test.",
              effort: "high",
            })
          }
          currentFunction = null
        }
      }
    })

    return issues
  }

  private checkNestingDepth(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    let maxDepth = 0
    let currentDepth = 0
    let deepestLine = 0

    lines.forEach((line, index) => {
      // Simple nesting detection
      if (/\{|\bif\b|\bfor\b|\bwhile\b|\btry\b/.test(line)) {
        currentDepth++
        if (currentDepth > maxDepth) {
          maxDepth = currentDepth
          deepestLine = index
        }
      }

      if (line.includes("}")) {
        currentDepth = Math.max(0, currentDepth - 1)
      }
    })

    if (maxDepth > 4) {
      issues.push({
        id: `deep-nesting-${deepestLine}`,
        type: "complexity",
        severity: maxDepth > 6 ? "high" : "medium",
        title: "Deep Nesting",
        description: `Maximum nesting depth of ${maxDepth} detected.`,
        file: file.path,
        line: deepestLine + 1,
        suggestion: "Reduce nesting by using early returns, extracting functions, or guard clauses.",
        impact: "Deep nesting makes code harder to read and understand.",
        effort: "medium",
      })
    }

    return issues
  }

  private checkParameterCount(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []

    lines.forEach((line, index) => {
      const functionMatch = line.match(/\b(?:function|def)\s+(\w+)\s*$$([^)]*)$$/)

      if (functionMatch) {
        const params = functionMatch[2].split(",").filter((p) => p.trim().length > 0)

        if (params.length > 5) {
          issues.push({
            id: `many-parameters-${index}`,
            type: "complexity",
            severity: params.length > 8 ? "high" : "medium",
            title: "Too Many Parameters",
            description: `Function '${functionMatch[1]}' has ${params.length} parameters.`,
            file: file.path,
            line: index + 1,
            suggestion: "Consider using an options object or breaking the function into smaller functions.",
            impact: "Functions with many parameters are harder to use and maintain.",
            effort: "medium",
          })
        }
      }
    })

    return issues
  }
}
