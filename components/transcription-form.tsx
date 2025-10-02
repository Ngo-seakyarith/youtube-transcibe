"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, FileText, Languages } from "lucide-react"

type ProcessingStep = "idle" | "downloading" | "transcribing" | "cleaning" | "summarizing" | "complete"

export function TranscriptionForm() {
  const [url, setUrl] = useState("")
  const [step, setStep] = useState<ProcessingStep>("idle")
  const [transcription, setTranscription] = useState("")
  const [khmerSummary, setKhmerSummary] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setTranscription("")
    setKhmerSummary("")

    if (!url.trim()) {
      setError("Please enter a YouTube URL")
      return
    }

    try {
      setStep("downloading")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to process video")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error("No response stream")

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6))

            if (data.step) setStep(data.step)
            if (data.transcription) setTranscription(data.transcription)
            if (data.summary) setKhmerSummary(data.summary)
            if (data.error) throw new Error(data.error)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setStep("idle")
    }
  }

  const getStepMessage = () => {
    switch (step) {
      case "downloading":
        return "Downloading audio from YouTube..."
      case "transcribing":
        return "Transcribing audio with Whisper..."
      case "cleaning":
        return "Removing sponsors and filler content..."
      case "summarizing":
        return "Generating Khmer summary..."
      case "complete":
        return "Processing complete!"
      default:
        return ""
    }
  }

  const isProcessing = step !== "idle" && step !== "complete"

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Enter YouTube URL</CardTitle>
          <CardDescription>Paste the URL of the YouTube video you want to transcribe</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isProcessing}
              className="flex-1 bg-secondary text-secondary-foreground"
            />
            <Button
              type="submit"
              disabled={isProcessing}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                "Process Video"
              )}
            </Button>
          </form>

          {error && <div className="mt-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

          {isProcessing && (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-secondary p-4">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <span className="text-sm text-secondary-foreground">{getStepMessage()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {transcription && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <FileText className="h-5 w-5" />
              Transcription
            </CardTitle>
            <CardDescription>Original transcription with sponsors and filler removed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto rounded-lg bg-secondary p-4">
              <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-secondary-foreground">
                {transcription}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {khmerSummary && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Languages className="h-5 w-5" />
              Khmer Summary
            </CardTitle>
            <CardDescription>Structured summary in Khmer language</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-secondary p-6">
              <p className="whitespace-pre-wrap text-base leading-relaxed text-secondary-foreground">{khmerSummary}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
