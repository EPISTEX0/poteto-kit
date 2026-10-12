import React from 'react'

const { useEffect: runEffect } = React
const { 'useEffect': runQuotedEffect } = React

export function EffectOnMount() {
  runEffect(() => {
    document.title = 'mounted'
  }, [])
  runQuotedEffect(() => {
    document.title = 'mounted again'
  }, [])
  return null
}
