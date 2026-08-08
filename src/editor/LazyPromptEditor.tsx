import { forwardRef, lazy, Suspense, type ComponentPropsWithoutRef } from 'react'
import type { PromptEditorHandle } from './PromptEditor'

type PromptEditorProps = ComponentPropsWithoutRef<(typeof import('./PromptEditor'))['PromptEditor']>

const LazyPromptEditor = lazy(async () => {
  const module = await import('./PromptEditor')
  return { default: module.PromptEditor }
})

export const PromptEditor = forwardRef<PromptEditorHandle, PromptEditorProps>(function PromptEditor(
  props,
  ref,
) {
  return (
    <Suspense fallback={<div className="inline-status" aria-live="polite">正在打开编辑器…</div>}>
      <LazyPromptEditor {...props} ref={ref} />
    </Suspense>
  )
})
