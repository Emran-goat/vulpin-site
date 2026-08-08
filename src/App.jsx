import { useEffect, useRef, useState } from 'react'
import { Vulpin } from './vulpin.js'

const COMMANDS = [
  { k: 'G', name: 'print', d: 'print a value, newline added', ex: 'G "hi"' },
  { k: 'g', name: 'print raw', d: 'print without a newline', ex: 'g "hi"' },
  { k: 'E', name: 'assign', d: 'set a variable', ex: 'E x = 5' },
  { k: 'D', name: 'delay', d: 'sleep n milliseconds', ex: 'D 500' },
  { k: '?', name: 'if', d: 'conditionally run a branch', ex: '? x > 2' },
  { k: ':', name: 'else', d: 'the else branch', ex: ': G "no"' },
  { k: ';', name: 'end if', d: 'close an if block', ex: ';' },
  { k: '@', name: 'while', d: 'loop while true', ex: '@ x < 5' },
  { k: '&', name: 'wend', d: 'close a while loop', ex: '&' },
  { k: 'O', name: 'for', d: 'count from a to b', ex: 'O i 1 5' },
  { k: 'N', name: 'next', d: 'close a for loop', ex: 'N' },
  { k: 'F', name: 'def fn', d: 'define a function', ex: 'F greet' },
  { k: '~', name: 'end fn', d: 'close a function', ex: '~' },
  { k: 'R', name: 'return', d: 'return from a function', ex: 'R 7' },
  { k: 'L', name: 'label', d: 'mark a jump target', ex: 'L top' },
  { k: 'J', name: 'jump', d: 'jump to a label', ex: 'J top' },
  { k: 'W', name: 'switch', d: 'dispatch on a value', ex: 'W x' },
  { k: 'V', name: 'case', d: 'a switch case', ex: 'V 3' },
  { k: 'Z', name: 'end sw', d: 'close a switch', ex: 'Z' },
  { k: 'T', name: 'try', d: 'open a try block', ex: 'T' },
  { k: 'C', name: 'catch', d: 'catch the error', ex: 'C e' },
  { k: 'Y', name: 'end try', d: 'close a try block', ex: 'Y' },
  { k: 'Q', name: 'quit', d: 'stop the program', ex: 'Q' },
  { k: '#', name: 'comment', d: 'ignore the rest of the line', ex: '# note' },
]

const SAMPLES = [
  `# hello world in vulpin
G "hello world"`,
  `# print a line that has been calculated
E x = 21
G "the answer is " + x`,
  `# count to five
O i 1 5
  G i
N`,
  `# loop while x is small
E x = 0
@ x < 4
  G x
  E x = x + 1
&`,
  `# an if/else branch
E age = 17
? age >= 18
  G "you can vote"
:
  G "too young"
;`,
  `# string helpers
E s = "vulpin"
G upper(s)
G len(s)`,
]

const WHYS = [
  { g: '1', t: 'one character commands', d: 'every instruction is a single letter. there is nothing shorter to type.' },
  { g: '½', t: 'as small as it gets', d: 'a whole program can be one line. no boilerplate, no ceremony.' },
  { g: 'C', t: 'built on a real C runtime', d: 'it compiles down to a tiny C interpreter, so it starts instantly.' },
  { g: '?', t: 'still a real language', d: 'if, while, for, functions, try/catch, labels — all in single letters.' },
]

const STEPS = [
  { n: '01', t: 'write it', d: 'one command letter per line, arguments after it.' },
  { n: '02', t: 'run it', d: 'feed a .vul file to the tiny interpreter. no build step.' },
  { n: '03', t: 'ship it', d: 'the whole runtime is a single small C binary you can move anywhere.' },
]

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            el.classList.add('is-in')
            io.unobserve(el)
          }
        })
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function Brand() {
  return (
    <a className="brand" href="#top">
      <img src="./logo.png" alt="Vulpin fox logo" />
      <span>Vul< b>pin</b></span>
    </a>
  )
}

