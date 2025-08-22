import { sortBy } from 'ramda'
import { GameName } from '../../games'
import {
  BasicStageInfo,
  ExpItem,
  IGameAdapter,
  IGameAdapterStatic,
  PredefinedQuery,
  QNumber,
  QString,
  QStrings,
  QueryParam,
  RootCharacterQuery,
} from '../cpp-basic'
import { PSTR, gt, lpstr } from '../gt'
import { ArknightsDataManager, Character } from './DataManager'
import { ArknightsUserDataAdapter } from './UserDataAdapter'
import { HeyboxSurveySource, YituliuSurveySource } from './survey'
import {
  AK_ITEM_GOLD,
  AK_ITEM_UNKNOWN_SHIT,
  AK_ITEM_VIRTUAL_EXP,
  Arknights,
  ArknightsKengxxiao,
  ArknightsRegion,
  PreferenceKeys,
  SurveySourceKeys,
  formulaTagNames,
} from './types'

export class ArknightsAdapter implements IGameAdapter<Arknights> {
  public readPreference<K extends keyof Arknights['preferences']>(
    key: K,
    storage: Record<string, any>,
  ): Arknights['preferences'][K] {
    if (key === PreferenceKeys.SurveySource) {
      const value = storage[PreferenceKeys.SurveySource]
      return SurveySourceKeys.includes(value) ? value : SurveySourceKeys[0]
    }
    return undefined as never
  }

  public writePreference<K extends keyof Arknights['preferences']>(
    key: K,
    value: Arknights['preferences'][K],
    storage: Record<string, any>,
  ): Record<string, any> {
    if (key === PreferenceKeys.SurveySource) {
      return {
        ...storage,
        [key]: value,
      }
    }
    return storage
  }

  public getRealCharacterKey(charId: string) {
    if (this.getCharacter(charId)) return charId
    if (Object.hasOwn(this.dataManager.raw.exPatchCharacters.patchChars, charId)) {
      for (const v of Object.values(this.dataManager.raw.exPatchCharacters.infos)) {
        if (v.tmplIds.includes(charId)) return v.default
      }
    }
    return charId
  }

  private dataManager = new ArknightsDataManager()
  private userDataAdapter = new ArknightsUserDataAdapter(this.dataManager)

  public static codename: string = GameName.Arknights
  public getCodename(): string {
    return ArknightsAdapter.codename
  }

  public static getRegions() {
    return [
      { id: ArknightsRegion.zh_CN, name: 'CN (Simplified Chinese)', short: 'CN' },
      { id: ArknightsRegion.en_US, name: 'YoStarEN (English)', short: 'EN' },
      { id: ArknightsRegion.ja_JP, name: 'YoStarJP (Japanese)', short: 'JP' },
      { id: ArknightsRegion.ko_KR, name: 'YoStarKR (Korean)', short: 'KR' },
      // { id: ArknightsRegion.zh_TW, name: 'txwy (Traditional Chinese)', short: 'KR' },
    ]
  }

  public getDataManager() {
    return this.dataManager
  }

  public getUserDataAdapter() {
    return this.userDataAdapter
  }

