import test from 'ava'
import { generateTypes } from '../src'

test('types generator', t => {
  const types = generateTypes({
    greeting: '`${foo(bar.baz)}`'
  })

  t.log(types)

  t.regex(types, /foo:/)
  t.regex(types, /bar:/)
  t.notRegex(types, /baz:/)
})

