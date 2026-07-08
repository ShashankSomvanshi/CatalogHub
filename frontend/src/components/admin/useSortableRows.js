import { useMemo, useState } from 'react'

function compareValues(left, right) {
  if (left == null || left === '') return right == null || right === '' ? 0 : 1
  if (right == null || right === '') return -1
  if (typeof left === 'number' && typeof right === 'number') return left - right

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export default function useSortableRows(rows, columns, initialKey = '') {
  const [sort, setSort] = useState({ key: initialKey, direction: 'asc' })

  const sortedRows = useMemo(() => {
    const getter = columns[sort.key]
    if (!getter) return rows

    return [...rows].sort((left, right) => {
      const result = compareValues(getter(left), getter(right))
      return sort.direction === 'asc' ? result : -result
    })
  }, [columns, rows, sort])

  const requestSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  return { sortedRows, sort, requestSort }
}
