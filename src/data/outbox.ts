export type Table = 'roast_beans' | 'roast_roasts' | 'roast_tastings' | 'roast_settings' | 'roast_public'

export interface Op {
  table: Table
  kind: 'upsert' | 'delete'
  id: string
  row?: Record<string, unknown>
}

/**
 * Add a change to the upload queue. A newer save of a row that's already queued replaces it
 * in place, so the order stays intact: a roast still reaches the database before the
 * tastings that point at it.
 */
export function queueOp(queue: Op[], op: Op): Op[] {
  const i = queue.findIndex((o) => o.table === op.table && o.id === op.id)
  return i >= 0 ? queue.map((o, j) => (j === i ? op : o)) : [...queue, op]
}
