import { readFile, stat } from "fs/promises"
import { join, extname, relative } from "path"
import { glob } from "glob"
import type { CodeFile } from "../types.js"
import { DEFAULT_CONFIG, LANGUAGE_EXTENSIONS } from "../config.js"

export class FileAnalyzer {
  private config = DEFAULT_CONFIG

  async analyzeDirectory(dirPath: string): Promise<CodeFile[]> {
    const files: CodeFile[] = []

    try {
      const pattern = join(dirPath, "**/*")
      const foundFiles = await glob(pattern, {
        ignore: this.config.excludePatterns,
        nodir: true,
      })

      for (const filePath of foundFiles) {
        try {
          const fileStats = await stat(filePath)

          // Skip files that are too large
          if (fileStats.size > this.config.maxFileSize) {
            continue
          }

          const ext = extname(filePath).toLowerCase()
          const language = LANGUAGE_EXTENSIONS[ext]

          if (!language) continue

          const content = await readFile(filePath, "utf-8")
          const relativePath = relative(dirPath, filePath)

          files.push({
            path: relativePath,
            content,
            language,
            size: fileStats.size,
          })
        } catch (error) {
          console.warn(`Skipping file ${filePath}: ${error}`)
        }
      }
    } catch (error) {
      throw new Error(`Failed to analyze directory: ${error}`)
    }

    return files
  }

  async analyzeFile(filePath: string): Promise<CodeFile | null> {
    try {
      const fileStats = await stat(filePath)

      if (fileStats.size > this.config.maxFileSize) {
        throw new Error("File too large")
      }

      const ext = extname(filePath).toLowerCase()
      const language = LANGUAGE_EXTENSIONS[ext]

      if (!language) {
        throw new Error("Unsupported file type")
      }

      const content = await readFile(filePath, "utf-8")

      return {
        path: filePath,
        content,
        language,
        size: fileStats.size,
      }
    } catch (error) {
      return null
    }
  }

  getLanguageStats(files: CodeFile[]): Record<string, number> {
    const stats: Record<string, number> = {}

    for (const file of files) {
      stats[file.language] = (stats[file.language] || 0) + 1
    }

    return stats
  }

  getTotalLines(files: CodeFile[]): number {
    return files.reduce((total, file) => {
      return total + file.content.split("\n").length
    }, 0)
  }
}
