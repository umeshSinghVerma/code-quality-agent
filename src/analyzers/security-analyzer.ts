import type { CodeFile, QualityIssue } from "../types.js"

export class SecurityAnalyzer {
  analyzeFile(file: CodeFile): QualityIssue[] {
    const issues: QualityIssue[] = []
    const lines = file.content.split("\n")

    // Check for common security vulnerabilities
    issues.push(...this.checkSqlInjection(file, lines))
    issues.push(...this.checkXss(file, lines))
    issues.push(...this.checkHardcodedSecrets(file, lines))
    issues.push(...this.checkInsecureRandomness(file, lines))
    issues.push(...this.checkPathTraversal(file, lines))
    issues.push(...this.checkCommandInjection(file, lines))

    return issues
  }

  private checkSqlInjection(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    const sqlPatterns = [
      /query\s*\(\s*['"`][^'"`]*\$\{[^}]+\}[^'"`]*['"`]/i,
      /execute\s*\(\s*['"`][^'"`]*\+[^'"`]*['"`]/i,
      /SELECT\s+.*\+.*FROM/i,
      /INSERT\s+.*\+.*VALUES/i,
    ]

    lines.forEach((line, index) => {
      sqlPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          issues.push({
            id: `sql-injection-${index}`,
            type: "security",
            severity: "critical",
            title: "Potential SQL Injection",
            description: "Dynamic SQL query construction detected. This could lead to SQL injection vulnerabilities.",
            file: file.path,
            line: index + 1,
            suggestion: "Use parameterized queries or prepared statements instead of string concatenation.",
            impact:
              "Attackers could execute arbitrary SQL commands, potentially accessing or modifying sensitive data.",
            effort: "medium",
          })
        }
      })
    })

    return issues
  }

  private checkXss(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    const xssPatterns = [/innerHTML\s*=\s*.*\+/i, /document\.write\s*\(/i, /eval\s*\(/i, /dangerouslySetInnerHTML/i]

    lines.forEach((line, index) => {
      xssPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          issues.push({
            id: `xss-${index}`,
            type: "security",
            severity: "high",
            title: "Potential XSS Vulnerability",
            description: "Dynamic HTML content insertion detected without proper sanitization.",
            file: file.path,
            line: index + 1,
            suggestion: "Sanitize user input before inserting into DOM or use safe DOM manipulation methods.",
            impact: "Attackers could inject malicious scripts that execute in users' browsers.",
            effort: "medium",
          })
        }
      })
    })

    return issues
  }

  private checkHardcodedSecrets(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    const secretPatterns = [
      /(?:password|pwd|pass)\s*[:=]\s*['"`][^'"`]{3,}['"`]/i,
      /(?:api[_-]?key|apikey)\s*[:=]\s*['"`][^'"`]{10,}['"`]/i,
      /(?:secret|token)\s*[:=]\s*['"`][^'"`]{10,}['"`]/i,
      /(?:private[_-]?key)\s*[:=]\s*['"`][^'"`]{20,}['"`]/i,
    ]

    lines.forEach((line, index) => {
      secretPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          issues.push({
            id: `hardcoded-secret-${index}`,
            type: "security",
            severity: "critical",
            title: "Hardcoded Secret Detected",
            description: "Sensitive information appears to be hardcoded in the source code.",
            file: file.path,
            line: index + 1,
            suggestion: "Move secrets to environment variables or secure configuration files.",
            impact: "Exposed credentials could lead to unauthorized access to systems and data.",
            effort: "low",
          })
        }
      })
    })

    return issues
  }

  private checkInsecureRandomness(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    const randomPatterns = [/Math\.random$$$$/i, /Random$$$$/i, /rand$$$$/i]

    lines.forEach((line, index) => {
      randomPatterns.forEach((pattern) => {
        if (pattern.test(line) && /(?:password|token|key|salt|nonce)/i.test(line)) {
          issues.push({
            id: `insecure-random-${index}`,
            type: "security",
            severity: "medium",
            title: "Insecure Random Number Generation",
            description: "Cryptographically weak random number generator used for security-sensitive operations.",
            file: file.path,
            line: index + 1,
            suggestion: "Use cryptographically secure random number generators for security-sensitive operations.",
            impact: "Predictable random values could be exploited by attackers.",
            effort: "low",
          })
        }
      })
    })

    return issues
  }

  private checkPathTraversal(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    const pathPatterns = [/readFile\s*\(\s*.*\+/i, /writeFile\s*\(\s*.*\+/i, /path\.join\s*\(\s*.*req\./i, /\.\.\//]

    lines.forEach((line, index) => {
      pathPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          issues.push({
            id: `path-traversal-${index}`,
            type: "security",
            severity: "high",
            title: "Potential Path Traversal",
            description: "File path construction using user input without proper validation.",
            file: file.path,
            line: index + 1,
            suggestion: "Validate and sanitize file paths, use allowlists for permitted directories.",
            impact: "Attackers could access files outside the intended directory structure.",
            effort: "medium",
          })
        }
      })
    })

    return issues
  }

  private checkCommandInjection(file: CodeFile, lines: string[]): QualityIssue[] {
    const issues: QualityIssue[] = []
    const commandPatterns = [/exec\s*\(\s*.*\+/i, /spawn\s*\(\s*.*\+/i, /system\s*\(\s*.*\+/i, /shell_exec\s*\(/i]

    lines.forEach((line, index) => {
      commandPatterns.forEach((pattern) => {
        if (pattern.test(line)) {
          issues.push({
            id: `command-injection-${index}`,
            type: "security",
            severity: "critical",
            title: "Potential Command Injection",
            description: "System command execution with user-controlled input detected.",
            file: file.path,
            line: index + 1,
            suggestion:
              "Avoid executing system commands with user input. If necessary, use parameterized commands and input validation.",
            impact: "Attackers could execute arbitrary system commands on the server.",
            effort: "high",
          })
        }
      })
    })

    return issues
  }
}
