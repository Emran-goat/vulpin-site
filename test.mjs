import { Vulpin } from './src/vulpin.js'

const t = (src, expect) => {
  const v = new Vulpin()
  const r = v.run(src)
  const out = v.output
  const ok = r.ok && JSON.stringify(out) === JSON.stringify(expect)
  const label = src.split('\n')[0].slice(0, 28)
  console.log(ok ? 'PASS' : 'FAIL', label, '=>', JSON.stringify(out), ok ? '' : ' expected ' + JSON.stringify(expect) + ' err=' + r.error)
}

t('G "hello world"', ['hello world'])
t('E x = 3 + 4\nG x * 2', ['14'])
t('O i 1 5\nG i\nN', ['1', '2', '3', '4', '5'])
t('E x = 0\n@ x < 4\n G x\n E x = x + 1\n&', ['0', '1', '2', '3'])
t('E age = 17\n? age >= 18\n G "vote"\n:\n G "young"\n;', ['young'])
t('E age = 19\n? age >= 18\n G "vote"\n:\n G "young"\n;', ['vote'])
t('E s = "vulpin"\nG upper(s)', ['VULPIN'])
t('E s = "vulpin"\nG len(s)', ['6'])
t('G 7 % 4', ['3'])
t('E a = 10\nE b = 3\nG a - b', ['7'])