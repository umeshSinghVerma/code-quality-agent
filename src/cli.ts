#!/usr/bin/env node

import { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import { existsSync, statSync } from "fs"
import { resolve } from "path"
import { QualityEngine } from "./core/quality-engine.js"
import { ReportGenerator } from "./reports/report-generator.js"
import { ReportExporter } from "./reports/export-utils.js"
import { CLIQAInterface } from "./interactive/cli-qa.js"
import { FileAnalyzer } from "./utils/file-utils.js"

const program = new Command()

program.name("codeql").description("AI-powered Code Quality Intelligence Agent").version("1.0.0")

program
  .command("analyze")
  .description("Analyze a codebase for quality issues")
  .argument("<path>", "Path to a code file or directory")
  .option("-o, --output <path>", "Output directory for reports")
  .option("-f, --format <format>", "Report format (console|html|markdown|json|all)", "console")
  .option("-i, --interactive", "Start interactive Q&A session after analysis")
  .option("-q, --question <question>", "Ask a specific question about the code")
  .option("--no-ai", "Skip AI-powered analysis (faster but less comprehensive)")
  .action(async (codePath: string, options) => {
    const spinner = ora("Initializing analysis...").start()

    try {
      // Validate input path
      const fullPath = resolve(codePath)
      if (!existsSync(fullPath)) {
        spinner.fail(chalk.red(`Path does not exist: ${codePath}`))
        process.exit(1)
      }

      // Check for API key (honor --no-ai). Commander sets options.ai to false when --no-ai is provided
      if (!process.env.GEMINI_API_KEY && options.ai !== false) {
        spinner.fail(chalk.red("GEMINI_API_KEY environment variable is required"))
        console.log(chalk.yellow("Get your free API key from: https://makersuite.google.com/app/apikey"))
        console.log(chalk.dim("Or use --no-ai flag to skip AI analysis"))
        process.exit(1)
      }

      // Determine if path is a file or directory
      const isFile = statSync(fullPath).isFile()

      spinner.text = isFile ? "Analyzing file..." : "Analyzing codebase..."

      const engine = new QualityEngine()
      let report

      if (isFile) {
        const fileAnalyzer = new FileAnalyzer()
        const codeFile = await fileAnalyzer.analyzeFile(fullPath)
        if (!codeFile) {
          spinner.fail(chalk.red("Unsupported or unreadable file"))
          process.exit(1)
        }
        report = await engine.analyzeFiles([codeFile])
      } else {
        report = await engine.analyzeDirectory(fullPath)
      }

      spinner.succeed(chalk.green("Analysis complete!"))

      // Generate and display report
      const reportGenerator = new ReportGenerator()

      if (options.format === "console" || options.format === "all") {
        const consoleReport = reportGenerator.generateConsoleReport(report)
        console.log(consoleReport)
      }

      // Export reports if requested
      if (options.output || options.format !== "console") {
        const exporter = new ReportExporter()
        const outputDir = options.output || "./reports"

        spinner.start("Generating reports...")

        if (options.format === "all") {
          const exportedFiles = await exporter.exportAllFormats(report, outputDir)
          spinner.succeed(chalk.green(`Reports exported to: ${exportedFiles.join(", ")}`))
        } else if (options.format !== "console") {
          const exportedFile = await exporter.exportReport(report, `${outputDir}/report`, options.format)
          spinner.succeed(chalk.green(`Report exported to: ${exportedFile}`))
        }
      }

      // Handle specific question
      if (options.question) {
        const fileAnalyzer = new FileAnalyzer()
        let files
        if (statSync(fullPath).isFile()) {
          const single = await fileAnalyzer.analyzeFile(fullPath)
          files = single ? [single] : []
        } else {
          files = await fileAnalyzer.analyzeDirectory(fullPath)
        }
        const qaInterface = new CLIQAInterface(report, files)

        console.log(chalk.bold.blue("\n🤖 Answering your question..."))
        const answer = await qaInterface.askSingleQuestion(options.question)
        console.log(chalk.bold.green("\n🤖 Answer:"))
        console.log(answer)
      }

      // Start interactive session if requested
      if (options.interactive && !options.question) {
        const fileAnalyzer = new FileAnalyzer()
        const files = await fileAnalyzer.analyzeDirectory(fullPath)
        const qaInterface = new CLIQAInterface(report, files)
        await qaInterface.startInteractiveSession()
      }
    } catch (error) {
      spinner.fail(chalk.red("Analysis failed"))
      const message = error instanceof Error ? error.message : String(error)
      console.error(chalk.red("Error:"), message)

      if (message.includes("GEMINI_API_KEY")) {
        console.log(chalk.yellow("\nTip: Get your free Gemini API key from:"))
        console.log(chalk.cyan("https://makersuite.google.com/app/apikey"))
      }

      process.exit(1)
    }
  })

program
  .command("interactive")
  .description("Start interactive Q&A session for a previously analyzed codebase")
  .argument("<path>", "Path to the codebase directory")
  .action(async (codePath: string) => {
    const spinner = ora("Loading codebase...").start()

    try {
      const fullPath = resolve(codePath)
      if (!existsSync(fullPath)) {
        spinner.fail(chalk.red(`Path does not exist: ${codePath}`))
        process.exit(1)
      }

      if (!process.env.GEMINI_API_KEY) {
        spinner.fail(chalk.red("GEMINI_API_KEY environment variable is required"))
        process.exit(1)
      }

      // Quick analysis for Q&A context
      const engine = new QualityEngine()
      const report = await engine.analyzeDirectory(fullPath)

      const fileAnalyzer = new FileAnalyzer()
      const files = await fileAnalyzer.analyzeDirectory(fullPath)

      spinner.succeed(chalk.green("Codebase loaded!"))

      const qaInterface = new CLIQAInterface(report, files)
      await qaInterface.startInteractiveSession()
    } catch (error) {
      spinner.fail(chalk.red("Failed to load codebase"))
      const message = error instanceof Error ? error.message : String(error)
      console.error(chalk.red("Error:"), message)
      process.exit(1)
    }
  })

program
  .command("quick")
  .description("Quick analysis with summary only (no detailed report)")
  .argument("<path>", "Path to the codebase directory")
  .action(async (codePath: string) => {
    const spinner = ora("Running quick analysis...").start()

    try {
      const fullPath = resolve(codePath)
      if (!existsSync(fullPath)) {
        spinner.fail(chalk.red(`Path does not exist: ${codePath}`))
        process.exit(1)
      }

      const engine = new QualityEngine()
      const report = await engine.analyzeDirectory(fullPath)

      spinner.succeed(chalk.green("Quick analysis complete!"))

      // Show only summary
      const exporter = new ReportExporter()
      const summary = exporter.generateSummaryStats(report)
      console.log(summary)

      // Show top 3 critical issues
      const criticalIssues = report.issues.filter((issue) => issue.severity === "critical").slice(0, 3)
      if (criticalIssues.length > 0) {
        console.log(chalk.bold.red("\n🚨 Critical Issues:"))
        criticalIssues.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue.title} (${issue.file})`)
          console.log(`   ${chalk.dim(issue.suggestion)}`)
        })
      }
    } catch (error) {
      spinner.fail(chalk.red("Quick analysis failed"))
      const message = error instanceof Error ? error.message : String(error)
      console.error(chalk.red("Error:"), message)
      process.exit(1)
    }
  })

program
  .command("config")
  .description("Show configuration and setup information")
  .action(() => {
    console.log(chalk.bold.blue("🔧 Code Quality Intelligence Agent Configuration"))
    console.log("")

    console.log(chalk.yellow("Environment Variables:"))
    console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? chalk.green("✓ Set") : chalk.red("✗ Not set")}`)
    console.log("")

    console.log(chalk.yellow("Supported Languages:"))
    const languages = ["JavaScript", "TypeScript", "Python", "Java", "C/C++", "C#", "PHP", "Ruby", "Go", "Rust"]
    languages.forEach((lang) => {
      console.log(`• ${lang}`)
    })
    console.log("")

    console.log(chalk.yellow("Analysis Categories:"))
    const categories = [
      "Security vulnerabilities",
      "Performance issues",
      "Code complexity",
      "Code duplication",
      "Testing gaps",
      "Documentation issues",
      "Maintainability concerns",
    ]
    categories.forEach((cat) => {
      console.log(`• ${cat}`)
    })
    console.log("")

    if (!process.env.GEMINI_API_KEY) {
      console.log(chalk.red("⚠️  Setup Required:"))
      console.log("1. Get a free Gemini API key: https://makersuite.google.com/app/apikey")
      console.log("2. Set environment variable: export GEMINI_API_KEY='your-key-here'")
      console.log("3. Run analysis: codeql analyze /path/to/your/code")
    } else {
      console.log(chalk.green("✅ Ready to analyze code!"))
      console.log("Run: codeql analyze /path/to/your/code")
    }
  })

// Error handling
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name(),
})

program.on("command:*", () => {
  console.error(chalk.red("Invalid command: %s"), program.args.join(" "))
  console.log(chalk.yellow("See 'codeql --help' for available commands"))
  process.exit(1)
})

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error(chalk.red("Uncaught error:"), error.message)
  process.exit(1)
})

process.on("unhandledRejection", (reason) => {
  console.error(chalk.red("Unhandled rejection:"), reason)
  process.exit(1)
})

program.parse()
