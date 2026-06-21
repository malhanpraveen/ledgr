function randomChallenge(): ArrayBuffer {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return arr.buffer
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
  const binary = atob(padded)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return arr.buffer
}

export function useBiometric(uid: string | undefined) {
  const storageKey = uid ? `ledgr_bio_${uid}` : null
  const credentialId = storageKey ? localStorage.getItem(storageKey) : null
  const isRegistered = Boolean(credentialId)
  const isSupported = typeof window !== 'undefined' && 'PublicKeyCredential' in window

  async function register(email: string): Promise<boolean> {
    if (!uid || !storageKey || !isSupported) return false
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: randomChallenge(),
          rp: { name: 'Ledgr', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(uid),
            name: email,
            displayName: email,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null
      if (!credential) return false
      localStorage.setItem(storageKey, credential.id)
      return true
    } catch {
      return false
    }
  }

  async function authenticate(): Promise<boolean> {
    if (!credentialId || !isSupported) return false
    try {
      const result = await navigator.credentials.get({
        publicKey: {
          challenge: randomChallenge(),
          rpId: window.location.hostname,
          allowCredentials: [{ id: base64urlToBuffer(credentialId), type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000,
        },
      })
      return Boolean(result)
    } catch {
      return false
    }
  }

  function unregister() {
    if (storageKey) localStorage.removeItem(storageKey)
  }

  return { isRegistered, isSupported, register, authenticate, unregister }
}
