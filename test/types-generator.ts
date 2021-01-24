import test from 'ava'

import {TypesGenerator} from '../src/TypesGenerator'

test('types generator', t => {
  const i18n = new TypesGenerator()
  i18n.loadLocale('en', {
    greeting: '`${foo(bar.baz)}`'
  })
  const types = i18n.generateTypes()

  t.log(types)

  t.regex(types, /foo:/)
  t.regex(types, /bar:/)
  t.notRegex(types, /baz:/)
})

