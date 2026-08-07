import type { InsertPlacement } from '../extension/messages'

type TextControl = HTMLTextAreaElement | HTMLInputElement

const textInputTypes = new Set(['text', 'search', 'email', 'url', 'tel'])

let trackingStarted = false
let lastEditable: HTMLElement | null = null
let lastContentRange: Range | null = null

export function startEditableTracking(): void {
  if (trackingStarted) return
  trackingStarted = true

  document.addEventListener('focusin', captureFocusedEditable, true)
  document.addEventListener('selectionchange', captureContentSelection)
  captureFocusedEditable()
  captureContentSelection()
}

export function stopEditableTracking(): void {
  if (!trackingStarted) return
  trackingStarted = false
  document.removeEventListener('focusin', captureFocusedEditable, true)
  document.removeEventListener('selectionchange', captureContentSelection)
  lastEditable = null
  lastContentRange = null
}

export function findGenericEditable(): HTMLElement | null {
  const focused = asEditable(document.activeElement)
  if (focused) return focused

  const selected = editableFromSelection(window.getSelection())
  if (selected) return selected

  if (lastEditable?.isConnected !== false) return lastEditable

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      'textarea, input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], [contenteditable="true"], [contenteditable="plaintext-only"]',
    ),
  ).filter(isUsableEditable)

  return candidates.length === 1 ? candidates[0] ?? null : null
}

export function insertIntoEditable(element: HTMLElement, text: string): InsertPlacement {
  if (!isUsableEditable(element)) throw new Error('目标输入框当前不可编辑。')
  if (isTextControl(element)) return insertIntoTextControl(element, text)
  if (!element.isContentEditable) throw new Error('目标元素不是可编辑文本输入框。')
  return insertIntoContentEditable(element, text)
}

function insertIntoTextControl(element: TextControl, text: string): InsertPlacement {
  const value = element.value
  const hasCaret = typeof element.selectionStart === 'number' && typeof element.selectionEnd === 'number'
  const start = hasCaret ? element.selectionStart ?? value.length : value.length
  const end = hasCaret ? element.selectionEnd ?? start : start
  const placement: InsertPlacement = start !== end ? 'selection' : hasCaret ? 'caret' : 'end'
  const next = `${value.slice(0, start)}${text}${value.slice(end)}`

  setNativeValue(element, next)
  const caret = start + text.length
  element.setSelectionRange?.(caret, caret)
  element.focus()
  dispatchInput(element, text, start !== end)
  lastEditable = element
  return placement
}

function insertIntoContentEditable(element: HTMLElement, text: string): InsertPlacement {
  element.focus()
  const selection = window.getSelection()
  const resolved = resolveContentRange(element, selection)
  const range = resolved.range
  const fallbackRange = range.cloneRange()
  const beforeText = element.textContent ?? ''
  const selectedText = range.toString()

  selection?.removeAllRanges()
  selection?.addRange(range)

  const commandReportedSuccess =
    typeof document.execCommand === 'function' && document.execCommand('insertText', false, text)
  const afterCommandText = element.textContent ?? ''
  const commandProducedExpectedChange =
    text.length === 0 ||
    afterCommandText !== beforeText ||
    (resolved.placement === 'selection' && selectedText === text)

  if (!commandReportedSuccess || !commandProducedExpectedChange) {
    fallbackRange.deleteContents()
    const textNode = document.createTextNode(text)
    fallbackRange.insertNode(textNode)
    fallbackRange.setStartAfter(textNode)
    fallbackRange.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(fallbackRange)
    dispatchInput(element, text, resolved.placement === 'selection')
  }

  const afterText = element.textContent ?? ''
  if (
    text.length > 0 &&
    afterText === beforeText &&
    !(resolved.placement === 'selection' && selectedText === text)
  ) {
    throw new Error('网页编辑器没有接受插入内容，请先复制后手动粘贴。')
  }

  lastEditable = element
  captureContentSelection()
  return resolved.placement
}

function resolveContentRange(
  element: HTMLElement,
  selection: Selection | null,
): { range: Range; placement: InsertPlacement } {
  if (selection?.rangeCount) {
    const current = selection.getRangeAt(0)
    if (rangeBelongsTo(current, element)) {
      return {
        range: current.cloneRange(),
        placement: current.collapsed ? 'caret' : 'selection',
      }
    }
  }

  if (lastEditable === element && lastContentRange && rangeBelongsTo(lastContentRange, element)) {
    return {
      range: lastContentRange.cloneRange(),
      placement: lastContentRange.collapsed ? 'caret' : 'selection',
    }
  }

  const fallback = document.createRange()
  fallback.selectNodeContents(element)
  fallback.collapse(false)
  return { range: fallback, placement: 'end' }
}

function captureFocusedEditable(): void {
  const editable = asEditable(document.activeElement)
  if (editable) lastEditable = editable
}

function captureContentSelection(): void {
  const selection = window.getSelection()
  const editable = editableFromSelection(selection)
  if (!editable || !selection?.rangeCount) return
  lastEditable = editable
  lastContentRange = selection.getRangeAt(0).cloneRange()
}

function editableFromSelection(selection: Selection | null): HTMLElement | null {
  if (!selection?.rangeCount) return null
  const range = selection.getRangeAt(0)
  return editableFromNode(range.commonAncestorContainer)
}

function editableFromNode(node: Node | null): HTMLElement | null {
  let element: Element | null
  if (node instanceof Element) element = node
  else element = node?.parentElement ?? null

  while (element) {
    const editable = asEditable(element)
    if (editable) return editable
    element = element.parentElement
  }
  return null
}

function asEditable(element: Element | null): HTMLElement | null {
  if (!element || !(element instanceof HTMLElement)) return null
  if (element instanceof HTMLTextAreaElement) return isUsableEditable(element) ? element : null
  if (element instanceof HTMLInputElement) {
    return textInputTypes.has(element.type || 'text') && isUsableEditable(element) ? element : null
  }
  if (!element.isContentEditable) return null

  let root = element
  while (root.parentElement?.isContentEditable) root = root.parentElement
  return isUsableEditable(root) ? root : null
}

function isTextControl(element: HTMLElement): element is TextControl {
  return element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement
}

function isUsableEditable(element: HTMLElement): boolean {
  if (element.isConnected === false) return false
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return !element.disabled && !element.readOnly
  }
  return element.isContentEditable
}

function rangeBelongsTo(range: Range, element: HTMLElement): boolean {
  const node = range.commonAncestorContainer
  return node === element || element.contains(node)
}

function setNativeValue(element: TextControl, value: string): void {
  const prototype =
    element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  if (descriptor?.set) descriptor.set.call(element, value)
  else element.value = value
}

function dispatchInput(element: HTMLElement, text: string, replacing: boolean): void {
  const inputType = replacing ? 'insertReplacementText' : 'insertText'
  const event =
    typeof InputEvent === 'function'
      ? new InputEvent('input', { bubbles: true, inputType, data: text })
      : new Event('input', { bubbles: true })
  element.dispatchEvent(event)
}
