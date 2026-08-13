import { Link } from 'react-router-dom'

import homeBackground from '../assets/figma/home/home-background.png'
import homeLogoAccent1 from '../assets/figma/home/home-logo-accent-1.svg'
import homeLogoAccent2 from '../assets/figma/home/home-logo-accent-2.svg'
import homeLogo from '../assets/figma/home/home-logo.png'
import missionStar from '../assets/figma/home/mission-star.svg'
import dongcheonCharacter from '../assets/figma/policy-selection/dongcheon-character.png'
import goejeongcheonCharacter from '../assets/figma/policy-selection/goejeongcheon-character.png'
import oncheoncheonCharacter from '../assets/figma/policy-selection/oncheoncheon-character.png'
import { useGameConfig } from '../features/game/useGameConfig'

const HOME_RIVERS = [
  { id: 'oncheoncheon', name: '온천천', difficulty: '쉬움', grade: 'II' },
  { id: 'goejeongcheon', name: '괴정천', difficulty: '보통', grade: 'IV' },
  { id: 'dongcheon', name: '동천', difficulty: '어려움', grade: 'VI' },
] as const

export default function HomePage() {
  const { state } = useGameConfig()
  const config =
    state.status === 'success' || state.status === 'empty'
      ? state.data
      : state.status === 'loading' || state.status === 'error'
        ? state.previousData
        : undefined
  const rivers = HOME_RIVERS.map((fallback) => {
    const river = config?.rivers.find((item) => item.id === fallback.id)

    return {
      ...fallback,
      name: river?.name ?? fallback.name,
      difficulty: river?.difficulty ?? fallback.difficulty,
      grade: river?.initialGrade.symbol ?? fallback.grade,
    }
  })

  return (
    <main id="main-content" className="figma-home-screen" tabIndex={-1}>
      <img className="figma-home-background" src={homeBackground} alt="" aria-hidden="true" />

      <h1 className="figma-home-logo">
        <img src={homeLogo} alt="강 새로이" />
        <img className="figma-home-logo__accent-1" src={homeLogoAccent1} alt="" />
        <img className="figma-home-logo__accent-2" src={homeLogoAccent2} alt="" />
      </h1>

      <section className="figma-home-mission" aria-label="게임 안내">
        <img src={missionStar} alt="" aria-hidden="true" />
        <p>
          <span>예산 {config?.maxBudget ?? 100}억 원으로</span>
          <span>정책을 선택해 하천 수질을 개선해요!</span>
        </p>
      </section>

      <div className="figma-home-characters" aria-hidden="true">
        <span className="figma-home-character figma-home-character--dongcheon">
          <img src={dongcheonCharacter} alt="" />
          <i />
          <i />
        </span>
        <img
          className="figma-home-character figma-home-character--oncheoncheon"
          src={oncheoncheonCharacter}
          alt=""
        />
        <img
          className="figma-home-character figma-home-character--goejeongcheon"
          src={goejeongcheonCharacter}
          alt=""
        />
      </div>

      <nav className="figma-home-actions" aria-label="하천 게임 시작">
        <div className="figma-home-river-links">
          {rivers.map((river) => (
            <Link key={river.id} className="figma-home-river-link" to={`/challenge/${river.id}`}>
              <span
                className={`figma-home-difficulty figma-home-difficulty--${river.id}`}
              >
                {river.difficulty} {river.grade}
              </span>
              <strong>{river.name} 구하러 가기</strong>
            </Link>
          ))}

          <Link className="figma-home-dashboard-link" to="/candidate">
            <span className="figma-home-dashboard-icon" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <strong>후보자용 대시보드</strong>
          </Link>
        </div>

        <p className="figma-home-disclaimer">
          ※ 모든 데이터는 시연용 데모 데이터이며
          <br />
          실제 예측이 아닙니다.
        </p>
      </nav>

      {state.status === 'error' ? (
        <p className="visually-hidden" role="alert">
          최신 하천 정보를 불러오지 못해 기본 정보로 표시하고 있습니다.
        </p>
      ) : null}
    </main>
  )
}
