"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Play, Pause } from "lucide-react"
import AudioVisualizer from "@/components/audio-visualizer"

export default function AudioVisualizerPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [similarity, setSimilarity] = useState<number>(0)
  const [formula, setFormula] = useState("sin(x * 0.5) * 2")
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type === "audio/mp3" || file.type === "audio/mpeg" || file.type === "audio/wav")) {
      setAudioFile(file)
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
      setIsPlaying(false)
    }
  }

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header Controls */}
      <div className="p-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">3D Audio Visualizer</h1>
            <p className="text-sm text-gray-400">Real-time frequency analysis with custom formula</p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {/* File Upload */}
            <div className="flex items-center gap-2">
              <Label htmlFor="audio-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Audio</span>
                </div>
                <Input
                  id="audio-upload"
                  type="file"
                  accept="audio/mp3,audio/mpeg,audio/wav"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Label>

              {audioFile && (
                <Button
                  onClick={togglePlayback}
                  variant="outline"
                  size="icon"
                  className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              )}
            </div>

            {/* Similarity Display */}
            {audioFile && (
              <Card className="bg-gray-900 border-gray-800 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Similarity:</span>
                  <span className="text-sm font-bold text-green-400">{similarity.toFixed(1)}%</span>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Formula Input */}
        {audioFile && (
          <div className="max-w-7xl mx-auto mt-4">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <Label htmlFor="formula" className="text-sm text-gray-400 whitespace-nowrap">
                Z-axis Formula:
              </Label>
              <Input
                id="formula"
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="e.g., sin(x * 0.5) * 2"
                className="bg-gray-900 border-gray-800 text-white font-mono text-sm flex-1"
              />
              <span className="text-xs text-gray-500">Use 'x' as frequency index variable</span>
            </div>
          </div>
        )}
      </div>

      {/* Visualizer Canvas */}
      <div className="flex-1 relative">
        {audioFile && audioUrl ? (
          <>
            <AudioVisualizer
              audioUrl={audioUrl}
              isPlaying={isPlaying}
              formula={formula}
              onSimilarityUpdate={setSimilarity}
            />
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-700" />
              <h2 className="text-xl font-semibold mb-2 text-gray-400">No Audio Loaded</h2>
              <p className="text-sm text-gray-600">Upload an MP3 or WAV file to begin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
