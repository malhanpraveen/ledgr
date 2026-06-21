import { useRef, useState, useEffect } from 'react'

type PINScreenProps =
  | { mode: 'verify'; heading?: string; onVerify: (pin: string) => Promise<boolean>; onSuccess: () => void; onCancel?: () => void }
  | { mode: 'set'; heading?: string; onVerify?: never; onSuccess: (pin: string) => void; onCancel?: () => void }

export default function PINScreen({ mode, heading, onVerify, onSuccess, onCancel }: PINScreenProps) {
  const [value, setValue] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pinRowRef = useRef<HTMLDivElement>(null)
  const isSubmitting = useRef(false)

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(id)
  }, [])

  function triggerShake() {
    const el = pinRowRef.current
    if (!el) return
    import('animejs').then(({ animate }) => {
      if (!el) return
      animate(el, { translateX: [0, -8, 8, -8, 8, 0], ease: 'inOutSine', duration: 400 })
    })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setValue(val)
    setError('')
  }

  async function handleSubmit() {
    if (value.length < 4 || isSubmitting.current) return
    isSubmitting.current = true
    try {
      if (mode === 'verify') {
        const ok = await onVerify!(value)
        if (!ok) {
          triggerShake()
          setValue('')
          setError('Incorrect PIN')
        } else {
          inputRef.current?.blur()
          onSuccess()
        }
        return
      }

      if (step === 'enter') {
        setFirstPin(value)
        setValue('')
        setStep('confirm')
        setError('')
        // onMouseDown=preventDefault on button keeps input focused, so keyboard stays
        return
      }

      // confirm step
      if (value !== firstPin) {
        triggerShake()
        setValue('')
        setError("PINs don't match — try again")
        return
      }

      inputRef.current?.blur()
      onSuccess(value)
    } finally {
      isSubmitting.current = false
    }
  }

  const baseLabel = heading ?? (mode === 'verify' ? 'Enter PIN' : 'Set PIN')
  const title =
    mode === 'verify' ? baseLabel
    : step === 'confirm' ? `Confirm ${baseLabel}`
    : baseLabel

  const btnLabel =
    mode === 'verify' ? 'Unlock'
    : step === 'confirm' ? 'Confirm'
    : 'Next'

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white px-8">
      <h1 className="text-2xl font-bold mb-2 text-gray-800">Ledgr</h1>
      <p className="text-gray-500 mb-8">{title}</p>

      {/* Hidden 1×1 input — font-size 16 prevents iOS zoom */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={handleChange}
        autoComplete="off"
        autoCorrect="off"
        className="absolute top-0 left-0 opacity-0 w-px h-px pointer-events-none"
        style={{ fontSize: 16 }}
        aria-label={title}
      />

      {/* Dot display — tapping focuses hidden input */}
      <div
        ref={pinRowRef}
        className="flex gap-4 mb-4 cursor-pointer"
        role="button"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.focus()}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
              i < value.length
                ? 'border-blue-500 bg-blue-50 text-blue-500'
                : 'border-gray-300 text-gray-200'
            }`}
          >
            {i < value.length ? '●' : '○'}
          </div>
        ))}
      </div>

      {error ? (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      ) : (
        <p className="text-gray-300 text-sm mb-4">tap above to type</p>
      )}

      {/* onMouseDown preventDefault = button click fires but focus never leaves input */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleSubmit}
        disabled={value.length < 4}
        className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold disabled:opacity-30 mb-3"
      >
        {btnLabel}
      </button>

      {onCancel && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCancel}
          className="text-gray-400 text-sm"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
