/** 背景变体：black=全黑 / void=幽暗虚空 / ruins=荒渊废墟 / camp=枢纽营地 */
export type BgVariant = 'black' | 'void' | 'ruins' | 'camp'

export type StoryBeat =
  | {
      kind?: 'dialogue'
      bgVariant?: BgVariant
      bg?: string
      speaker?: string
      text: string
    }
  | {
      kind: 'input'
      bgVariant?: BgVariant
      bg?: string
      speaker?: string
      /** 输入框占位符文字 */
      inputPlaceholder?: string
      /** 输入 id，store 用来路由处理逻辑 */
      inputId: string
      text: string
    }

export type StoryScript = {
  id: string
  beats: StoryBeat[]
}
