import React from 'react'
import Toast, { type ToastProps } from '@ui/primitives/Toast'
import './ToastContainer.css'

export type ToastContainerProps = {
  toasts: ToastProps[]
  onClose: (id: string) => void
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps): React.ReactElement
{
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  )
}

