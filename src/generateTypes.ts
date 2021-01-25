import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { prepareI18nData } from './I18n'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parse, traverse } = require('abstract-syntax-tree')

export interface ResourceDefinitions {
  Identifier?: Record<string, string>,
  MemberExpression?: Record<string, string>,
  CallExpression?: Record<string, string>
}

export function generateTypes (
  i18nData: Readonly<Record<string, unknown>>,
  output?: string,
  definitions?: ResourceDefinitions
): string {
  const templates = prepareI18nData(i18nData)
  const types: string[] = [
    generateTemplateParams(templates, definitions),
    generateResourceKeyType()
  ]
  const outputContent = types.join('\n\n').trim() + '\n'

  if (output) {
    writeFileSync(resolve(__dirname, output), outputContent, 'utf8')
  }
  return outputContent
}

function generateTemplateParams (templates: Readonly<Record<string, string>>, definitions?: ResourceDefinitions) {
  const params: string[] = []
  Object.keys(templates).forEach((resourceKey) => {
    const template: string | null = templates[resourceKey] ?? null
    if (template) {
      const templateParams = parseTemplateParams(resourceKey, template, definitions)
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

function parseTemplateParams (resourceKey: string, template: string, definitions?: ResourceDefinitions): string[] {
  try {
    const output: string[] = []
    const tree = parse(`\`${template.replace(/`/g, '\\\`')}\``)
    const objectValueType = 'Record<string, unknown>'
    const allValueTypes = `string | number | ${objectValueType}`
    const functionType = '(...args: unknown[]) => string | number'

    let skipNode: any = null
    traverse(tree, {
      enter (node: any) {
        if (skipNode) {
          return
        }
        switch (node.type) {
          case 'Identifier': {
            output.push(`    ${node.name}: ${definitions?.Identifier?.[node.name] ?? allValueTypes}`)
            break
          }
          case 'MemberExpression': {
            skipNode = node
            output.push(`    ${node.object.name}: ${definitions?.MemberExpression?.[node.name] ?? objectValueType}`)
            break
          }
          case 'CallExpression': {
            skipNode = node
            if (node.arguments?.length) {
              node.arguments.forEach((argument: any) => {
                const argumentName = argument.name || argument.object?.name
                if(argumentName) {
                  output.push(`    ${argumentName}: ${allValueTypes}`)
                }
              })
            }
            output.push(`    ${node.callee.name}: ${definitions?.CallExpression?.[node.name] ?? functionType}`)
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
