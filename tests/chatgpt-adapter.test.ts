import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatGptAdapter } from '../src/adapters/chatgpt'
import { installChatGptContentEditableFixture } from './fixtures/editableDom'

afterEach(() => vi.unstubAllGlobals())

describe('chatGptAdapter', () => {
  it('handles only ChatGPT hosts', () => {
    expect(chatGptAdapter.canHandle(new URL('https://chatgpt.com/'))).toBe(true)
    expect(chatGptAdapter.canHandle(new URL('https://chat.openai.com/'))).toBe(true)
    expect(chatGptAdapter.canHandle(new URL('https://example.com/'))).toBe(false)
  })

  it('keeps the current ChatGPT composer selector as a site-specific preference', () => {
    const { composer } = installChatGptContentEditableFixture({ text: '已有内容' })

    expect(chatGptAdapter.findComposer()).toBe(composer)
    expect(composer.id).toBe('prompt-textarea')
    expect(composer.className).toBe('ProseMirror')
  })
})
