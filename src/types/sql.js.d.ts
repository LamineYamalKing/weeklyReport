declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: unknown[]): void
    exec(sql: string): Statement[]
    prepare(sql: string, params?: unknown[]): Statement
    export(): number[]
    getRowsModified(): number
  }

  export interface Statement {
    bind(params?: unknown[]): void
    step(): boolean
    getAsObject(): Record<string, unknown>
    free(): void
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array | Buffer | null) => Database
  }

  export default function initSqlJs(config?: {
    locateFile: (filename: string) => string
  }): Promise<SqlJsStatic>
}
