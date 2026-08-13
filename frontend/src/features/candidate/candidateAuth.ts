import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

export type CandidateSession = {
  accessToken: string
  email: string
}

export class CandidateLoginError extends Error {
  constructor(readonly code: 'NOT_CONFIGURED' | 'INVALID_CREDENTIALS' | 'AUTH_UNAVAILABLE') {
    super(
      code === 'NOT_CONFIGURED'
        ? '후보자 인증 설정이 준비되지 않았습니다.'
        : code === 'INVALID_CREDENTIALS'
          ? '비밀번호가 올바르지 않습니다.'
          : '인증 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    )
    this.name = 'CandidateLoginError'
  }
}

const authConfig = {
  url: import.meta.env.VITE_SUPABASE_URL?.trim(),
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  email: import.meta.env.VITE_CANDIDATE_AUTH_EMAIL?.trim().toLowerCase(),
}

export const isCandidateAuthConfigured = Boolean(
  authConfig.url && authConfig.publishableKey && authConfig.email,
)

let authClient: SupabaseClient | null = null

function client() {
  if (!isCandidateAuthConfigured) {
    throw new CandidateLoginError('NOT_CONFIGURED')
  }
  authClient ??= createClient(authConfig.url!, authConfig.publishableKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
  return authClient
}

function candidateSession(session: Session | null): CandidateSession | null {
  const email = session?.user.email?.trim().toLowerCase()
  if (!session || !email || email !== authConfig.email) {
    return null
  }
  return { accessToken: session.access_token, email }
}

export async function readCandidateSession() {
  if (!isCandidateAuthConfigured) {
    return null
  }
  const { data, error } = await client().auth.getSession()
  if (error) {
    throw new CandidateLoginError('AUTH_UNAVAILABLE')
  }
  return candidateSession(data.session)
}

export function subscribeCandidateSession(listener: (session: CandidateSession | null) => void) {
  if (!isCandidateAuthConfigured) {
    return () => undefined
  }
  const { data } = client().auth.onAuthStateChange((_event, session) => {
    listener(candidateSession(session))
  })
  return () => data.subscription.unsubscribe()
}

export async function signInCandidate(password: string) {
  if (!password) {
    throw new CandidateLoginError('INVALID_CREDENTIALS')
  }
  const { data, error } = await client().auth.signInWithPassword({
    email: authConfig.email!,
    password,
  })
  if (error) {
    throw new CandidateLoginError(
      typeof error.status === 'number' && error.status >= 500
        ? 'AUTH_UNAVAILABLE'
        : 'INVALID_CREDENTIALS',
    )
  }
  const session = candidateSession(data.session)
  if (!session) {
    await client().auth.signOut()
    throw new CandidateLoginError('INVALID_CREDENTIALS')
  }
  return session
}

export async function signOutCandidate() {
  if (isCandidateAuthConfigured) {
    await client().auth.signOut()
  }
}
