export function typeServices(context, ruleName) {
  const services = context.sourceCode.parserServices
  if (!services?.program || !services.esTreeNodeToTSNodeMap) {
    throw new Error(
      `local/${ruleName} needs type information: enable parserOptions.projectService for the files it lints (see eslint.config.js). A type-blind fallback would silently stop checking.`,
    )
  }
  return services
}
