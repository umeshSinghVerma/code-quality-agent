import { mkdir, rm } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import type { CodeFile } from "../types.js"
import { LANGUAGE_EXTENSIONS } from "../config.js"

export interface GitHubRepo {
  owner: string
  repo: string
  branch?: string
}

export class GitHubFetcher {
  private readonly tempDir: string
  private readonly githubToken?: string

  constructor() {
    this.tempDir = join(tmpdir(), "codeql-github")
    this.githubToken = process.env.GITHUB_TOKEN
  }

  async fetchRepository(repoUrl: string): Promise<CodeFile[]> {
    const repoInfo = this.parseGitHubUrl(repoUrl)
    if (!repoInfo) {
      throw new Error("Invalid GitHub URL")
    }

    const tempPath = join(this.tempDir, `${repoInfo.owner}-${repoInfo.repo}-${Date.now()}`)

    try {
      // Create temp directory
      await mkdir(tempPath, { recursive: true })

      const defaultBranch = await this.getDefaultBranch(repoInfo)
      repoInfo.branch = repoInfo.branch || defaultBranch

      // Fetch repository contents using GitHub API
      const files = await this.fetchRepoContents(repoInfo, tempPath)

      return files
    } finally {
      // Cleanup temp directory
      try {
        await rm(tempPath, { recursive: true, force: true })
      } catch (error) {
        console.warn("Failed to cleanup temp directory:", error)
      }
    }
  }

  private async getDefaultBranch(repoInfo: GitHubRepo): Promise<string> {
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Code-Quality-Agent",
      }

      if (this.githubToken) {
        headers.Authorization = `token ${this.githubToken}`
      }

      const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`, {
        headers,
      })

      if (response.ok) {
        const repoData = await response.json()
        return repoData.default_branch || "main"
      }
    } catch (error) {
      console.warn("Failed to get default branch, using main:", error)
    }
    return "main"
  }

  private parseGitHubUrl(url: string): GitHubRepo | null {
    const patterns = [
      /github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/,
      /github\.com\/([^/]+)\/([^/]+)\.git/,
      /^([^/]+)\/([^/]+)$/, // Simple owner/repo format
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ""),
          branch: match[3] || undefined,
        }
      }
    }

    return null
  }

  private async fetchRepoContents(repoInfo: GitHubRepo, tempPath: string): Promise<CodeFile[]> {
    const files: CodeFile[] = []

    try {
      // Use GitHub API to fetch repository contents
      const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents`

      const contents = await this.fetchDirectoryContents(apiUrl, repoInfo.branch || "main")

      for (const item of contents) {
        if (item.type === "file" && this.isSupportedFile(item.name)) {
          try {
            const fileContent = await this.fetchFileContent(item.download_url)

            files.push({
              path: item.path,
              content: fileContent,
              language: this.getLanguageFromPath(item.name),
              size: item.size || fileContent.length,
            })
          } catch (error) {
            console.warn(`Failed to fetch file ${item.path}:`, error)
          }
        } else if (item.type === "dir" && !this.shouldSkipDirectory(item.name)) {
          // Recursively fetch subdirectory contents
          const subFiles = await this.fetchDirectoryContentsRecursive(
            `${apiUrl}/${item.path}`,
            repoInfo.branch || "main",
            item.path,
          )
          files.push(...subFiles)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to fetch repository: ${message}`)
    }

    return files
  }

  private async fetchDirectoryContents(apiUrl: string, branch: string): Promise<any[]> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Code-Quality-Agent",
    }

    if (this.githubToken) {
      headers.Authorization = `token ${this.githubToken}`
    }

    const response = await fetch(`${apiUrl}?ref=${branch}`, {
      headers,
    })

    if (!response.ok) {
      if (response.status === 404) {
        if (branch === "main") {
          console.log("Trying with master branch...")
          return this.fetchDirectoryContents(apiUrl, "master")
        }
        throw new Error("Repository not found or is private. Make sure the repository exists and is public.")
      }
      if (response.status === 403) {
        const rateLimitReset = response.headers.get("X-RateLimit-Reset")
        const resetTime = rateLimitReset
          ? new Date(Number.parseInt(rateLimitReset) * 1000).toLocaleTimeString()
          : "unknown"
        throw new Error(`GitHub API rate limit exceeded. Try again after ${resetTime}`)
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  private async fetchDirectoryContentsRecursive(apiUrl: string, branch: string, basePath: string): Promise<CodeFile[]> {
    const files: CodeFile[] = []

    try {
      const contents = await this.fetchDirectoryContents(apiUrl, branch)

      for (const item of contents) {
        if (item.type === "file" && this.isSupportedFile(item.name)) {
          try {
            const fileContent = await this.fetchFileContent(item.download_url)

            files.push({
              path: item.path,
              content: fileContent,
              language: this.getLanguageFromPath(item.name),
              size: item.size || fileContent.length,
            })
          } catch (error) {
            console.warn(`Failed to fetch file ${item.path}:`, error)
          }
        } else if (item.type === "dir" && !this.shouldSkipDirectory(item.name)) {
          const subFiles = await this.fetchDirectoryContentsRecursive(
            `${apiUrl}/${item.name}`,
            branch,
            `${basePath}/${item.name}`,
          )
          files.push(...subFiles)
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch directory ${basePath}:`, error)
    }

    return files
  }

  private async fetchFileContent(downloadUrl: string): Promise<string> {
    const headers: Record<string, string> = {
      "User-Agent": "Code-Quality-Agent",
    }

    if (this.githubToken) {
      headers.Authorization = `token ${this.githubToken}`
    }

    const response = await fetch(downloadUrl, {
      headers,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`)
    }

    return response.text()
  }

  private isSupportedFile(filename: string): boolean {
    const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase()
    return ext in LANGUAGE_EXTENSIONS
  }

  private getLanguageFromPath(filename: string): string {
    const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase()
    return LANGUAGE_EXTENSIONS[ext] || "text"
  }

  private shouldSkipDirectory(dirname: string): boolean {
    const skipDirs = [
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      ".nuxt",
      "coverage",
      "__pycache__",
      ".vscode",
      ".idea",
      "vendor",
    ]

    return skipDirs.includes(dirname) || dirname.startsWith(".")
  }
}
