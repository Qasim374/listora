import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

/**
 * Hand-wrapped rather than `promisify(scrypt)`: promisify resolves to the
 * 3-argument overload and drops the ScryptOptions parameter, so the cost
 * parameters below would not typecheck.
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

/**
 * scrypt parameters. N=16384 keeps a single hash around 50-100ms on Vercel's
 * hardware — slow enough to make offline brute-forcing expensive, fast enough
 * that a login doesn't feel sluggish.
 */
const KEY_LENGTH = 64
const SCRYPT_N = 16_384
const SCRYPT_r = 8
const SCRYPT_p = 1

/**
 * Password hashing with Node's built-in scrypt — no bcrypt/argon2 dependency.
 *
 * Stored format: `scrypt$N$r$p$saltHex$hashHex`. The parameters travel with the
 * hash so they can be raised later without invalidating existing passwords:
 * verification reads whatever each row was created with.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)

  const derived = await scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_r,
    p: SCRYPT_p,
  })

  return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString('hex')}$${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')

  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, n, r, p, saltHex, hashHex] = parts
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')

  let derived: Buffer

  try {
    derived = await scryptAsync(password.normalize('NFKC'), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })
  } catch {
    return false
  }

  // timingSafeEqual throws on length mismatch, so guard first
  if (derived.length !== expected.length) return false

  return timingSafeEqual(derived, expected)
}
