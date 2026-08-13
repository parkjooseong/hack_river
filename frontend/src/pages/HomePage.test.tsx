import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import HomePage from './HomePage'

describe('HomePage', () => {
  it('shows the service promise, success criteria, and citizen journey entry points', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(markup).toContain('강 새로이')
    expect(markup).toContain('BOD 2.0mg/L 이하 성공')
    expect(markup).toContain('하천 구하러 가기')
    expect(markup).toContain('href="/select"')
    expect(markup).toContain('실제 정책 시행 후의 수질을 예측하거나 보장하지 않습니다')
  })
})
