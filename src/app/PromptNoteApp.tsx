import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PromptEditor } from '../editor/LazyPromptEditor'
import type {
  EditorCompletionContext,
  EditorSelectionSnapshot,
  PromptEditorHandle,
} from '../editor/PromptEditor'
import { compilePrompt, type CompileFormat } from '../prompt/compiler'
import {
  cloneWithContent,
  createPromptDocument,
  createPromptDocumentExport,
  parsePromptDocumentExport,
  type PromptDocument,
  type PromptNodeJSON,
} from '../prompt/schema'
import { ChromePromptRepository } from '../storage/promptRepository'
import { ChromeAiSettingsRepository, defaultAiSettings } from '../storage/aiSettingsRepository'
import { defaultBaseUrl, ensureAiHostPermission, getAiProvider } from '../ai/provider'
import { lintPrompt } from '../ai/lint'
import {
  isSuggestionCurrent,
  makeAppendSuggestion,
  makeReplacementSuggestion,
} from '../ai/suggestions'
import type { AiSettings, PromptSuggestion } from '../ai/types'
import {
  AiSheet,
  DocumentSheet,
  LintCard,
  Preview,
  SelectionActionBar,
  SlashMenu,
  SuggestionCard,
} from '../ui/components'
import { resolveImportedDocument } from './importDocument'
import { useInlineCompletion } from './useInlineCompletion'

const promptRepository = new ChromePromptRepository()
const aiSettingsRepository = new ChromeAiSettingsRepository()

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type AiPanel = 'menu' | 'settings' | null

