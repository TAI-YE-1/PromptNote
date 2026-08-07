import { useEffect, useMemo, useRef, useState } from 'react'
import { PromptEditor, type EditorSelectionSnapshot, type PromptEditorHandle } from './editor/PromptEditor'
import { compilePrompt, type CompileFormat } from './prompt/compiler'
import {
  cloneWithContent,
  createPromptDocument,
  createPromptDocumentExport,
  parsePromptDocumentExport,
  type PromptDocument,
  type PromptNodeJSON,
} from './prompt/schema'
import { ChromePromptRepository } from './storage/promptRepository'
import { ChromeAiSettingsRepository, defaultAiSettings } from './storage/aiSettingsRepository'
import { defaultBaseUrl, ensureAiHostPermission, getAiProvider } from './ai/provider'
import { lintPrompt } from './ai/lint'
import {
  isSuggestionCurrent,
  makeAppendSuggestion,
  makeReplacementSuggestion,
} from './ai/suggestions'
import type { AiSettings, PromptSuggestion } from './ai/types'
import type { ContentRequest, ContentResponse, InsertPlacement } from './extension/messages'
import {
  AiSheet,
  DocumentSheet,
  LintCard,
  Preview,
  SelectionContextMenu,
  SlashMenu,
  SuggestionCard,
} from './ui/components'

const promptRepository = new ChromePromptRepository()
const aiSettingsRepository = new ChromeAiSettingsRepository()

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type AiPanel = 'menu' | 'settings' | null

