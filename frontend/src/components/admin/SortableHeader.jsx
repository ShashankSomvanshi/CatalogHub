export default function SortableHeader({ column, label, sort, onSort, className = '' }) {
  const active = sort.key === column
  const directionLabel = active && sort.direction === 'asc' ? 'descending' : 'ascending'

  return (
    <th className={className} aria-sort={active ? `${sort.direction}ending` : 'none'}>
      <button className="table-sort-button" type="button" onClick={() => onSort(column)} title={`Sort ${directionLabel}`}>
        <span>{label}</span>
        <span className={`table-sort-indicator ${active ? 'active' : ''}`} aria-hidden="true">{active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  )
}
