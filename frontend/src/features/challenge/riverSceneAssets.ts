import type { RiverId } from '../../api'
import dongcheonBackground from '../../assets/figma/policy-selection/dongcheon-background.png'
import dongcheonCharacter from '../../assets/figma/policy-selection/dongcheon-character.png'
import dongcheonGround from '../../assets/figma/policy-selection/dongcheon-ground.svg'
import dongcheonTigerCrowned from '../../assets/figma/policy-selection/dongcheon-tiger-crowned.png'
import dongcheonTigerCrying from '../../assets/figma/policy-selection/dongcheon-tiger-crying.png'
import dongcheonTigerNeutral from '../../assets/figma/policy-selection/dongcheon-tiger-neutral.png'
import goejeongcheonBackground from '../../assets/figma/policy-selection/goejeongcheon-background.png'
import goejeongcheonCharacter from '../../assets/figma/policy-selection/goejeongcheon-character.png'
import goejeongcheonGround from '../../assets/figma/policy-selection/goejeongcheon-ground.svg'
import oncheoncheonBackground from '../../assets/figma/policy-selection/oncheoncheon-background.png'
import oncheoncheonCharacter from '../../assets/figma/policy-selection/oncheoncheon-character.png'
import oncheoncheonGround from '../../assets/figma/policy-selection/oncheoncheon-ground.svg'
import oncheoncheonOtterCrowned from '../../assets/figma/policy-selection/oncheoncheon-otter-crowned.png'
import oncheoncheonOtterCrying from '../../assets/figma/policy-selection/oncheoncheon-otter-crying.png'
import oncheoncheonOtterNeutral from '../../assets/figma/policy-selection/oncheoncheon-otter-neutral.png'

export const RIVER_SCENE_ASSETS = {
  dongcheon: {
    background: dongcheonBackground,
    character: dongcheonCharacter,
    ground: dongcheonGround,
  },
  goejeongcheon: {
    background: goejeongcheonBackground,
    character: goejeongcheonCharacter,
    ground: goejeongcheonGround,
  },
  oncheoncheon: {
    background: oncheoncheonBackground,
    character: oncheoncheonCharacter,
    ground: oncheoncheonGround,
  },
} as const

export type RiverSceneCharacterMood = 'crying' | 'neutral' | 'crowned' | 'default'

type RiverSceneCharacterPresentation = {
  src: string
  mood: RiverSceneCharacterMood
  waterQualityStage: number
}

const DONGCHEON_TIGERS = {
  crying: dongcheonTigerCrying,
  neutral: dongcheonTigerNeutral,
  crowned: dongcheonTigerCrowned,
} as const

const ONCHEONCHEON_OTTERS = {
  crying: oncheoncheonOtterCrying,
  neutral: oncheoncheonOtterNeutral,
  crowned: oncheoncheonOtterCrowned,
} as const

/**
 * 백엔드 수질 등급 level(0~6)을 화면용 1~7단계로 변환합니다.
 * 동천 호랑이와 온천천 수달은 1~3단계에서 울고, 4~5단계에서
 * 평온하며, 안전한 6~7단계에서 최고 단계 모습을 사용합니다.
 */
export function resolveRiverSceneCharacter(
  riverId: RiverId,
  gradeLevel: number,
): RiverSceneCharacterPresentation {
  const waterQualityStage = Math.min(7, Math.max(1, Math.trunc(gradeLevel) + 1))

  if (riverId !== 'dongcheon' && riverId !== 'oncheoncheon') {
    return {
      src: RIVER_SCENE_ASSETS[riverId].character,
      mood: 'default',
      waterQualityStage,
    }
  }

  const characters = riverId === 'dongcheon' ? DONGCHEON_TIGERS : ONCHEONCHEON_OTTERS

  if (waterQualityStage <= 3) {
    return { src: characters.crying, mood: 'crying', waterQualityStage }
  }

  if (waterQualityStage <= 5) {
    return { src: characters.neutral, mood: 'neutral', waterQualityStage }
  }

  return { src: characters.crowned, mood: 'crowned', waterQualityStage }
}
