import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const readStyle = (name) => readFileSync(new URL(`../src/styles/${name}`, import.meta.url), 'utf8')

const tokens = readStyle('tokens.css')
const fonts = readStyle('fonts.css')
const reset = readStyle('reset.css')
const global = readStyle('global.css')
const components = readStyle('components.css')

assert.ok(
  existsSync(new URL('../src/assets/fonts/PretendardVariable.woff2', import.meta.url)),
  'Pretendard 웹폰트 파일이 필요합니다.',
)
assert.ok(
  existsSync(new URL('../src/assets/fonts/Ownglyph-PDH.ttf', import.meta.url)),
  '온글잎 박다현체 파일이 필요합니다.',
)
assert.match(fonts, /font-family:\s*Pretendard/, 'Pretendard @font-face 선언이 필요합니다.')
assert.match(
  fonts,
  /font-family:\s*'Ownglyph PDH'/,
  '온글잎 박다현체 @font-face 선언이 필요합니다.',
)

assert.match(tokens, /--app-max-width:\s*412px/, '412px 앱 최대 너비가 필요합니다.')
assert.match(tokens, /--touch-target:\s*44px/, '44px 최소 터치 영역이 필요합니다.')
assert.match(reset, /min-width:\s*320px/, '320px 최소 화면 폭을 지원해야 합니다.')
assert.match(
  reset,
  /@media \(prefers-reduced-motion:\s*reduce\)/,
  '모션 감소 설정을 지원해야 합니다.',
)
assert.match(
  global,
  /\.app-shell\s*\{[^}]*max-width:\s*var\(--app-max-width\)/s,
  '앱 컨테이너 최대 너비가 토큰과 연결되어야 합니다.',
)
assert.match(
  global,
  /\.app-shell\s*\{[^}]*overflow-x:\s*clip/s,
  '앱 컨테이너의 가로 넘침을 차단해야 합니다.',
)
assert.match(global, /@media\s+print/, '후보자 리포트 인쇄 스타일이 필요합니다.')
assert.match(
  components,
  /\.button\s*\{[^}]*min-height:\s*var\(--touch-target\)/s,
  '버튼은 최소 터치 영역 토큰을 사용해야 합니다.',
)
assert.match(
  components,
  /\.modal\s*\{[^}]*width:\s*min\(/s,
  '모달은 모바일 화면 너비 제한을 적용해야 합니다.',
)

console.log('design-readiness=PASS viewport=320..412 touch=44 motion=reduce print=ready')
