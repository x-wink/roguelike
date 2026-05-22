// 扫描 assets/fonts 下所有字体文件，按目录分组，woff2 优先于同名 ttf

export interface FontVariant {
  family: string // CSS font-family 名
  label: string // tab 显示名
  file: string // 原始路径（调试用）
  format: 'woff2' | 'truetype' | 'opentype'
}

export interface FontGroup {
  name: string // 组名（取自目录名）
  variants: FontVariant[]
}

const woff2Files = import.meta.glob('@/assets/fonts/**/*.woff2', {
  eager: false,
  query: '?url',
  import: 'default',
})
const ttfFiles = import.meta.glob('@/assets/fonts/**/*.ttf', {
  eager: false,
  query: '?url',
  import: 'default',
})
const otfFiles = import.meta.glob('@/assets/fonts/**/*.otf', {
  eager: false,
  query: '?url',
  import: 'default',
})

function basename(path: string) {
  return path.split('/').pop()!
}

function dirName(path: string) {
  // 取 fonts/ 下的直接子目录名，扁平文件归到 ''
  const parts = path.split('/')
  const fontsIdx = parts.findLastIndex((p) => p === 'fonts')
  if (fontsIdx === -1 || fontsIdx + 1 >= parts.length - 1) return ''
  return parts[fontsIdx + 1]
}

function familyName(filename: string): string {
  // 保留原始文件名（去扩展名）作为 family，避免替换后与注册名不一致
  return filename.replace(/\.(woff2|ttf|otf)$/i, '').trim()
}

function variantLabel(filename: string): string {
  return filename.replace(/\.(woff2|ttf|otf)$/i, '')
}

// 合并所有文件，woff2 覆盖同名 ttf/otf
function mergeFiles() {
  type Entry = { path: string; loader: () => Promise<unknown>; format: FontVariant['format'] }
  const map = new Map<string, Entry>()

  const add = (files: Record<string, () => Promise<unknown>>, fmt: FontVariant['format']) => {
    for (const [path, loader] of Object.entries(files)) {
      const key = basename(path).replace(/\.(woff2|ttf|otf)$/i, '')
      const existing = map.get(key)
      const priority = { woff2: 2, opentype: 1, truetype: 0 }
      if (!existing || priority[fmt] > priority[existing.format]) {
        map.set(key, { path, loader: loader as () => Promise<unknown>, format: fmt })
      }
    }
  }

  add(ttfFiles, 'truetype')
  add(otfFiles, 'opentype')
  add(woff2Files, 'woff2')

  return [...map.values()]
}

let _groups: FontGroup[] | null = null

export async function loadFontGroups(): Promise<FontGroup[]> {
  if (_groups) return _groups

  const entries = mergeFiles()
  const groupMap = new Map<
    string,
    Array<{ entry: (typeof entries)[0]; family: string; label: string }>
  >()

  // 先按目录分桶
  for (const entry of entries) {
    const dir = dirName(entry.path)
    if (!groupMap.has(dir)) groupMap.set(dir, [])
    const filename = basename(entry.path)
    groupMap.get(dir)!.push({
      entry,
      family: familyName(filename),
      label: variantLabel(filename),
    })
  }

  // 并行加载所有字体
  const groups: FontGroup[] = []

  await Promise.all(
    [...groupMap.entries()].map(async ([dir, items]) => {
      const variants: FontVariant[] = []

      await Promise.all(
        items.map(async ({ entry, family, label }) => {
          try {
            const url = (await entry.loader()) as string
            const face = new FontFace(family, `url(${url})`)
            await face.load()
            document.fonts.add(face)
            variants.push({ family, label, file: entry.path, format: entry.format })
          } catch (e) {
            console.warn(`[fonts] failed: ${entry.path}`, e)
          }
        }),
      )

      if (variants.length === 0) return

      // 组内按 label 排序
      variants.sort((a, b) => a.label.localeCompare(b.label))

      groups.push({
        name: dir || variants[0].label,
        variants,
      })
    }),
  )

  // 组间按名排序
  groups.sort((a, b) => a.name.localeCompare(b.name))
  _groups = groups
  return groups
}
