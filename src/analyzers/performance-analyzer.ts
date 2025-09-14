import type { CodeFile, QualityIssue } from "../types.js"

export class PerformanceAnalyzer {
  analyzeFile(file: CodeFile): QualityIssue[] {
    const issues: QualityIssue[] = []
    const lines = file.content.split("\n")

    issues.push(...this.checkNestedLoops(file, lines))
    issues.push(...this.checkInefficientQueries(file, lines))
    issues.push(...this.checkMemoryLeaks(file, lines))
    issues.push(...this.checkSynchronousOperations(file, lines))
    issues.push(...this.checkLargeDataStructures(file, lines))

    return issues
  }

  private checkNestedLoops(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    let nestedLevel = 0
    const loopStack: number[] = []

    lines.forEach((line, index) => {
      const loopPattern = /\b(for|while|forEach|map|filter|reduce)\b/i

      if (loopPattern.test(line)) {
        nestedLevel++
        loopStack.push(index)

        if (nestedLevel >= 3) {
          issues.push({
            id: `nested-loops-${index}`,
            type: "performance",
            severity: "medium",
            title: "Deeply Nested Loops",
            description: `Found ${nestedLevel} levels of nested loops, which can cause O(n^${nestedLevel}) complexity.`,
            file: file.path,
            line: index + 1,
            suggestion: "Consider optimizing with better algorithms, caching, or breaking down into smaller functions.",
            impact: "Poor performance with large datasets, potential for exponential time complexity.",
            effort: "high",
          })
        }
      }

      // Simple heuristic for loop end (closing brace)
      if (line.trim() === "}" && loopStack.length > 0) {
        loopStack.pop()
        nestedLevel = Math.max(0, nestedLevel - 1)
      }
    })

    return issues
  }

  private checkInefficientQueries(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    const inefficientPatterns = [
      /SELECT\s+\*\s+FROM/i,
      /\.find$$$$\s*\.find\(/i,
      /\.filter$$$$\s*\.filter\(/i,
      /for.*in.*for.*in/i,
    ]

    lines.forEach((line, index) => {
      inefficientPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          issues.push({
            id: `inefficient-query-${index}`,
            type: "performance",
            severity: "medium",
            title: "Inefficient Query Pattern",
            description: "Detected potentially inefficient data access pattern.",
            file: file.path,
            line: index + 1,
            suggestion: "Optimize queries by selecting specific fields, using indexes, or combining operations.",
            impact: "Slower query execution and increased resource usage.",
            effort: "medium",
          })
        }
      })
    })

    return issues
  }

  private checkMemoryLeaks(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    const memoryLeakPatterns = [
      /setInterval\s*\(/i,
      /addEventListener\s*\(/i,
      /new\s+Array\s*$$\s*\d{6,}\s*$$/i,
      /global\./i,
    ]

    lines.forEach((line, index) => {
      memoryLeakPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          let severity: "low" | "medium" | "high" = "low"
          let title = "Potential Memory Leak"
          let suggestion = "Ensure proper cleanup of resources."

          if (/setInterval|addEventListener/.test(line)) {
            severity = "medium"
            title = "Event Listener/Timer Not Cleaned Up"
            suggestion = "Add corresponding clearInterval/removeEventListener calls."
          }

          issues.push({
            id: `memory-leak-${index}`,
            type: "performance",
            severity,
            title,
            description: "Code pattern that could lead to memory leaks detected.",
            file: file.path,
            line: index + 1,
            suggestion,
            impact: "Gradual memory consumption increase, potential application crashes.",
            effort: "low",
          })
        }
      })
    })

    return issues
  }

  private checkSynchronousOperations(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    const syncPatterns = [/readFileSync\s*\(/i, /writeFileSync\s*\(/i, /execSync\s*\(/i, /\.sync$$$$/i]

    lines.forEach((line, index) => {
      syncPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          issues.push({
            id: `sync-operation-${index}`,
            type: "performance",
            severity: "medium",
            title: "Synchronous Operation",
            description: "Blocking synchronous operation detected that could freeze the application.",
            file: file.path,
            line: index + 1,
            suggestion: "Replace with asynchronous alternatives using async/await or promises.",
            impact: "Application blocking, poor user experience, reduced throughput.",
            effort: "medium",
          })
        }
      })
    })

    return issues
  }

  private checkLargeDataStructures(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []

    lines.forEach((line, index) => {
      // Check for large array/object literals
      const arrayMatch = line.match(/\[([^\]]{200,})\]/)
      const objectMatch = line.match(/\{([^}]{200,})\}/)

      if (arrayMatch || objectMatch) {
        issues.push({
          id: `large-data-structure-${index}`,
          type: "performance",
          severity: "low",
          title: "Large Data Structure",
          description: "Large inline data structure detected that could impact performance.",
          file: file.path,
          line: index + 1,
          suggestion: "Consider loading data from external files or using lazy loading.",
          impact: "Increased memory usage and slower initial load times.",
          effort: "medium",
        })
      }
    })

    return issues
  }
}
