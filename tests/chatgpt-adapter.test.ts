import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chatGptAdapter } from '../src/adapters/chatgpt'

class FakeHTMLElement {
  innerText = ''
  textContent = ''
  focus = vi.fn()
  dispatchEvent = vi.fn(() => true)
}

class FakeTextarea extends FakeHTMLElement {
  private currentValue = ''

  get value() {
    return this.currentValue
  }

  set value(value: string) {
    this.currentValue = value
  }
}

class FakeInput extends FakeTextarea {}

function installDom(composer: FakeTextarea | null) {
  vi.stubGlobal('HTMLElement', FakeHTMLElement)
  vi.stubGlobal('HTMLTextAreaElement', FakeTextarea)
  vi.stubGlobal('HTMLInputElement', FakeInput)
  vi.stubGlobal('document', {
    querySelector(selector: string) {
      if (selector === '#prompt-textarea') return composer
      return null
    },
  })
}

describe('chatGptAdapter', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('detects an existing ChatGPT composer and its current content', () => {
    const composer = new FakeTextarea()
    composer.value = '已经有内容'
    installDom(composer)

    expect(chatGptAdapter.readComposer()).toEqual({
      supported: true,
      hasContent: true,
      text: '已经有内容',
    })
  })

  it('appends without silently overwriting existing textarea content', () => {
    const composer = new FakeTextarea()
    composer.value = '原内容'
    installDom(composer)

    chatGptAdapter.insert('新的 Prompt', 'append')

    expect(composer.value).toBe('原内容\n新的 Prompt')
    expect(composer.focus).toHaveBeenCalledOnce()
    expect(composer.dispatchEvent).toHaveBeenCalledTimes(2)
  })

  it('replaces content only when replacement mode was explicitly selected', () => {
    const composer = new FakeTextarea()
    composer.value = '原内容'
    installDom(composer)

    chatGptAdapter.insert('新的 Prompt', 'replace')

    expect(composer.value).toBe('新的 Prompt')
  })

  it('fails visibly when the page has no supported composer', () => {
    installDom(null)
    expect(chatGptAdapter.readComposer().supported).toBe(false)
    expect(() => chatGptAdapter.insert('内容', 'replace')).toThrow(/输入框/)
  })
})
