import ts from 'typescript'
import { typeServices } from './type-services.js'

const storeModule = '/src/shared/create-store.ts'

export const message =
  "A store built with createStore is private to the module that builds it. Only 'store.use', 'store.get()' and calls to 'store.set(...)' may mention it: never export it, alias it, destructure it, or pass it or its setter around. To change state in a new way, add a command in src/client/commands.ts whose body calls store.set((state) => ...) with the change written out, and export that command."

function isTopLevel(declaration) {
  for (let node = declaration.parent; node; node = node.parent) {
    if (ts.isSourceFile(node)) {
      return true
    }
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) {
      return false
    }
  }
  return false
}

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
  return isCallee && (member.property.name === 'get' || member.property.name === 'set')
}

export const storeStaysPrivate = {
  meta: {
    type: 'problem',
    schema: [],
    messages: { escapes: message },
  },
  create(context) {
    const services = typeServices(context, 'store-stays-private')
    const checker = services.program.getTypeChecker()
    const report = (node) => context.report({ node, messageId: 'escapes' })
    const buildsStore = (call) => {
      const declaration = checker.getResolvedSignature(services.esTreeNodeToTSNodeMap.get(call))?.declaration
      return (
        declaration !== undefined &&
        isTopLevel(declaration) &&
        declaration.getSourceFile().fileName.replaceAll('\\', '/').endsWith(storeModule)
      )
    }
    return {
      CallExpression(call) {
        if (!buildsStore(call)) {
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
          for (const { identifier } of variable.references) {
            if (identifier !== declarator.id && !isAllowedUse(identifier)) {
              report(identifier)
            }
          }
        }
      },
    }
  },
}
