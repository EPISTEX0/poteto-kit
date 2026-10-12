import { useEffect } from 'react'

export function EffectOnMount() {
  useEffect(() => {
    document.title = 'mounted'
  }, [])
  return null
}
