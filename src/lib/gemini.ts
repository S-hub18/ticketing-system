import { GoogleGenAI } from "@google/genai"
import { prisma } from "@/lib/prisma"
import { AgentType } from "@/generated/prisma/client"

// gemini-2.0-flash is quota-exhausted/deprecated on the free tier (returns 429).
// 3.1-flash-lite is the current fast/cheap model with available quota.
export const GEMINI_MODEL = "gemini-3.1-flash-lite"

// Thrown when the model is rate-limited even after retries, so routes can return
// a clear "try again shortly" message instead of a generic 503.
export class RateLimitError extends Error {
  constructor(message = "The AI assistant is busy right now. Please try again in a moment.") {
    super(message)
    this.name = "RateLimitError"
  }
}

// Strip a ```json … ``` (or bare ``` … ```) markdown fence the model may wrap JSON in.
function stripJsonFence(text: string): string {
  const trimmed = text.trim()
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return (fence ? fence[1] : trimmed).trim()
}

// Gemini's functionResponse.response must be a JSON object. Wrap arrays/primitives
// (and null) so the proto Struct serialization doesn't reject them.
function toStruct(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return { result: value }
}

function is429(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err)
  return (err as any)?.status === 429 || msg.includes('"code":429') || msg.includes("RESOURCE_EXHAUSTED")
}

// The free tier enforces a per-minute request cap, and each agentic run fires
// several calls. Retry transient 429s, honouring the server's retryDelay hint.
async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  maxRetries = 4,
) {
  let lastErr: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params)
    } catch (err) {
      lastErr = err
      if (!is429(err) || attempt === maxRetries) break
      const msg = String((err as any)?.message ?? err)
      const hinted = msg.match(/retryDelay"?:\s*"?(\d+(?:\.\d+)?)s/)
      const delaySec = hinted ? parseFloat(hinted[1]) + 0.5 : Math.min(2 ** attempt, 16)
      await new Promise((r) => setTimeout(r, delaySec * 1000))
    }
  }
  if (is429(lastErr)) throw new RateLimitError()
  throw lastErr
}

export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface AgentRunStep {
  stepIndex: number
  toolName: string
  toolInput: unknown
  toolOutput: unknown
}

export async function runAgent<T>({
  systemPrompt,
  userMessage,
  tools,
  toolHandlers,
  agentType,
  ticketId,
  userId,
}: {
  systemPrompt: string
  userMessage: string
  tools: AgentTool[]
  toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>>
  agentType: AgentType
  ticketId?: string
  userId?: string
}): Promise<{ result: T; steps: AgentRunStep[] }> {
  const startTime = performance.now()
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

  const functionDeclarations = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }))

  const contents: any[] = [{ role: "user", parts: [{ text: userMessage }] }]
  const steps: AgentRunStep[] = []
  let stepIndex = 0

  let response = await generateWithRetry(ai, {
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: systemPrompt,
      tools: tools.length > 0 ? [{ functionDeclarations }] : undefined,
    },
  })

  // Agentic loop
  while (response.functionCalls && response.functionCalls.length > 0) {
    const toolResults: any[] = []
    for (const call of response.functionCalls) {
      const handler = call.name ? toolHandlers[call.name] : undefined
      const output = handler
        ? await handler(call.args as Record<string, unknown>)
        : { error: "Tool not found" }
      steps.push({ stepIndex: stepIndex++, toolName: call.name ?? "", toolInput: call.args, toolOutput: output })
      toolResults.push({ name: call.name ?? "", response: output })
    }
    contents.push({ role: "model", parts: response.candidates?.[0]?.content?.parts ?? [] })
    contents.push({
      role: "user",
      parts: toolResults.map((r) => ({
        // Gemini's functionResponse.response must be a JSON object (Struct).
        // Tools that return an array or primitive must be wrapped, or the API
        // rejects the request with "Proto field is not repeating, cannot start list".
        functionResponse: { name: r.name, response: toStruct(r.response) },
      })),
    })
    response = await generateWithRetry(ai, {
      model: GEMINI_MODEL,
      contents,
      config: { systemInstruction: systemPrompt, tools: [{ functionDeclarations }] },
    })
  }

  const finalOutput = response.text ?? ""
  const latencyMs = Math.round(performance.now() - startTime)

  if (steps.length > 0) {
    await Promise.all(
      steps.map((step) =>
        prisma.agentRun.create({
          data: {
            ticketId, userId, agentType,
            stepIndex: step.stepIndex,
            toolName: step.toolName,
            toolInput: JSON.stringify(step.toolInput),
            toolOutput: JSON.stringify(step.toolOutput),
            finalOutput, totalSteps: steps.length, latencyMs,
            modelId: GEMINI_MODEL,
          },
        })
      )
    )
  } else {
    await prisma.agentRun.create({
      data: { ticketId, userId, agentType, finalOutput, totalSteps: 0, latencyMs, modelId: GEMINI_MODEL },
    })
  }

  // Gemini often wraps JSON in a ```json … ``` markdown fence despite instructions.
  let result: T
  try { result = JSON.parse(stripJsonFence(finalOutput)) as T }
  catch { result = { raw: finalOutput } as unknown as T }

  return { result, steps }
}
