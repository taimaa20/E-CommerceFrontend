import { Table, TableStatus } from './pos'

export type { Table, TableStatus }

/** Status string alias used in the new Table Selection UI */
export type TableStatusLabel = 'available' | 'occupied' | 'reserved'

/** Map the numeric enum to a string label */
export function getStatusLabel(status: TableStatus): TableStatusLabel {
  if (status === TableStatus.Occupied) return 'occupied'
  if (status === TableStatus.Reserved) return 'reserved'
  return 'available'
}

/** Tables grouped by section (categoryName) */
export type GroupedTables = Record<string, Table[]>

export function groupTablesBySection(tables: Table[]): GroupedTables {
  return tables.reduce((acc, table) => {
    const key = table.categoryName?.trim() || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(table)
    return acc
  }, {} as GroupedTables)
}
