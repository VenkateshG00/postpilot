import { createClient } from '@/lib/supabase/server'
import { formatDate, getStatusColor } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

export default async function PostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: logs } = await supabase
    .from('post_logs')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Post history</h1>
        <p className="text-sm text-gray-500 mt-1">Every post PostPilot has created or attempted</p>
      </div>

      {!logs?.length ? (
        <div className="card p-16 text-center">
          <p className="text-gray-400 text-sm">No posts yet — set up a schedule to get started.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 w-16">Image</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Caption</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 w-28">Topic</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 w-24">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 w-32">Date</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      {log.image_url
                        ? <img src={log.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                        : <div className="w-10 h-10 rounded-lg bg-gray-100" />
                      }
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-700 line-clamp-2 max-w-sm">{log.caption || '—'}</p>
                      {log.error_message && (
                        <p className="text-xs text-red-500 mt-0.5">{log.error_message}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{log.topic_used || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(log.created_at)}</td>
                    <td className="px-5 py-3">
                      {log.ig_permalink && (
                        <a href={log.ig_permalink} target="_blank" rel="noreferrer"
                          className="text-gray-400 hover:text-brand-600 transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