function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="navbar glass-strong" id="top">
      <Brand />
      <div className="navlinks">
        <a href="#play">playground</a>
        <a href="#commands">commands</a>
        <a href="#why">why vulpin</a>
        <a href="https://github.com/vulpin-lang/VulpinC" target="_blank" rel="noreferrer">github</a>
      </div>
      <button className="burger" aria-label="menu" onClick={() => setOpen((o) => !o)}>
        <span /><span /><span />
      </button>
      {open && (
        <div className="navlinks navlinks--open">
          <a href="#play" onClick={() => setOpen(false)}>playground</a>
          <a href="#commands" onClick={() => setOpen(false)}>commands</a>
          <a href="#why" onClick={() => setOpen(false)}>why vulpin</a>
          <a href="https://github.com/vulpin-lang/VulpinC" target="_blank" rel="noreferrer">github</a>
        </div>
      )}
    </nav>
  )
}

function CoffeeCard() {
  const src = [
    '# age check',
    'E age = 17',
    '? age >= 18',
    '  G "you can vote"',
    ':',
    '  G "too young"',
    ';',
  ].join('\n')
  const [n, setN] = useState(0)
  const [out, setOut] = useState(null)

  useEffect(() => {
    if (n < src.length) {
      const id = setTimeout(() => setN((c) => c + 1), 34)
      return () => clearTimeout(id)
    }
    if (out === null) {
      const v = new Vulpin()
      v.run(src + '\n# ---')
      setOut(v.output)
    }
    return undefined
  }, [n, out, src])

  const done = n >= src.length

  return (
    <div className="coffee-card">
      <div className="paper">
        <span className="stain stain--a" />
        <span className="stain stain--b" />
        <span className="stain stain--c" />
        <span className="stain stain--d" />

        <div className="paper-head">
          <span className="paper-tag">note to self</span>
          <span className="paper-date">vulpin v0.9</span>
        </div>

        <pre className="paper-code">
          {src.slice(0, n)}
          <span className="caret" />
        </pre>

        {done && out && out.length && (
          <div className="paper-out">
            <div className="paper-out-line">v▸ <b>{out[0]}</b></div>
            <span className="paper-done">ran in the browser — no boilerplate</span>
          </div>
        )}

        <div className="stamp"><span>vulpin</span> v0.9</div>

        <p className="paper-foot">a whole program fits on a coffee stain.</p>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <header className="hero">
      <div>
        <span className="hero-eyebrow"><span className="dot" /> v0.9 · a tiny scripting language</span>
        <h1>
          write the <em>smallest</em><br />
          possible programs
        </h1>
        <p className="lede">
          Vulpin is a one-character-command scripting language that runs on a
          tiny C interpreter. every instruction is a single letter, so a whole
          program fits on a coffee stain.
        </p>
        <div className="hero-cta">
          <a className="aero-btn aero-btn--blue" href="#play">try it live</a>
          <a className="aero-btn aero-btn--ghost" href="https://github.com/vulpin-lang/VulpinC" target="_blank" rel="noreferrer">view on github</a>
        </div>
        <div className="hero-stats">
          <div className="stat"><b>1-char</b><span>commands</span></div>
          <div className="stat"><b>0</b><span>boilerplate</span></div>
          <div className="stat"><b>C</b><span>runtime</span></div>
        </div>
      </div>

      <Reveal>
        <CoffeeCard />
      </Reveal>
    </header>
  )
}

