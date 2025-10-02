import type { NextRequest } from "next/server"
import { experimental_transcribe as transcribe } from "ai"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export const maxDuration = 300

async function downloadYouTubeAudio(url: string): Promise<Buffer> {
  // Using ytdl-core to download audio
  const ytdl = await import("ytdl-core")

  if (!ytdl.validateURL(url)) {
    throw new Error("Invalid YouTube URL")
  }

  const info = await ytdl.getInfo(url)
  const audioFormat = ytdl.chooseFormat(info.formats, { quality: "lowestaudio", filter: "audioonly" })

  const chunks: Buffer[] = []
  const stream = ytdl.downloadFromInfo(info, { format: audioFormat })

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { url } = await req.json()

        // Step 1: Download audio
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "downloading" })}\n\n`))
        const audioBuffer = await downloadYouTubeAudio(url)

        // Step 2: Transcribe with Whisper
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "transcribing" })}\n\n`))
        const { text } = await transcribe({
          model: openai.transcription("whisper-1"),
          audio: audioBuffer,
        })

        // Step 3: Clean transcription (remove sponsors and filler)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "cleaning" })}\n\n`))
        const { text: cleanedText } = await generateText({
          model: "openai/gpt-4o",
          prompt: `Remove all sponsor messages, advertisements, promotional content, and unnecessary filler words from this transcription. Keep only the main content and valuable information:\n\n${text}`,
        })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ transcription: cleanedText })}\n\n`))

        // Step 4: Generate Khmer summary
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step: "summarizing" })}\n\n`))
        const { text: khmerSummary } = await generateText({
          model: "openai/gpt-4o",
          prompt: `Create a well-structured summary of the following content in Khmer language. Include main points, key takeaways, and organize it with clear sections:\n\n${cleanedText}`,
        })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ summary: khmerSummary, step: "complete" })}\n\n`))
        controller.close()
      } catch (error) {
        console.error("[v0] Transcription error:", error)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Processing failed" })}\n\n`,
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
