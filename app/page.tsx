import { TranscriptionForm } from "@/components/transcription-form"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">YouTube Transcription</h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Convert YouTube videos to text with AI-powered transcription, automatically remove sponsors and filler
            content, then get a structured summary in Khmer language.
          </p>
        </div>

        <TranscriptionForm />
      </div>
    </main>
  )
}
