import styles from './LegalLayout.module.css'

export type LegalBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }

type LegalSection = {
  title?: string
  blocks: Array<Exclude<LegalBlock, { type: 'h2' }>>
}

function isH2(block: LegalBlock): block is { type: 'h2'; text: string } {
  return block.type === 'h2'
}

export function LegalDoc({ blocks }: { blocks: LegalBlock[] }) {
  const sections: LegalSection[] = []
  let current: LegalSection = { title: undefined, blocks: [] }

  for (const block of blocks) {
    if (isH2(block)) {
      if (current.title || current.blocks.length > 0) sections.push(current)
      current = { title: block.text, blocks: [] }
      continue
    }

    current.blocks.push(block)
  }

  if (current.title || current.blocks.length > 0) sections.push(current)

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <section key={`${section.title ?? 'section'}-${sectionIndex}`} className={styles.section}>
          {section.title ? <h2 className={styles.h2}>{section.title}</h2> : null}
          {section.blocks.map((block, blockIndex) => {
            const key = `${block.type}-${blockIndex}`
            switch (block.type) {
              case 'h3':
                return (
                  <h3 key={key} className={styles.h3}>
                    {block.text}
                  </h3>
                )
              case 'p':
                return (
                  <p key={key} className={styles.p}>
                    {block.text}
                  </p>
                )
              case 'ul':
                return (
                  <ul key={key} className={styles.ul}>
                    {block.items.map((item, itemIndex) => (
                      <li key={`${item}-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                )
              default:
                return null
            }
          })}
        </section>
      ))}
    </>
  )
}

