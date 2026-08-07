import { vi } from 'vitest'

class FakeHTMLElement {
  private content = ''
  parentElement: FakeHTMLElement | null = null
  isConnected = true
  isContentEditable = false
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

  contains(node: unknown) {
    return node === this || (node instanceof FakeTextNode && node.parentElement === this)
  }
}

export class FakeChatGptComposer extends FakeHTMLElement {
  readonly id = 'prompt-textarea'
  readonly role = 'textbox'
  readonly contentEditable = 'true'
  readonly className = 'ProseMirror'
  override isContentEditable = true
}

export class FakeTextarea extends FakeHTMLElement {
  private currentValue = ''
  selectionStart: number | null
  selectionEnd: number | null
  disabled = false
  readOnly = false
  setSelectionRange = vi.fn((start: number, end: number) => {
    this.selectionStart = start
    this.selectionEnd = end
  })

  constructor(value = '', start = value.length, end = start) {
    super('')
    this.currentValue = value
    this.selectionStart = start
    this.selectionEnd = end
  }

  get value() {
    return this.currentValue
  }

  set value(value: string) {
    this.currentValue = value
  }
}

class FakeInput extends FakeTextarea {
  type = 'text'
}

class FakeTextNode {
  parentElement: FakeHTMLElement | null = null
  insertedEnd = 0

  constructor(readonly data: string) {}
}

class FakeRange {
  private target: FakeHTMLElement | null
  private start: number
  private end: number

  constructor(target: FakeHTMLElement | null = null, start = 0, end = start) {
    this.target = target
    this.start = start
    this.end = end
  }

  get collapsed() {
    return this.start === this.end
  }

  get commonAncestorContainer() {
    if (!this.target) throw new Error('Range has no target.')
    return this.target
  }

  cloneRange() {
    return new FakeRange(this.target, this.start, this.end)
  }

  toString() {
    if (!this.target) return ''
    const text = this.target.textContent ?? ''
    return text.slice(this.start, this.end)
  }

  selectNodeContents(element: FakeHTMLElement) {
    this.target = element
    this.start = 0
    this.end = element.textContent?.length ?? 0
  }

  collapse(toStart: boolean) {
    if (toStart) this.end = this.start
    else this.start = this.end
  }

  deleteContents() {
    if (!this.target) throw new Error('Range has no target.')
    const text = this.target.textContent ?? ''
    this.target.textContent = `${text.slice(0, this.start)}${text.slice(this.end)}`
    this.end = this.start
  }

  insertNode(node: FakeTextNode) {
    if (!this.target) throw new Error('Range has no target.')
    const text = this.target.textContent ?? ''
    this.target.textContent = `${text.slice(0, this.start)}${node.data}${text.slice(this.start)}`
    node.parentElement = this.target
    node.insertedEnd = this.start + node.data.length
  }

  setStartAfter(node: FakeTextNode) {
    this.start = node.insertedEnd
    this.end = this.start
  }

  replaceSelection(text: string) {
    this.deleteContents()
    const node = new FakeTextNode(text)
    this.insertNode(node)
    this.setStartAfter(node)
  }
}

class FakeEvent {
  constructor(
    readonly type: string,
    readonly init?: Record<string, unknown>,
  ) {}
}

class FakeInputEvent extends FakeEvent {}

export function installTextareaFixture(input: {
  text: string
  start?: number
  end?: number
  active?: boolean
}) {
  const composer = new FakeTextarea(
    input.text,
    input.start ?? input.text.length,
    input.end ?? input.start ?? input.text.length,
  )
  installGlobals({ activeElement: input.active === false ? null : composer, candidates: [composer] })
  return { composer }
}

export function installChatGptContentEditableFixture(input?: {
  text?: string
  start?: number
  end?: number
  execCommandSucceeds?: boolean
  execCommandAvailable?: boolean
  execCommandMutates?: boolean
}) {
  const composer = new FakeChatGptComposer(input?.text ?? '')
  const range = new FakeRange(
    composer,
    input?.start ?? (input?.text?.length ?? 0),
    input?.end ?? input?.start ?? (input?.text?.length ?? 0),
  )
  const selection = createSelection(range)
  const execCommand = vi.fn((_command: string, _showUi: boolean, value: string) => {
    if (input?.execCommandSucceeds === false) return false
    if (input?.execCommandMutates !== false) selection.getRangeAt(0).replaceSelection(value)
    return true
  })

  installGlobals({
    activeElement: composer,
    candidates: [composer],
    range,
    selection,
    promptComposer: composer,
    execCommand: input?.execCommandAvailable === false ? undefined : execCommand,
  })
  return { composer, execCommand, selection }
}

export function installUnsupportedPageFixture() {
  installGlobals({ activeElement: null, candidates: [] })
}

function createSelection(initialRange: FakeRange) {
  let currentRange: FakeRange | null = initialRange
  return {
    get rangeCount() {
      return currentRange ? 1 : 0
    },
    getRangeAt: vi.fn((_index: number) => {
      if (!currentRange) throw new Error('Selection has no range.')
      return currentRange
    }),
    removeAllRanges: vi.fn(() => {
      currentRange = null
    }),
    addRange: vi.fn((range: FakeRange) => {
      currentRange = range
    }),
  }
}

function installGlobals(input: {
  activeElement: FakeHTMLElement | null
  candidates: FakeHTMLElement[]
  range?: FakeRange
  selection?: ReturnType<typeof createSelection>
  promptComposer?: FakeChatGptComposer
  execCommand?: ReturnType<typeof vi.fn>
}) {
  const fallbackRange = input.range ?? new FakeRange()
  const selection = input.selection ?? createSelection(fallbackRange)

  vi.stubGlobal('Element', FakeHTMLElement)
  vi.stubGlobal('HTMLElement', FakeHTMLElement)
  vi.stubGlobal('HTMLTextAreaElement', FakeTextarea)
  vi.stubGlobal('HTMLInputElement', FakeInput)
  vi.stubGlobal('Event', FakeEvent)
  vi.stubGlobal('InputEvent', FakeInputEvent)
  vi.stubGlobal('window', { getSelection: () => selection })
  vi.stubGlobal('document', {
    activeElement: input.activeElement,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector(selector: string) {
      if (selector === '#prompt-textarea') return input.promptComposer ?? null
      if (selector === 'textarea[data-id="root"]') return null
      return null
    },
    querySelectorAll: vi.fn(() => input.candidates),
    createRange: () => new FakeRange(),
    createTextNode: (text: string) => new FakeTextNode(text),
    ...(input.execCommand ? { execCommand: input.execCommand } : {}),
  })
}