  private rootCharacterQuery = new RootCharacterQuery<Arknights, Character>().tap((aa) => {
    aa.addField('name', '代号', QString, ({ character }) => character.name)
    aa.addField('code', '西文代号', QString, ({ character }) => character.appellation)
      .addAlias('appellation')
      .addAlias('en')
    aa.addField('rarity', '稀有度', QNumber, ({ character }) => character.rarity + 1).addAlias('star')
    aa.addField('profession', '职业', QString, ({ character }) => character.raw.profession)
    aa.addField('professions', '职业', QStrings, ({ character }) => [
      ...new Set([character.raw.profession, ...character.patches.map((x) => x[1].profession)]),
    ])

    aa.addStatusField('elite', '精英化', QNumber, ({ status }) => status.elite)
    aa.addStatusField('level', '等级', QNumber, ({ status }) => status.level)
    aa.addStatusField('elv', '精英化*100+等级', QNumber, ({ status }) => status.elite * 100 + status.level)
    aa.addStatusField('skillLevel', '技能等级', QNumber, ({ status }) => status.skillLevel)

    const hss = new HeyboxSurveySource(this.dataManager)
    const yss = new YituliuSurveySource(this.dataManager)

    aa.addField('elite2rate.yituliu', '一图流练度统计 精二率', QNumber, ({ character }) => {
      return QNumber.parse(yss.elite2(character)?.percent)
    })

    aa.addField('elite2rate.heybox', '小黑盒干员统计 精二率', QNumber, ({ character }) => {
      return QNumber.parse(hss.elite2(character)?.percent)
    })

    aa.addField('elite2level90rate.heybox', '小黑盒干员统计 精二 90 级率', QNumber, ({ character }) => {
      return QNumber.parse(hss.e2level(character, 90)?.percent)
    })

    // 模组持有率字段（已替换为子查询方式，保留以备后用）
    /*
    aa.addField('modxrate.yituliu', '一图流练度统计 X模组持有率', QNumber, ({ character }) => {
      return QNumber.parse(yss.modXRate(character)?.percent)
    })

    aa.addField('modyrate.yituliu', '一图流练度统计 Y模组持有率', QNumber, ({ character }) => {
      return QNumber.parse(yss.modYRate(character)?.percent)
    })

    aa.addField('moddrate.yituliu', '一图流练度统计 D模组持有率', QNumber, ({ character }) => {
      return QNumber.parse(yss.modDRate(character)?.percent)
    })

    aa.addField('modarate.yituliu', '一图流练度统计 A模组持有率', QNumber, ({ character }) => {
      return QNumber.parse(yss.modARate(character)?.percent)
    })

    aa.addField('modxrate.heybox', '小黑盒干员统计 X模组持有率', QNumber, () => {
      // 先检查小黑盒是否有模组数据，如果没有则返回NaN
      // 这里暂时返回NaN，等小黑盒API支持模组数据后再实现
      return NaN
    })

    aa.addField('modyrate.heybox', '小黑盒干员统计 Y模组持有率', QNumber, () => {
      return NaN
    })

    aa.addField('moddrate.heybox', '小黑盒干员统计 D模组持有率', QNumber, () => {
      return NaN
    })

    aa.addField('modarate.heybox', '小黑盒干员统计 A模组持有率', QNumber, () => {
      return NaN
    })

    // 模组三级率字段（已替换为子查询方式，保留以备后用）
    aa.addField('modx3rate.yituliu', '一图流练度统计 X模组三级率', QNumber, ({ character }) => {
      return QNumber.parse(yss.modX3Rate(character)?.percent)
    })

    aa.addField('mody3rate.yituliu', '一图流练度统计 Y模组三级率', QNumber, ({ character }) => {
      return QNumber.parse(yss.modY3Rate(character)?.percent)
    })

    aa.addField('modd3rate.yituliu', '一图流练度统计 D模组三级率', QNumber, ({ character }) => {
      return QNumber.parse(yss.modD3Rate(character)?.percent)
    })

    aa.addField('moda3rate.yituliu', '一图流练度统计 A模组三级率', QNumber, ({ character }) => {
      return QNumber.parse(yss.modA3Rate(character)?.percent)
    })

    aa.addField('modx3rate.heybox', '小黑盒干员统计 X模组三级率', QNumber, () => {
      return NaN
    })

    aa.addField('mody3rate.heybox', '小黑盒干员统计 Y模组三级率', QNumber, () => {
      return NaN
    })

    aa.addField('modd3rate.heybox', '小黑盒干员统计 D模组三级率', QNumber, () => {
      return NaN
    })

    aa.addField('moda3rate.heybox', '小黑盒干员统计 A模组三级率', QNumber, () => {
      return NaN
    })
    */

    aa.createSubQuery(
      'skill',
      '技能',
      (character) => {
        return character.skills.map((_, index) => [index] as const)
      },
      (index) => `${index}`,
    ).tap((sq) => {
      sq.addField('name', '技能名', QString, ({ character, args: [index] }) => character.skills[index].skill.name)

      sq.addStatusField('mastery', '专精等级', QNumber, ({ character, status, args: [index] }) => {
        return status.skillMaster[character.skills[index].skillId] ?? 0
      })

      sq.addField('mastery3rate.yituliu', '一图流练度统计 技能专三率', QNumber, ({ character, args: [index] }) => {
        const s = yss.skill(
          character,
          character.skills[index].skill,
          character.skills[index].rawCharId,
          character.skills[index].charSkillIndex,
        )
        if (s?.[0]?.percent == null || s?.[3]?.percent == null) return NaN
        return s?.[0]?.percent * s?.[3]?.percent
      })

      sq.addField('mastery3rate.heybox', '小黑盒干员统计 技能专三率', QNumber, ({ character, args: [index] }) => {
        const s = hss.skill(
          character,
          character.skills[index].skill,
          character.skills[index].rawCharId,
          character.skills[index].charSkillIndex,
        )
        if (s?.[0]?.percent == null || s?.[3]?.percent == null) return NaN
        return s?.[0]?.percent * s?.[3]?.percent
      })
    })

    aa.createSubQuery(
      'mod',
      '模组',
      (character) => {
        return character.uniEquips
          .map((_, index) => [index] as const)
          .filter(([index]) => {
            const typeName = character.uniEquips[index].equip.raw.typeName2
            return typeName === 'X' || typeName === 'Y' || typeName === 'D' || typeName === 'A'
          })
      },
      (index) => `${index}`,
    ).tap((sq) => {
      sq.addField('name', '模组名', QString, ({ character, args: [index] }) => character.uniEquips[index].equip.name)
      sq.addField('type', '模组类型', QString, ({ character, args: [index] }) => {
        const typeName = character.uniEquips[index].equip.raw.typeName2 || ''
        const typeMap: Record<string, string> = {
          X: 'X模组',
          Y: 'Y模组',
          D: 'D模组',
          A: '特限模组',
        }
        return typeMap[typeName] || '未知模组'
      })

      sq.addStatusField('level', '模组等级', QNumber, ({ character, status, args: [index] }) => {
        return status.modLevel[character.uniEquips[index].equipId] ?? 0
      })

      sq.addField('rate.yituliu', '一图流练度统计 模组持有率', QNumber, ({ character, args: [index] }) => {
        const modData = yss.mod(character, character.uniEquips[index].equip, character.uniEquips[index].rawCharId)
        const percent = modData?.[0]?.percent
        return percent != null ? QNumber.parse(percent) : NaN
      })

      sq.addField('level3rate.yituliu', '一图流练度统计 模组三级率', QNumber, ({ character, args: [index] }) => {
        const modData = yss.mod(character, character.uniEquips[index].equip, character.uniEquips[index].rawCharId)
        // 使用mod方法返回的第4个元素，即模组三级率数据
        const percent = modData?.[3]?.percent
        return percent != null ? QNumber.parse(percent) : NaN
      })

      sq.addField('rate.heybox', '小黑盒干员统计 模组持有率', QNumber, () => {
        return NaN
      })

      sq.addField('level3rate.heybox', '小黑盒干员统计 模组三级率', QNumber, () => {
        return NaN
      })
    })
  })

