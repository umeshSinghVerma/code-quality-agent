import { GoogleGenerativeAI } from "@google/generative-ai"
import { getGeminiApiKey } from "../config.js"

export class GeminiClient {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor() {
    const apiKey = getGeminiApiKey()
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  }

  async analyzeCode(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error("Gemini API error:", error)
      throw new Error(`Failed to analyze code: ${error}`)
    }
  }

  async askQuestion(context: string, question: string): Promise<string> {
    const prompt = `
Context: You are analyzing a codebase. Here's the relevant information:
${context}

Question: ${question}

Please provide a clear, helpful answer based on the code context provided.
`

    return this.analyzeCode(prompt)
  }

  async generateSummary(analysisData: any): Promise<string> {
    const prompt = `
Based on the following code analysis data, generate a comprehensive summary:

${JSON.stringify(analysisData, null, 2)}

Please provide:
1. Overall code quality assessment
2. Key strengths and weaknesses
3. Priority recommendations
4. Risk assessment

Keep the response clear and actionable for developers.
`

    return this.analyzeCode(prompt)
  }
}
