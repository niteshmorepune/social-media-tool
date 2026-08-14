import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = {
  title: 'Social Media Dost — Niranjan Enterprises Digital Solutions',
}

export default async function RootPage() {
  const session = await auth()
  if (session) {
    if (session.user.role === 'CLIENT') redirect('/portal')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/neds-logo-horizontal.png" alt="Niranjan Enterprises Digital Solutions" className="h-8 w-auto" />
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/neds-logo.png" alt="Niranjan Enterprises Digital Solutions" className="h-28 w-auto mx-auto mb-6" />
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Social Media Dost</h1>
        <p className="text-gray-500 mt-2">Operated by Niranjan Enterprises Digital Solutions (NEDS)</p>
        <p className="text-gray-700 text-lg leading-relaxed mt-6">
          Social Media Dost is NEDS&apos;s internal content-production platform — used by our
          team to plan, generate, review, and approve social media posts, ad copy, and marketing
          content on behalf of our clients, and by client contacts to review and approve that
          content through a dedicated client portal.
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Sign in to your account
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span>&copy; {new Date().getFullYear()} Niranjan Enterprises Digital Solutions</span>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-gray-600">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-gray-600">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
