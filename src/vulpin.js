// Tiny in-browser Vulpin interpreter powering the playground demo.
// It honors a practical subset of the language (the same commands the
// C VM parses), so people can type real programs against it.

export class Vulpin {
  constructor() {
    this.reset()
  }

  reset() {
    this.env = Object.create(null)
    this.output = []
    this.builtins = {
      abs: Math.abs,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      sqrt: Math.sqrt,
      pow: Math.pow,
      len: (s) => String(s).length,
      upper: (s) => String(s).toUpperCase(),
      lower: (s) => String(s).toLowerCase(),
      char: (n) => String.fromCharCode(n),
      ord: (c) => (typeof c === 'string' ? c.charCodeAt(0) : c),
      rand: (n) => Math.floor(Math.random() * (n || 100)),
    }
  }

  run(source, maxSteps = 40000, freshEnv = true) {
    if (freshEnv) this.reset()
    const lines = source.replace(/\r\n/g, '\n').split('\n')
    const src = lines.map((l) => l.replace(/\s+$/, ''))
    let pc = 0
    let steps = 0
    const started = performance.now()
    try {
      while (pc < src.length) {
        if (++steps > maxSteps) throw new Error('demo sandbox: loop bound hit')
        pc = this.step(src, pc)
      }
      return { ok: true, ms: Math.round(performance.now() - started) }
    } catch (e) {
      return { ok: false, ms: Math.round(performance.now() - started), error: e.message }
    }
  }

