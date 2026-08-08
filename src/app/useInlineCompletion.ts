import { useEffect, useRef, useState } from 'react'
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
const PARTIAL_RENDER_INTERVAL_MS = 48

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
  const settings = input.settings
  currentContextKeyRef.current = context?.key ?? null

  const settingsKey = completionSettingsKey(settings)
  const ready = settings.enabled && settings.configured && settings.completionEnabled

  useEffect(() => {
    requestSequenceRef.current += 1
    lastErrorRef.current = null
    retryAfterRef.current = 0
    cacheRef.current.clear()
    setCompletion(null)
  }, [settingsKey])

  useEffect(() => {
    setCompletion(null)
    if (!ready || !context) return
    if (context.contextChars !== settings.completionContextChars) return
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
      setCompletion(makeSuggestion(cached))
      return
    }

    const controller = new AbortController()
    const requestSequence = ++requestSequenceRef.current
    const remainingBackoff = Math.max(0, retryAfterRef.current - Date.now())
    const startDelay = Math.max(settings.completionDelayMs, remainingBackoff)
    let renderTimer: number | null = null
    let pendingPartial: string | null = null
    let lastRendered: string | null = null

    const flushPartial = () => {
      if (renderTimer !== null) {
        window.clearTimeout(renderTimer)
        renderTimer = null
      }
      if (!pendingPartial || pendingPartial === lastRendered) return
      lastRendered = pendingPartial
      setCompletion(makeSuggestion(pendingPartial))
    }

    const queuePartial = (text: string) => {
      pendingPartial = text
      if (renderTimer !== null) return
      renderTimer = window.setTimeout(() => {
        renderTimer = null
        flushPartial()
      }, PARTIAL_RENDER_INTERVAL_MS)
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        let lastUsablePartial: string | null = null
        try {
          const provider = getAiProvider(settings)
          const result = await provider.streamCompletion(
            settings,
            {
              action: 'complete',
              content: completionPrompt(contextSnapshot),
            },
            (partial) => {
              if (!isCurrentRequest(controller, requestSequenceRef, requestSequence, currentContextKeyRef, contextSnapshot.key)) return
              const normalized = normalizeCompletion(partial, contextSnapshot.beforeText)
              if (!normalized) return
              lastUsablePartial = normalized
              queuePartial(normalized)
            },
            controller.signal,
          )
          if (!isCurrentRequest(controller, requestSequenceRef, requestSequence, currentContextKeyRef, contextSnapshot.key)) return

          const normalized = normalizeCompletion(result, contextSnapshot.beforeText)
          if (!normalized) return

          pendingPartial = normalized
          flushPartial()
          cacheCompletion(cacheRef.current, requestKey, normalized)
          lastErrorRef.current = null
        } catch (error) {
          if (!isCurrentRequest(controller, requestSequenceRef, requestSequence, currentContextKeyRef, contextSnapshot.key)) return
          if (lastUsablePartial) {
            pendingPartial = lastUsablePartial
            flushPartial()
            cacheCompletion(cacheRef.current, requestKey, lastUsablePartial)
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
      if (renderTimer !== null) window.clearTimeout(renderTimer)
      controller.abort()
    }
  }, [context, input.onError, ready, settingsKey])

  return completion
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
