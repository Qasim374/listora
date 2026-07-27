import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs outside Next, so .env.local isn't loaded for us.
config({ path: '.env.local' })

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  // strict:true makes every push ask for interactive confirmation, which is the
  // right default once there's customer data but blocks scripted pushes while
  // iterating. drizzle-kit still warns separately on data-loss changes.
  strict: false,
})
