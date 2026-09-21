'use client'

import { useState } from 'react'

interface Row {
  id: string
  email: string
  platform: string
  status: string
  caption: string | null
  topic_used: string | null
  error_message: string | null
  created_at: string
}

const STATUSES = ['all', 'published', 'failed', 'pending', 'generating']

function badge(status: string) {
  const map: Record<string, string> = {
    published: 'text-emerald-600',
    failed: 'text-red-600',
    pending: 'text-amber-600',
    generating: 'text-brand-600',
  }
  return <span className={'text-xs font-medium ' + (map[status] ?? 'text-gray-500')}>{status}</span>
}

export default function PostsClient({ posts }: { posts: Row[] }) {
  const [filter, setFilter] = useState('all')
  const shown = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Posts</h1>
        <p className="text-sm text-gray-500 mt-1">Latest 200 posts across all users</p>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUSES.map(s => {
          const n = s === 'all' ? posts.length : posts.filter(p => p.status === s).length
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={'px-3 py-1.5 rounded-lg text-sm capitalize ' + (filter === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>
              {s} <span className="opacity-70">({n})</span>
            </button>
          )
        })}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left font-medium px-4 py-3">Date</th>
              <th className="text-left font-medium px-4 py-3">User</th>
              <th className="text-left font-medium px-4 py-3">Platform</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">Topic / Caption</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(p => (
              <tr key={p.id} className="border-t border-gray-100 align-top">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(p.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.email}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{p.platform}</td>
                <td className="px-4 py-3">{badge(p.status)}</td>
                <td className="px-4 py-3 text-gray-600 max-w-md">
                  {p.topic_used && <span className="text-gray-900">{p.topic_used}: </span>}
                  {p.status === 'failed' && p.error_message
                    ? <span className="text-red-500">{p.error_message}</span>
                    : <span className="line-clamp-1">{p.caption ?? '—'}</span>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No posts.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
