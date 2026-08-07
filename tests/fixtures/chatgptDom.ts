import { vi } from 'vitest'

class FakeHTMLElement {
  private content = ''
  focus = vi.fn()
  dispatchEvent = vi.fn(() => true)

  constructor(text = '') {
    this.content = text
  }

  get innerText() {
    return this.content
  }

  set innerText(value: string) {
    this.content = value
  }

  get textContent() {
    return this.content
  }

  set textContent(value: string | null) {
    this.content = value ?? ''
  }
}

export class FakeChatGptComposer extends FakeHTMLElement {
  readonly id = 'prompt-textarea'
  readonly role = 'textbox'
  readonly contentEditable = 'true'
  readonly className = 'ProseMirror'
}

export class FakeTextarea extends FakeHTMLElement {
  private currentValue = ''

  constructor(value = '') {
    super('')
    this.currentValue = value
  }

  get value() {
    return this.currentValue
  }

  set value(value: string) {
    this.currentValue = value
  }
}

class FakeInput extends FakeTextarea {}

class FakeRange {
  private target: FakeHTMLElement | null = null
  private append = false

  selectNodeContents(element: FakeHTMLElement) {
    this.target = element
    this.append = false
  }

  collapse(toEnd: boolean) {
    this.append = toEnd
  }

  insert(text: string) {
    if (!this.target) throw new Error('Range has no selected composer.')
    this.target.textContent = this.append ? `${this.target.textContent ?? ''}${text}` : text
  }
}

class FakeEvent {
  constructor(
    readonly type: string,
    readonly init?: Record<string, unknown>,
  ) {}
}

class FakeInputEvent extends FakeEvent {}

export function installChatGptContentEditableFixture(input?: {
  text?: string
  execCommandSucceeds?: boolean
}) {
  const composer = new FakeChatGptComposer(input?.text ?? '')
  const range = new FakeRange()
  const selection = {
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  }
  const execCommand = vi.fn((_command: string, _showUi: boolean, value: string) => {
    if (input?.execCommandSucceeds === false) return false
    range.insert(value)
    return true
  })

  installGlobals({ composer, range, selection, execCommand })
  return { composer, execCommand, selection }
}

export function installLegacyTextareaFixture(text = '') {
  const composer = new FakeTextarea(text)
  const range = new FakeRange()
  const selection = {
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  }
  const execCommand = vi.fn(() => false)

  installGlobals({ composer, range, selection, execCommand, textarea: composer })
  return { composer }
}

export function installUnsupportedChatGptFixture() {
  installBaseGlobals()
  vi.stubGlobal('window', { getSelection: () => null })
  vi.stubGlobal('document', {
    querySelector: () => null,
  })
}

function installGlobals(input: {
  composer: FakeHTMLElement
  range: FakeRange
  selection: { removeAllRanges: ReturnType<typeof vi.fn>; addRange: ReturnType<typeof vi.fn> }
  execCommand: ReturnType<typeof vi.fn>
  textarea?: FakeTextarea
}) {
  installBaseGlobals()
  vi.stubGlobal('window', {
    getSelection: () => input.selection,
  })
  vi.stubGlobal('document', {
    querySelector(selector: string) {
      if (selector === '#prompt-textarea') return input.composer
      if (selector === 'textarea[data-id="root"]') return input.textarea ?? null
      if (selector === 'textarea, [contenteditable="true"][role="textbox"]') {
        return input.textarea ?? input.composer
      }
      return null
    },
    createRange: () => input.range,
    execCommand: input.execCommand,
  })
}

function installBaseGlobals() {
  vi.stubGlobal('HTMLElement', FakeHTMLElement)
  vi.stubGlobal('HTMLTextAreaElement', FakeTextarea)
  vi.stubGlobal('HTMLInputElement', FakeInput)
  vi.stubGlobal('Event', FakeEvent)
  vi.stubGlobal('InputEvent', FakeInputEvent)
}
