import Link from 'next/link'
import { PRIVACY_CONTENT } from '@/lib/privacy-content'

export const metadata = {
  title: 'Kebijakan Privasi — StoryForge.id',
}

export default function PrivacyPage() {
  const sections = PRIVACY_CONTENT.trim().split('\n')

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <Link href="/" className="text-base font-bold text-indigo-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <article className="prose prose-gray max-w-none">
          {sections.map((line, i) => {
            if (line.startsWith('# ')) {
              return <h1 key={i} className="text-3xl font-bold text-gray-900 mb-2">{line.slice(2)}</h1>
            }
            if (line.startsWith('## ')) {
              return <h2 key={i} className="text-xl font-semibold text-gray-800 mt-8 mb-3">{line.slice(3)}</h2>
            }
            if (line.startsWith('**') && line.endsWith('**')) {
              return <p key={i} className="font-medium text-gray-700 mt-1">{line.replace(/\*\*/g, '')}</p>
            }
            if (line.startsWith('- ')) {
              return <li key={i} className="ml-4 text-gray-600 list-disc">{line.slice(2)}</li>
            }
            if (line.startsWith('---')) {
              return <hr key={i} className="my-8 border-gray-200" />
            }
            if (line.trim() === '') {
              return <br key={i} />
            }
            return <p key={i} className="text-gray-600 leading-relaxed">{line}</p>
          })}
        </article>
      </main>
    </div>
  )
}
