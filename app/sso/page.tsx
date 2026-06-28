'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SsoPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setError('Missing SSO token. Please return to the NEDS portal and try again.')
      return
    }

    signIn('credentials', { token, redirect: false }).then(result => {
      if (result?.error) {
        setError('Single sign-on failed. The link may have expired — please return to the portal and try again.')
        return
      }
      router.push('/')
      router.refresh()
    })
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
            <p className="font-medium mb-1">Sign-in failed</p>
            <p className="text-sm">{error}</p>
          </div>
          <a href="/login" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Sign in manually
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Signing you in&hellip;</p>
      </div>
    </div>
  )
}
