import type { AnalysisConfig } from "./types.js"

export const DEFAULT_CONFIG: AnalysisConfig = {
  includePatterns: [
    "**/*.js",
    "**/*.ts",
    "**/*.jsx",
    "**/*.tsx",
    "**/*.py",
    "**/*.java",
    "**/*.cpp",
    "**/*.c",
    "**/*.cs",
    "**/*.php",
    "**/*.rb",
    "**/*.go",
    "**/*.rs",
    "**/*.swift",
    "**/*.kt",
  ],
  excludePatterns: [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".git/**",
    "**/*.min.js",
    "**/*.bundle.js",
    "coverage/**",
    ".next/**",
    ".nuxt/**",
    "vendor/**",
    "__pycache__/**",
    "*.pyc",
    ".vscode/**",
    ".idea/**",
  ],
  maxFileSize: 1024 * 1024, // 1MB
  languages: ["javascript", "typescript", "python", "java", "cpp", "csharp", "php", "ruby", "go", "rust"],
}

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".java": "java",
  ".cpp": "cpp",
  ".c": "cpp",
  ".cs": "csharp",
  ".php": "php",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".swift": "swift",
  ".kt": "kotlin",
}

export const getGeminiApiKey = (): string => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required")
  }
  return apiKey
}