  public getRootCharacterQuery() {
    return this.rootCharacterQuery
  }

  public getDefaultCharacterQueryOrder(): QueryParam['order'] {
    return [
      ['rarity', 'DESC'],
      ['elite', 'DESC'],
      ['level', 'DESC'],
    ]
  }

  public getFavCharacterQueryWhere(): QueryParam['where'] {
    return {
      _: 'field',
      op: '<',
      field: 'elite',
      operand: 2,
    }
  }

  public getPredefinedQueries(): Record<string, PredefinedQuery> {
    return {
      'skill.mastery3rate.yituliu': {
        name: '一图流练度统计 技能专三率',
        query: {
          select: ['skill.mastery3rate.yituliu'],
          join: 'skill',
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'skill.mastery', op: '<', operand: 3 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['skill.mastery3rate.yituliu', 'DESC']],
        },
      },
      'skill.mastery3rate.all.yituliu': {
        name: '一图流练度统计 技能专三率（全部）',
        query: {
          select: ['skill.mastery3rate.yituliu'],
          join: 'skill',
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['skill.mastery3rate.yituliu', 'DESC']],
        },
      },
      'skill.mastery3rate.heybox': {
        name: '小黑盒干员统计 技能专三率',
        query: {
          select: ['skill.mastery3rate.heybox'],
          join: 'skill',
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'skill.mastery', op: '<', operand: 3 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['skill.mastery3rate.heybox', 'DESC']],
        },
      },
      'skill.mastery3rate.all.heybox': {
        name: '小黑盒干员统计 技能专三率（全部）',
        query: {
          select: ['skill.mastery3rate.heybox'],
          join: 'skill',
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['skill.mastery3rate.heybox', 'DESC']],
        },
      },
      'mod.rate.yituliu': {
        name: '一图流练度统计 模组持有率',
        query: {
          select: ['mod.type', 'mod.rate.yituliu'],
          join: 'mod',
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'mod.level', op: '<', operand: 1 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['mod.rate.yituliu', 'DESC']],
        },
      },
      'mod.rate.all.yituliu': {
        name: '一图流练度统计 模组持有率（全部）',
        query: {
          select: ['mod.type', 'mod.rate.yituliu'],
          join: 'mod',
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['mod.rate.yituliu', 'DESC']],
        },
      },
      'mod.level3rate.yituliu': {
        name: '一图流练度统计 模组三级率',
        query: {
          select: ['mod.type', 'mod.level3rate.yituliu'],
          join: 'mod',
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'mod.level', op: '<', operand: 3 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['mod.level3rate.yituliu', 'DESC']],
        },
      },
      'mod.level3rate.all.yituliu': {
        name: '一图流练度统计 模组三级率（全部）',
        query: {
          select: ['mod.type', 'mod.level3rate.yituliu'],
          join: 'mod',
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['mod.level3rate.yituliu', 'DESC']],
        },
      },
      'elite2rate.yituliu': {
        name: '一图流练度统计 精二率',
        query: {
          select: ['elite2rate.yituliu'],
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'elite', op: '<', operand: 2 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['elite2rate.yituliu', 'DESC']],
        },
      },
      'elite2rate.all.yituliu': {
        name: '一图流练度统计 精二率（全部）',
        query: {
          select: ['elite2rate.yituliu'],
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['elite2rate.yituliu', 'DESC']],
        },
      },
      'elite2rate.heybox': {
        name: '小黑盒干员统计 精二率',
        query: {
          select: ['elite2rate.heybox'],
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'elite', op: '<', operand: 2 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['elite2rate.heybox', 'DESC']],
        },
      },
      'elite2rate.all.heybox': {
        name: '小黑盒干员统计 精二率（全部）',
        query: {
          select: ['elite2rate.heybox'],
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['elite2rate.heybox', 'DESC']],
        },
      },
      'elite2level90rate.heybox': {
        name: '小黑盒干员统计 精二 90 级率',
        query: {
          select: ['elite2level90rate.heybox'],
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'elite', op: '==', operand: 2 },
              { _: 'field', field: 'level', op: '<', operand: 90 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['elite2level90rate.heybox', 'DESC']],
        },
      },
      'elite2level90rate.all.heybox': {
        name: '小黑盒干员统计 精二 90 级率（全部）',
        query: {
          select: ['elite2level90rate.heybox'],
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['elite2level90rate.heybox', 'DESC']],
        },
      },
      /* 旧版模组持有率和三级率查询（已替换为子查询方式，保留以备后用）
      'modxrate.yituliu': {
        name: '一图流练度统计 X模组持有率',
        query: {
          select: ['modxrate.yituliu'],
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'elite', op: '<', operand: 2 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['modxrate.yituliu', 'DESC']],
        },
      },
      'modxrate.all.yituliu': {
        name: '一图流练度统计 X模组持有率（全部）',
        query: {
          select: ['modxrate.yituliu'],
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['modxrate.yituliu', 'DESC']],
        },
      },
      'modyrate.yituliu': {
        name: '一图流练度统计 Y模组持有率',
        query: {
          select: ['modyrate.yituliu'],
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'elite', op: '<', operand: 2 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['modyrate.yituliu', 'DESC']],
        },
      },
      'modyrate.all.yituliu': {
        name: '一图流练度统计 Y模组持有率（全部）',
        query: {
          select: ['modyrate.yituliu'],
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['modyrate.yituliu', 'DESC']],
        },
      },
      'moddrate.yituliu': {
        name: '一图流练度统计 D模组持有率',
        query: {
          select: ['moddrate.yituliu'],
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'elite', op: '<', operand: 2 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['moddrate.yituliu', 'DESC']],
        },
      },
      'moddrate.all.yituliu': {
        name: '一图流练度统计 D模组持有率（全部）',
        query: {
          select: ['moddrate.yituliu'],
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['moddrate.yituliu', 'DESC']],
        },
      },
      'modx3rate.yituliu': {
        name: '一图流练度统计 X模组三级率',
        query: {
          select: ['modx3rate.yituliu'],
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'elite', op: '<', operand: 2 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['modx3rate.yituliu', 'DESC']],
        },
      },
      'modx3rate.all.yituliu': {
        name: '一图流练度统计 X模组三级率（全部）',
        query: {
          select: ['modx3rate.yituliu'],
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['modx3rate.yituliu', 'DESC']],
        },
      },
      'mody3rate.yituliu': {
        name: '一图流练度统计 Y模组三级率',
        query: {
          select: ['mody3rate.yituliu'],
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'elite', op: '<', operand: 2 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['mody3rate.yituliu', 'DESC']],
        },
      },
      'mody3rate.all.yituliu': {
        name: '一图流练度统计 Y模组三级率（全部）',
        query: {
          select: ['mody3rate.yituliu'],
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['mody3rate.yituliu', 'DESC']],
        },
      },
      'modd3rate.yituliu': {
        name: '一图流练度统计 D模组三级率',
        query: {
          select: ['modd3rate.yituliu'],
          where: {
            _: '&&',
            operand: [
              {
                _: '||',
                operand: [
                  { _: 'field', field: 'own', op: '==', operand: true },
                  { _: 'field', field: 'goal', op: '==', operand: true },
                ],
              },
              { _: 'field', field: 'elite', op: '<', operand: 2 },
              { _: 'field', field: 'rarity', op: '==', operand: 6 },
            ],
          },
          order: [['modd3rate.yituliu', 'DESC']],
        },
      },
      'modd3rate.all.yituliu': {
        name: '一图流练度统计 D模组三级率（全部）',
        query: {
          select: ['modd3rate.yituliu'],
          where: { _: 'field', field: 'rarity', op: '==', operand: 6 },
          order: [['modd3rate.yituliu', 'DESC']],
        },
      },
      */
    }
  }

  public getFormulaTagNames() {
    return formulaTagNames
  }

  public getItem(key: string) {
    return this.dataManager.data.items[key]
  }

  public getInventoryCategories(): Record<string, PSTR> {
    return CategoryNames
  }

  public getInventoryPages(): Record<string, string> {
    return {
      material: gt.pgettext('arknights inventory page', '养成材料'),
    }
  }

  public getInventoryItems(page?: string) {
    return Object.values(this.dataManager.data.items)
      .filter((x) => {
        if (!['MATERIAL', 'CARD_EXP', 'GOLD', '##EXP_VIRTUAL'].includes(x.raw.itemType)) return false
        if (
          [
            '3105', // 龙骨
            '3401', // 家具零件
            '3133', // 高级加固建材
            '3132', // 进阶加固建材
            '3131', // 基础加固建材
            '3114', // 碳素组
            '3113', // 碳素
            '3112', // 碳
            'STORY_REVIEW_COIN', // 事相碎片
            '3141', // 源石碎片
            '3003', // 赤金
            AK_ITEM_UNKNOWN_SHIT,
          ].includes(x.key)
        ) {
          return false
        }
        if (x.key.startsWith('act')) return false
        if (x.key.startsWith('tier')) return false
        if (x.key.startsWith('p_char')) return false
        if (x.key.startsWith('class_p_char')) return false
        return true
      })
      .sort((a, b) => {
        if (a.raw.sortId < b.raw.sortId) return -1
        if (a.raw.sortId > b.raw.sortId) return 1
        return 0
      })
      .filter((x) => {
        if (!page) return true
        if ([AK_ITEM_VIRTUAL_EXP].includes(x.key)) return false
        return ![AK_ITEM_GOLD, '4006'].includes(x.key)
      })
  }

  public getCharacter(key: string) {
    return this.dataManager.data.characters[key]
  }

  public getFormulas() {
    return this.dataManager.data.formulas
  }

  private _expItems?: Record<string, ExpItem>
  public getExpItems(): Record<string, ExpItem> {
    if (this._expItems) return this._expItems

    this._expItems = {
      [AK_ITEM_VIRTUAL_EXP]: {
        value: Object.fromEntries(
          Object.entries(this.dataManager.raw.exItems.expItems).map(([, value]) => [value.id, value.gainExp]),
        ),
        indirectStage: [
          // LS-6
          { itemId: '2003', quantity: 2 },
          { itemId: '2004', quantity: 4 },
        ],
      },
    }
    return this._expItems
  }

  private _expItemValueMap?: Map<string, [number, string]>
  public getExpItemValue(key: string): [number, string] | null | undefined {
    if (!this._expItemValueMap) {
      const allExpItems = this.getExpItems()
      const map = new Map<string, [number, string]>()
      for (const [virtualExpItemId, thisExpItem] of Object.entries(allExpItems)) {
        for (const [item, value] of Object.entries(thisExpItem.value)) {
          map.set(item, [value, virtualExpItemId])
        }
      }
      this._expItemValueMap = map
    }
    return this._expItemValueMap.get(key)
  }

  private zoneNames: Record<string, string> = {}
  private stageInfo: Record<string, ArknightsStageInfo> = undefined as any
  private cacheExpiresAt = Infinity

  public getZoneNames() {
    this.getStageInfos()
    return this.zoneNames
  }

  public getStageInfos() {
    if (this.stageInfo && Date.now() < this.cacheExpiresAt) return this.stageInfo

    const base = this.dataManager.raw.local || this.dataManager.raw
    const now = Date.now()
    const map = new Map<string, ArknightsStageInfo>()
    this.stageInfo = {}
    this.zoneNames = {}
    this.cacheExpiresAt = Infinity
    const loadZoneName = (stageInfo: ArknightsKengxxiao['exStage']['stages'][''], isRetro: boolean) => {
      if (this.zoneNames[stageInfo.zoneId]) return
      if (isRetro) {
        const retroId = base.exRetro.zoneToRetro[stageInfo.zoneId]
        if (retroId) {
          this.zoneNames[stageInfo.zoneId] = base.exRetro.retroActList[retroId]?.name
        }
      } else {
        const zone = base.exZone.zones[stageInfo.zoneId]
        this.zoneNames[stageInfo.zoneId] = [zone?.zoneNameFirst || '', zone?.zoneNameSecond || ''].join(' ')
      }
    }
    const matrixKeys = new Set(this.dataManager.raw.penguinMatrix.matrix.map((x) => x.stageId))
    for (const stageId of matrixKeys) {
      if (stageId.endsWith('_rep')) {
        matrixKeys.delete(stageId.slice(0, stageId.length - 4) + '_perm')
      }
    }
    for (const i of this.dataManager.raw.penguinMatrix.matrix) {
      if (!matrixKeys.has(i.stageId)) continue
      if (i.start && i.start > now) {
        this.cacheExpiresAt = Math.min(this.cacheExpiresAt, i.start)
      }
      if (i.end && i.end > now) {
        this.cacheExpiresAt = Math.min(this.cacheExpiresAt, i.end)
      }
      if (i.start > now || (i.end && i.end < now)) continue
      if (!this.dataManager.data.items[i.itemId]) continue

      let stageId = i.stageId
      if (stageId.startsWith('wk_armor_')) continue // SK-...

      let stageInfo = base.exStage.stages[stageId]
      let isRetro = false
      if (stageId.endsWith('_rep')) {
        stageId = stageId.slice(0, stageId.length - 4)
        stageInfo = base.exStage.stages[stageId]
      } else if (stageId.endsWith('_perm')) {
        stageId = stageId.slice(0, stageId.length - 5)
        stageInfo = base.exRetro.stageList[stageId]
        isRetro = true
      }
      if (!stageInfo) {
        continue
      }
      loadZoneName(stageInfo, isRetro)

      let stage = map.get(stageId)
      if (!stage) {
        stage = new ArknightsStageInfo(this, stageInfo)
        map.set(stageId, stage)
        this.stageInfo[stageId] = stage

        if (!stageInfo.apCost) console.log(stageInfo)
        stage.setAp(stageInfo.apCost)
        stage.addDrop(AK_ITEM_GOLD, stageInfo.apCost * 12)
      }

      stage.addDrop(i.itemId, i.quantity, i.times)
    }

    const makeCE = (stageId: string, gold: number) => {
      const stageInfo = this.dataManager.raw.exStage.stages[stageId]
      const stage = new ArknightsStageInfo(this, stageInfo)
      stage.setAp(stageInfo.apCost)
      stage.addDrop(AK_ITEM_GOLD, gold)
      map.set(stageId, stage)
      this.stageInfo[stageId] = stage
      loadZoneName(stageInfo, false)
    }
    makeCE('wk_melee_6', 10000)
    makeCE('wk_melee_5', 7500)
    makeCE('wk_melee_4', 5700)
    makeCE('wk_melee_3', 4100)
    makeCE('wk_melee_2', 2800)
    makeCE('wk_melee_1', 1700)

    const makeAP = (stageId: string, ticket: number) => {
      const stageInfo = this.dataManager.raw.exStage.stages[stageId]
      const stage = new ArknightsStageInfo(this, stageInfo)
      stage.setAp(stageInfo.apCost)
      stage.addDrop('4006', ticket)
      stage.addDrop(AK_ITEM_GOLD, stageInfo.apCost * 12)
      map.set(stageId, stage)
      this.stageInfo[stageId] = stage
      loadZoneName(stageInfo, false)
    }
    makeAP('wk_toxic_5', 21)

    this.zoneNames['weekly_chips'] = gt.pgettext('arknights zone', '芯片搜索')
    return this.stageInfo
  }
}

