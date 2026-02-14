import { useEffect } from 'react'

export function useMeta({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    if (title) document.title = title
    if (description) {
      const el = document.querySelector('meta[name="description"]')
      if (el) el.setAttribute('content', description)
    }
  }, [title, description])
}

