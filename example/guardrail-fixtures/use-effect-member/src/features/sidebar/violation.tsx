import React from 'react'

export function EffectOnMount() {
  React.useEffect(() => {
    document.title = 'mounted'
  }, [])
  React['useEffect'](() => {
    document.title = 'mounted again'
  }, [])
  return null
}