const diffGroupName = {
  NORMAL: lpstr(() => gt.pgettext('arknights stage difficulty', '标准')),
  TOUGH: lpstr(() => gt.pgettext('arknights stage difficulty', '磨难')),
  EASY: lpstr(() => gt.pgettext('arknights stage difficulty', '剧情')),
} as Record<string, PSTR>

class ArknightsStageInfo extends BasicStageInfo {
  public constructor(
    ga: ArknightsAdapter,
    private excel: ArknightsKengxxiao['exStage']['stages'][''],
  ) {
    super(ga)
  }

  public get id(): string {
    return this.excel.stageId
  }

  public get code(): string {
    return `${(diffGroupName[this.excel.diffGroup] || '').toString()}${this.excel.code}`
  }

  public get name(): string {
    return `${this.excel.name}`
  }

  public get zoneId(): string {
    if (Object.prototype.hasOwnProperty.call(zoneReplacement, this.excel.zoneId)) {
      return zoneReplacement[this.excel.zoneId]
    }
    return this.excel.zoneId
  }

  public sortDropInfo(
    di: [itemId: string, drops: number, samples: number][],
  ): [itemId: string, drops: number, samples: number][] {
    return sortBy((i) => {
      if (i[0] === AK_ITEM_GOLD) return 1000
      if (this.ga.getExpItemValue(i[0])) {
        return 1000 + this.ga.getExpItemValue(i[0])![0]
      }
      return -(this.ga.getItem(i[0]).valueAsAp || 0) * (Number.isFinite(i[2]) ? i[1] / i[2] : i[1])
    }, di)
  }
}

