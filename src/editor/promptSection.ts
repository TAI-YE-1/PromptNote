import { mergeAttributes, Node } from '@tiptap/core'
import { isSectionKind, sectionKindMeta, type SectionKind } from '../prompt/sectionKinds'

export function normalizeSectionKind(value: unknown): SectionKind {
  return isSectionKind(value) ? value : 'context'
}

export function promptSectionDomAttributes(value: unknown) {
  const kind = normalizeSectionKind(value)
  return {
    'data-prompt-section': 'true',
    'data-kind': kind,
    'data-label': sectionKindMeta[kind].label,
  }
}

export const PromptSection = Node.create({
  name: 'promptSection',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: 'context',
        parseHTML: (element) => normalizeSectionKind(element.getAttribute('data-kind')),
        renderHTML: (attributes) => ({
          'data-kind': normalizeSectionKind(attributes.kind),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-prompt-section]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes, promptSectionDomAttributes(node.attrs.kind)), 0]
  },
})
