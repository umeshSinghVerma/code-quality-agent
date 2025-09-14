import type { CodeFile } from "../types.js"

export interface CodeMetrics {
  linesOfCode: number
  cyclomaticComplexity: number
  functionCount: number
  classCount: number
  commentLines: number
  duplicateBlocks: DuplicateBlock[]
  imports: string[]
  exports: string[]
}

export interface DuplicateBlock {
  startLine: number
  endLine: number
  content: string
  duplicateIn: string[]
}

export class CodeParser {
  parseFile(file: CodeFile): CodeMetrics {
    const lines = file.content.split("\n")

    return {
      linesOfCode: this.countLinesOfCode(lines),
      cyclomaticComplexity: this.calculateComplexity(file.content, file.language),
      functionCount: this.countFunctions(file.content, file.language),
      classCount: this.countClasses(file.content, file.language),
      commentLines: this.countCommentLines(lines, file.language),
      duplicateBlocks: this.findDuplicateBlocks(file.content),
      imports: this.extractImports(file.content, file.language),
      exports: this.extractExports(file.content, file.language),
    }
  }

  private countLinesOfCode(lines: string[]): number {
    return lines.filter((line) => {
      const trimmed = line.trim()
      return trimmed.length > 0 && !trimmed.startsWith("//") && !trimmed.startsWith("/*")
    }).length
  }

  private calculateComplexity(content: string, language: string): number {
    // Simplified cyclomatic complexity calculation
    const complexityPatterns = {
      javascript: /\b(if|else|while|for|switch|case|catch|&&|\|\||\?)\b/g,
      typescript: /\b(if|else|while|for|switch|case|catch|&&|\|\||\?)\b/g,
      python: /\b(if|elif|else|while|for|try|except|and|or)\b/g,
      java: /\b(if|else|while|for|switch|case|catch|&&|\|\||\?)\b/g,
      cpp: /\b(if|else|while|for|switch|case|catch|&&|\|\||\?)\b/g,
    }

    const pattern = complexityPatterns[language as keyof typeof complexityPatterns]
    if (!pattern) return 1

    const matches = content.match(pattern)
    return (matches?.length || 0) + 1
  }

  private countFunctions(content: string, language: string): number {
    const functionPatterns = {
      javascript:
        /\b(function\s+\w+|const\s+\w+\s*=\s*$$|let\s+\w+\s*=\s*\(|var\s+\w+\s*=\s*\(|\w+\s*:\s*function|\w+\s*\([^)]*$$\s*{)/g,
      typescript: /\b(function\s+\w+|const\s+\w+\s*=\s*$$|let\s+\w+\s*=\s*\(|\w+\s*:\s*function|\w+\s*\([^)]*$$\s*{)/g,
      python: /\bdef\s+\w+\s*\(/g,
      java: /\b(public|private|protected|static)?\s*(static\s+)?\w+\s+\w+\s*$$[^)]*$$\s*{/g,
      cpp: /\b\w+\s+\w+\s*$$[^)]*$$\s*{/g,
    }

    const pattern = functionPatterns[language as keyof typeof functionPatterns]
    if (!pattern) return 0

    const matches = content.match(pattern)
    return matches?.length || 0
  }

  private countClasses(content: string, language: string): number {
    const classPatterns = {
      javascript: /\bclass\s+\w+/g,
      typescript: /\bclass\s+\w+/g,
      python: /\bclass\s+\w+/g,
      java: /\bclass\s+\w+/g,
      cpp: /\bclass\s+\w+/g,
    }

    const pattern = classPatterns[language as keyof typeof classPatterns]
    if (!pattern) return 0

    const matches = content.match(pattern)
    return matches?.length || 0
  }

  private countCommentLines(lines: string[], language: string): number {
    const commentPatterns = {
      javascript: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      typescript: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      python: [/^\s*#/],
      java: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
      cpp: [/^\s*\/\//, /^\s*\/\*/, /^\s*\*/],
    }

    const patterns = commentPatterns[language as keyof typeof commentPatterns] || []

    return lines.filter((line) => {
      return patterns.some((pattern) => pattern.test(line))
    }).length
  }

  private findDuplicateBlocks(content: string): DuplicateBlock[] {
    // Simplified duplicate detection - look for identical blocks of 5+ lines
    const lines = content.split("\n")
    const duplicates: DuplicateBlock[] = []
    const minBlockSize = 5

    for (let i = 0; i < lines.length - minBlockSize; i++) {
      const block = lines.slice(i, i + minBlockSize).join("\n")
      const blockContent = block.trim()

      if (blockContent.length < 50) continue // Skip small blocks

      for (let j = i + minBlockSize; j < lines.length - minBlockSize; j++) {
        const compareBlock = lines.slice(j, j + minBlockSize).join("\n")

        if (blockContent === compareBlock.trim()) {
          duplicates.push({
            startLine: i + 1,
            endLine: i + minBlockSize,
            content: blockContent,
            duplicateIn: [`Line ${j + 1}-${j + minBlockSize}`],
          })
        }
      }
    }

    return duplicates
  }

  private extractImports(content: string, language: string): string[] {
    const importPatterns = {
      javascript: /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
      typescript: /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
      python: /(?:from\s+(\S+)\s+import|import\s+(\S+))/g,
      java: /import\s+([^;]+);/g,
      cpp: /#include\s*[<"]([^>"]+)[>"]/g,
    }

    const pattern = importPatterns[language as keyof typeof importPatterns]
    if (!pattern) return []

    const imports: string[] = []
    let match

    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1] || match[2] || match[0])
    }

    return imports
  }

  private extractExports(content: string, language: string): string[] {
    const exportPatterns = {
      javascript: /export\s+(?:default\s+)?(?:class|function|const|let|var)?\s*(\w+)/g,
      typescript: /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)?\s*(\w+)/g,
      python: /^def\s+(\w+)|^class\s+(\w+)/gm,
      java: /public\s+(?:class|interface)\s+(\w+)/g,
      cpp: /^(?:class|struct)\s+(\w+)/gm,
    }

    const pattern = exportPatterns[language as keyof typeof exportPatterns]
    if (!pattern) return []

    const exports: string[] = []
    let match

    while ((match = pattern.exec(content)) !== null) {
      exports.push(match[1] || match[2])
    }

    return exports
  }
}