;(function (t: IGameAdapterStatic) {
  return t
})(ArknightsAdapter)

const zoneReplacement: Record<string, string> = {
  weekly_1: 'weekly_chips',
  weekly_2: 'weekly_chips',
  weekly_3: 'weekly_chips',
  weekly_4: 'weekly_chips',
}

export enum Category {
  Gold = '0',
  Rarity4 = '1',
  Rarity3 = '2',
  Rarity2 = '3',
  Rarity1 = '4',
  Rarity0 = '5',
  ModSkill = '7',
  ChipsDual = '81',
  ChipsHard = '82',
  ChipsEasy = '83',
  Unknown = '9',
}

export const CategoryNames = {
  [Category.Gold]: lpstr(() => gt.pgettext('arknights item category', '钱和经验')),
  [Category.Rarity4]: lpstr(() => gt.pgettext('arknights item category', '金材料')),
  [Category.Rarity3]: lpstr(() => gt.pgettext('arknights item category', '紫材料')),
  [Category.Rarity2]: lpstr(() => gt.pgettext('arknights item category', '蓝材料')),
  [Category.Rarity1]: lpstr(() => gt.pgettext('arknights item category', '绿材料')),
  [Category.Rarity0]: lpstr(() => gt.pgettext('arknights item category', '灰材料')),
  [Category.ModSkill]: lpstr(() => gt.pgettext('arknights item category', '技能、模组和胶水')),
  [Category.ChipsDual]: lpstr(() => gt.pgettext('arknights item category', '双芯片')),
  [Category.ChipsHard]: lpstr(() => gt.pgettext('arknights item category', '芯片组')),
  [Category.ChipsEasy]: lpstr(() => gt.pgettext('arknights item category', '芯片')),
  [Category.Unknown]: lpstr(() => gt.pgettext('arknights item category', '其他')),
} satisfies Record<Category, PSTR>

