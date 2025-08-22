import { memo } from 'react'
import { Arknights, Character } from '../../pkg/cpp-arknights'
import { FieldContext } from '../../pkg/cpp-basic'
import { gt } from '../../pkg/gt'
import { CharacterListColumn, createSimpleExtraField } from '../CharacterList'
import { CachedImg } from '../Icons'
import { IGameComponent } from '../types'

const percentageFormatter = (value: number) => {
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '???'
}

const percentageStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  textAlign: 'right',
}

export const extraFields: IGameComponent['extraFields'] = {
  skill: {
    width: 150,
    C: memo(({ context }: { context: FieldContext<Arknights, Character, [number]> }) => {
      const skillId = context.args[0]
      const charSkill = context.character.skills[skillId]
      const skillName = charSkill.skill.name
      const skillIndex = [
        gt.pgettext('arknights skill ref', '一技能'),
        gt.pgettext('arknights skill ref', '二技能'),
        gt.pgettext('arknights skill ref', '三技能'),
      ][charSkill.charSkillIndex]

      return (
        <CharacterListColumn width={150}>
          <span className="bp5-menu-item-icon">
            <CachedImg src={charSkill.skill.icon} width={'100%'} height={'100%'} alt={skillName} title={skillName} />
          </span>
          <div className="bp5-fill" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="bp5-text-overflow-ellipsis" title={skillName}>
              {skillName}
            </div>
            <div className="bp5-text-overflow-ellipsis" style={{ fontWeight: 'normal', opacity: 0.25 }}>
              {skillIndex}
            </div>
          </div>
        </CharacterListColumn>
      )
    }),
  },
  'skill.mastery3rate.yituliu': createSimpleExtraField(
    'skill.mastery3rate.yituliu',
    65,
    percentageFormatter,
    percentageStyle,
  ),
  'skill.mastery3rate.heybox': createSimpleExtraField(
    'skill.mastery3rate.heybox',
    65,
    percentageFormatter,
    percentageStyle,
  ),
  'elite2rate.yituliu': createSimpleExtraField('elite2rate.yituliu', 65, percentageFormatter, percentageStyle),
  'elite2rate.heybox': createSimpleExtraField('elite2rate.heybox', 65, percentageFormatter, percentageStyle),
  'elite2level90rate.heybox': createSimpleExtraField(
    'elite2level90rate.heybox',
    65,
    percentageFormatter,
    percentageStyle,
  ),
  /* 旧版模组字段（已替换为子查询方式，保留以备后用）
  'modxrate.yituliu': createSimpleExtraField('modxrate.yituliu', 65, percentageFormatter, percentageStyle),
  'modyrate.yituliu': createSimpleExtraField('modyrate.yituliu', 65, percentageFormatter, percentageStyle),
  'moddrate.yituliu': createSimpleExtraField('moddrate.yituliu', 65, percentageFormatter, percentageStyle),
  'modxrate.heybox': createSimpleExtraField('modxrate.heybox', 65, percentageFormatter, percentageStyle),
  'modyrate.heybox': createSimpleExtraField('modyrate.heybox', 65, percentageFormatter, percentageStyle),
  'moddrate.heybox': createSimpleExtraField('moddrate.heybox', 65, percentageFormatter, percentageStyle),
  'modx3rate.yituliu': createSimpleExtraField('modx3rate.yituliu', 65, percentageFormatter, percentageStyle),
  'mody3rate.yituliu': createSimpleExtraField('mody3rate.yituliu', 65, percentageFormatter, percentageStyle),
  'modd3rate.yituliu': createSimpleExtraField('modd3rate.yituliu', 65, percentageFormatter, percentageStyle),
  'modx3rate.heybox': createSimpleExtraField('modx3rate.heybox', 65, percentageFormatter, percentageStyle),
  'mody3rate.heybox': createSimpleExtraField('mody3rate.heybox', 65, percentageFormatter, percentageStyle),
  'modd3rate.heybox': createSimpleExtraField('modd3rate.heybox', 65, percentageFormatter, percentageStyle),
  */
  'mod.name': createSimpleExtraField('mod.name', 120, (value) => value, {}),
  'mod.type': {
    width: 150,
    C: memo(({ context }: { context: FieldContext<Arknights, Character, [number]> }) => {
      const modIndex = context.args[0]
      const modEquip = context.character.uniEquips[modIndex]
      const modName = modEquip.equip.name
      const typeName = modEquip.equip.raw.typeName2 || ''

      const typeMap: Record<string, string> = {
        X: 'X模组',
        Y: 'Y模组',
        D: 'D模组',
        A: '特限模组',
      }
      const modTypeName = typeMap[typeName] || '未知模组'

      return (
        <CharacterListColumn width={150}>
          <div className="bp5-fill" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="bp5-text-overflow-ellipsis" title={modName}>
              {modName}
            </div>
            <div className="bp5-text-overflow-ellipsis" style={{ fontWeight: 'normal', opacity: 0.6 }}>
              {modTypeName}
            </div>
          </div>
        </CharacterListColumn>
      )
    }),
  },
  'mod.level': createSimpleExtraField('mod.level', 60, (value) => value, {}),
  'mod.rate.yituliu': createSimpleExtraField('mod.rate.yituliu', 65, percentageFormatter, percentageStyle),
  'mod.level3rate.yituliu': createSimpleExtraField('mod.level3rate.yituliu', 65, percentageFormatter, percentageStyle),
  'mod.rate.heybox': createSimpleExtraField('mod.rate.heybox', 65, percentageFormatter, percentageStyle),
  'mod.level3rate.heybox': createSimpleExtraField('mod.level3rate.heybox', 65, percentageFormatter, percentageStyle),
}
