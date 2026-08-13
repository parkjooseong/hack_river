import dongcheonBackground from '../../assets/figma/policy-selection/dongcheon-background.png'
import dongcheonCharacter from '../../assets/figma/policy-selection/dongcheon-character.png'
import dongcheonGround from '../../assets/figma/policy-selection/dongcheon-ground.svg'
import goejeongcheonBackground from '../../assets/figma/policy-selection/goejeongcheon-background.png'
import goejeongcheonCharacter from '../../assets/figma/policy-selection/goejeongcheon-character.png'
import goejeongcheonGround from '../../assets/figma/policy-selection/goejeongcheon-ground.svg'
import oncheoncheonBackground from '../../assets/figma/policy-selection/oncheoncheon-background.png'
import oncheoncheonCharacter from '../../assets/figma/policy-selection/oncheoncheon-character.png'
import oncheoncheonGround from '../../assets/figma/policy-selection/oncheoncheon-ground.svg'

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