  step(src, pc) {
    const raw = src[pc]
    const line = raw.replace(/^\s+/, '')
    const cmd = line[0]
    const arg = line.slice(1).trim()

    switch (cmd) {
      case '': case '#':
        return pc + 1

      case 'G':
        this.println(this.evalExpr(arg))
        return pc + 1

      case 'g':
        this.print(this.evalExpr(arg))
        return pc + 1

      case 'E': {
        const m = arg.match(/^([A-Za-z_]\w*)\s*(?:=\s*)?([\s\S]*)$/)
        if (!m || !m[1]) throw new Error('E needs a variable name')
        this.env[m[1]] = this.evalExpr(m[2])
        return pc + 1
      }

      case 'D': {
        const del = arg.match(/^"([^"]*)"$/)
        if (del) { delete this.env[del[1]]; return pc + 1 }
        return pc + 1 // delay skipped in the demo
      }

      case '?': {
        const cond = this.truthy(this.evalExpr(arg))
        if (cond) return pc + 1
        // scan forward to matching ':' (else) or ';'
        let depth = 1
        let i = pc + 1
        for (; i < src.length; i++) {
          const c = src[i].trim()[0]
          if (c === '?') depth++
          else if (c === ':' || c === ';') {
            depth--
            if (depth === 0) {
              // land after the marker so the else body runs; ':' just starts it
              if (c === ':') return i + 1
              return i + 1
            }
          }
        }
        return i + 1
      }

      case ':': // hit while executing then-branch: skip the else
        return this.skipToClause(src, pc, ';')

      case ';':
        return pc + 1

      case '@': {
        const cond = this.truthy(this.evalExpr(arg))
        // remember back-jump target for matching '&'
        if (cond) return pc + 1
        let depth = 1
        let i = pc + 1
        for (; i < src.length; i++) {
          const c = src[i].trim()[0]
          if (c === '@') depth++
          else if (c === '&' && --depth === 0) break
        }
        return i + 1
      }

      case '&': {
        // back to the matching '@' which re-evaluates the condition
        let depth = 1
        let i = pc - 1
        for (; i >= 0; i--) {
          const c = src[i].trim()[0]
          if (c === '&') depth++
          else if (c === '@' && --depth === 0) break
        }
        return i
      }

      case 'F': {
        // F name:  def;  R value ;  ~ end
        const m = arg.match(/^([A-Za-z_]\w*)\s*$/)
        if (!m) throw new Error('F needs a name')
        const name = m[1]
        let i = pc + 1
        for (; i < src.length; i++) {
          const c = src[i].trim()[0]
          if (c === '~') break
        }
        const body = src.slice(pc + 1, i)
        this.env['fn:' + name] = () => {
          const sub = new Vulpin()
          sub.env = this.env
          sub.builtins = this.builtins
          const out = sub.run(body.join('\n'), 2000, false)
          if (!out.ok && out.error !== '::return::') throw new Error('inside ' + name + ': ' + out.error)
          return sub.retval !== undefined ? sub.retval : sub.output.join('')
        }
        return i + 1
      }

      case 'R':
        this.retval = this.evalExpr(arg)
        throw new Error('::return::')

      case '~':
      case 'L':
        return pc + 1

      case 'J': {
        let i
        for (i = 0; i < src.length; i++) {
          const m = src[i].trim().match(/^L\s+([A-Za-z_]\w*)\s*$/)
          if (m && m[1] === arg) break
        }
        return i
      }

      case 'O': { // O var start end [step]
        const parts = arg.split(/\s+/).filter(Boolean)
        const [vname, startT, endT, stepT] = parts
        if (!/^[A-Za-z_]\w*$/.test(vname || '')) throw new Error('O needs a variable')
        const start = this.num(this.evalExpr(startT))
        const end = this.num(this.evalExpr(endT))
        const step = stepT ? Math.abs(this.num(this.evalExpr(stepT))) : 1
        // find matching 'N'
        let i = pc + 1
        {
          let depth = 1
          for (; i < src.length; i++) {
            const c = src[i].trim()[0]
            if (c === 'O') depth++
            else if (c === 'N' && --depth === 0) break
          }
        }
        // execute body start -> end
        const body = src.slice(pc + 1, i)
        this.env[vname] = start
        if (start <= end) {
          for (let v = start; v <= end; v += step) {
            this.env[vname] = v
            const sub = new Vulpin()
            sub.env = this.env
            sub.builtins = this.builtins
            const out = sub.run(body.join('\n'), 2000, false)
            if (!out.ok) throw new Error('in loop: ' + out.error)
            this.output.push(...sub.output)
            sub.output = []
          }
        }
        return i + 1
      }

      case 'U':
        return pc + 1 // imports are a no-op in the demo

      case 'T': case 'C': case 'Y':
        throw new Error('ty/catch: not in demo — try G, E, ?, }, @, O, F')

      case 'W': case 'V': case 'N': case 'Z':
        return pc + 1

      case 'Q':
        throw new Error('QUIT::')

      default:
        // bare expression / assignment / function call
        const v = this.evalExpr(line)
        if (v !== undefined && v !== '') this.println(v)
        return pc + 1
    }
  }

    skipToClause(src, pc, target) {
    let depth = 0
    let i = pc + 1
    for (; i < src.length; i++) {
      const c = src[i].trim()[0]
      if (c === '?') depth++
      else if (c === target) {
        if (depth === 0) return i + 1
        depth--
      }
    }
    return i
  }

  /* ---------- expression evaluation ---------- */
  evalExpr(s) {
    if (!s || !s.trim()) return ''
    this.toks = s.match(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\d+\.\d+|\d+|<=|>=|==|!=|[+\-*/%()<>]|[A-Za-z_]\w*/g) || []
    this.pos = 0
    const v = this.sum()
    if (this.pos < this.toks.length) throw new Error('unexpected ' + JSON.stringify(this.toks[this.pos]))
    return v
  }

  peek() { return this.toks[this.pos] }
  take() { return this.toks[this.pos++] }

  sum() {
    let a = this.term()
    for (;;) {
      const t = this.peek()
      if (t === '+') { this.take(); a = this.arith(a, this.term(), '+') }
      else if (t === '-') { this.take(); a = this.arith(a, this.term(), '-') }
      else if (t === '==') { this.take(); a = this.eq(a, this.term()) ? 1 : 0 }
      else if (t === '!=') { this.take(); a = this.eq(a, this.term()) ? 0 : 1 }
      else if (t === '>=') { this.take(); a = this.num(a) >= this.num(this.term()) ? 1 : 0 }
      else if (t === '<=') { this.take(); a = this.num(a) <= this.num(this.term()) ? 1 : 0 }
      else if (t === '>') { this.take(); a = this.num(a) > this.num(this.term()) ? 1 : 0 }
      else if (t === '<') { this.take(); a = this.num(a) < this.num(this.term()) ? 1 : 0 }
      else break
    }
    return a
  }

  term() {
    let left = this.factor()
    for (;;) {
      const t = this.peek()
      if (t === '*') { this.take(); left = this.arith(left, this.factor(), '*') }
      else if (t === '/') { this.take(); left = this.arith(left, this.factor(), '/') }
      else if (t === '%') { this.take(); left = this.num(left) % this.num(this.factor()) }
      else break
    }
    return left
  }

  factor() {
    const t = this.take()
    if (t === undefined) return ''
    if (t === '(') {
      const v = this.sum()
      if (this.peek() === ')') this.take()
      return v
    }
    if (t[0] === '"' || t[0] === "'") return this.unquote(t)
    if (this.isNum(t)) return parseFloat(t)
    if (t === 'true') return true
    if (t === 'false') return false
    if (this.peek() === '(') {
      // function call f( args )
      this.take()
      const args = []
      if (this.peek() !== ')') {
        args.push(this.sum())
        while (this.peek() === ',') { this.take(); args.push(this.sum()) }
      }
      if (this.peek() === ')') this.take()
      return this.call(t, args)
    }
    if (t in this.env) return this.env[t]
    if (this.builtins[t]) return this.builtins[t] // bare builtin name
    if (t === 'fn:' ) return ''
    return 0
  }

  call(name, args) {
    if (this.fns && this.env['fn:' + name]) {
      const ret = this.env['fn:' + name]()
      return ret
    }
    const b = this.builtins[name]
    if (b) return b(...args.map((x) => (typeof x === 'number' ? x : x)))
    return args[0] ?? 0
  }

  isNum(t) { return /^-?\d/.test(t) }
  num(v) {
    if (typeof v === 'string') {
      if (v === 'true') return 1
      if (v === 'false') return 0
      const n = parseFloat(v)
      return Number.isNaN(n) ? 0 : n
    }
    return v
  }
  arith(a, b, op) {
    if (typeof a === 'string' || typeof b === 'string') {
      if (op === '+') return String(a) + String(b)
      return a
    }
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return Math.floor(a / b)
    }
  }
  eq(a, b) { return String(a) === String(b) }
  unquote(t) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, '\n')
  }
  truthy(v) { return !(v === 0 || v === false || v === '' || v === undefined || v === null) }
  println(v) { this.output.push(this.fmt(v)) }
  print(v) {
    const s = this.fmt(v)
    if (this.output.length) this.output[this.output.length - 1] += s
    else this.output.push(s)
  }
  fmt(v) {
    if (typeof v === 'boolean') return v ? '1' : '0'
    if (typeof v === 'string') return v
    return String(v)
  }
}