function Terminal({ lines, onCmd, value, setValue, placeholder }) {
  const screenRef = useRef(null)
  useEffect(() => {
    if (screenRef.current) screenRef.current.scrollTop = screenRef.current.scrollHeight
  }, [lines])

  const run = () => {
    if (!value.trim()) return
    onCmd(value)
  }

  const onKey = (e) => {
    if (e.key === 'Enter') run()
  }

  return (
    <div className="aero-panel glass-strong term">
      <div className="caption">
        <span className="cbtns">
          <span className="cbtn cbtn--min">_</span>
          <span className="cbtn cbtn--max">□</span>
          <span className="cbtn cbtn--cls">×</span>
        </span>
        <h4>vulpin.exe — command line</h4>
      </div>
      <div className="term-screen" ref={screenRef}>
        {lines.map((l, i) => (
          <span key={i} className={`term-line term-line--${l.kind}`}>{l.text}</span>
        ))}
      </div>
      <div className="term-input">
        <span className="prompt">v▸</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder || 'G "hello"'}
          autoFocus
        />
      </div>
      <div className="term-hints">
        <button className="term-hint" onClick={() => setValue('G "hi"')}>G "hi"</button>
        <button className="term-hint" onClick={() => setValue('E x = 3 + 4')}>E x = 3 + 4</button>
        <button className="term-hint" onClick={() => setValue('G x * 2')}>G x * 2</button>
      </div>
    </div>
  )
}

