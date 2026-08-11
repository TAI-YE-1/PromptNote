import { setBlockType, splitBlock } from '@tiptap/pm/commands'
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'
import type { SectionKind } from '../prompt/sectionKinds'

export function canConvertCurrentBlockToSection(state: EditorState): boolean {
  const { selection } = state
  if (!selection.empty) return false

  const { $from } = selection
  const promptSection = state.schema.nodes.promptSection
  if (!promptSection || !$from.parent.isTextblock || $from.parentOffset !== 0 || $from.depth < 1) {
    return false
  }

  const containerDepth = $from.depth - 1
  const container = $from.node(containerDepth)
  const index = $from.index(containerDepth)
  return container.canReplaceWith(index, index + 1, promptSection)
}

export function createSlashSectionTransaction(
  state: EditorState,
  kind: SectionKind,
): Transaction | null {
  const { selection } = state
  const promptSection = state.schema.nodes.promptSection
  if (!promptSection || !selection.empty || !selection.$from.parent.isTextblock) return null

  if (canConvertCurrentBlockToSection(state)) {
    return state.tr.setNodeMarkup(selection.$from.before(), promptSection, { kind })
  }

  const splitTransactions: Transaction[] = []
  const didSplit = splitBlock(state, (transaction) => {
    splitTransactions.push(transaction)
  })
  const splitTransaction = splitTransactions[0]
  if (!didSplit || !splitTransaction) return null

  const afterSplit = state.apply(splitTransaction)
  const conversionTransactions: Transaction[] = []
  const didConvert = setBlockType(promptSection, { kind })(afterSplit, (transaction) => {
    conversionTransactions.push(transaction)
  })
  const conversionTransaction = conversionTransactions[0]
  if (!didConvert || !conversionTransaction) return null

  for (const step of conversionTransaction.steps) splitTransaction.step(step)
  splitTransaction.setSelection(conversionTransaction.selection)
  return splitTransaction
}

export function createAppendSectionTransaction(
  state: EditorState,
  kind: SectionKind,
  text: string,
): Transaction | null {
  const promptSection = state.schema.nodes.promptSection
  if (!promptSection) return null

  const section = promptSection.create(
    { kind },
    text ? state.schema.text(text) : undefined,
  )
  const position = state.doc.content.size
  const transaction = state.tr.insert(position, section)
  const cursorPosition = position + 1 + section.content.size
  transaction.setSelection(TextSelection.near(transaction.doc.resolve(cursorPosition), -1))
  return transaction
}
