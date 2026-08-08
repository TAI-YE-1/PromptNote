import { useEffect, useRef } from 'react'
import { getAiProvider } from '../ai/provider'
import type { AiSettings } from '../ai/types'
import { sectionKindMeta } from '../prompt/sectionKinds'
import type {
  EditorCompletionContext,
  EditorCompletionSuggestion,
} from '../editor/completionContext'

const COMPLETION_ERROR_BACKOFF_MS = 3_000
const COMPLETION_MIN_BLOCK_CONTEXT = 1
const COMPLETION_CACHE_SIZE = 8
const COMPLETION_MAX_CHARS = 240
const COMPLETION_OVERLAP_MAX = 32

interface InlineCompletionInput {
  settings: AiSettings
  context: EditorCompletionContext | null
  onCompletion(completion: EditorCompletionSuggestion | null): void
  onError(message: string): void
}

export function useInlineCompletion(input: InlineCompletionInput): void {
  const lastErrorRef = useRef<string | null>(null)
  const retryAfterRef = useRef(0)
  const cacheRef = useRef(new Map<string, string>())
  const requestSequenceRef = useRef(0)
  const currentContextKeyRef = useRef<string | null>(null)
  const context = input.context
  currentContextKeyRef.current = context?.key ?? null

  const settingsKey = completionSettingsKey(input.settings)
  const ready =
    input.settings.enabled &&
    input.settings.configured &&
    input.settings.completionEnabled

  useEffect(() => {
    requestSequenceRef.current += 1
    lastErrorRef.current = null
    retryAfterRef.current = 0
    cacheRef.current.clear()
    input.onCompletion(null)
  }, [settingsKey, input.onCompletion])

  useEffect(() => {
    input.onCompletion(null)
    if (!ready || !context) return
    if (context.contextChars !== input.settings.completionContextChars) return
    if (blockContextLength(context) < COMPLETION_MIN_BLOCK_CONTEXT) return

    const contextSnapshot = context
    const requestKey = contextSnapshot.key
    const makeSuggestion = (text: string): EditorCompletionSuggestion => ({
      text,
      contextKey: contextSnapshot.key,
      documentId: contextSnapshot.documentId,
      position: contextSnapshot.position,
    })
    const cached = cacheRef.current.get(requestKey)
    if (cached) {
      input.onCompletion(makeSuggestion(cached))
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
              content: completionPrompt(contextSnapshot),
            },
            (partial) => {
              if (!isCurrentRequest(controller, requestSequenceRef, requestSequence, currentContextKeyRef, contextSnapshot.key)) return
              const normalized = normalizeCompletion(partial, contextSnapshot.beforeText)
              if (!normalized) return
              lastUsablePartial = normalized
              input.onCompletion(makeSuggestion(normalized))
            },
            controller.signal,
          )
          if (!isCurrentRequest(controller, requestSequenceRef, requestSequence, currentContextKeyRef, contextSnapshot.key)) return

          const normalized = normalizeCompletion(result, contextSnapshot.beforeText)
          if (!normalized) return

          cacheCompletion(cacheRef.current, requestKey, normalized)
          input.onCompletion(makeSuggestion(normalized))
          lastErrorRef.current = null
        } catch (error) {
          if (!isCurrentRequest(controller, requestSequenceRef, requestSequence, currentContextKeyRef, contextSnapshot.key)) return
          if (lastUsablePartial) {
            cacheCompletion(cacheRef.current, requestKey, lastUsablePartial)
            input.onCompletion(makeSuggestion(lastUsablePartial))
            lastErrorRef.current = null
            return
          }

          const message = error instanceof Error ? error.message : String(error)
          retryAfterRef.current = Date.now() + COMPLETION_ERROR_BACKOFF_MS
          input.onCompletion(null)
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
  }, [context, input.onCompletion, input.onError, input.settings, ready, settingsKey])
}

function isCurrentRequest(
  controller: AbortController,
  sequenceRef: { current: number },
  sequence: number,
  contextKeyRef: { current: string | null },
  contextKey: string,
): boolean {
  return !controller.signal.aborted && sequenceRef.current === sequence && contextKeyRef.current === contextKey
}

function blockContextLength(context: EditorCompletionContext): number {
  return (context.beforeText + context.afterText).trim().length
}

function completionPrompt(context: EditorCompletionContext): string {
  const semantic = context.sectionKind
    ? `当前模块：${sectionKindMeta[context.sectionKind].label}\n`
    : ''
  return `${semantic}当前文本块（<光标> 表示续写位置）：\n${context.beforeText}<光标>${context.afterText}`
}

function completionSettingsKey(settings: AiSettings): string {
  return [
    settings.enabled,
    settings.configured,
    settings.completionEnabled,
    settings.provider,
    settings.model,
    settings.completionModel,
    settings.baseUrl,
    settings.apiKey,
    settings.completionContextChars,
    settings.completionDelayMs,
    settings.instructionOverrides.complete ?? '',
  ].join('\u0000')
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
