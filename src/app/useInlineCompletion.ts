import { useEffect, useRef, useState } from 'react'
import { getAiProvider } from '../ai/provider'
import type { AiSettings } from '../ai/types'
import type { EditorCompletionContext } from '../editor/PromptEditor'

const COMPLETION_DEBOUNCE_MS = 750
const COMPLETION_ERROR_BACKOFF_MS = 30_000
const COMPLETION_MIN_CONTEXT = 8

interface InlineCompletionInput {
  settings: AiSettings
  context: EditorCompletionContext | null
  revision: number | null
  onError(message: string): void
}

export function useInlineCompletion(input: InlineCompletionInput): string | null {
  const [completionText, setCompletionText] = useState<string | null>(null)
  const lastErrorRef = useRef<string | null>(null)
  const retryAfterRef = useRef(0)
  const ready =
    input.settings.enabled &&
    input.settings.configured &&
    input.settings.completionEnabled

  useEffect(() => {
    lastErrorRef.current = null
    retryAfterRef.current = 0
    setCompletionText(null)
  }, [input.settings])

  useEffect(() => {
    setCompletionText(null)
    if (
      !ready ||
      !input.context ||
      input.context.beforeText.trim().length < COMPLETION_MIN_CONTEXT ||
      Date.now() < retryAfterRef.current
    ) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await getAiProvider(input.settings).generate(
            input.settings,
            { action: 'complete', content: input.context?.beforeText ?? '' },
            controller.signal,
          )
          if (controller.signal.aborted) return
          setCompletionText(normalizeCompletion(result))
          lastErrorRef.current = null
        } catch (error) {
          if (controller.signal.aborted) return
          const message = error instanceof Error ? error.message : String(error)
          retryAfterRef.current = Date.now() + COMPLETION_ERROR_BACKOFF_MS
          setCompletionText(null)
          if (lastErrorRef.current !== message) {
            lastErrorRef.current = message
            input.onError(message)
          }
        }
      })()
    }, COMPLETION_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [input.context, input.revision, input.settings, ready])

  return completionText
}

function normalizeCompletion(value: string): string | null {
  const text = value.replace(/\r\n/g, '\n').trim()
  if (!text) return null
  return text.slice(0, 240)
}
