import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { prepareI18nData } from './I18n'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parse, traverse } = require('abstract-syntax-tree')

export function generateTypes (i18nData: Readonly<Record<string, unknown>>, output?: string): string {
  const templates = prepareI18nData(i18nData)
  const resourceKeys = Object.keys(templates)

  const types: string[] = [
    generateTemplateParams(templates, resourceKeys),
    generateResourceKeyType()
  ]
  const outputContent = types.join('\n\n').trim() + '\n'

  if (output) {
    writeFileSync(resolve(__dirname, output), outputContent, 'utf8')
  }
  return outputContent
}

function generateTemplateParams (templates: Readonly<Record<string, string>>, resourceKeys: string[]) {
  const params: string[] = []
  resourceKeys.forEach((resourceKey) => {
    const template: string | null = templates[resourceKey] ?? null
    if (template) {
      const templateParams = parseTemplateParams(resourceKey, template)
      if (templateParams.length) {
        params.push(`  '${resourceKey}': {\n${templateParams.join('\n')}\n  }`)
      } else {
        params.push(`  '${resourceKey}': never`)
      }
    }
  })

  return `export interface I18nResourceParams {\n${params.join('\n')}\n}`
}

function generateResourceKeyType () {
  return 'export type I18nResourceKey = keyof I18nResourceParams'
}

function parseTemplateParams (resourceKey: string, template: string): string[] {
  try {
    const output: string[] = []
    const tree = parse(`\`${template.replace(/`/g, '\\\`')}\``)
    const objectValueType = 'Record<string, unknown>'
    const allValueTypes = `string | number | ${objectValueType}`

    let skipNode: any = null
    traverse(tree, {
      enter (node: any) {
        if (skipNode) {
          return
        }
        switch (node.type) {
          case 'Identifier': {
            output.push(`    ${node.name}: ${allValueTypes}`)
            break
          }
          case 'MemberExpression': {
            skipNode = node
            output.push(`    ${node.object.name}: ${objectValueType}`)
            break
          }
          case 'CallExpression': {
            skipNode = node
            if (node.arguments?.length) {
              node.arguments.forEach((argument: any) => {
                output.push(`    ${argument.name || argument.object.name}: ${allValueTypes}`)
              })
            }
            output.push(`    ${node.callee.name}: (...args: unknown[]) => string | number`)
            break
          }
        }
      },
      leave (node: any) {
        if (skipNode === node) {
          skipNode = null
        }
      }
    })

    return output
  } catch (e) {
    console.error(`Parsing of the key '${resourceKey}' failed. Template:\n${template}`)
    throw e
  }
}