export const myCategories = {
  '4001': Category.Gold, // 龙门币
  [AK_ITEM_VIRTUAL_EXP]: Category.Gold,
  '2004': Category.Gold, // 高级作战记录
  '2003': Category.Gold, // 中级作战记录
  '2002': Category.Gold, // 初级作战记录
  '2001': Category.Gold, // 基础作战记录

  '3303': Category.ModSkill, // 技巧概要·卷3
  '3302': Category.ModSkill, // 技巧概要·卷2
  '3301': Category.ModSkill, // 技巧概要·卷1
  mod_unlock_token: Category.ModSkill, // 模组数据块
  mod_update_token_2: Category.ModSkill, // 数据增补仪
  mod_update_token_1: Category.ModSkill, // 数据增补条
  '4006': Category.Gold, // 采购凭证
  '32001': Category.ModSkill, // 芯片助剂

  '3213': Category.ChipsDual, // 先锋双芯片
  '3223': Category.ChipsDual, // 近卫双芯片
  '3233': Category.ChipsDual, // 重装双芯片
  '3243': Category.ChipsDual, // 狙击双芯片
  '3253': Category.ChipsDual, // 术师双芯片
  '3263': Category.ChipsDual, // 医疗双芯片
  '3273': Category.ChipsDual, // 辅助双芯片
  '3283': Category.ChipsDual, // 特种双芯片

  '3212': Category.ChipsHard, // 先锋芯片组
  '3222': Category.ChipsHard, // 近卫芯片组
  '3232': Category.ChipsHard, // 重装芯片组
  '3242': Category.ChipsHard, // 狙击芯片组
  '3252': Category.ChipsHard, // 术师芯片组
  '3262': Category.ChipsHard, // 医疗芯片组
  '3272': Category.ChipsHard, // 辅助芯片组
  '3282': Category.ChipsHard, // 特种芯片组

  '3211': Category.ChipsEasy, // 先锋芯片
  '3221': Category.ChipsEasy, // 近卫芯片
  '3231': Category.ChipsEasy, // 重装芯片
  '3241': Category.ChipsEasy, // 狙击芯片
  '3251': Category.ChipsEasy, // 术师芯片
  '3261': Category.ChipsEasy, // 医疗芯片
  '3271': Category.ChipsEasy, // 辅助芯片
  '3281': Category.ChipsEasy, // 特种芯片
} satisfies Record<string, Category>
