import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chatGptAdapter } from '../src/adapters/chatgpt'
import {
  installChatGptContentEditableFixture,
  installLegacyTextareaFixture,
  installUnsupportedChatGptFixture,
} from './fixtures/chatgptDom'

describe('chatGptAdapter', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('detects the current ChatGPT ProseMirror-style contenteditable composer', () => {
    const { composer } = installChatGptContentEditableFixture({ text: '已经有内容' })

    expect(composer.id).toBe('prompt-textarea')
    expect(composer.contentEditable).toBe('true')
    expect(composer.className).toBe('ProseMirror')
    expect(chatGptAdapter.readComposer()).toEqual({
      supported: true,
      hasContent: true,
      text: '已经有内容',
    })
  })

  it('appends to the contenteditable composer through the browser selection path', () => {
    const { composer, execCommand, selection } = installChatGptContentEditableFixture({
      text: '原内容',
      execCommandSucceeds: true,
    })

    chatGptAdapter.insert('新的 Prompt', 'append')

    expect(composer.innerText).toBe('原内容\n新的 Prompt')
    expect(composer.focus).toHaveBeenCalledOnce()
    expect(selection.removeAllRanges).toHaveBeenCalledOnce()
    expect(selection.addRange).toHaveBeenCalledOnce()
    expect(execCommand).toHaveBeenCalledWith('insertText', false, '\n新的 Prompt')
  })

  it('falls back to textContent plus an input event when execCommand rejects insertion', () => {
    const { composer, execCommand } = installChatGptContentEditableFixture({
      text: '原内容',
      execCommandSucceeds: false,
    })

    chatGptAdapter.insert('替换后的 Prompt', 'replace')

    expect(execCommand).toHaveBeenCalledWith('insertText', false, '替换后的 Prompt')
    expect(composer.innerText).toBe('替换后的 Prompt')
    expect(composer.dispatchEvent).toHaveBeenCalledOnce()
  })

  it('uses the same fallback when execCommand is absent', () => {
    const { composer, execCommand } = installChatGptContentEditableFixture({
      text: '原内容',
      execCommandAvailable: false,
    })

    chatGptAdapter.insert('替换后的 Prompt', 'replace')

    expect(execCommand).not.toHaveBeenCalled()
    expect(composer.innerText).toBe('替换后的 Prompt')
    expect(composer.dispatchEvent).toHaveBeenCalledOnce()
  })

  it('keeps the legacy textarea path without silently overwriting in append mode', () => {
    const { composer } = installLegacyTextareaFixture('原内容')

    chatGptAdapter.insert('新的 Prompt', 'append')

    expect(composer.value).toBe('原内容\n新的 Prompt')
    expect(composer.focus).toHaveBeenCalledOnce()
    expect(composer.dispatchEvent).toHaveBeenCalledTimes(2)
  })

  it('replaces legacy textarea content only when replacement mode was explicitly selected', () => {
    const { composer } = installLegacyTextareaFixture('原内容')

    chatGptAdapter.insert('新的 Prompt', 'replace')

    expect(composer.value).toBe('新的 Prompt')
  })

  it('fails visibly when the page has no supported composer', () => {
    installUnsupportedChatGptFixture()

    expect(chatGptAdapter.readComposer().supported).toBe(false)
    expect(() => chatGptAdapter.insert('内容', 'replace')).toThrow(/输入框/)
  })
})
