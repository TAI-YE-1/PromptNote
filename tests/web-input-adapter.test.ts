import { afterEach, describe, expect, it, vi } from 'vitest'
import { insertIntoEditable, findGenericEditable } from '../src/adapters/editable'
import {
  installChatGptContentEditableFixture,
  installTextareaFixture,
} from './fixtures/editableDom'

afterEach(() => vi.unstubAllGlobals())

describe('generic web input insertion', () => {
  it('inserts into a textarea at the current caret without touching surrounding text', () => {
    const { composer } = installTextareaFixture({ text: 'hello world', start: 5 })

    expect(findGenericEditable()).toBe(composer)
    expect(insertIntoEditable(composer as unknown as HTMLElement, ' PromptNote')).toBe('caret')
    expect(composer.value).toBe('hello PromptNote world')
    expect(composer.setSelectionRange).toHaveBeenCalledWith(16, 16)
    expect(composer.dispatchEvent).toHaveBeenCalledOnce()
  })

  it('replaces only the selected textarea range', () => {
    const { composer } = installTextareaFixture({ text: 'old suffix', start: 0, end: 3 })

    expect(insertIntoEditable(composer as unknown as HTMLElement, 'new')).toBe('selection')
    expect(composer.value).toBe('new suffix')
  })

  it('uses the current contenteditable caret instead of appending the whole prompt', () => {
    const { composer, execCommand } = installChatGptContentEditableFixture({
      text: 'AB',
      start: 1,
      execCommandSucceeds: true,
    })

    expect(insertIntoEditable(composer as unknown as HTMLElement, 'X')).toBe('caret')
    expect(composer.innerText).toBe('AXB')
    expect(execCommand).toHaveBeenCalledWith('insertText', false, 'X')
  })

  it('replaces a contenteditable selection through the browser selection path', () => {
    const { composer } = installChatGptContentEditableFixture({
      text: 'ABCDE',
      start: 1,
      end: 4,
      execCommandSucceeds: true,
    })

    expect(insertIntoEditable(composer as unknown as HTMLElement, 'X')).toBe('selection')
    expect(composer.innerText).toBe('AXE')
  })

  it('falls back to a Range insertion when execCommand is unavailable', () => {
    const { composer, execCommand } = installChatGptContentEditableFixture({
      text: 'AB',
      start: 1,
      execCommandAvailable: false,
    })

    expect(insertIntoEditable(composer as unknown as HTMLElement, 'X')).toBe('caret')
    expect(execCommand).not.toHaveBeenCalled()
    expect(composer.innerText).toBe('AXB')
    expect(composer.dispatchEvent).toHaveBeenCalledOnce()
  })

  it('falls back when execCommand reports success but does not change the editor DOM', () => {
    const { composer, execCommand } = installChatGptContentEditableFixture({
      text: 'AB',
      start: 1,
      execCommandSucceeds: true,
      execCommandMutates: false,
    })

    expect(insertIntoEditable(composer as unknown as HTMLElement, 'X')).toBe('caret')
    expect(execCommand).toHaveBeenCalledWith('insertText', false, 'X')
    expect(composer.innerText).toBe('AXB')
    expect(composer.dispatchEvent).toHaveBeenCalledOnce()
  })
})
