import type { Feature, Slot } from './feature'

export function Shell({ features }: { features: readonly Feature[] }) {
  const parts = (slot: Slot) =>
    features.flatMap((feature) => {
      const Part = feature.slots[slot]
      return Part ? [<Part key={`${feature.id}:${slot}`} />] : []
    })

  return (
    <div className="shell" data-component="app-shell">
      <header className="topbar" data-component="topbar">
        <h1 className="app-title">Notes</h1>
        {parts('topbar')}
      </header>
      <div className="workspace">
        <div className="slot-left" data-slot="left">
          {parts('left')}
        </div>
        <div className="slot-main" data-slot="main">
          {parts('main')}
        </div>
      </div>
      {parts('overlay')}
    </div>
  )
}
