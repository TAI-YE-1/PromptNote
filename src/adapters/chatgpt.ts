import type { ComposerState, InsertMode } from '../extension/messages'
import type { WebPromptAdapter } from './types'

function findComposer(): HTMLElement | null {
  const prompt = document.querySelector<HTMLElement>('#prompt-textarea')
  if (prompt) return prompt
  const textarea = document.querySelector<HTMLTextAreaElement>('textarea[data-id="root"]')
  if (textarea) return textarea
  return document.querySelector<HTMLElement>('textarea, [contenteditable="true"][role="textbox"]')
}

function readText(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) return element.value
  return element.innerText || element.textContent || ''
}

function setNativeValue(element: HTMLTextAreaElement | HTMLInputElement, value: string): void {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function insertContentEditable(element: HTMLElement, text: string, mode: InsertMode): void {
  element.focus()
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(element)
  if (mode === 'append') range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
  const value = mode === 'append' && readText(element).trim() ? `\n${text}` : text
  const inserted = typeof document.execCommand === 'function'
    ? document.execCommand('insertText', false, value)
    : false
  if (!inserted) {
    element.textContent = mode === 'append' ? `${readText(element)}${value}` : text
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }))
  }
}

export const chatGptAdapter: WebPromptAdapter = {
  id: 'chatgpt',
  canHandle(url) {
    return url.hostname === 'chatgpt.com' || url.hostname === 'chat.openai.com'
  },
  readComposer(): ComposerState {
    const composer = findComposer()
    if (!composer) return { supported: false, hasContent: false, text: '' }
    const text = readText(composer).trim()
    return { supported: true, hasContent: Boolean(text), text }
  },
  insert(text, mode) {
    const composer = findComposer()
    if (!composer) throw new Error('未找到 ChatGPT 输入框。')
    const existing = readText(composer)
    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      const next = mode === 'append' && existing.trim() ? `${existing}\n${text}` : text
      setNativeValue(composer, next)
      composer.focus()
      return
    }
    insertContentEditable(composer, text, mode)
  },
}
