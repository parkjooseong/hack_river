import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import HomePage from './HomePage'

describe('HomePage', () => {
  it('피그마 메인 화면에서 각 하천 게임과 후보자 화면으로 바로 이동한다', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(markup).toContain('강 새로이')
    expect(markup).toContain('예산 100억 원으로')
    expect(markup).toContain('href="/challenge/oncheoncheon"')
    expect(markup).toContain('href="/challenge/goejeongcheon"')
    expect(markup).toContain('href="/challenge/dongcheon"')
    expect(markup).toContain('쉬움 II')
    expect(markup).toContain('보통 IV')
    expect(markup).toContain('어려움 VI')
    expect(markup).toContain('href="/candidate"')
    expect(markup).toContain('후보자용 대시보드')
    expect(markup).toContain('실제 예측이 아닙니다')
  })
})
