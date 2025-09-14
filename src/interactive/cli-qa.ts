import inquirer from "inquirer"
import chalk from "chalk"
import type { QualityReport, CodeFile } from "../types.js"
import { QASession } from "./qa-session.js"

export class CLIQAInterface {
  private qaSession: QASession

  constructor(report: QualityReport, files: CodeFile[]) {
    this.qaSession = new QASession(report, files)
  }

  async startInteractiveSession(): Promise<void> {
    console.log(chalk.bold.blue("\n🤖 Interactive Q&A Session"))
    console.log(chalk.gray("Ask questions about your codebase. Type 'exit' to quit, 'help' for suggestions."))
    console.log(chalk.gray("=".repeat(60)))

    while (true) {
      try {
        const { question } = await inquirer.prompt<{ question: string }>([
          {
            type: "input",
            name: "question",
            message: chalk.cyan("Your question:"),
            validate: (input: string) => {
              if (!input.trim()) {
                return "Please enter a question"
              }
              return true
            },
          },
        ])

        const trimmedQuestion = question.trim().toLowerCase()

        // Handle special commands
        if (trimmedQuestion === "exit" || trimmedQuestion === "quit") {
          console.log(chalk.yellow("\n👋 Thanks for using Code Quality Intelligence Agent!"))
          break
        }

        if (trimmedQuestion === "help" || trimmedQuestion === "suggestions") {
          this.showSuggestedQuestions()
          continue
        }

        if (trimmedQuestion === "history") {
          this.showConversationHistory()
          continue
        }

        if (trimmedQuestion === "clear") {
          this.qaSession.clearHistory()
          console.log(chalk.green("✅ Conversation history cleared"))
          continue
        }

        // Process the question
        console.log(chalk.dim("\n🤔 Thinking..."))

        const answer = await this.qaSession.askQuestion(question)

        console.log(chalk.bold.green("\n🤖 Answer:"))
        console.log(this.formatAnswer(answer))
        console.log("")
      } catch (error) {
        if ((error as any)?.name === "ExitPromptError") {
          console.log(chalk.yellow("\n👋 Session ended"))
          break
        }
        console.error(chalk.red("Error:"), error instanceof Error ? error.message : String(error))
      }
    }
  }

  private showSuggestedQuestions(): void {
    const suggestions = this.qaSession.getSuggestedQuestions()

    console.log(chalk.bold.yellow("\n💡 Suggested Questions:"))
    suggestions.forEach((suggestion, index) => {
      console.log(chalk.dim(`${index + 1}.`), suggestion)
    })
    console.log("")
  }

  private showConversationHistory(): void {
    const history = this.qaSession.getConversationHistory()

    if (history.length === 0) {
      console.log(chalk.dim("\n📝 No conversation history yet"))
      return
    }

    console.log(chalk.bold.yellow("\n📝 Conversation History:"))
    history.forEach(({ question, answer }, index) => {
      console.log(chalk.cyan(`\nQ${index + 1}: ${question}`))
      console.log(chalk.green(`A${index + 1}: ${answer.slice(0, 150)}${answer.length > 150 ? "..." : ""}`))
    })
    console.log("")
  }

  private formatAnswer(answer: string): string {
    // Simple formatting to make answers more readable
    const lines = answer.split("\n")
    const formattedLines = lines.map((line) => {
      const trimmed = line.trim()

      // Highlight bullet points
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        return chalk.dim("  ") + chalk.white(trimmed)
      }

      // Highlight numbered lists
      if (/^\d+\./.test(trimmed)) {
        return chalk.dim("  ") + chalk.white(trimmed)
      }

      // Highlight code snippets (simple detection)
      if (trimmed.includes("`") || trimmed.includes("()") || trimmed.includes("{}")) {
        return chalk.dim("  ") + chalk.cyan(trimmed)
      }

      return chalk.dim("  ") + trimmed
    })

    return formattedLines.join("\n")
  }

  async askSingleQuestion(question: string): Promise<string> {
    console.log(chalk.dim("🤔 Processing question..."))
    const answer = await this.qaSession.askQuestion(question)
    return answer
  }
}
