const frozen = new WeakSet<object>()

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !frozen.has(value)) {
    frozen.add(value)
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}