export function App() {
  const editorRef = useRef<PromptEditorHandle | null>(null)
  const deletedDocumentIds = useRef(new Set<string>())
  const [documents, setDocuments] = useState<PromptDocument[]>([])
  const [current, setCurrent] = useState<PromptDocument | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [slashOpen, setSlashOpen] = useState(false)
  const [documentSheetOpen, setDocumentSheetOpen] = useState(false)
  const [selection, setSelection] = useState<EditorSelectionSnapshot | null>(null)
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
      setSaveState('saved')
      setDocuments((previous) => upsertDocument(previous, document))
    } catch (saveError) {
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
      setSuggestion(null)
      setSelection(null)
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
      setSuggestion(null)
      setSelection(null)
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
      setToast('已导出 PromptDocument JSON')
    } catch (exportError) {
      setError(`导出失败：${messageOf(exportError)}`)
    }
  }

  async function importPromptDocumentBackup(file: File) {
    try {
      const raw = JSON.parse(await file.text()) as unknown
      const backup = parsePromptDocumentExport(raw)
      await flushCurrent()

      let imported = backup.document
      const existing = await promptRepository.get(imported.id)
      if (existing) {
        const overwrite = window.confirm(
          `本地已存在同 ID 的“${existing.title || '未命名 Prompt'}”。确定覆盖它吗？\n\n取消则会作为一个新的导入副本保存。`,
        )
        if (!overwrite) {
          const now = new Date().toISOString()
          imported = {
            ...imported,
            id: crypto.randomUUID(),
            title: `${imported.title || '未命名 Prompt'}（导入）`,
            revision: imported.revision + 1,
            updatedAt: now,
          }
        } else {
          deletedDocumentIds.current.delete(imported.id)
        }
      }

      await promptRepository.save(imported)
      await promptRepository.setCurrentId(imported.id)
      setDocuments((previous) => upsertDocument(previous, imported))
      setCurrent(imported)
      setSuggestion(null)
      setSelection(null)
      setDocumentSheetOpen(false)
      setToast('已恢复 Prompt 备份')
    } catch (importError) {
      setError(`导入失败：${messageOf(importError)}`)
    }
  }

  function openAi(clearSelection = true) {
    setAiDraft(aiSettings)
    setAiTestState('idle')
    setAiError(null)
    setAiPanel(aiSettings.configured ? 'menu' : 'settings')
    if (clearSelection) setSelection(null)
  }

  async function saveAiSettings() {
    setAiError(null)
    try {
      if (!aiDraft.enabled) {
        await aiSettingsRepository.save(aiDraft)
        setAiSettings(aiDraft)
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
      setToast('AI 配置已保存')
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

  async function copyCompiled() {
    if (!current) return
    try {
      await navigator.clipboard.writeText(compilePrompt(current, previewFormat))
      setToast('已复制')
    } catch {
      setError('复制失败，请从预览中手动复制。')
    }
  }

  async function insertIntoPage() {
    if (!current) return
    setError(null)
    try {
      const placement = await insertIntoActivePage(compilePrompt(current, previewFormat))
      setToast(insertToast(placement))
    } catch (insertError) {
      setError(`无法插入：${messageOf(insertError)} 可继续使用“复制”。`)
    }
  }

  if (!loaded || !current) {
    return <div className="boot-state">{error ?? '正在打开 PromptNote…'}</div>
  }

  const aiLabel = !aiSettings.enabled ? 'AI 已关闭' : aiSettings.configured ? 'AI 已连接' : 'AI 未配置'

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
          <Preview text={previewText} format={previewFormat} onFormat={setPreviewFormat} onBack={() => setPreviewOpen(false)} onCopy={() => void copyCompiled()} onInsert={() => void insertIntoPage()} />
        ) : (
          <>
            <div className="editor-scroll">
              <PromptEditor
                ref={editorRef}
                documentId={current.id}
                content={current.content}
                onChange={updateCurrentContent}
                onSelectionChange={setSelection}
                onSlashRequest={() => { setSlashOpen(true); setSelection(null) }}
              />
              {slashOpen && <SlashMenu onClose={() => setSlashOpen(false)} onInsert={(kind) => { editorRef.current?.insertSection(kind); setSlashOpen(false) }} />}
              {selection && !aiBusy && (
                <SelectionContextMenu
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
            <footer className="actionbar">
              <button className="actionbar__light" onClick={() => setLintOpen((value) => !value)}>检查</button>
              <button className="actionbar__light" onClick={() => setPreviewOpen(true)}>预览</button>
              <button className="actionbar__light" onClick={() => void copyCompiled()}>复制</button>
              <button className="primary-button" onClick={() => void insertIntoPage()}>插入</button>
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
          onSettings={setAiDraft}
          onProvider={(provider) => setAiDraft((previous) => ({ ...previous, provider, baseUrl: defaultBaseUrl(provider) }))}
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

async function insertIntoActivePage(text: string): Promise<InsertPlacement> {
  const tabId = await activeTabId()
  const request: ContentRequest = { type: 'PROMPTNOTE_INSERT_AT_CARET', text }

  try {
    return await sendInsertRequest(tabId, request)
  } catch (error) {
    if (!isMissingReceiverError(error)) throw error
  }

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })
  } catch (injectionError) {
    throw new Error(
      'PromptNote 尚未获得当前网页的临时插入权限。请在目标网页点击一次 PromptNote 扩展图标，再重试。',
      { cause: injectionError },
    )
  }

  return sendInsertRequest(tabId, request)
}

async function sendInsertRequest(tabId: number, request: ContentRequest): Promise<InsertPlacement> {
  const response = (await chrome.tabs.sendMessage(tabId, request)) as ContentResponse
  if (!response.ok) throw new Error(response.error)
  if (!('placement' in response)) throw new Error('网页插入桥返回了无效响应。')
  return response.placement
}

async function activeTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error('无法确定当前标签页。')
  return tab.id
}

function upsertDocument(documents: PromptDocument[], document: PromptDocument): PromptDocument[] {
  return [...documents.filter((item) => item.id !== document.id), document].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  )
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

function isMissingReceiverError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Could not establish connection|Receiving end does not exist/i.test(message)
}

function messageOf(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (isMissingReceiverError(error)) {
    return 'PromptNote 尚未连接到当前网页。请在目标网页点击一次 PromptNote 扩展图标后重试。'
  }
  return message
}

function insertToast(placement: InsertPlacement): string {
  if (placement === 'selection') return '已替换网页当前选区；不会自动发送'
  if (placement === 'end') return '未恢复到光标，已插入输入框末尾；不会自动发送'
  return '已插入网页光标处；不会自动发送'
}

function saveLabel(state: SaveState) {
  if (state === 'saving') return '保存中…'
  if (state === 'saved') return '已保存'
  if (state === 'error') return '未保存'
  return ''
}
