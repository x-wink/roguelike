import type { NpcId, NpcDef, NodeType } from './types'

export const NPC_DEFS: Record<NpcId, NpcDef> = {
  shopkeeper: { id: 'shopkeeper', name: '掌柜', role: '用金币换取补给' },
  seamstress: {
    id: 'seamstress',
    name: '缝合者',
    role: '修复伤势，也可联系修补者强化技艺',
    companion: 'repairman',
  },
  repairman: { id: 'repairman', name: '修补者', role: '深化技能潜力' },
  chronicler: { id: 'chronicler', name: '记录者', role: '在册之事，过去与选择' },
}

/** 驻渊各节点类型默认对应的 NPC */
export const SETTLEMENT_NODE_NPC: Partial<Record<NodeType, NpcId>> = {
  shop: 'shopkeeper',
  rest: 'seamstress',
  event: 'chronicler',
}
