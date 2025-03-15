'use client'

import { useRef, useState, useEffect } from 'react'
import { useChat } from 'ai/react'
import { Button } from '@/components/ui/button'
import { ArrowUp, Square, Copy, ThumbsDown, ThumbsUp } from 'lucide-react'
import { PromptInput, PromptInputAction, PromptInputActions, PromptInputTextarea } from './ui/prompt-input'
import { PromptSuggestion } from '@/components/ui/prompt-suggestion'
import { ChatContainer } from './ui/chat-container'
import { Message, MessageAvatar, MessageContent, MessageAction, MessageActions } from './ui/message'
import { ScrollButton } from './ui/scroll-button'
import { Loader } from './ui/loader'
import Image from 'next/image'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
}

interface MessageFeedback {
  [key: string]: {
    liked: boolean | null;
    copied: boolean;
  }
}

export function Chatbot() {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [messageFeedback, setMessageFeedback] = useState<MessageFeedback>({})
  const [waitingForResponse, setWaitingForResponse] = useState(false)

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
    api: '/api/chat',
    onResponse: () => {
      // When response starts streaming, we no longer need the typing indicator
      setWaitingForResponse(false)
    },
    onFinish: () => {
      // When response is complete, ensure typing indicator is hidden
      setWaitingForResponse(false)
    },
  })

  // Suggestions data
  const suggestions = [
    "Tell me a joke",
    "Fastest land animal",
    "Longest river in the world",
    "Largest planet in our solar system",
  ]

  const handleSuggestionClick = (suggestion: string) => {
    handleInputChange({ target: { value: suggestion } } as React.ChangeEvent<HTMLTextAreaElement>)
  }

  // Show typing indicator when loading starts but only if we're waiting for a new response
  useEffect(() => {
    if (isLoading) {
      // Check if the last message is from the user (meaning we're waiting for a response)
      const lastMessage = messages[messages.length - 1]
      const waitingForAssistantResponse = lastMessage && lastMessage.role === 'user'
      
      setWaitingForResponse(waitingForAssistantResponse)
    } else {
      setWaitingForResponse(false)
    }
  }, [isLoading, messages])

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return
    
    // Set waiting for response as soon as form is submitted
    setWaitingForResponse(true)
    await handleSubmit(e)
  }

  const handleSubmitMessage = () => {
    if (!input.trim()) return
    
    // Create a synthetic form event
    const formEvent = new Event('submit', { cancelable: true }) as unknown as React.FormEvent<HTMLFormElement>
    handleFormSubmit(formEvent)
  }

  const handleValueChange = (value: string) => {
    handleInputChange({ target: { value } } as React.ChangeEvent<HTMLTextAreaElement>)
  }

  const handleStopGeneration = () => {
    stop()
    setWaitingForResponse(false)
  }

  const handleCopy = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content)
    setMessageFeedback(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        copied: true
      }
    }))
    setTimeout(() => {
      setMessageFeedback(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          copied: false
        }
      }))
    }, 2000)
  }

  const handleLike = (messageId: string, value: boolean) => {
    setMessageFeedback(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        liked: value
      }
    }))
  }

  return (
    <div className="relative flex h-[600px] w-full flex-col overflow-hidden">
      <div className="relative flex-1 overflow-hidden">
        <ChatContainer
          className="h-full space-y-4 p-4"
          autoScroll={true}
          ref={chatContainerRef}
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <Image 
                  src="/grok-logo-icon.png" 
                  alt="Grok AI" 
                  width={80} 
                  height={80} 
                  className="mb-2"
                />
                <h1 className="text-3xl font-bold tracking-tight">Grok</h1>
                <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                  {suggestions.map((suggestion, index) => (
                    <PromptSuggestion
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </PromptSuggestion>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isAssistant = message.role === 'assistant'
                const messageId = message.id.toString()
                const feedback = messageFeedback[messageId] || { liked: null, copied: false }

                return (
                  <Message
                    key={message.id}
                    className={
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }
                  >
                    {isAssistant ? (
                      <>
                        <MessageAvatar
                          src="/grok-logo-icon.png"
                          alt="Grok AI Assistant"
                          fallback="Grok"
                          className="border-2 border-gray-200/50 dark:border-gray-700/50"
                        />
                        <div className="flex w-full flex-col gap-2">
                          <MessageContent markdown className="bg-transparent p-0">
                            {message.content}
                          </MessageContent>
                          <MessageActions className="self-end">
                            <MessageAction tooltip="Copy to clipboard">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => handleCopy(messageId, message.content)}
                              >
                                <Copy className={`size-4 ${feedback.copied ? "text-green-500" : ""}`} />
                              </Button>
                            </MessageAction>

                            <MessageAction tooltip="Helpful">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 rounded-full ${feedback.liked === true ? "bg-green-100 text-green-500" : ""}`}
                                onClick={() => handleLike(messageId, true)}
                              >
                                <ThumbsUp className="size-4" />
                              </Button>
                            </MessageAction>

                            <MessageAction tooltip="Not helpful">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 rounded-full ${feedback.liked === false ? "bg-red-100 text-red-500" : ""}`}
                                onClick={() => handleLike(messageId, false)}
                              >
                                <ThumbsDown className="size-4" />
                              </Button>
                            </MessageAction>
                          </MessageActions>
                        </div>
                      </>
                    ) : (
                      <MessageContent className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                        {message.content}
                      </MessageContent>
                    )}
                  </Message>
                )
              })}
              
              {waitingForResponse && (
                <Message className="justify-start">
                  <MessageAvatar
                    src="/grok-logo-icon.png"
                    alt="Grok AI Assistant"
                    fallback="Grok"
                  />
                  <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
                    <div className="text-foreground prose text-base rounded-lg p-4 flex items-center">
                      <Loader variant="text-shimmer" text="Thinking..." size="md" />
                    </div>
                  </div>
                </Message>
              )}
            </>
          )}
          
          <div ref={bottomRef} />
        </ChatContainer>
        
        <div className="absolute right-4 bottom-4">
          <ScrollButton containerRef={chatContainerRef} />
        </div>
      </div>

      <div className="p-4">
        <form onSubmit={handleFormSubmit}>
          <PromptInput
            value={input}
            onValueChange={handleValueChange}
            isLoading={isLoading}
            className="w-full"
            onSubmit={handleSubmitMessage}
          >
            <PromptInputTextarea placeholder="Ask Grok anything..." />
            <PromptInputActions className="justify-end">
              <PromptInputAction
                tooltip={isLoading ? 'Stop generation' : 'Send message'}
              >
                <Button
                  type={isLoading ? "button" : "submit"}
                  variant="default"
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-md hover:shadow-lg transition-all"
                  onClick={isLoading ? handleStopGeneration : undefined}
                >
                  {isLoading ? (
                    <Square className="size-4 fill-current" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </form>
      </div>
    </div>
  )
}
