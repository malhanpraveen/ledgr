import { useState, useRef, useEffect } from 'react'

type PINScreenProps =
  | { mode: 'verify'; onVerify: (pin: string) => Promise<boolean>; onSuccess: () => void; onCancel?: () => void }
  | { mode: 'set'; onVerify?: never; onSuccess: (pin: string) => void; onCancel?: () => void }

export default function PINScreen({ mode, onVerify, onSuccess, onCancel }: PINScreenProps) {
  const [digits, setDigits] = useState('')           // step-1 PIN
  const [confirmDigits, setConfirmDigits] = useState('')  // step-2 PIN
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const inputRef = useRef<HTMLInputElement>(null)
  const pinRowRef = useRef<HTMLDivElement>(null)
  const isSubmitting = useRef(false)

  const active = step === 'confirm' ? confirmDigits : digits
  const setActive = step === 'confirm' ? setConfirmDigits : setDigits

  // Focus the hidden input immediately on mount and step change
  useEffect(() => {
    // Small timeout ensures iOS honors focus after re-render
    const id = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(id)
  }, [step])

  function triggerShake() {
    const el = pinRowRef.current
    if (!el) return
    import('animejs').then(({ animate }) => {
      if (!el) return
      animate(el, {
        translateX: [0, -8, 8, -8, 8, 0],
        ease: 'inOutSine',
        duration: 400,
      })
    })
  }

  async function handleComplete(pin: string) {
    if (isSubmitting.current) return
    isSubmitting.current = true
    try {
      if (mode === 'verify') {
        const ok = await onVerify!(pin)
        if (!ok) {
          triggerShake()
          setActive('')
        } else {
          onSuccess()
        }
        return
      }

      if (step === 'enter') {
        setStep('confirm')
        setConfirmDigits('')
        // Focus synchronously while still inside the user-gesture chain (iOS requires this)
        inputRef.current?.focus()
        return
      }

      // confirm step
      if (pin !== digits) {
        triggerShake()
        setConfirmDigits('')
        inputRef.current?.focus()
        return
      }
      onSuccess(pin)
    } finally {
      isSubmitting.current = false
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setActive(val)
    if (val.length === 4) {
      void handleComplete(val)
    }
  }

  const title =
    mode === 'verify' ? 'Enter PIN'
    : step === 'confirm' ? 'Confirm PIN'
    : 'Set PIN'

  return (
    <div
      className="flex flex-col items-center justify-center h-screen bg-white px-8"
      onClick={() => inputRef.current?.focus()}
    >
      <h1 className="text-2xl font-bold mb-2 text-gray-800">Ledgr</h1>
      <p className="text-gray-500 mb-8">{title}</p>

      {/* Hidden input captures actual typing */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={active}
        onChange={handleChange}
        autoComplete="off"
        autoCorrect="off"
        className="absolute opacity-0 w-px h-px pointer-events-none"
        style={{ fontSize: 16 }}
        aria-label={title}
      />

      {/* Visual 4-dot display */}
      <div ref={pinRowRef} className="flex gap-4 mb-8" onClick={() => inputRef.current?.focus()}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
              i < active.length
                ? 'border-blue-500 bg-blue-50 text-blue-500'
                : 'border-gray-300 text-gray-200'
            }`}
          >
            {i < active.length ? '●' : '○'}
          </div>
        ))}
      </div>

      {onCancel && (
        <button onClick={onCancel} className="text-gray-400 text-sm">
          Cancel
        </button>
      )}
    </div>
  )
}
