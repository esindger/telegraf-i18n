export type LanguageCode = string

type IsNeverKey<T,K> = [T] extends [never] ? K : never;
export type NeverKeys<T> = { [K in keyof T]-?: IsNeverKey<T[K], K> }[keyof T]

export type TemplateData = Record<string, unknown>
export type Template = (data: Readonly<TemplateData>) => string

export type RepositoryData = Record<string, Record<string, unknown> | never>
export type RepositoryEntry<RepositoryT> = Record<keyof RepositoryT, Template>
export type Repository<RepositoryT> = Record<LanguageCode, Readonly<RepositoryEntry<RepositoryT>>>

export interface Config {
  readonly allowMissing?: boolean;
  readonly defaultLanguage: LanguageCode;
  readonly defaultLanguageOnMissing?: boolean;
  readonly directory?: string;
  readonly sessionName: string;
  readonly templateData: Readonly<TemplateData>;
  readonly useSession?: boolean;
}
