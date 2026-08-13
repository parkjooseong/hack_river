import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import CandidatePage from '../pages/CandidatePage'
import ChallengePage from '../pages/ChallengePage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'
import SelectRiverPage from '../pages/SelectRiverPage'
import StatisticsPage from '../pages/StatisticsPage'

const pages = [
  { path: '/', route: '/', element: <HomePage />, title: '강 새로이' },
  { path: '/select', route: '/select', element: <SelectRiverPage />, title: '하천을 선택' },
  {
    path: '/challenge/dongcheon',
    route: '/challenge/:river',
    element: <ChallengePage />,
    title: '하천 정책 챌린지',
  },
  { path: '/stats', route: '/stats', element: <StatisticsPage />, title: '시민의 선택' },
  {
    path: '/candidate',
    route: '/candidate',
    element: <CandidatePage />,
    title: '시민 정책 리포트',
  },
  { path: '/missing', route: '*', element: <NotFoundPage />, title: '페이지를 찾을 수 없습니다' },
] as const

describe('페이지 디자인 적용 전 스모크 검증', () => {
  it.each(pages)(
    '$path 화면이 기본 랜드마크와 상태 안내를 렌더링한다',
    ({ path, route, element, title }) => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={element} />
          </Routes>
        </MemoryRouter>,
      )

      expect(html).toContain('<main')
      expect(html).toContain('id="main-content"')
      expect(html).toContain('<h1')
      expect(html).toContain(title)
      expect(html).not.toContain('undefined')
    },
  )

  it('초기 인증 확인 전에는 후보자 리포트를 렌더링하지 않는다', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/candidate']}>
        <Routes>
          <Route path="/candidate" element={<CandidatePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(html).not.toContain('리포트 필터')
  })

  it('시민 통계의 참여 버튼은 메인 화면으로 이동한다', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/stats']}>
        <Routes>
          <Route path="/stats" element={<StatisticsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(html).toMatch(/href="\/"[^>]*>나도 참여하기<\/a>/)
    expect(html).not.toContain('href="/select">나도 참여하기</a>')
  })
})
