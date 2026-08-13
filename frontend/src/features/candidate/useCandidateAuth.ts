import { useCallback, useEffect, useState } from 'react'

import {
  CandidateLoginError,
  isCandidateAuthConfigured,
  readCandidateSession,
  signInCandidate,
  signOutCandidate,
  subscribeCandidateSession,
  type CandidateSession,
} from './candidateAuth'

type CandidateAuthState =
  | { status: 'loading' }
  | { status: 'not-configured' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; session: CandidateSession }
  | { status: 'error'; message: string }

export function useCandidateAuth() {
  const [state, setState] = useState<CandidateAuthState>(
    isCandidateAuthConfigured ? { status: 'loading' } : { status: 'not-configured' },
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isCandidateAuthConfigured) {
      return
    }

    let active = true
    void readCandidateSession()
      .then((session) => {
        if (active) {
          setState(session ? { status: 'authenticated', session } : { status: 'unauthenticated' })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message:
              error instanceof CandidateLoginError
                ? error.message
                : '후보자 로그인 상태를 확인하지 못했습니다.',
          })
        }
      })

    const unsubscribe = subscribeCandidateSession((session) => {
      if (active) {
        setState(session ? { status: 'authenticated', session } : { status: 'unauthenticated' })
      }
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (password: string) => {
    setIsSubmitting(true)
    try {
      const session = await signInCandidate(password)
      setState({ status: 'authenticated', session })
      return true
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof CandidateLoginError
            ? error.message
            : '후보자 로그인을 처리하지 못했습니다.',
      })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsSubmitting(true)
    try {
      await signOutCandidate()
    } catch {
      // 원격 로그아웃이 실패해도 현재 브라우저의 후보자 화면은 즉시 잠급니다.
    } finally {
      setState({ status: 'unauthenticated' })
      setIsSubmitting(false)
    }
  }, [])

  return { state, isSubmitting, login, logout }
}
