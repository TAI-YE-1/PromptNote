import { useEffect, useRef, useState } from 'react'
import { getAiProvider } from '../ai/provider'
import type { AiSettings } from '../ai/types'
import { sectionKindMeta } from '../prompt/sectionKinds'
import type {
  EditorCompletionContext,
  EditorCompletionSuggestion,
} from '../editor/completionContext'

const COMPLETION_ERROR_BACKOFF_MS = 3_000
const COMPLETION_MIN_CONTEXT = 2
const COMPLETION_CACHE_SIZE = 8
const COMPLETION_MAX_CHARS = 240
const COMPLETION_OVERLAP_MAX = 32

interface InlineCompletionInput {
  settings: AiSettings
  context: EditorCompletionContext | null
  onError(message: string): void
}

export function useInlineCompletion(
  input: InlineCompletionInput,
): EditorCompletionSuggestion | null {
  const [completion, setCompletion] = useState<EditorCompletionSuggestion | null>(null)
  const lastErrorRef = useRef<string | null>(null)
  const retryAfterRef = useRef(0)
  const cacheRef = useRef(new Map<string, string>())
  const requestSequenceRef = useRef(0)
  const currentContextKeyRef = useRef<string | null>(null)
  const context = input.context
  currentContextKeyRef.current = context?.key ?? null

  const rawContext = context?.beforeText ?? ''
  const contextBeforeText = rawContext.slice(-input.settings.completionContextChars)
  const ready =
    input.settings.enabled &&
    input.settings.configured &&
    input.settings.completionEnabled

  useEffect(() => {
    requestSequenceRef.current += 1
    lastErrorRef.current = null
    retryAfterRef.current = 0
    cacheRef.current.clear()
    setCompletion(null)
  }, [input.settings])

  useEffect(() => {
    setCompletion(null)
    if (
      !ready ||
      !context ||
      contextBeforeText.trim().length < COMPLETION_MIN_CONTEXT
    ) {
      return
    }

    const contextSnapshot = context
    const requestKey = `${contextSnapshot.key}\u0000${contextBeforeText}`
    const makeSuggestion = (text: string): EditorCompletionSuggestion => ({
      text,
      contextKey: contextSnapshot.key,
      documentId: contextSnapshot.documentId,
      position: contextSnapshot.position,
    })
    const cached = cacheRef.current.get(requestKey)
    if (cached) {
      setCompletion(makeSuggestion(cached))
      return
    }

    const controller = new AbortController()
    const requestSequence = ++requestSequenceRef.current
    const remainingBackoff = Math.max(0, retryAfterRef.current - Date.now())
    const startDelay = Math.max(input.settings.completionDelayMs, remainingBackoff)
    const timer = window.setTimeout(() => {
      void (async () => {
        let lastUsablePartial: string | null = null
        try {
          const provider = getAiProvider(input.settings)
          const result = await provider.streamCompletion(
            input.settings,
            {
              action: 'complete',
              content: completionPrompt(contextSnapshot, contextBeforeText),
            },
            (partial) => {
              if (
                controller.signal.aborted ||
                requestSequenceRef.current !== requestSequence ||
                currentContextKeyRef.current !== contextSnapshot.key
              ) {
                return
              }
              const normalized = normalizeCompletion(partial, contextBeforeText)
              if (!normalized) return
              lastUsablePartial = normalized
              setCompletion(makeSuggestion(normalized))
            },
            controller.signal,
          )
          if (
            controller.signal.aborted ||
            requestSequenceRef.current !== requestSequence ||
            currentContextKeyRef.current !== contextSnapshot.key
          ) {
            return
          }

          const normalized = normalizeCompletion(result, contextBeforeText)
          if (!normalized) return

          cacheCompletion(cacheRef.current, requestKey, normalized)
          setCompletion(makeSuggestion(normalized))
          lastErrorRef.current = null
        } catch (error) {
          if (
            controller.signal.aborted ||
            requestSequenceRef.current !== requestSequence ||
            currentContextKeyRef.current !== contextSnapshot.key
          ) {
            return
          }
          if (lastUsablePartial) {
            cacheCompletion(cacheRef.current, requestKey, lastUsablePartial)
            setCompletion(makeSuggestion(lastUsablePartial))
            lastErrorRef.current = null
            return
          }

          const message = error instanceof Error ? error.message : String(error)
          retryAfterRef.current = Date.now() + COMPLETION_ERROR_BACKOFF_MS
          setCompletion(null)
          if (lastErrorRef.current !== message) {
            lastErrorRef.current = message
            input.onError(message)
          }
        }
      })()
    }, startDelay)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [
    context,
    contextBeforeText,
    input.onError,
    input.settings,
    input.settings.completionDelayMs,
    ready,
  ])

  return completion
}

function completionPrompt(context: EditorCompletionContext, beforeText: string): string {
  if (!context.sectionKind) return beforeText
  return `当前模块：${sectionKindMeta[context.sectionKind].label}\n光标前文本：${beforeText}`
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

function normalizeCompletion(value: string, beforeText: string): string | null {
  const text = value.replace(/\r\n/g, '\n').trimEnd()
  if (!text.trim()) return null
  const withoutRepeatedPrefix = stripRepeatedPrefix(beforeText, text)
  if (!withoutRepeatedPrefix.trim()) return null
  return withoutRepeatedPrefix.slice(0, COMPLETION_MAX_CHARS)
}

function stripRepeatedPrefix(beforeText: string, completion: string): string {
  const maxOverlap = Math.min(COMPLETION_OVERLAP_MAX, beforeText.length, completion.length)
  for (let size = maxOverlap; size >= 2; size -= 1) {
    if (beforeText.endsWith(completion.slice(0, size))) return completion.slice(size)
  }
  return completion
}
