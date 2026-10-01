import { Fragment, type ReactNode } from 'react'

/** web addresses and email addresses in running text (a URL's closing punctuation stays text) */
const LINK = /(https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)\]])|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g

function linked(text: string): ReactNode {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    const url = !!m[1]
    out.push(
      <a key={at} href={url ? m[0] : `mailto:${m[0]}`} target={url ? '_blank' : undefined} rel="noreferrer">
        {m[0]}
      </a>,
    )
    last = at + m[0].length
  }
  if (last === 0) return text
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** renders **marked** words in ink, the rest in the softer grey (and makes addresses links) */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 ? <em key={i}>{linked(part)}</em> : <Fragment key={i}>{linked(part)}</Fragment>,
      )}
    </>
  )
}
