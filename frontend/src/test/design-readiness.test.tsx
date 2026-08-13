import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { RootLayout } from '../app/RootLayout'
import {
  AppHeader,
  Button,
  ErrorState,
  LoadingState,
  Modal,
  PageLayout,
  Textarea,
} from '../components'

describe('디자인 적용 전 접근성·반응형 기반', () => {
  it('건너뛰기 링크를 본문 랜드마크와 연결한다', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route
              index
              element={
                <PageLayout title="테스트 화면" header={<AppHeader />}>
                  본문
                </PageLayout>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(html).toContain('href="#main-content"')
    expect(html).toContain('id="main-content"')
    expect(html).toContain('tabindex="-1"')
    expect(html.match(/<h1/g)).toHaveLength(1)
  })

  it('로딩과 오류 상태를 보조기기에 알린다', () => {
    const loading = renderToStaticMarkup(<LoadingState label="정보 불러오는 중" />)
    const error = renderToStaticMarkup(
      <ErrorState
        description="잠시 후 다시 시도해 주세요."
        requestId="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      />,
    )

    expect(loading).toContain('role="status"')
    expect(loading).toContain('aria-live="polite"')
    expect(error).toContain('role="alert"')
    expect(error).toContain('문의 코드')
  })

  it('모달과 폼 오류에 접근 가능한 이름과 연결을 제공한다', () => {
    const modal = renderToStaticMarkup(
      <Modal open title="돌전 상황" onClose={vi.fn()} footer={<Button>확인</Button>}>
        대응 방법을 선택하세요.
      </Modal>,
    )
    const field = renderToStaticMarkup(
      <Textarea id="opinion" label="한 줄 의견" error="의견을 확인해 주세요." />,
    )

    expect(modal).toContain('<dialog')
    expect(modal).toContain('aria-labelledby=')
    expect(modal).toContain('aria-label="닫기"')
    expect(field).toContain('for="opinion"')
    expect(field).toContain('aria-invalid="true"')
    expect(field).toContain('aria-describedby="opinion-error"')
  })
})
