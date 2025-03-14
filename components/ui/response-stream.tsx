"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"

export interface ResponseStreamProps {
  textStream: string | AsyncIterable<string>
  mode?: "typewriter" | "fade"
  speed?: number
  className?: string
  onComplete?: () => void
  as?: React.ElementType
  fadeDuration?: number
  segmentDelay?: number
  characterChunkSize?: number
}

export function useTextStream({
  textStream,
  speed = 20,
  mode = "typewriter",
  onComplete,
  fadeDuration,
  segmentDelay,
  characterChunkSize,
  onError,
}: {
  textStream: string | AsyncIterable<string>
  speed?: number
  mode?: "typewriter" | "fade"
  onComplete?: () => void
  fadeDuration?: number
  segmentDelay?: number
  characterChunkSize?: number
  onError?: (error: unknown) => void
}) {
  const [displayedText, setDisplayedText] = useState("")
  const [isComplete, setIsComplete] = useState(false)
  const [segments, setSegments] = useState<{ text: string; index: number }[]>([])
  const [, setIsPaused] = useState(false)
  const pauseRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Calculate speeds based on the speed parameter (1-100)
  const getFadeDuration = useCallback(() => {
    if (fadeDuration !== undefined) return fadeDuration
    // Map speed 1-100 to duration 800-50ms (inverse relationship)
    return Math.floor(800 - (speed / 100) * 750)
  }, [fadeDuration, speed])

  const getSegmentDelay = useCallback(() => {
    if (segmentDelay !== undefined) return segmentDelay
    // Map speed 1-100 to delay 200-10ms (inverse relationship)
    return Math.floor(200 - (speed / 100) * 190)
  }, [segmentDelay, speed])

  const getCharacterChunkSize = useCallback(() => {
    if (characterChunkSize !== undefined) return characterChunkSize
    // Map speed 1-100 to chunk size 1-5 (direct relationship)
    return Math.max(1, Math.floor((speed / 100) * 4) + 1)
  }, [characterChunkSize, speed])

  const reset = useCallback(() => {
    setDisplayedText("")
    setIsComplete(false)
    setSegments([])
    pauseRef.current = false
    setIsPaused(false)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const pause = useCallback(() => {
    pauseRef.current = true
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    pauseRef.current = false
    setIsPaused(false)
  }, [])

  const startStreaming = useCallback(async () => {
    reset()
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      if (typeof textStream === "string") {
        // Handle string input
        if (mode === "typewriter") {
          let currentText = ""
          const chunkSize = getCharacterChunkSize()
          
          for (let i = 0; i < textStream.length; i += chunkSize) {
            if (signal.aborted) break
            while (pauseRef.current) {
              await new Promise(resolve => setTimeout(resolve, 100))
              if (signal.aborted) break
            }
            
            const chunk = textStream.slice(i, i + chunkSize)
            currentText += chunk
            setDisplayedText(currentText)
            
            await new Promise(resolve => 
              setTimeout(resolve, 1000 / (speed * 2))
            )
          }
        } else if (mode === "fade") {
          // For fade mode, split by words and animate
          const words = textStream.split(/\s+/)
          const newSegments: { text: string; index: number }[] = []
          
          for (let i = 0; i < words.length; i++) {
            if (signal.aborted) break
            while (pauseRef.current) {
              await new Promise(resolve => setTimeout(resolve, 100))
              if (signal.aborted) break
            }
            
            newSegments.push({ text: words[i] + " ", index: i })
            setSegments([...newSegments])
            setDisplayedText(words.slice(0, i + 1).join(" ") + " ")
            
            await new Promise(resolve => 
              setTimeout(resolve, getSegmentDelay())
            )
          }
        }
      } else {
        // Handle AsyncIterable input
        let currentText = ""
        let wordBuffer = ""
        let wordIndex = 0
        const newSegments: { text: string; index: number }[] = []
        
        for await (const chunk of textStream) {
          if (signal.aborted) break
          
          if (mode === "typewriter") {
            currentText += chunk
            setDisplayedText(currentText)
          } else if (mode === "fade") {
            // Process chunk by words for fade mode
            const text = wordBuffer + chunk
            const words = text.split(/\s+/)
            
            // Last word might be incomplete, save it for the next chunk
            wordBuffer = words.pop() || ""
            
            for (const word of words) {
              if (signal.aborted) break
              while (pauseRef.current) {
                await new Promise(resolve => setTimeout(resolve, 100))
                if (signal.aborted) break
              }
              
              newSegments.push({ text: word + " ", index: wordIndex++ })
              setSegments([...newSegments])
              currentText += word + " "
              
              await new Promise(resolve => 
                setTimeout(resolve, getSegmentDelay())
              )
            }
            
            setDisplayedText(currentText)
          }
          
          // Small delay between chunks
          await new Promise(resolve => setTimeout(resolve, 10))
        }
        
        // Handle any remaining word buffer
        if (mode === "fade" && wordBuffer && !signal.aborted) {
          newSegments.push({ text: wordBuffer, index: wordIndex })
          setSegments([...newSegments])
          setDisplayedText(currentText + wordBuffer)
        }
      }
      
      if (!signal.aborted) {
        setIsComplete(true)
        onComplete?.()
      }
    } catch (error) {
      if (!signal.aborted) {
        onError?.(error)
        console.error("Error in text streaming:", error)
      }
    }
  }, [textStream, mode, speed, getCharacterChunkSize, getSegmentDelay, onComplete, onError, reset])

  useEffect(() => {
    if (textStream) {
      startStreaming()
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [textStream, startStreaming])

  return {
    displayedText,
    isComplete,
    segments,
    getFadeDuration,
    getSegmentDelay,
    reset,
    startStreaming,
    pause,
    resume,
  }
}

export function ResponseStream({
  textStream,
  mode = "typewriter",
  speed = 20,
  className,
  onComplete,
  as: Component = "div",
  fadeDuration,
  segmentDelay,
  characterChunkSize,
}: ResponseStreamProps) {
  const {
    displayedText,
    segments,
    getFadeDuration,
    getSegmentDelay,
  } = useTextStream({
    textStream,
    mode,
    speed,
    onComplete,
    fadeDuration,
    segmentDelay,
    characterChunkSize,
  })

  if (mode === "typewriter") {
    return <Component className={className}>{displayedText}</Component>
  }

  // Fade mode
  return (
    <Component className={className}>
      {segments.map((segment, i) => (
        <span
          key={i}
          className="animate-in fade-in"
          style={{
            animationDuration: `${getFadeDuration()}ms`,
            animationDelay: `${i * getSegmentDelay()}ms`,
          }}
        >
          {segment.text}
        </span>
      ))}
    </Component>
  )
}
