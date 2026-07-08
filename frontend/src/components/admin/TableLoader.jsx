export default function TableLoader({ label = 'Loading table data...' }) {
  return (
    <div className="table-loader" role="status" aria-live="polite">
      <span className="table-loader-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
