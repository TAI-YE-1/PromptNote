import { mergeAttributes, Node } from '@tiptap/core'
import { isSectionKind, sectionKindMeta } from '../prompt/sectionKinds'

export const PromptSection = Node.create({
  name: 'promptSection',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: 'context',
        parseHTML: (element) => element.getAttribute('data-kind') ?? 'context',
        renderHTML: (attributes) => ({ 'data-kind': String(attributes.kind) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-prompt-section]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const kind = isSectionKind(HTMLAttributes.kind) ? HTMLAttributes.kind : 'context'
    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-prompt-section': 'true',
        'data-kind': kind,
        'data-label': sectionKindMeta[kind].label,
      }),
      0,
    ]
  },
})
