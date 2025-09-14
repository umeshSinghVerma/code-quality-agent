import type { QualityReport, CodeFile } from "../types.js"
import { QASession } from "./qa-session.js"

export interface WebQAResponse {
  answer: string
  suggestions: string[]
  conversationId: string
  timestamp: string
}

export class WebQAInterface {
  private sessions: Map<string, QASession> = new Map()

  createSession(sessionId: string, report: QualityReport, files: CodeFile[]): void {
    const session = new QASession(report, files)
    this.sessions.set(sessionId, session)
  }

  async askQuestion(sessionId: string, question: string): Promise<WebQAResponse> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error("Session not found")
    }

    const answer = await session.askQuestion(question)
    const suggestions = session.getSuggestedQuestions()

    return {
      answer,
      suggestions,
      conversationId: sessionId,
      timestamp: new Date().toISOString(),
    }
  }

  getSuggestions(sessionId: string): string[] {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error("Session not found")
    }

    return session.getSuggestedQuestions()
  }

  getHistory(sessionId: string): Array<{ question: string; answer: string }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error("Session not found")
    }

    return session.getConversationHistory()
  }

  clearSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.clearHistory()
    }
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  // Cleanup old sessions (call periodically)
  cleanupOldSessions(maxAgeHours = 24): void {
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000

    // Simple cleanup - in a real app, you'd track session creation times
    if (this.sessions.size > 100) {
      const sessionsToDelete = Array.from(this.sessions.keys()).slice(0, 50)
      sessionsToDelete.forEach((sessionId) => {
        this.sessions.delete(sessionId)
      })
    }
  }
}
