'use client'

import { useState, useEffect, useCallback } from 'react'
import { HardDrive, Trash2, RefreshCw, Clock, User, Image, Video, AlertTriangle, CheckCircle } from 'lucide-react'

interface FileInfo {
  name: string
  path: string
  userId: string
  size: number
  created: string
  type: string
}

interface UserBreakdown {
  userId: string
  name: string
  fileCount: number
  totalSize: number
}

interface StorageData {
  totalSize: number
  totalFiles: number
  limitBytes: number
  usagePercent: number
  autoDeleteHours: number
  perUser: UserBreakdown[]
  files: FileInfo[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const DELETE_OPTIONS = [
  { value: 24, label: '24 hours' },
  { value: 48, label: '2 days' },
  { value: 168, label: '1 week' },
  { value: 0, label: 'Disabled' },
]

export default function StorageClient() {
  const [data, setData] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [tab, setTab] = useState<'overview' | 'files'>('overview')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/storage')
      if (!res.ok) throw new Error('Failed to load storage data')
      const d = await res.json()
      setData(d)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function updateAutoDelete(hours: number) {
    setStatus('Saving...')
    try {
      const res = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_auto_delete', hours }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      setData(prev => prev ? { ...prev, autoDeleteHours: hours } : null)
      setStatus('Saved')
      setTimeout(() => setStatus(''), 2000)
    } catch (e: any) {
      setStatus(e.message)
    }
  }

  async function runCleanup() {
    if (!confirm('Run auto-cleanup now? This will delete files from published posts older than the configured retention period.')) return
    setCleaning(true); setStatus('')
    try {
      const res = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_cleanup' }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      setStatus(`Cleaned up ${d.cleaned} file(s)`)
      fetchData()
    } catch (e: any) {
      setStatus(e.message)
    } finally {
      setCleaning(false)
    }
  }

  async function deleteSelected() {
    if (selectedFiles.size === 0) return
    if (!confirm(`Delete ${selectedFiles.size} selected file(s)? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_files', paths: Array.from(selectedFiles) }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      setStatus(`Deleted ${d.deleted} file(s)`)
      setSelectedFiles(new Set())
      fetchData()
    } catch (e: any) {
      setStatus(e.message)
    } finally {
      setDeleting(false)
    }
  }

  async function deleteUserFiles(userId: string, userName: string) {
    if (!confirm(`Delete ALL files for ${userName}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user_files', user_id: userId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      setStatus(`Deleted ${d.deleted} file(s) for ${userName}`)
      fetchData()
    } catch (e: any) {
      setStatus(e.message)
    } finally {
      setDeleting(false)
    }
  }

  function toggleFile(path: string) {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function toggleAll() {
    if (!data) return
    if (selectedFiles.size === data.files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(data.files.map(f => f.path)))
    }
  }

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{error}</div>
      </div>
    )
  }

  if (!data) return null

  const usageColor = data.usagePercent > 80 ? '#ef4444' : data.usagePercent > 50 ? '#f59e0b' : '#22c55e'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <HardDrive size={22} className="text-brand-600" /> Storage
          </h1>
          <p className="text-sm text-gray-500 mt-1">Supabase storage usage and cleanup</p>
        </div>
        <div className="flex items-center gap-2">
          {status && <span className="text-sm text-gray-500">{status}</span>}
          <button onClick={fetchData} disabled={loading} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Usage overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total used</p>
          <p className="text-2xl font-semibold text-gray-900">{formatBytes(data.totalSize)}</p>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(data.usagePercent, 100)}%`, background: usageColor }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{data.usagePercent}% of {formatBytes(data.limitBytes)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Remaining</p>
          <p className="text-2xl font-semibold" style={{ color: usageColor }}>{formatBytes(data.limitBytes - data.totalSize)}</p>
          <p className="text-xs text-gray-400 mt-1">Free plan limit: 1 GB</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total files</p>
          <p className="text-2xl font-semibold text-gray-900">{data.totalFiles}</p>
          <p className="text-xs text-gray-400 mt-1">{data.perUser.length} user(s)</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Auto-delete</p>
          <select
            value={data.autoDeleteHours}
            onChange={e => updateAutoDelete(Number(e.target.value))}
            className="text-lg font-semibold text-gray-900 bg-transparent border-none outline-none cursor-pointer -ml-1"
          >
            {DELETE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">After posting to Instagram</p>
        </div>
      </div>

      {/* Cleanup button */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Clock size={14} className="text-gray-400" /> Auto-cleanup
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.autoDeleteHours === 0
              ? 'Auto-delete is disabled. Files stay in storage permanently until manually deleted.'
              : `Files from published posts are auto-deleted ${data.autoDeleteHours}h after posting. Click to run cleanup now.`}
          </p>
        </div>
        <button
          onClick={runCleanup}
          disabled={cleaning || data.autoDeleteHours === 0}
          className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1.5"
        >
          {cleaning ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Run cleanup now
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['overview', 'files'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'overview' ? 'Per-user breakdown' : `All files (${data.totalFiles})`}
          </button>
        ))}
      </div>

      {/* Per-user breakdown */}
      {tab === 'overview' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Files</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">% of total</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.perUser.map(u => (
                <tr key={u.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-gray-900 font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{u.fileCount}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatBytes(u.totalSize)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {data.totalSize > 0 ? Math.round((u.totalSize / data.totalSize) * 100) : 0}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.userId !== 'system' && (
                      <button
                        onClick={() => deleteUserFiles(u.userId, u.name)}
                        disabled={deleting}
                        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        Delete all
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.perUser.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No files in storage</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* All files */}
      {tab === 'files' && (
        <div>
          {selectedFiles.size > 0 && (
            <div className="mb-3 flex items-center gap-3 bg-red-50 p-3 rounded-xl">
              <span className="text-sm text-red-700 font-medium">{selectedFiles.size} selected</span>
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
              >
                {deleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete selected
              </button>
              <button onClick={() => setSelectedFiles(new Set())} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 w-8">
                    <input type="checkbox" checked={selectedFiles.size === data.files.length && data.files.length > 0} onChange={toggleAll} className="rounded accent-brand-600" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.files.slice(0, 100).map(f => (
                  <tr key={f.path} className={`hover:bg-gray-50 ${selectedFiles.has(f.path) ? 'bg-brand-50' : ''}`}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selectedFiles.has(f.path)} onChange={() => toggleFile(f.path)} className="rounded accent-brand-600" />
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-gray-900 text-xs font-mono truncate max-w-xs">{f.path}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {f.type === 'video' ? <Video size={14} className="text-purple-500" /> : <Image size={14} className="text-blue-500" />}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatBytes(f.size)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(f.created)}</td>
                  </tr>
                ))}
                {data.files.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No files in storage</td>
                  </tr>
                )}
                {data.files.length > 100 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-xs text-gray-400">
                      Showing 100 of {data.files.length} files
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warning banner */}
      {data.usagePercent > 80 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Storage running low!</p>
            <p className="text-xs text-red-600 mt-0.5">
              You've used {data.usagePercent}% of your free 1GB. Consider running cleanup or deleting unused files.
              {data.autoDeleteHours === 0 && ' Enable auto-delete to prevent this in the future.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
