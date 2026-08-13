import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RequiredNotices } from '../notices'
import { Button } from './Button'
import { TextInput } from './FormControls'
import { ProgressBar } from './ProgressBar'

describe('공통 UI 접근성 구조', () => {
  it('처리 중 버튼을 비활성화하고 상태를 알린다', () => {
    const html = renderToStaticMarkup(
      <Button isLoading loadingLabel="제출 중">
        제출하기
      </Button>,
    )

    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('제출 중')
  })

  it('입력 오류를 label, aria-invalid, aria-describedby와 연결한다', () => {
    const html = renderToStaticMarkup(
      <TextInput
        id="comment"
        label="한 줄 의견"
        hint="개인정보를 입력하지 마세요."
        error="의견을 확인해 주세요."
        required
      />,
    )

    expect(html).toContain('for="comment"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('aria-describedby="comment-hint comment-error"')
    expect(html).toContain('id="comment-error"')
    expect(html).toContain('role="alert"')
  })

  it('게이지 값을 허용 범위로 제한하고 텍스트와 함께 제공한다', () => {
    const html = renderToStaticMarkup(
      <ProgressBar label="남은 예산" value={120} max={100} valueText="100억원" />,
    )

    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuemax="100"')
    expect(html).toContain('aria-valuenow="100"')
    expect(html).toContain('aria-valuetext="100억원"')
  })

  it('필수 윤리 안내와 통계 비대표성 문구를 함께 제공한다', () => {
    const html = renderToStaticMarkup(<RequiredNotices showRepresentativeness />)

    expect(html).toContain('체험용 시뮬레이션 안내')
    expect(html).toContain('데모 데이터 안내')
    expect(html).toContain('익명 의견 작성 안내')
    expect(html).toContain('부산 시민 전체를 대표하지 않습니다')
  })
})
