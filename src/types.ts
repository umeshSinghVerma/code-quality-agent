export interface CodeFile {
  path: string
  content: string
  language: string
  size: number
}

export interface QualityIssue {
  id: string
  type: "security" | "performance" | "duplication" | "complexity" | "testing" | "documentation" | "maintainability"
  severity: "low" | "medium" | "high" | "critical"
  title: string
  description: string
  file: string
  line?: number
  suggestion: string
  impact: string
  effort: "low" | "medium" | "high"
}

export interface QualityReport {
  summary: {
    totalFiles: number
    totalLines: number
    languages: string[]
    issueCount: number
    severityBreakdown: Record<string, number>
  }
  issues: QualityIssue[]
  metrics: {
    codeComplexity: number
    testCoverage: number
    duplicationPercentage: number
    maintainabilityIndex: number
  }
  recommendations: string[]
  timestamp: string
}

export interface AnalysisConfig {
  includePatterns: string[]
  excludePatterns: string[]
  maxFileSize: number
  languages: string[]
}
