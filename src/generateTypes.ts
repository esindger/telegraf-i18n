import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { prepareI18nData } from './I18n'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parse, traverse } = require('abstract-syntax-tree')

export function generateTypes (
  i18nData: Readonly<Record<string, unknown>>,
  output?: string,
  globalTemplateData?: string[]
): string {
  const templates = prepareI18nData(i18nData)
  const types: string[] = [
    generateTemplateParams(templates, globalTemplateData),
    generateResourceKeyType()
  ]
  const outputContent = types.join('\n\n').trim() + '\n'

  if (output) {
    writeFileSync(resolve(__dirname, output), outputContent, 'utf8')
  }
  return outputContent
}

function generateTemplateParams (templates: Readonly<Record<string, string>>, globalTemplateData?: string[]) {
  const params: string[] = []
  Object.keys(templates).forEach((resourceKey) => {
    const template: string | null = templates[resourceKey] ?? null
    if (template) {
      const templateParams = parseTemplateParams(resourceKey, template, globalTemplateData)
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

function parseTemplateParams (resourceKey: string, template: string, globalTemplateData?: string[]): string[] {
  try {
    const output = new Set<string>()
    const tree = parse(`\`${template.replace(/`/g, '\\\`')}\``)
    const objectValueType = 'Record<string, unknown>'
    const scalarValueTypes = 'string | number'
    const functionType = '(...args: unknown[]) => string | number'

    let skipNode: any = null
    traverse(tree, {
      enter (node: any) {
        if (skipNode) {
          return
        }
        switch (node.type) {
          case 'Identifier': {
            if(!globalTemplateData?.includes(node.name)) {
              output.add(`    ${node.name}: ${scalarValueTypes}`)
            }
            break
          }
          case 'MemberExpression': {
            skipNode = node
            if(!globalTemplateData?.includes(node.object.name)) {
              output.add(`    ${node.object.name}: ${objectValueType}`)
            }
            break
          }
          case 'CallExpression': {
            skipNode = node
            if (node.arguments?.length) {
              node.arguments.forEach((argument: any) => {
                const argumentName = argument.name || argument.object?.name
                if(argumentName && !globalTemplateData?.includes(argumentName)) {
                  output.add(`    ${argumentName}: ${scalarValueTypes}`)
                }
              })
            }
            if(!globalTemplateData?.includes(node.callee.name)) {
              output.add(`    ${node.callee.name}: ${functionType}`)
            }
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

    return Array.from(output)
  } catch (e) {
    console.error(`telegraf-i18n: parsing of the key '${resourceKey}' failed, template:\n${template}`)
    throw e
  }
}
