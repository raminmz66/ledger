import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Miniflare } from 'miniflare'

export async function createTestDb(): Promise<{ db: D1Database; dispose(): Promise<void> }> {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("") } }',
    d1Databases: { DB: 'test-db' },
  })
  const db = (await mf.getD1Database('DB')) as unknown as D1Database
  const dir = join(process.cwd(), 'migrations')
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const statements = readFileSync(join(dir, file), 'utf8')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
    await db.batch(statements.map((s) => db.prepare(s)))
  }
  return { db, dispose: () => mf.dispose() }
}
