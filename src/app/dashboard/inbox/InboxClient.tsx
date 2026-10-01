'use client'

import { useState, useEffect } from 'react'
import {
  MessageSquare, Search, Inbox, Archive, Send, ArrowLeft,
  AlertTriangle, Instagram, Star, Filter, Clock, User,
  Loader2, MoreHorizontal,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/* ── Types ────────────────────────────────────────── */
interface Conversation {
  id: string
  user_id: string
  account_id: string
  participant_id: string
  participant_name: string
  participant_username: string
  participant_avatar: string | null
  last_message: string
  last_message_at: string
  unread_count: number
  is_archived: boolean
  is_hot_lead: boolean
  tab: 'chats' | 'outreach' | 'archived'
}

interface Message {
  id: string
  conversation_id: string
  sender_type: 'user' | 'participant' | 'automation'
  content: string
  created_at: string
}

interface Account {
  id: string
  account_name: string
  platform: string
  profile_picture_url: string | null
}

type TabId = 'chats' | 'outreach' | 'archived'
type FilterId = 'all' | 'unread' | 'hot_lead'

/* ── Helpers ──────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 14,
  outline: 'none', background: 'var(--bg)', border: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

/* ── Component ────────────────────────────────────── */
export default function InboxClient({
  accounts,
  initialConversations,
}: {
  accounts: Account[]
  initialConversations: Conversation[]
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null)
  const [tab, setTab] = useState<TabId>('chats')
  const [filter, setFilter] = useState<FilterId>('all')
  const [search, setSearch] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const hasAccounts = accounts.length > 0

  /* Filter conversations */
  const filtered = conversations.filter(c => {
    if (tab === 'archived' && !c.is_archived) return false
    if (tab === 'chats' && (c.is_archived || c.tab === 'outreach')) return false
    if (tab === 'outreach' && c.tab !== 'outreach') return false
    if (filter === 'unread' && c.unread_count === 0) return false
    if (filter === 'hot_lead' && !c.is_hot_lead) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.participant_name.toLowerCase().includes(q) ||
        c.participant_username.toLowerCase().includes(q) ||
        c.last_message.toLowerCase().includes(q)
      )
    }
    return true
  })

  /* Load messages for a conversation */
  async function openConversation(convo: Conversation) {
    setActiveConvo(convo)
    setLoadingMsgs(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convo.id)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages((data as Message[]) ?? [])
      // Mark as read
      if (convo.unread_count > 0) {
        await supabase.from('conversations').update({ unread_count: 0 }).eq('id', convo.id)
        setConversations(prev => prev.map(c => c.id === convo.id ? { ...c, unread_count: 0 } : c))
      }
    } catch {
      setMessages([])
    } finally {
      setLoadingMsgs(false)
    }
  }

  /* Send reply */
  async function handleSend() {
    if (!reply.trim() || !activeConvo) return
    setSending(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: activeConvo.id,
        sender_type: 'user',
        content: reply.trim(),
      }).select().single()
      if (error) throw error
      setMessages(prev => [...prev, data as Message])
      setReply('')
      // Update last_message
      await supabase.from('conversations').update({
        last_message: reply.trim(),
        last_message_at: new Date().toISOString(),
      }).eq('id', activeConvo.id)
      setConversations(prev =>
        prev.map(c => c.id === activeConvo.id
          ? { ...c, last_message: reply.trim(), last_message_at: new Date().toISOString() }
          : c
        )
      )
    } catch (e: any) {
      alert('Failed to send: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  /* Tab counts */
  const chatCount = conversations.filter(c => !c.is_archived && c.tab !== 'outreach').length
  const outreachCount = conversations.filter(c => c.tab === 'outreach').length
  const archivedCount = conversations.filter(c => c.is_archived).length

  const TABS: { id: TabId; label: string; count: number }[] = [
    { id: 'chats',    label: 'Chats',    count: chatCount },
    { id: 'outreach', label: 'Outreach', count: outreachCount },
    { id: 'archived', label: 'Archived', count: archivedCount },
  ]

  const FILTERS: { id: FilterId; label: string }[] = [
    { id: 'all',      label: 'All' },
    { id: 'unread',   label: 'Unread' },
    { id: 'hot_lead', label: 'Hot Lead' },
  ]

  /* No accounts */
  if (!hasAccounts) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inbox</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage your Instagram conversations</p>
        </div>
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(245,158,11,0.1)' }}>
            <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
          </div>
          <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Instagram not connected</h2>
          <p className="text-sm mb-4 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            Connect your Instagram account to view and manage your conversations.
          </p>
          <a href="/dashboard/connect"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90"
            style={{ background: 'var(--accent)' }}>
            <Instagram size={15} /> Connect Instagram
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inbox</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your Instagram conversations and leads
        </p>
      </div>

      {/* Split pane */}
      <div
        className="rounded-2xl overflow-hidden flex"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          height: 'calc(100vh - 200px)',
          minHeight: 500,
        }}
      >
        {/* ── Left: Conversation list ── */}
        <div
          className={activeConvo ? 'hidden sm:flex flex-col shrink-0' : 'flex flex-col shrink-0'}
          style={{
            width: activeConvo ? 340 : '100%',
            borderRight: '1px solid var(--border)',
          }}
        >
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b" style={{ borderColor: 'var(--border)' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setActiveConvo(null) }}
                className="flex-1 px-3 py-3 text-xs font-bold text-center transition-all relative"
                style={{ color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: tab === t.id ? 'var(--accent-subtle)' : 'var(--bg)', color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {t.count}
                  </span>
                )}
                {tab === t.id && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
                )}
              </button>
            ))}
          </div>

          {/* Search + filters */}
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                style={{ ...inputStyle, paddingLeft: 34, fontSize: 13, padding: '8px 12px 8px 34px' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
              />
            </div>
            <div className="flex gap-1">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: filter === f.id ? 'var(--accent-subtle)' : 'transparent',
                    color: filter === f.id ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-4 sm:p-6 text-center">
                <Inbox size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {conversations.length === 0
                    ? 'No conversations yet. Messages will appear here when people DM your Instagram account.'
                    : 'No conversations match your filters.'
                  }
                </p>
              </div>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => openConversation(c)}
                className="w-full px-3 py-3 flex items-start gap-3 text-left transition-all hover:brightness-95"
                style={{
                  background: activeConvo?.id === c.id ? 'var(--accent-subtle)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center"
                  style={{ background: 'var(--accent-subtle)' }}>
                  {c.participant_avatar
                    ? <img src={c.participant_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    : <User size={16} style={{ color: 'var(--accent)' }} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {c.participant_name}
                    </span>
                    <span className="text-[10px] shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    @{c.participant_username}
                  </p>
                  <p className="text-xs truncate mt-0.5"
                    style={{ color: c.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: c.unread_count > 0 ? 600 : 400 }}>
                    {c.last_message}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {c.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: 'var(--accent)' }}>
                      {c.unread_count}
                    </span>
                  )}
                  {c.is_hot_lead && (
                    <Star size={12} style={{ color: '#f59e0b' }} fill="#f59e0b" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: Message detail ── */}
        <div className={activeConvo ? 'flex-1 flex flex-col' : 'hidden sm:flex flex-1 flex-col'}>
          {!activeConvo ? (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Select a conversation</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setActiveConvo(null)}
                  className="sm:hidden p-1 rounded-lg hover:bg-white/5"
                >
                  <ArrowLeft size={18} style={{ color: 'var(--text-primary)' }} />
                </button>
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent-subtle)' }}>
                  {activeConvo.participant_avatar
                    ? <img src={activeConvo.participant_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    : <User size={14} style={{ color: 'var(--accent)' }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {activeConvo.participant_name}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    @{activeConvo.participant_username}
                  </p>
                </div>
                {activeConvo.is_hot_lead && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                    Hot Lead
                  </span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No messages yet</p>
                  </div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[75%] px-4 py-2.5 rounded-2xl"
                        style={{
                          background: m.sender_type === 'user' ? 'var(--accent)' : 'var(--bg)',
                          color: m.sender_type === 'user' ? '#fff' : 'var(--text-primary)',
                          border: m.sender_type === 'user' ? 'none' : '1px solid var(--border)',
                        }}
                      >
                        <p className="text-sm">{m.content}</p>
                        <p className="text-[10px] mt-1" style={{ opacity: 0.6 }}>
                          {m.sender_type === 'automation' && '🤖 '}
                          {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply box */}
              <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <input
                    style={{ ...inputStyle, fontSize: 13 }}
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Type a reply..."
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !reply.trim()}
                    className="p-2.5 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0"
                    style={{ background: 'var(--accent)' }}
                  >
                    {sending
                      ? <Loader2 size={16} className="animate-spin text-white" />
                      : <Send size={16} className="text-white" />
                    }
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
