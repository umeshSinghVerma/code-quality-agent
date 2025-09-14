// Main entry point for the application
export { QualityEngine } from "./core/quality-engine.js"
export { ReportGenerator } from "./reports/report-generator.js"
export { ReportExporter } from "./reports/export-utils.js"
export { QASession } from "./interactive/qa-session.js"
export { CLIQAInterface } from "./interactive/cli-qa.js"
export { WebQAInterface } from "./interactive/web-qa.js"
export { FileAnalyzer } from "./utils/file-utils.js"
export { GeminiClient } from "./ai/gemini-client.js"

// Types
export type {
  CodeFile,
  QualityIssue,
  QualityReport,
  AnalysisConfig,
} from "./types.js"

// Default export for easy usage
import { QualityEngine } from "./core/quality-engine.js"
export default QualityEngine
