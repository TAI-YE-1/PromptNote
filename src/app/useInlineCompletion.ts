import { useEffect, useRef, useState } from 'react'
import { getAiProvider } from '../ai/provider'
import type { AiSettings } from '../ai/types'
import type { EditorCompletionContext } from '../editor/PromptEditor'

const COMPLETION_DEBOUNCE_MS = 250
const COMPLETION_ERROR_BACKOFF_MS = 30_000
const COMPLETION_MIN_CONTEXT = 2
const COMPLETION_CACHE_SIZE = 8

interface InlineCompletionInput {
  settings: AiSettings
  context: EditorCompletionContext | null
  onError(message: string): void
}

export function useInlineCompletion(input: InlineCompletionInput): string | null {
  const [completionText, setCompletionText] = useState<string | null>(null)
  const lastErrorRef = useRef<string | null>(null)
  const retryAfterRef = useRef(0)
  const cacheRef = useRef(new Map<string, string>())
  const contextPosition = input.context?.position ?? null
  const contextBeforeText = input.context?.beforeText ?? ''
  const ready =
    input.settings.enabled &&
    input.settings.configured &&
    input.settings.completionEnabled

  useEffect(() => {
    lastErrorRef.current = null
    retryAfterRef.current = 0
    cacheRef.current.clear()
    setCompletionText(null)
  }, [input.settings])

  useEffect(() => {
    setCompletionText(null)
    if (
      !ready ||
      contextPosition === null ||
      contextBeforeText.trim().length < COMPLETION_MIN_CONTEXT ||
      Date.now() < retryAfterRef.current
    ) {
      return
    }

    const cacheKey = `${contextPosition}\u0000${contextBeforeText}`
    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      setCompletionText(cached)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await getAiProvider(input.settings).generate(
            input.settings,
            { action: 'complete', content: contextBeforeText },
            controller.signal,
          )
          if (controller.signal.aborted) return

          const normalized = normalizeCompletion(result)
          if (!normalized) return

          cacheCompletion(cacheRef.current, cacheKey, normalized)
          setCompletionText(normalized)
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
  }, [contextBeforeText, contextPosition, input.onError, input.settings, ready])

  return completionText
}

function cacheCompletion(cache: Map<string, string>, key: string, value: string) {
  cache.delete(key)
  cache.set(key, value)
  while (cache.size > COMPLETION_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    if (typeof oldestKey !== 'string') break
    cache.delete(oldestKey)
  }
}

function normalizeCompletion(value: string): string | null {
  const text = value.replace(/\r\n/g, '\n').trimEnd()
  if (!text.trim()) return null
  return text.slice(0, 240)
}
