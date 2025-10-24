import React from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

interface ToastProps {
  type: 'success' | 'error'
  message: string
  onClose: () => void
}

function Toast({ type, message, onClose }: ToastProps) {
  return (
    <div className={`toast ${type}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {type === 'success' ? (
          <CheckCircle size={18} color="#30d158" />
        ) : (
          <AlertCircle size={18} color="#ff3b30" />
        )}
        <div className="toast-message">{message}</div>
      </div>
      <button className="toast-close" onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  )
}

export default Toast
