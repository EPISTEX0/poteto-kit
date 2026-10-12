export const mode = import.meta.env.MODE

export const here = import.meta.url

if (import.meta.hot) {
  import.meta.hot.accept()
}

export const directory = import.meta.dirname

export const filename = import.meta.filename
