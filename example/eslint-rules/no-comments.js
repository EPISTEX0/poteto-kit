export const message =
  'Code comments are banned in this repo. Agents write comments that describe history or intent that later goes stale, and nothing checks them. Say it with names, types and tests; put explanations in AGENTS.md or the PR description. Delete this comment.'

export const noComments = {
  meta: {
    type: 'problem',
    schema: [],
    messages: { banned: message },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          context.report({ loc: comment.loc, messageId: 'banned' })
        }
      },
    }
  },
}
