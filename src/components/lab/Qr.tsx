import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** QR code for the join link, rendered client-side (no external service). */
export default function Qr({ value, size = 168 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { width: size * 2, margin: 1 })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null))
    return () => {
      alive = false
    }
  }, [value, size])
  if (!src) return <div style={{ width: size, height: size }} className="rounded-lg bg-muted" />
  return (
    <img
      data-testid="join-qr"
      src={src}
      width={size}
      height={size}
      alt="QR code to join this session"
      className="rounded-lg bg-white p-1"
    />
  )
}
