import { useState, useRef, useEffect } from 'react'

interface PINScreenProps {
  mode: 'verify' | 'set'
  onVerify?: (pin: string) => Promise<boolean>
  onSuccess: (pin?: string) => void
  onCancel?: () => void
}

export default function PINScreen({ mode, onVerify, onSuccess, onCancel }: PINScreenProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])
  const [confirmDigits, setConfirmDigits] = useState<string[]>(['', '', '', ''])
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const pinRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [step])

  const activeDigits = step === 'confirm' ? confirmDigits : digits
  const setActiveDigits = step === 'confirm' ? setConfirmDigits : setDigits

  function triggerShake() {
    import('animejs').then(({ animate }) => {
      animate(pinRowRef.current!, {
        translateX: [0, -8, 8, -8, 8, 0],
        ease: 'inOutSine',
        duration: 400,
      })
    })
  }

  function resetDigits() {
    if (step === 'confirm') {
      setConfirmDigits(['', '', '', ''])
    } else {
      setDigits(['', '', '', ''])
    }
    setTimeout(() => inputRefs.current[0]?.focus(), 0)
  }

  async function handleComplete(pin: string) {
    if (mode === 'verify') {
      if (!onVerify) return
      const ok = await onVerify(pin)
      if (!ok) {
        triggerShake()
        resetDigits()
      } else {
        onSuccess()
      }
      return
    }

    // mode === 'set'
    if (step === 'enter') {
      setStep('confirm')
      return
    }

    // step === 'confirm'
    if (pin !== digits.join('')) {
      triggerShake()
      setConfirmDigits(['', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 0)
      return
    }

    onSuccess(pin)
  }

  function handleDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...activeDigits]
    next[index] = value.slice(-1)
    setActiveDigits(next)
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
    if (value && index === 3) {
      const pin = next.join('')
      if (pin.length === 4) {
        void handleComplete(pin)
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !activeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const title =
    mode === 'verify'
      ? 'Enter PIN'
      : step === 'confirm'
      ? 'Confirm PIN'
      : 'Set PIN'

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white px-8">
      <h1 className="text-2xl font-bold mb-2 text-gray-800">Ledgr</h1>
      <p className="text-gray-500 mb-8">{title}</p>
      <div ref={pinRowRef} className="flex gap-4 mb-8">
        {activeDigits.map((d, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none"
          />
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
