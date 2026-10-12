export const message =
  "A store built with createStore is private to the module that builds it. Only 'store.use', 'store.get()' and calls to 'store.set(<inline function>)' may mention it: never export it, alias it, pass it or its setter around, never pass store.set anything but an inline function, and never call a function you were handed from inside that function. To change state in a new way, add a command in src/client/commands.ts whose body calls store.set((state) => ...) with the change written out, and export that command."

const inlineFunctions = new Set(['ArrowFunctionExpression', 'FunctionExpression'])

function isAllowedUse(identifier) {
  const member = identifier.parent
  if (member.type !== 'MemberExpression' || member.object !== identifier || member.computed) {
    return false
  }
  if (member.property.name === 'use') {
    return true
  }
  const call = member.parent
  const isCallee = call.type === 'CallExpression' && call.callee === member
  if (!isCallee) {
    return false
  }
  if (member.property.name === 'get') {
    return true
  }
  return member.property.name === 'set' && call.arguments.length === 1 && inlineFunctions.has(call.arguments[0].type)
}

function setterArgument(identifier) {
  const member = identifier.parent
  const call = member.type === 'MemberExpression' ? member.parent : null
  return call?.type === 'CallExpression' && member.property.name === 'set' ? call.arguments[0] : null
}

export const storeStaysPrivate = {
  meta: {
    type: 'problem',
    schema: [],
    messages: { escapes: message },
  },
  create(context) {
    const report = (node) => context.report({ node, messageId: 'escapes' })
    return {
      CallExpression(call) {
        if (call.callee.type !== 'Identifier' || call.callee.name !== 'createStore') {
          return
        }
        const declarator = call.parent
        if (declarator.type !== 'VariableDeclarator' || declarator.id.type !== 'Identifier') {
          report(call)
          return
        }
        if (declarator.parent.parent.type === 'ExportNamedDeclaration') {
          report(declarator.id)
        }
        for (const variable of context.sourceCode.getDeclaredVariables(declarator)) {
          for (const reference of variable.references) {
            const { identifier } = reference
            if (identifier === declarator.id) {
              continue
            }
            if (!isAllowedUse(identifier)) {
              report(identifier)
              continue
            }
            const update = setterArgument(identifier)
            if (update) {
              for (const outer of context.sourceCode.getScope(update).through) {
                const handed = outer.resolved?.defs.some((definition) => definition.type === 'Parameter')
                const called = outer.identifier.parent.type === 'CallExpression' && outer.identifier.parent.callee === outer.identifier
                if (handed && called) {
                  report(outer.identifier)
                }
              }
            }
          }
        }
      },
    }
  },
}
