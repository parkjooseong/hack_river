# 캐릭터 자산 연결 안내

캐릭터 상태와 화면 렌더링은 다음 두 파일로 분리되어 있습니다.

- `model.ts`: 하천·등급·이벤트·결과 상태와 자산 경로 매핑
- `RiverCharacter.tsx`: 연결된 SVG 또는 임시 인라인 SVG 렌더링

디자이너 자산을 받기 전에는 모든 상태가 인라인 SVG 표정으로 표시됩니다. 자산을 받은 뒤 `public/characters/<riverId>/`에 파일을 추가하고 `RIVER_CHARACTER_ASSETS`의 `bodySrc`, `backgroundSrc`, 등급·상태별 `src`를 해당 `expectedPath`로 변경합니다.

```text
public/characters/
├─ dongcheon/
│  ├─ body.svg
│  ├─ background.svg
│  ├─ face-grade-ia.svg ... face-grade-vi.svg
│  ├─ face-event-pending.svg
│  ├─ face-event-worried.svg
│  ├─ face-result-try-again.svg
│  ├─ face-result-success.svg
│  └─ face-result-perfect.svg
├─ goejeongcheon/
└─ oncheoncheon/
```

SVG 이미지는 캐릭터 전체의 대체 텍스트를 중복해서 읽지 않도록 장식 이미지(`alt=""`)로 렌더링합니다. 실제 상태 설명은 `RiverCharacter` 컨테이너의 접근 가능한 이름으로 제공합니다.
