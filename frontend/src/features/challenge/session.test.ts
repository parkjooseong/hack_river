import { describe, expect, it } from 'vitest'

import { clearChallengeSession, readChallengeSession, writeChallengeSession } from './session'

function createStorage() {
  const data = new Map<string, string>()

  return {
    getItem(key: string) {
      return data.get(key) ?? null
    },
    setItem(key: string, value: string) {
      data.set(key, value)
    },
    removeItem(key: string) {
      data.delete(key)
    },
    entries: data,
  }
}

describe('challenge session', () => {
  it('restores policy order, the handled event, stage, and survey draft', () => {
    const storage = createStorage()

    writeChallengeSession(
      'dongcheon',
      {
        selectedPolicyIds: ['sensor', 'sewer'],
        eventChoice: 'INVESTIGATE',
        showResult: true,
        showSubmissionForm: true,
        topPriority: 'source_control',
        district: 'busanjin',
        comment: '악취 문제부터 해결해 주세요.',
        consent: true,
      },
      storage,
    )

    expect(readChallengeSession('dongcheon', 200, storage)).toEqual({
      selectedPolicyIds: ['sensor', 'sewer'],
      eventChoice: 'INVESTIGATE',
      showResult: true,
      showSubmissionForm: true,
      topPriority: 'source_control',
      district: 'busanjin',
      comment: '악취 문제부터 해결해 주세요.',
      consent: true,
    })
  })

  it('removes invalid data and never restores unknown policy values', () => {
    const storage = createStorage()
    storage.setItem(
      'gang-saeroi:challenge:dongcheon:v1',
      JSON.stringify({
        version: 1,
        riverId: 'dongcheon',
        selectedPolicyIds: ['sewer', 'unknown', 'sewer'],
        eventChoice: 'UNKNOWN',
        topPriority: 'unknown',
        district: 'unknown',
        comment: '123456789',
      }),
    )

    expect(readChallengeSession('dongcheon', 5, storage)).toEqual({
      selectedPolicyIds: ['sewer'],
      showResult: false,
      showSubmissionForm: false,
      topPriority: '',
      district: '',
      comment: '12345',
      consent: false,
    })
  })

  it('clears the draft after reset or successful submission', () => {
    const storage = createStorage()
    writeChallengeSession(
      'oncheoncheon',
      {
        selectedPolicyIds: ['walking'],
        showResult: false,
        showSubmissionForm: false,
        topPriority: '',
        district: '',
        comment: '',
        consent: false,
      },
      storage,
    )

    clearChallengeSession('oncheoncheon', storage)

    expect(readChallengeSession('oncheoncheon', 200, storage)).toBeNull()
    expect(storage.entries.size).toBe(0)
  })

  it('keeps the handled event even while all policies are temporarily removed', () => {
    const storage = createStorage()
    writeChallengeSession(
      'dongcheon',
      {
        selectedPolicyIds: [],
        eventChoice: 'WAIT',
        showResult: false,
        showSubmissionForm: false,
        topPriority: '',
        district: '',
        comment: '',
        consent: false,
      },
      storage,
    )

    expect(readChallengeSession('dongcheon', 200, storage)?.eventChoice).toBe('WAIT')
  })

  it('falls back to memory state when storage access fails', () => {
    const storage = {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        throw new Error('blocked')
      },
      removeItem() {
        throw new Error('blocked')
      },
    }

    expect(readChallengeSession('goejeongcheon', 200, storage)).toBeNull()
    expect(() =>
      writeChallengeSession(
        'goejeongcheon',
        {
          selectedPolicyIds: [],
          showResult: false,
          showSubmissionForm: false,
          topPriority: '',
          district: '',
          comment: '',
          consent: false,
        },
        storage,
      ),
    ).not.toThrow()
  })
})