export function PromptNoteApp() {
  const editorRef = useRef<PromptEditorHandle | null>(null)
  const currentRef = useRef<PromptDocument | null>(null)
  const deletedDocumentIds = useRef(new Set<string>())
  const [documents, setDocuments] = useState<PromptDocument[]>([])
  const [current, setCurrent] = useState<PromptDocument | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [slashOpen, setSlashOpen] = useState(false)
  const [documentSheetOpen, setDocumentSheetOpen] = useState(false)
  const [selection, setSelection] = useState<EditorSelectionSnapshot | null>(null)
  const [completionContext, setCompletionContext] = useState<EditorCompletionContext | null>(null)
  const [suggestion, setSuggestion] = useState<PromptSuggestion | null>(null)
  const [lintOpen, setLintOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewFormat, setPreviewFormat] = useState<CompileFormat>('plain')
  const [aiSettings, setAiSettings] = useState<AiSettings>(defaultAiSettings)
  const [aiDraft, setAiDraft] = useState<AiSettings>(defaultAiSettings)
  const [aiPanel, setAiPanel] = useState<AiPanel>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiTestState, setAiTestState] = useState<'idle' | 'ok' | 'error'>('idle')
  const [aiError, setAiError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  currentRef.current = current

  const handleCompletionError = useCallback((message: string | null) => {
    setAiError(message)
    if (message) setToast(`AI 补全失败：${shortCompletionError(message)}`)
  }, [])

  const completionText = useInlineCompletion({
    settings: aiSettings,
    context: completionContext,
    onError: handleCompletionError,
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [document, docs, settings] = await Promise.all([
          promptRepository.ensureCurrent(),
          promptRepository.list(),
          aiSettingsRepository.load(),
        ])
        if (cancelled) return
        setCurrent(document)
        setDocuments(docs)
        setAiSettings(settings)
        setAiDraft(settings)
        setLoaded(true)
      } catch (loadError) {
        if (!cancelled) setError(messageOf(loadError))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loaded || !current) return
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      void persistDocument(current)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [current, loaded])

  useEffect(() => {
    if (!loaded || !current) return
    const flush = () => {
      if (!deletedDocumentIds.current.has(current.id)) void promptRepository.save(current)
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [current, loaded])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const dismissTopmost = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return

      if (aiPanel) setAiPanel(null)
      else if (documentSheetOpen) setDocumentSheetOpen(false)
      else if (previewOpen) setPreviewOpen(false)
      else if (slashOpen) setSlashOpen(false)
      else if (selection) setSelection(null)
      else return

      event.preventDefault()
    }

    window.addEventListener('keydown', dismissTopmost)
    return () => window.removeEventListener('keydown', dismissTopmost)
  }, [aiPanel, documentSheetOpen, previewOpen, selection, slashOpen])

  const previewText = useMemo(
    () => (previewOpen && current ? compilePrompt(current, previewFormat) : ''),
    [current, previewFormat, previewOpen],
  )
  const localFindings = useMemo(
    () => (lintOpen && current ? lintPrompt(current) : []),
    [current, lintOpen],
  )
  const suggestionIsStale = Boolean(
    suggestion && current && !isSuggestionCurrent(suggestion, current.revision),
  )

  async function persistDocument(document: PromptDocument) {
    if (deletedDocumentIds.current.has(document.id)) return
    try {
      await promptRepository.save(document)
      const latest = currentRef.current
      const superseded =
        latest?.id === document.id && latest.revision > document.revision
      if (!superseded) setDocuments((previous) => upsertDocument(previous, document))
      if (isSameDocumentVersion(latest, document)) setSaveState('saved')
    } catch (saveError) {
      if (!isSameDocumentVersion(currentRef.current, document)) return
      setSaveState('error')
      setError(`保存失败：${messageOf(saveError)}`)
    }
  }

  function updateCurrentContent(content: PromptNodeJSON) {
    setCurrent((previous) => (previous ? cloneWithContent(previous, content) : previous))
  }

  function updateTitle(title: string) {
    setCurrent((previous) =>
      previous
        ? { ...previous, title, revision: previous.revision + 1, updatedAt: new Date().toISOString() }
        : previous,
    )
  }

  async function flushCurrent() {
    if (current && !deletedDocumentIds.current.has(current.id)) await promptRepository.save(current)
  }

  async function switchDocument(id: string) {
    try {
      await flushCurrent()
      const next = await promptRepository.get(id)
      if (!next) throw new Error('Prompt 不存在或已被删除。')
      await promptRepository.setCurrentId(id)
      setCurrent(next)
      resetTransientEditorState()
      setDocumentSheetOpen(false)
    } catch (switchError) {
      setError(messageOf(switchError))
    }
  }

  async function createDocument() {
    try {
      await flushCurrent()
      const created = createPromptDocument()
      await promptRepository.save(created)
      await promptRepository.setCurrentId(created.id)
      setDocuments((previous) => upsertDocument(previous, created))
      setCurrent(created)
      resetTransientEditorState()
      setDocumentSheetOpen(false)
      window.setTimeout(() => editorRef.current?.focus(), 0)
    } catch (createError) {
      setError(`创建失败：${messageOf(createError)}`)
    }
  }

  async function deleteCurrentDocument() {
    if (!current || !window.confirm(`删除“${current.title || '未命名 Prompt'}”？此操作只删除本地副本。`)) return
    const deletingId = current.id
    deletedDocumentIds.current.add(deletingId)

    try {
      await promptRepository.remove(deletingId)
    } catch (deleteError) {
      deletedDocumentIds.current.delete(deletingId)
      setError(`删除失败：${messageOf(deleteError)}`)
      return
    }

    let remaining: PromptDocument[]
    try {
      remaining = await promptRepository.list()
    } catch (listError) {
      setError(`Prompt 已删除，但读取剩余文档失败：${messageOf(listError)}。请重新打开 PromptNote。`)
      return
    }

    try {
      const next = remaining[0] ?? createPromptDocument()
      if (remaining.length === 0) await promptRepository.save(next)
      await promptRepository.setCurrentId(next.id)
      setDocuments(remaining.length ? remaining : [next])
      setCurrent(next)
      resetTransientEditorState()
      setDocumentSheetOpen(false)
    } catch (recoveryError) {
      setError(`Prompt 已删除，但切换到下一文档失败：${messageOf(recoveryError)}。请重新打开 PromptNote。`)
    }
  }

  function exportCurrentDocument() {
    if (!current) return
    try {
      const backup = createPromptDocumentExport(current)
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `promptnote-${safeFileName(current.title || 'prompt')}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setToast('已保存备份到电脑')
    } catch (exportError) {
      setError(`导出失败：${messageOf(exportError)}`)
    }
  }

  async function importPromptDocumentBackup(file: File) {
    try {
      const raw = JSON.parse(await file.text()) as unknown
      const backup = parsePromptDocumentExport(raw)
      await flushCurrent()

      const existing = await promptRepository.get(backup.document.id)
      const overwrite = existing
        ? window.confirm(
            `本地已存在同 ID 的“${existing.title || '未命名 Prompt'}”。确定覆盖它吗？\n\n取消则会作为一个新的导入副本保存。`,
          )
        : false
      const imported = resolveImportedDocument(backup.document, existing, overwrite)
      if (overwrite) deletedDocumentIds.current.delete(imported.id)

      await promptRepository.save(imported)
      await promptRepository.setCurrentId(imported.id)
      setDocuments((previous) => upsertDocument(previous, imported))
      setCurrent(imported)
      resetTransientEditorState()
      setDocumentSheetOpen(false)
      setToast('已恢复 Prompt 备份')
    } catch (importError) {
      setError(`导入失败：${messageOf(importError)}`)
    }
  }

  function resetTransientEditorState() {
    setSuggestion(null)
    setSelection(null)
    setCompletionContext(null)
  }

  function openAi(clearSelection = true) {
    setAiDraft(aiSettings)
    setAiTestState('idle')
    setAiError(null)
    setAiPanel(aiSettings.configured ? 'menu' : 'settings')
    if (clearSelection) setSelection(null)
  }

  function updateAiDraft(next: AiSettings) {
    setAiDraft((previous) => {
      const connectionChanged =
        previous.provider !== next.provider ||
        previous.model !== next.model ||
        previous.baseUrl !== next.baseUrl ||
        previous.apiKey !== next.apiKey
      return connectionChanged
        ? { ...next, configured: false, completionEnabled: false }
        : next
    })
  }

  async function saveAiSettings() {
    setAiError(null)
    try {
      if (!aiDraft.enabled) {
        const next = { ...aiDraft, completionEnabled: false }
        await aiSettingsRepository.save(next)
        setAiSettings(next)
        setAiDraft(next)
        setAiPanel(null)
        setToast('AI 辅助已关闭')
        return
      }
      validateAiSettings(aiDraft)
      if (!(await ensureAiHostPermission(aiDraft.baseUrl))) {
        throw new Error('没有授予该 AI 地址的网络访问权限。')
      }
      const next = { ...aiDraft, configured: true }
      await aiSettingsRepository.save(next)
      setAiSettings(next)
      setAiDraft(next)
      setAiPanel('menu')
      setToast(next.completionEnabled ? 'AI 配置已保存，内联补全已开启' : 'AI 配置已保存')
    } catch (settingsError) {
      setAiError(messageOf(settingsError))
    }
  }

  async function testAiConnection() {
    setAiBusy(true)
    setAiError(null)
    setAiTestState('idle')
    try {
      validateAiSettings(aiDraft)
      if (!(await ensureAiHostPermission(aiDraft.baseUrl))) {
        throw new Error('没有授予该 AI 地址的网络访问权限。')
      }
      await getAiProvider(aiDraft).testConnection(aiDraft)
      setAiDraft((previous) => ({ ...previous, configured: true }))
      setAiTestState('ok')
    } catch (testError) {
      setAiTestState('error')
      setAiError(messageOf(testError))
    } finally {
      setAiBusy(false)
    }
  }

  async function runSelectionAi(action: 'clarify' | 'shorten' | 'split_constraints') {
    if (!current || !selection) return
    if (!aiSettings.enabled || !aiSettings.configured) {
      openAi(false)
      return
    }
    setAiBusy(true)
    setAiError(null)
    try {
      const result = await getAiProvider(aiSettings).generate(aiSettings, {
        action,
        content: selection.text,
        surroundingContext: aiSettings.scope === 'context' ? compilePrompt(current, 'plain') : undefined,
      })
      setSuggestion(
        makeReplacementSuggestion({
          action,
          sourceText: selection.text,
          replacementText: result,
          sourceRevision: current.revision,
          range: { from: selection.from, to: selection.to },
        }),
      )
      setSelection(null)
    } catch (aiRunError) {
      setAiError(messageOf(aiRunError))
      setAiPanel('menu')
    } finally {
      setAiBusy(false)
    }
  }

  async function runGlobalAi(action: 'draft_acceptance' | 'ambiguity' | 'structure') {
    if (!current) return
    if (!aiSettings.enabled || !aiSettings.configured) {
      openAi()
      return
    }
    setAiBusy(true)
    setAiError(null)
    try {
      const result = await getAiProvider(aiSettings).generate(aiSettings, {
        action,
        content: compilePrompt(current, 'plain'),
      })
      setSuggestion(
        makeAppendSuggestion({
          action,
          replacementText: result,
          sourceRevision: current.revision,
          sectionKind: action === 'draft_acceptance' ? 'acceptance' : undefined,
        }),
      )
      setAiPanel(null)
    } catch (aiRunError) {
      setAiError(messageOf(aiRunError))
      setAiPanel('menu')
    } finally {
      setAiBusy(false)
    }
  }

  function acceptSuggestion() {
    if (!suggestion || !current) return
    if (!isSuggestionCurrent(suggestion, current.revision)) {
      setError('正文已经变化，这条 AI 建议已过期，不能直接应用。')
      return
    }
    if (suggestion.target === 'selection' && suggestion.range) {
      editorRef.current?.replaceRange(suggestion.range.from, suggestion.range.to, suggestion.replacementText)
    } else if (suggestion.target === 'append-section' && suggestion.sectionKind === 'acceptance') {
      editorRef.current?.appendSection('acceptance', suggestion.replacementText)
    }
    setSuggestion(null)
  }

  async function copyCompiled(format: CompileFormat) {
    if (!current) return
    try {
      await navigator.clipboard.writeText(compilePrompt(current, format))
      setToast(format === 'plain' ? '已复制' : `已复制 ${format === 'markdown' ? 'Markdown' : 'XML'}`)
    } catch {
      setError('复制失败，请从预览中手动复制。')
    }
  }

  if (!loaded || !current) {
    return <div className="boot-state">{error ?? '正在打开 PromptNote…'}</div>
  }

  const aiLabel = !aiSettings.enabled
    ? 'AI 已关闭'
    : aiSettings.configured
      ? aiSettings.completionEnabled
        ? 'AI · 补全开'
        : 'AI 已连接'
      : 'AI 未配置'

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-button" aria-label="Prompt 列表" onClick={() => setDocumentSheetOpen(true)}>☰</button>
        <div className="title-wrap">
          <input className="title-input" value={current.title} onChange={(event) => updateTitle(event.target.value)} aria-label="Prompt 标题" />
          <span className={`save-state save-state--${saveState}`}>{saveLabel(saveState)}</span>
        </div>
        <button className={`ai-chip ${aiSettings.configured && aiSettings.enabled ? 'ai-chip--ready' : ''}`} onClick={() => openAi()}>
          <span className="ai-chip__dot" />{aiLabel}
        </button>
      </header>

      <main className="workspace">
        {previewOpen ? (
          <Preview
            text={previewText}
            format={previewFormat}
            onFormat={setPreviewFormat}
            onBack={() => setPreviewOpen(false)}
            onCopy={() => void copyCompiled(previewFormat)}
          />
        ) : (
          <>
            <div className="editor-scroll">
              <PromptEditor
                ref={editorRef}
                documentId={current.id}
                content={current.content}
                completionText={completionText}
                completionContextChars={aiSettings.completionContextChars}
                onChange={updateCurrentContent}
                onSelectionChange={setSelection}
                onCompletionContext={setCompletionContext}
                onSlashRequest={() => { setSlashOpen(true); setSelection(null) }}
              />
              {slashOpen && (
                <SlashMenu
                  onClose={() => setSlashOpen(false)}
                  onEscape={() => {
                    editorRef.current?.insertText('/')
                    setSlashOpen(false)
                  }}
                  onInsert={(kind) => {
                    editorRef.current?.insertSection(kind)
                    setSlashOpen(false)
                  }}
                />
              )}
              {selection && !aiBusy && (
                <SelectionActionBar
                  selection={selection}
                  onAction={(action) => void runSelectionAi(action)}
                  onMore={() => openAi(false)}
                  onConvert={(format) => {
                    editorRef.current?.convertSelectedBlock(format)
                    setSelection(null)
                  }}
                />
              )}
              {aiBusy && <div className="inline-status">AI 正在生成建议…</div>}
              {suggestion && <SuggestionCard suggestion={suggestion} stale={suggestionIsStale} onAccept={acceptSuggestion} onIgnore={() => setSuggestion(null)} />}
              {lintOpen && <LintCard findings={localFindings} aiReady={aiSettings.enabled && aiSettings.configured} onDeepCheck={() => { if (aiSettings.enabled && aiSettings.configured) void runGlobalAi('ambiguity'); else openAi() }} />}
            </div>
            <footer className="actionbar actionbar--three">
              <button className="actionbar__light" onClick={() => setLintOpen((value) => !value)}>检查</button>
              <button className="actionbar__light" onClick={() => setPreviewOpen(true)}>预览</button>
              <button className="primary-button" onClick={() => void copyCompiled('plain')}>复制</button>
            </footer>
          </>
        )}
      </main>

      {documentSheetOpen && (
        <DocumentSheet
          documents={documents}
          currentId={current.id}
          onClose={() => setDocumentSheetOpen(false)}
          onSwitch={(id) => void switchDocument(id)}
          onCreate={() => void createDocument()}
          onDelete={() => void deleteCurrentDocument()}
          onExport={exportCurrentDocument}
          onImport={(file) => void importPromptDocumentBackup(file)}
        />
      )}
      {aiPanel && (
        <AiSheet
          mode={aiPanel}
          settings={aiDraft}
          busy={aiBusy}
          testState={aiTestState}
          error={aiError}
          onSettings={updateAiDraft}
          onProvider={(provider) => setAiDraft((previous) => ({
            ...previous,
            provider,
            baseUrl: defaultBaseUrl(provider),
            configured: false,
            completionEnabled: false,
          }))}
          onClose={() => setAiPanel(null)}
          onOpenSettings={() => setAiPanel('settings')}
          onSave={() => void saveAiSettings()}
          onTest={() => void testAiConnection()}
          onAction={(action) => void runGlobalAi(action)}
        />
      )}
      {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError(null)}>×</button></div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function isSameDocumentVersion(
  left: PromptDocument | null,
  right: PromptDocument,
): boolean {
  return left?.id === right.id && left.revision === right.revision
}

function upsertDocument(documents: PromptDocument[], document: PromptDocument): PromptDocument[] {
  const existing = documents.find((item) => item.id === document.id)
  if (
    existing &&
    (existing.revision > document.revision ||
      (existing.revision === document.revision && existing.updatedAt >= document.updatedAt))
  ) {
    return documents
  }

  const withoutCurrent = documents.filter((item) => item.id !== document.id)
  const insertAt = withoutCurrent.findIndex((item) => item.updatedAt < document.updatedAt)
  if (insertAt < 0) return [...withoutCurrent, document]
  return [
    ...withoutCurrent.slice(0, insertAt),
    document,
    ...withoutCurrent.slice(insertAt),
  ]
}

function validateAiSettings(settings: AiSettings) {
  if (!settings.model.trim()) throw new Error('请填写 Model。')
  if (!settings.apiKey.trim()) throw new Error('请填写 API Key。')
  const url = new URL(settings.baseUrl)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('API Base URL 必须是 HTTP(S) 地址。')
  }
}

function safeFileName(value: string) {
  const trimmed = value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ')
  return trimmed.slice(0, 80) || 'prompt'
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function shortCompletionError(message: string) {
  const normalized = message.replace(/\s+/g, ' ').trim()
  return normalized.length > 96 ? `${normalized.slice(0, 96)}…` : normalized
}

function saveLabel(state: SaveState) {
  if (state === 'saving') return '保存中…'
  if (state === 'saved') return '已保存'
  if (state === 'error') return '未保存'
  return ''
}
