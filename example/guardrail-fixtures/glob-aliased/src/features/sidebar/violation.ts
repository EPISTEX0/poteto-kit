const { glob } = import.meta

export const viaDestructure = glob('/src/client/commands.ts', { eager: true })
export const viaIndex = import.meta['glob']('/src/client/index.ts', { eager: true })