function Playground() {
  const [lines, setLines] = useState([
    { kind: 'sys', text: 'type a vulpin command and press enter.' },
    { kind: 'sys', text: 'try:  G "hi"   ·   E x = 3 + 4   ·   G x * 2' },
  ])
  const [value, setValue] = useState('')
  const [source, setSource] = useState('')

  const onCmd = (cmd) => {
    setLines((prev) => [...prev, { kind: 'in', text: cmd }])
    setValue('')
    const v = new Vulpin()
    const res = v.run(cmd)
    if (!res.ok && res.error !== '::return::' && res.error !== 'QUIT::') {
      setLines((prev) => [...prev, { kind: 'err', text: 'error: ' + res.error }])
    } else {
      v.output.forEach((o) => setLines((prev) => [...prev, { kind: 'ok', text: o }]))
    }
  }

  const runSample = (s) => {
    setSource(s)
    const v = new Vulpin()
    const res = v.run(s)
    const fresh = [{ kind: 'sys', text: '— running program —' }]
    if (!res.ok && res.error !== 'QUIT::') {
      fresh.push({ kind: 'err', text: 'error: ' + res.error })
    }
    v.output.forEach((o) => fresh.push({ kind: 'ok', text: o }))
    fresh.push({ kind: 'sys', text: `— done in ${res.ms} ms —` })
    setLines(fresh)
  }

  return (
    <section id="play">
      <div className="wrap">
        <div className="sec-head reveal">
          <h2>a playground, not a lecture</h2>
          <p>this window runs a real subset of the vulpin interpreter right in your browser. type something.</p>
        </div>
        <Reveal delay={80}>
          <div className="play-banner">
            <span className="chip">live · in-browser</span>
            <div className="term-hints">
              {SAMPLES.map((s, i) => (
                <button key={i} className="term-hint" onClick={() => runSample(s)}>sample {i + 1}</button>
              ))}
            </div>
          </div>
          <Terminal
            lines={lines}
            onCmd={onCmd}
            value={value}
            setValue={setValue}
          />
          {source && (
            <div className="code-window glass" style={{ marginTop: 18 }}>
              <div className="code-body">
                {source.split('\n').map((ln, i) => (
                  <span key={i} className="ln">{renderCode(ln)}</span>
                ))}
              </div>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}

function renderCode(ln) {
  const trimmed = ln
  const out = []
  const tok = trimmed.match(/^([\s#GgE DO?@&N=+\-*/%0-9."']+)(.*)$/)
  if (trimmed.trim().startsWith('#')) {
    return <span className="tk-com">{trimmed}</span>
  }
  // cheap syntax tint
  return trimmed.split(/(G|g|E|O|@|&|N|F|~|R|\?|:|\d+|[+-/*%])/).map((p, i) => {
    if (/^(G|g|E|O|@|&|N|F|~|R|\?|:)$/.test(p)) return <span key={i} className="tk-key">{p}</span>
    if (/^\d+$/.test(p)) return <span key={i} className="tk-num">{p}</span>
    if (/^[+\-/*%]$/.test(p)) return <span key={i} className="tk-mut">{p}</span>
    return p
  })
}

function CommandGrid() {
  return (
    <section id="commands">
      <div className="wrap">
        <div className="sec-head reveal">
          <h2>the whole language</h2>
          <p>two dozen single-letter commands cover everything: math, strings, control flow, functions, errors.</p>
        </div>
        <Reveal delay={60}>
          <div className="glass cmd-wrap">
            <div className="cmdgrid">
              {COMMANDS.map((c) => (
                <div className="cmd" key={c.k}>
                  <span className="k">{c.k}</span>
                  <span className="d"><b>{c.name}</b>{c.d}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Why() {
  return (
    <section id="why">
      <div className="wrap">
        <div className="sec-head reveal">
          <h2>why build it this small?</h2>
          <p>because smaller programs are easier to read, faster to start, and cheaper to ship.</p>
        </div>
        <div className="cards">
          {WHYS.map((w, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="card glass card--tilt">
                <span className="glyph">{w.g}</span>
                <h3>{w.t}</h3>
                <p>{w.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Band() {
  return (
    <section>
      <div className="wrap">
        <Reveal>
          <div className="band glass-strong">
            <div>
              <h2>from a single letter to a full program</h2>
              <p>
                vulpin reads a line, looks at the first character, and that is the
                instruction. everything after it is the argument. the whole language
                fits on one index card, and the runtime is a single C file.
              </p>
              <div className="step"><span className="n">01</span><div><b>write it</b><p>one command letter per line, arguments after it.</p></div></div>
              <div className="step"><span className="n">02</span><div><b>run it</b><p>feed a .vul file to the tiny interpreter. no build step.</p></div></div>
              <div className="step"><span className="n">03</span><div><b>ship it</b><p>the whole runtime is a single small C binary you can move anywhere.</p></div></div>
            </div>
            <div className="code-window glass">
              <div className="code-body">
                <span className="ln"><span className="tk-com"># fizzbuzz, the vulpin way</span></span>
                <span className="ln"><span className="tk-key">O</span><span className="tk-mut"> </span><span>i 1 15</span></span>
                <span className="ln">  <span className="tk-key">?</span><span className="tk-mut"> i % 15 </span><span>== 0</span></span>
                <span className="ln">    <span className="tk-key">G</span><span> </span><span className="tk-str">"fizzbuzz"</span></span>
                <span className="ln">  <span className="tk-key">:</span><span> </span><span className="tk-key">?</span><span className="tk-mut"> i % 3 </span><span>== 0</span></span>
                <span className="ln">    <span className="tk-key">G</span><span> </span><span className="tk-str">"fizz"</span></span>
                <span className="ln">  <span className="tk-key">:</span><span> </span><span className="tk-key">?</span><span className="tk-mut"> i % 5 </span><span>== 0</span></span>
                <span className="ln">    <span className="tk-key">G</span><span> </span><span className="tk-str">"buzz"</span></span>
                <span className="ln">  <span className="tk-key">:</span><span> </span><span className="tk-key">G</span><span> i</span></span>
                <span className="ln"><span className="tk-key">N</span></span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer>
      <Brand />
      <p>2026 © ilunonix · all rights reversed</p>
      <p>source at <a href="https://github.com/vulpin-lang/VulpinC" target="_blank" rel="noreferrer">github.com/vulpin-lang/VulpinC</a></p>
      <p className="sponsor">sponsored by <b>fluxcast</b></p>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <div className="sky">
        <div className="aurora aurora--a" />
        <div className="aurora aurora--b" />
        <div className="aurora aurora--c" />
        <div className="aurora aurora--d" />
      </div>
      <Navbar />
      <Hero />
      <Playground />
      <CommandGrid />
      <Why />
      <Band />
      <Footer />
    </>
  )
}