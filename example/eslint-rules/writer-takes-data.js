import ts from 'typescript'
import { typeServices } from './type-services.js'

export const message =
  "'{{name}}' is exported from the writer module but accepts a callable parameter '{{parameter}}' ({{type}}). A function handed in from outside can reach store.set under any name, so no export of this module may take one, directly, inside an object or array, as a generic, as unknown or any, or through a returned function. Take data (an id, a value, a patch) and write the state change out in the command's body."

const maxDepth = 6

export const writerTakesData = {
  meta: {
    type: 'problem',
    schema: [],
    messages: { callable: message },
  },
  create(context) {
    const services = typeServices(context, 'writer-takes-data')
    const { program } = services
    const checker = program.getTypeChecker()
    const fromLibrary = (symbol) =>
      (symbol?.declarations ?? []).length > 0 &&
      symbol.declarations.every((declaration) => program.isSourceFileDefaultLibrary(declaration.getSourceFile()))

    const canBeCalled = (type, seen, depth) => {
      if (seen.has(type) || depth > maxDepth) {
        return false
      }
      seen.add(type)
      if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
        return true
      }
      if (type.flags & ts.TypeFlags.TypeParameter) {
        const constraint = type.getConstraint()
        return constraint === undefined || canBeCalled(constraint, seen, depth + 1)
      }
      if (type.isUnionOrIntersection()) {
        return type.types.some((member) => canBeCalled(member, seen, depth + 1))
      }
      if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
        return true
      }
      if (!(type.flags & ts.TypeFlags.Object)) {
        return false
      }
      if (type.symbol?.name === 'Function' && fromLibrary(type.symbol)) {
        return true
      }
      const typeArguments = type.objectFlags & ts.ObjectFlags.Reference ? checker.getTypeArguments(type) : []
      if (typeArguments.some((argument) => canBeCalled(argument, seen, depth + 1))) {
        return true
      }
      const indexTypes = [type.getStringIndexType(), type.getNumberIndexType()].filter(Boolean)
      if (indexTypes.some((indexType) => canBeCalled(indexType, seen, depth + 1))) {
        return true
      }
      return type
        .getProperties()
        .filter((property) => !fromLibrary(property))
        .some((property) => canBeCalled(checker.getTypeOfSymbol(property), seen, depth + 1))
    }

    const findCallableParameter = (type, seen, depth) => {
      if (seen.has(type) || depth > maxDepth) {
        return null
      }
      seen.add(type)
      for (const signature of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
        for (const parameter of signature.getParameters()) {
          const parameterType = checker.getTypeOfSymbol(parameter)
          if (canBeCalled(parameterType, new Set(), 0)) {
            return { parameter, type: parameterType }
          }
        }
        const nested = findCallableParameter(signature.getReturnType(), seen, depth + 1)
        if (nested) {
          return nested
        }
      }
      if (type.flags & ts.TypeFlags.Object && !fromLibrary(type.symbol)) {
        for (const property of type.getProperties().filter((candidate) => !fromLibrary(candidate))) {
          const nested = findCallableParameter(checker.getTypeOfSymbol(property), seen, depth + 1)
          if (nested) {
            return nested
          }
        }
      }
      return null
    }

    return {
      Program(program_) {
        const source = services.esTreeNodeToTSNodeMap.get(program_)
        const moduleSymbol = checker.getSymbolAtLocation(source)
        if (!moduleSymbol) {
          return
        }
        for (const exported of checker.getExportsOfModule(moduleSymbol)) {
          const resolved = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
          if (!(resolved.flags & ts.SymbolFlags.Value)) {
            continue
          }
          const found = findCallableParameter(checker.getTypeOfSymbolAtLocation(resolved, source), new Set(), 0)
          if (!found) {
            continue
          }
          const declaration = found.parameter.valueDeclaration
          const here = declaration?.getSourceFile() === source ? declaration : (exported.declarations?.[0] ?? source)
          const start = here.getSourceFile() === source ? source.getLineAndCharacterOfPosition(here.getStart()) : { line: 0, character: 0 }
          context.report({
            loc: { start: { line: start.line + 1, column: start.character } },
            messageId: 'callable',
            data: { name: exported.name, parameter: found.parameter.name, type: checker.typeToString(found.type) },
          })
        }
      },
    }
  },
}
