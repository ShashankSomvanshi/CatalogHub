import Swal from 'sweetalert2'

export async function confirmDelete(itemLabel) {
  const result = await Swal.fire({
    title: `Delete this ${itemLabel}?`,
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#475569',
    background: '#0f172a',
    color: '#f8fafc',
    reverseButtons: true,
    focusCancel: true,
  })

  return result.isConfirmed
}

export function showSuccess(title) {
  return Swal.fire({
    title,
    icon: 'success',
    confirmButtonText: 'OK',
    confirmButtonColor: '#16a34a',
    background: '#0f172a',
    color: '#f8fafc',
  })
}
