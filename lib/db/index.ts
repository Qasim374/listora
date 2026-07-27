import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

import * as schema from './schema'

type Database = NeonHttpDatabase<typeof schema>

let instance: Database | undefined

function connect(): Database {
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.')
  }

  /**
   * Neon's HTTP driver, not the WebSocket one.
   *
   * `neon-http` issues each query as a stateless fetch, so it works unchanged in
   * every Vercel runtime — Node serverless and Edge alike — with no connection
   * pool to exhaust across cold starts.
   *
   * The tradeoff: no interactive transactions. If we later need one (e.g.
   * reordering images atomically), that route switches to
   * `drizzle-orm/neon-serverless` on the Node runtime. Everything else stays here.
   */
  return drizzle(neon(url), { schema })
}

/**
 * Connection is created on first query rather than at import time, so a missing
 * DATABASE_URL fails the request that needed it instead of failing `next build`
 * while Next is collecting page metadata.
 */
export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    instance ??= connect()
    return Reflect.get(instance, property, receiver)
  },
})

export { schema }
