const fs = require('fs')
const MarkdownIt = require('markdown-it')

const md = new MarkdownIt()

// 识别at([@xxx@])语法
md.core.ruler.push('at', (state) => {
  const tokens = state.tokens
  const inlines = tokens.filter((token) => token.type === 'inline')

  if (inlines.length === 0) return false

  inlines.forEach((inline) => {
    const children = Array.from(inline.children)
    if (children.length === 0) return false

    const history = []

    const calcOffset = (index) => {
      // 输入原始index，计算offset后的index
      for (const item of history) {
        const limit = item.limit
        const value = item.value

        if (index > limit) {
          index += value
        }
      }

      return index
    }

    children.forEach((child, index) => {
      const type = child.type
      const content = child.content

      if (type !== 'text') return false
      if (!content.includes('[@') || !content.includes('@]')) return false

      const ats = content.match(/(?<=\[@).*?(?=@\])/g)
      const spilted = content.split(/\[\@[^\[^@]+\@\]/g)

      if (ats.length === 0) return false

      inline.children.splice(calcOffset(index), 1)

      history.push({
        limit: index,
        value: -1
      })

      ats.forEach((at, offset) => {
        inline.children.splice(calcOffset(index + offset + 1), 0, {
          type: 'text',
          content: spilted.shift(),
          level: 0,
        })

        history.push({
          limit: index + offset + 1,
          value: 1
        })

        inline.children.splice(calcOffset(index + offset + 2), 0, {
          type: 'at',
          content: at,
          level: 0,
          children: []
        })

        history.push({
          limit: index + offset + 2,
          value: 1
        })
      })
    })
  })

  return true
})

// 识别latex($$xxx$$)语法
md.core.ruler.push('latex', (state) => {
  const tokens = state.tokens
  const inlines = tokens.filter((token) => token.type === 'inline')

  if (inlines.length === 0) return false

  inlines.forEach((inline) => {
    const children = Array.from(inline.children)
    if (children.length === 0) return false

    const history = []

    // 输入原始index，计算经过了处理后的index
    const calcOffset = (index) => {
      for (const item of history) {
        const limit = item.limit
        const value = item.value

        if (index > limit) {
          index += value
        }
      }

      return index
    }

    children.forEach((child, index) => {
      const type = child.type
      const content = child.content

      if (type !== 'text') return false
      if (!content.includes('$$') || content.match(/\$\$/g).length % 2 !== 0) return false

      const latexs = content.match(/(?<=\$\$).*?(?=\$\$)/g)
      const spilted = content.split(/\$\$[^\$]+\$\$/g)

      if (latexs.length === 0) return false

      // 删除原始的text节点
      inline.children.splice(calcOffset(index), 1)

      history.push({
        limit: index,
        value: -1
      })

      // 插入新的text节点和latex节点
      latexs.forEach((latex, offset) => {
        inline.children.splice(calcOffset(index + offset + 1), 0, {
          type: 'text',
          content: spilted.shift(),
          level: 0,
        })

        history.push({
          limit: index + offset + 1,
          value: 1
        })

        inline.children.splice(calcOffset(index + offset + 2), 0, {
          type: 'latex',
          content: latex,
          level: 0,
          children: []
        })

        history.push({
          limit: index + offset + 2,
          value: 1
        })
      })
    })
  })
})

md.renderer.rules.at = (tokens, idx) => {
  const token = tokens[idx]
  return `<span class="at">${token.content}</span>`
}

md.renderer.rules.latex = (tokens, idx) => {
  const token = tokens[idx]
  return `<span class="latex">${token.content}</span>`
}

const input = fs.readFileSync('input.md', 'utf8')

fs.writeFileSync('output.html', md.render(input))
fs.writeFileSync('output.json', JSON.stringify(md.parse(input, {}), null, 2))
