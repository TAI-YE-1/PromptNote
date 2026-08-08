import { lazy, Suspense, type ComponentProps } from 'react'

type AiSheetProps = ComponentProps<(typeof import('./AiSheet'))['AiSheet']>
type DocumentSheetProps = ComponentProps<(typeof import('./DocumentSheet'))['DocumentSheet']>

const LazyAiSheet = lazy(async () => {
  const module = await import('./AiSheet')
  return { default: module.AiSheet }
})

const LazyDocumentSheet = lazy(async () => {
  const module = await import('./DocumentSheet')
  return { default: module.DocumentSheet }
})

export function AiSheet(props: AiSheetProps) {
  return (
    <Suspense fallback={<SheetLoading label="正在打开 AI 设置…" />}>
      <LazyAiSheet {...props} />
    </Suspense>
  )
}

export function DocumentSheet(props: DocumentSheetProps) {
  return (
    <Suspense fallback={<SheetLoading label="正在打开本地 Prompt…" />}>
      <LazyDocumentSheet {...props} />
    </Suspense>
  )
}

function SheetLoading(props: { label: string }) {
  return (
    <div className="overlay">
      <section className="sheet sheet--loading" aria-live="polite">
        {props.label}
      </section>
    </div>
  )
}
