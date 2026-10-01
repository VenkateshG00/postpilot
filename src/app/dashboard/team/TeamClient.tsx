'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, UserPlus, Mail, Shield, ShieldCheck, Eye,
  Trash2, Loader2, CheckCircle2, Crown, MoreHorizontal,
  Copy, AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/* ── Types ─────────────────────────────────────────── */
interface Workspace {
  id: string
  owner_id: string
  name: string
  created_at: string
}

interface TeamMember {
  id: string
  workspace_id: string
  user_id: string | null
  email: string
  role: 'admin' | 'editor' | 'viewer'
  status: 'pending' | 'accepted'
  invited_at: string
}

const ROLES = [
  { id: 'admin',  label: 'Admin',  desc: 'Full access to all features',   icon: ShieldCheck, color: '#8b5cf6' },
  { id: 'editor', label: 'Editor', desc: 'Create & edit content',         icon: Shield,      color: '#22c55e' },
  { id: 'viewer', label: 'Viewer', desc: 'View-only access to dashboard', icon: Eye,         color: '#6b7280' },
] as const
type Role = (typeof ROLES)[number]['id']

/* ── Helpers ───────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 12,
  fontSize: 14,
  outline: 'none',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}

/* ── Component ─────────────────────────────────────── */
export default function TeamClient({
  userId,
  userEmail,
  workspace: initWorkspace,
  members: initMembers,
}: {
  userId: string
  userEmail: string
  workspace: Workspace | null
  members: TeamMember[]
}) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<Workspace | null>(initWorkspace)
  const [members, setMembers] = useState<TeamMember[]>(initMembers)

  /* Create workspace form */
  const [wsName, setWsName] = useState('')
  const [creatingWs, setCreatingWs] = useState(false)

  /* Invite form */
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('editor')
  const [inviting, setInviting] = useState(false)
  const [invited, setInvited] = useState(false)

  /* Actions */
  const [removing, setRemoving] = useState<string | null>(null)

  async function createWorkspace() {
    if (!wsName.trim()) return
    setCreatingWs(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('workspaces')
        .insert({ owner_id: userId, name: wsName.trim() })
        .select()
        .single()
      if (error) throw error
      setWorkspace(data)
    } catch (e: any) {
      alert('Failed to create workspace: ' + e.message)
    } finally {
      setCreatingWs(false)
    }
  }

  async function inviteMember() {
    if (!inviteEmail.trim() || !workspace) return
    setInviting(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          workspace_id: workspace.id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          status: 'pending',
        })
        .select()
        .single()
      if (error) throw error
      setMembers(prev => [data, ...prev])
      setInviteEmail('')
      setInvited(true)
      setTimeout(() => setInvited(false), 2500)
    } catch (e: any) {
      alert('Failed to invite: ' + e.message)
    } finally {
      setInviting(false)
    }
  }

  async function updateRole(memberId: string, role: Role) {
    const supabase = createClient()
    await supabase.from('team_members').update({ role }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this team member?')) return
    setRemoving(memberId)
    try {
      const supabase = createClient()
      await supabase.from('team_members').delete().eq('id', memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (e: any) {
      alert('Failed to remove member: ' + e.message)
    } finally {
      setRemoving(null)
    }
  }

  /* ── No workspace yet ────────────────────────────── */
  if (!workspace) {
    return (
      <div className="">
        <div className="mb-8">
          <h1 className="page-heading"><em>Team</em></h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Create a workspace to start inviting team members</p>
        </div>

        <div className="card p-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-subtle)' }}>
            <Users size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Create Your Workspace</h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            A workspace lets you invite team members and collaborate on content creation, scheduling, and analytics.
          </p>
          <div className="flex items-center gap-3 max-w-sm mx-auto">
            <input
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              placeholder="Workspace name"
              onKeyDown={e => e.key === 'Enter' && createWorkspace()}
              style={inputStyle}
            />
            <button
              onClick={createWorkspace}
              disabled={creatingWs || !wsName.trim()}
              className="btn-primary shrink-0 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {creatingWs ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
              Create
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Main team view ──────────────────────────────── */
  return (
    <div className="">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-heading"><em>Team</em></h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {workspace.name} • {members.length} member{members.length !== 1 ? 's' : ''} invited
          </p>
        </div>
      </div>

      {/* Invite Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
            <UserPlus size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Invite Team Member</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Send an invitation by email address</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="team@example.com"
              onKeyDown={e => e.key === 'Enter' && inviteMember()}
              style={inputStyle}
            />
          </div>

          {/* Role selector */}
          <div className="flex gap-2 overflow-x-auto">
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => setInviteRole(r.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: inviteRole === r.id ? 'var(--accent-subtle)' : 'var(--bg)',
                  border: `1.5px solid ${inviteRole === r.id ? 'var(--accent)' : 'var(--border)'}`,
                  color: inviteRole === r.id ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                <r.icon size={12} />
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={inviteMember}
            disabled={inviting || !inviteEmail.trim()}
            className="btn-primary shrink-0 flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {inviting ? <Loader2 size={14} className="animate-spin" /> : invited ? <CheckCircle2 size={14} /> : <Mail size={14} />}
            {invited ? 'Invited!' : 'Send Invite'}
          </button>
        </div>
      </div>

      {/* Owner Card */}
      <div className="card p-6 mb-3">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--accent)' }}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{userEmail}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
            <Crown size={12} />
            Owner
          </div>
        </div>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <div className="card p-6 text-center">
          <Users size={40} style={{ color: 'var(--text-muted)', opacity: 0.3 }} className="mx-auto mb-3" />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>No team members yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>Invite your first team member above to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => {
            const roleInfo = ROLES.find(r => r.id === m.role) || ROLES[1]
            return (
              <div
                key={m.id}
                className="card p-6 flex items-center gap-4"
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: roleInfo.color }}
                >
                  {m.email.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{m.email}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Invited {timeAgo(m.invited_at)}
                    {m.status === 'pending' && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
                        PENDING
                      </span>
                    )}
                    {m.status === 'accepted' && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                        ACTIVE
                      </span>
                    )}
                  </p>
                </div>

                {/* Role switcher */}
                <select
                  value={m.role}
                  onChange={e => updateRole(m.id, e.target.value as Role)}
                  className="text-xs font-semibold rounded-lg px-2.5 py-1.5"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>

                {/* Remove */}
                <button
                  onClick={() => removeMember(m.id)}
                  className="p-2 rounded-lg transition-all hover:opacity-70"
                  style={{ color: '#ef4444' }}
                  title="Remove member"
                >
                  {removing === m.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Role Permissions Info */}
      <div className="card p-6 mt-6">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Role Permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ROLES.map(r => (
            <div key={r.id} className="rounded-xl p-4" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <r.icon size={16} style={{ color: r.color }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{r.label}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.desc}</p>
              <div className="mt-3 space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {r.id === 'admin' && (
                  <>
                    <p>• Manage team members</p>
                    <p>• Edit settings & billing</p>
                    <p>• Create & publish content</p>
                    <p>• View analytics</p>
                  </>
                )}
                {r.id === 'editor' && (
                  <>
                    <p>• Create & edit posts</p>
                    <p>• Schedule content</p>
                    <p>• View analytics</p>
                    <p>• Cannot manage team</p>
                  </>
                )}
                {r.id === 'viewer' && (
                  <>
                    <p>• View dashboard</p>
                    <p>• View analytics</p>
                    <p>• Cannot create content</p>
                    <p>• Cannot change settings</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
