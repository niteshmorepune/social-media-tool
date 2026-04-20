'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Polls router.refresh() every 5s while any IMAGE or CAROUSEL item is still GENERATING.
// VIDEO items are handled by VideoStatusPoller inside MediaDisplay.
export default function GeneratingPoller({ active }: { active: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => router.refresh(), 5000)
    return () => clearInterval(id)
  }, [active, router])

  return null
}
