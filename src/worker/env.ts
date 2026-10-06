export type Env = {
  DB: D1Database
  SESSION_SECRET: string
  RESEND_API_KEY: string
  EMAIL_FROM: string
  EMAIL_DEV_LOG?: string
}

export type AppEnv = { Bindings: Env; Variables: { userId: string } }
