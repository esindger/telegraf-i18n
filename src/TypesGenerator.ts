import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { I18n, prepareI18nData } from './I18n'
import { LanguageCode } from './types'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { parse, traverse } = require('abstract-syntax-tree')

export class TypesGenerator extends I18n {
  templates: Record<string, Record<string, string>> = {}

  generateTypes (output?: string): string {
    const resourceKeys = this.resourceKeys(this.config.defaultLanguage)

    const types: string[] = [
      generateResourceKeyType(resourceKeys),
      this.generateTemplateParams(resourceKeys)
    ]
    const outputContent = types.join('\n\n')

    if (output) {
      writeFileSync(resolve(__dirname, output), outputContent, 'utf8')
    }
    return outputContent
  }

  loadLocale (languageCode: LanguageCode, i18nData: Readonly<Record<string, unknown>>): void {
    const language = languageCode.toLowerCase()
    this.templates[language] = {
      ...this.templates[language],
      ...prepareI18nData(i18nData)
    }
  }

  resourceKeys (languageCode: LanguageCode): string[] {
    const language = languageCode.toLowerCase()
    return Object.keys(this.templates[language] ?? {})
  }

  private generateTemplateParams (resourceKeys: string[]) {
    const params: string[] = []
    resourceKeys.forEach((resourceKey) => {
      const template: string | null = this.templates[this.config.defaultLanguage]?.[resourceKey] ?? null
      if (template) {
        const templateParams = parseTemplateParams(template)
        if (templateParams.length) {
          params.push(`  ${resourceKey}: {\n${templateParams.join('\n')}\n  }`)
        } else {
          params.push(`  ${resourceKey}: never`)
        }
      }
    })

    return `export interface ResourceParams {\n${params.join('\\n')}\n}`
  }
}

function generateResourceKeyType (resourceKeys: string[]) {
  return `
export type ResourceKey =
${resourceKeys.map((resourceKey) => ` "${resourceKey}"`).join('\n  | ')}`
}

function parseTemplateParams (template: string): string[] {
  const output: string[] = []

  const tree = parse(template)
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
          if(node.arguments?.length) {
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
}
