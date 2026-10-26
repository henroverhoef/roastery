import { describe, expect, it } from 'vitest'
import { queueOp, type Op } from '../src/data/outbox'

const up = (table: Op['table'], id: string, v: number): Op => ({ table, kind: 'upsert', id, row: { id, v } })

describe('outbox', () => {
  it('keeps a re-saved roast ahead of the tasting that points at it', () => {
    let q: Op[] = []
    q = queueOp(q, up('roast_roasts', 'r1', 1))
    q = queueOp(q, up('roast_tastings', 't1', 1))
    q = queueOp(q, up('roast_roasts', 'r1', 2)) // e.g. roasted weight added later, still offline
    expect(q.map((o) => `${o.table}:${o.id}:${o.row?.v}`)).toEqual(['roast_roasts:r1:2', 'roast_tastings:t1:1'])
  })

  it('a delete replaces a pending save of the same row', () => {
    let q: Op[] = [up('roast_beans', 'b1', 1)]
    q = queueOp(q, { table: 'roast_beans', kind: 'delete', id: 'b1' })
    expect(q).toEqual([{ table: 'roast_beans', kind: 'delete', id: 'b1' }])
  })
})
