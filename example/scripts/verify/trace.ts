import type { CDPSession } from 'playwright-core'

export const longTaskThresholdMs = 50

export const frameBudgetMs = 16.7

const categories = [
  'toplevel',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'v8.execute',
  'blink.user_timing',
]

type TraceEvent = {
  name?: string
  ph?: string
  pid?: number
  tid?: number
  dur?: number
  args?: { name?: string }
}

export type TraceSummary = {
  eventCount: number
  rendererMainTasks: number
  longTasks: number
  tasksOverFrameBudget: number
  longestTaskMs: number
}

export async function startTrace(session: CDPSession) {
  await session.send('Tracing.start', {
    transferMode: 'ReturnAsStream',
    traceConfig: { includedCategories: categories },
  })
}

async function readStream(session: CDPSession, handle: string) {
  let text = ''
  for (;;) {
    const chunk = await session.send('IO.read', { handle })
    text += chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString('utf8') : chunk.data
    if (chunk.eof) {
      break
    }
  }
  await session.send('IO.close', { handle })
  return text
}

export async function endTrace(session: CDPSession) {
  const complete = new Promise<string>((resolve) => {
    session.once('Tracing.tracingComplete', (event) => resolve(event.stream ?? ''))
  })
  await session.send('Tracing.end')
  const handle = await complete
  return readStream(session, handle)
}

export function summarizeTrace(text: string): TraceSummary {
  const parsed: unknown = JSON.parse(text)
  const events: TraceEvent[] = Array.isArray(parsed)
    ? parsed
    : ((parsed as { traceEvents?: TraceEvent[] }).traceEvents ?? [])

  const rendererMainThreads = new Set<string>()
  for (const event of events) {
    if (event.ph === 'M' && event.name === 'thread_name' && event.args?.name === 'CrRendererMain') {
      rendererMainThreads.add(`${event.pid}:${event.tid}`)
    }
  }

  let rendererMainTasks = 0
  let longTasks = 0
  let tasksOverFrameBudget = 0
  let longestMicros = 0
  for (const event of events) {
    const onRendererMain = rendererMainThreads.has(`${event.pid}:${event.tid}`)
    if (event.name !== 'RunTask' || event.ph !== 'X' || !onRendererMain) {
      continue
    }
    rendererMainTasks += 1
    const micros = event.dur ?? 0
    longestMicros = Math.max(longestMicros, micros)
    if (micros > longTaskThresholdMs * 1000) {
      longTasks += 1
    }
    if (micros > frameBudgetMs * 1000) {
      tasksOverFrameBudget += 1
    }
  }

  return {
    eventCount: events.length,
    rendererMainTasks,
    longTasks,
    tasksOverFrameBudget,
    longestTaskMs: Math.round(longestMicros / 100) / 10,
  }
}
