import React, { useLayoutEffect } from 'react'

const { useLayoutEffect: runLayoutEffect } = React

export function LayoutEffectOnMount() {
  useLayoutEffect(() => {
    document.title = 'laid out'
  }, [])
  React.useLayoutEffect(() => {
    document.title = 'laid out again'
  }, [])
  runLayoutEffect(() => {
    document.title = 'laid out once more'
  }, [])
  return null
}
