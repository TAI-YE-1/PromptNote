import { sectionKindMeta, sectionKinds, type SectionKind } from '../prompt/sectionKinds'

export function SlashMenu(props: { onClose(): void; onInsert(kind: SectionKind): void }) {
  return (
    <div className="slash-menu">
      <div className="slash-menu__head">
        <span>Prompt 结构</span>
        <button onClick={props.onClose}>×</button>
      </div>
      {sectionKinds.map((kind) => {
        const meta = sectionKindMeta[kind]
        return (
          <button
            key={kind}
            className="slash-item"
            data-kind={kind}
            onClick={() => props.onInsert(kind)}
          >
            <span className="slash-item__icon">{meta.icon}</span>
            <span>
              <strong>{meta.label}</strong>
              <small>{meta.description}</small>
            </span>
          </button>
        )
      })}
    </div>
  )
}
