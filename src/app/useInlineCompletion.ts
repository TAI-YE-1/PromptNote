import { useEffect, useRef, useState } from 'react'
import {
  COMPLETION_TRANSIENT_AUTO_RETRY_LIMIT,
  computeCompletionStartDelayMs,
  computeCompletionTransientRetryDelayMs,
} from '../ai/completionTuning'
import { AiRequestError, getAiProvider } from '../ai/provider'
import type { AiSettings } from '../ai/types'
import { sectionKindMeta } from '../prompt/sectionKinds'
import type {
  EditorCompletionContext,
  EditorCompletionSuggestion,
} from '../editor/completionContext'

const COMPLETION_CACHE_SIZE = 8
const COMPLETION_MAX_CHARS = 240
const COMPLETION_OVERLAP_MAX = 32
const PARTIAL_RENDER_INTERVAL_MS = 48

interface InlineCompletionInput {
  settings: AiSettings
  context: EditorCompletionContext | null
  onError(message: string | null): void
}

export function useInlineCompletion(
  input: InlineCompletionInput,
): EditorCompletionSuggestion | null {
  const [completion, setCompletion] = useState<EditorCompletionSuggestion | null>(null)
  const lastReportedErrorRef = useRef<string | null>(null)
  const retryAtRef = useRef(0)
  const lastRequestStartedAtRef = useRef(0)
  const transientFailureCountRef = useRef(0)
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
    retryAtRef.current = 0
    lastRequestStartedAtRef.current = 0
    transientFailureCountRef.current = 0
    lastReportedErrorRef.current = null
    cacheRef.current.clear()
    setCompletion(null)
    input.onError(null)
  }, [input.onError, settingsKey])

  useEffect(() => {
    setCompletion(null)
    if (!ready || !context) return
    if (context.contextChars !== settings.completionContextChars) return

    const contextSnapshot = context
    const requestKey = contextSnapshot.key
    const request = { action: 'complete' as const, content: completionPrompt(contextSnapshot) }
    const provider = getAiProvider(settings)
    const makeSuggestion = (text: string): EditorCompletionSuggestion => ({
      text,
      contextKey: contextSnapshot.key,
      documentId: contextSnapshot.documentId,
      position: contextSnapshot.position,
    })
    const cached = cacheRef.current.get(requestKey)
    if (cached) {
      markCompletionRecovered()
      setCompletion(makeSuggestion(cached))
      return
    }

    const controller = new AbortController()
    const requestSequence = ++requestSequenceRef.current
    const isCurrent = () =>
      !controller.signal.aborted &&
      requestSequenceRef.current === requestSequence &&
      currentContextKeyRef.current === contextSnapshot.key
    const now = Date.now()
    const startDelay = computeCompletionStartDelayMs({
      configuredDelayMs: settings.completionDelayMs,
      lastRequestStartedAtMs: lastRequestStartedAtRef.current,
      retryAtMs: retryAtRef.current,
      nowMs: now,
    })
    let renderTimer: number | null = null
    let pendingPartial: string | null = null
    let lastRendered: string | null = null

    function markCompletionRecovered() {
      transientFailureCountRef.current = 0
      retryAtRef.current = 0
      if (!lastReportedErrorRef.current) return
      lastReportedErrorRef.current = null
      input.onError(null)
    }

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

    const reportCompletionError = (message: string) => {
      if (lastReportedErrorRef.current === message) return
      lastReportedErrorRef.current = message
      input.onError(message)
    }

    const runRequest = async () => {
      while (isCurrent()) {
        let lastUsablePartial: string | null = null
        lastRequestStartedAtRef.current = Date.now()
        try {
          const result = await provider.streamCompletion(
            settings,
            request,
            (partial) => {
              if (!isCurrent()) return
              const normalized = normalizeCompletion(partial, contextSnapshot.beforeText)
              if (!normalized) return
              lastUsablePartial = normalized
              markCompletionRecovered()
              queuePartial(normalized)
            },
            controller.signal,
          )
          if (!isCurrent()) return

          const normalized = normalizeCompletion(result, contextSnapshot.beforeText)
          if (!normalized) return

          markCompletionRecovered()
          pendingPartial = normalized
          flushPartial()
          cacheCompletion(cacheRef.current, requestKey, normalized)
          return
        } catch (error) {
          if (!isCurrent()) return
          if (lastUsablePartial) {
            markCompletionRecovered()
            pendingPartial = lastUsablePartial
            flushPartial()
            cacheCompletion(cacheRef.current, requestKey, lastUsablePartial)
            return
          }

          setCompletion(null)
          const message = error instanceof Error ? error.message : String(error)
          if (!(error instanceof AiRequestError) || !error.transient) {
            transientFailureCountRef.current = 0
            retryAtRef.current = 0
            reportCompletionError(message)
            return
          }

          const failures = transientFailureCountRef.current + 1
          transientFailureCountRef.current = failures
          const retryDelay = computeCompletionTransientRetryDelayMs(failures, error.retryAfterMs)
          retryAtRef.current = Date.now() + retryDelay
          if (failures >= COMPLETION_TRANSIENT_AUTO_RETRY_LIMIT) {
            reportCompletionError(message)
            return
          }

          if (!(await waitForRetry(retryDelay, controller.signal))) return
        }
      }
    }

    const timer = window.setTimeout(() => {
      void runRequest()
    }, startDelay)

    return () => {
      window.clearTimeout(timer)
      if (renderTimer !== null) window.clearTimeout(renderTimer)
      controller.abort()
    }
  }, [context, input.onError, ready, settingsKey])

  return completion
}

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false)
  if (delayMs <= 0) return Promise.resolve(true)
  return new Promise((resolve) => {
    let settled = false
    let timer: number | null = null
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      if (timer !== null) window.clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      resolve(value)
    }
    const onAbort = () => finish(false)
    signal.addEventListener('abort', onAbort, { once: true })
    if (signal.aborted) {
      finish(false)
      return
    }
    timer = window.setTimeout(() => finish(true), delayMs)
  })
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
