import { useState } from 'react'

export default function useServerSort(initialKey = '', initialDirection = 'asc') {
  const [sort, setSort] = useState({ key: initialKey, direction: initialDirection })

  const requestSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  return { sort, requestSort }
}
