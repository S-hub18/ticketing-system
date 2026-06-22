'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  departments: string[]
}

type Mode = 'add-button' | 'edit-button' | 'toggle'

interface AdminUsersClientProps {
  mode: Mode
  users: never[] // reserved for future use, kept for API consistency
  userId?: string
  isActive?: boolean
  editUser?: EditUser
}

const ALL_DEPARTMENTS = ['IT', 'HR', 'FINANCE', 'ADMIN']
const ALL_ROLES = ['ADMIN', 'AGENT', 'EMPLOYEE']

// ---------------------------------------------------------------------------
// Shared form state type
// ---------------------------------------------------------------------------

interface FormState {
  name: string
  email: string
  password: string
  role: string
  departments: string[]
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  role: 'EMPLOYEE',
  departments: [],
}

// ---------------------------------------------------------------------------
// Active/Inactive toggle
// ---------------------------------------------------------------------------

function ActiveToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState(isActive)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    const next = !optimistic
    setOptimistic(next)
    setError(null)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      })
      if (!res.ok) {
        setOptimistic(!next) // revert
        const data = await res.json()
        setError(data.error ?? 'Failed to update')
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setOptimistic(!next)
      setError('Network error')
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={handleToggle}
        disabled={pending}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#292524] ${
          optimistic ? 'bg-green-500' : 'bg-[#d4d4d4]'
        } ${pending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        title={optimistic ? 'Active — click to deactivate' : 'Inactive — click to activate'}
        aria-checked={optimistic}
        role="switch"
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            optimistic ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create / Edit dialog
// ---------------------------------------------------------------------------

function UserDialog({
  open,
  onClose,
  initial,
  isEdit,
}: {
  open: boolean
  onClose: () => void
  initial: FormState
  isEdit: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  function handleOpenChange(v: boolean) {
    if (!v) {
      onClose()
      setError(null)
    }
  }

  function toggleDept(dept: string) {
    setForm((f) => ({
      ...f,
      departments: f.departments.includes(dept)
        ? f.departments.filter((d) => d !== dept)
        : [...f.departments, dept],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.email.trim()) { setError('Email is required.'); return }
    if (!isEdit && !form.password.trim()) { setError('Password is required.'); return }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
    }
    if (!isEdit) payload.password = form.password
    if (form.role === 'AGENT') payload.departments = form.departments

    setSubmitting(true)
    try {
      const url = isEdit ? `/api/users/${initial.name}` : '/api/users'
      // For edit we need the userId — passed via initial which carries the id in name slot
      // We store the id separately in editUserId below
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }
      onClose()
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="u-name" className="text-xs">Name</Label>
            <Input
              id="u-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Jane Smith"
              className="text-sm"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="u-email" className="text-xs">Email</Label>
            <Input
              id="u-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="jane@company.com"
              className="text-sm"
              required
            />
          </div>

          {/* Password — create only */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="u-password" className="text-xs">Password</Label>
              <Input
                id="u-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="text-sm"
                required
              />
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="u-role" className="text-xs">Role</Label>
            <select
              id="u-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, departments: [] }))}
              className="w-full text-sm border border-[#e7e5e4] rounded-md px-3 py-2 bg-white text-[#0c0a09] focus:outline-none focus:ring-2 focus:ring-[#292524]"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Departments — agent only */}
          {form.role === 'AGENT' && (
            <div className="space-y-2">
              <Label className="text-xs">Departments</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_DEPARTMENTS.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDept(dept)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      form.departments.includes(dept)
                        ? 'bg-[#292524] text-white border-[#292524]'
                        : 'bg-white text-[#78716c] border-[#e7e5e4] hover:border-[#a8a29e]'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-[#292524] text-white hover:bg-[#44403c]"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main export — polymorphic based on `mode`
// ---------------------------------------------------------------------------

export function AdminUsersClient({
  mode,
  userId,
  isActive,
  editUser,
}: AdminUsersClientProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)

  // --- Toggle mode ---
  if (mode === 'toggle') {
    if (userId === undefined || isActive === undefined) return null
    return <ActiveToggle userId={userId} isActive={isActive} />
  }

  // --- Add button mode ---
  if (mode === 'add-button') {
    return (
      <>
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="bg-[#292524] text-white hover:bg-[#44403c] text-xs"
        >
          + Add User
        </Button>
        {dialogOpen && (
          <UserDialogWrapper
            open={dialogOpen}
            onClose={() => { setDialogOpen(false); router.refresh() }}
            isEdit={false}
            editUser={undefined}
          />
        )}
      </>
    )
  }

  // --- Edit button mode ---
  if (mode === 'edit-button') {
    return (
      <>
        <button
          onClick={() => setDialogOpen(true)}
          className="text-xs text-[#78716c] hover:text-[#0c0a09] transition-colors"
        >
          Edit
        </button>
        {dialogOpen && editUser && (
          <UserDialogWrapper
            open={dialogOpen}
            onClose={() => { setDialogOpen(false); router.refresh() }}
            isEdit
            editUser={editUser}
          />
        )}
      </>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Dialog wrapper that resolves the correct URL for edit vs create
// ---------------------------------------------------------------------------

function UserDialogWrapper({
  open,
  onClose,
  isEdit,
  editUser,
}: {
  open: boolean
  onClose: () => void
  isEdit: boolean
  editUser?: EditUser
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(
    isEdit && editUser
      ? {
          name: editUser.name,
          email: editUser.email,
          password: '',
          role: editUser.role,
          departments: editUser.departments,
        }
      : EMPTY_FORM,
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDept(dept: string) {
    setForm((f) => ({
      ...f,
      departments: f.departments.includes(dept)
        ? f.departments.filter((d) => d !== dept)
        : [...f.departments, dept],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.email.trim()) { setError('Email is required.'); return }
    if (!isEdit && !form.password.trim()) { setError('Password is required.'); return }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
    }
    if (!isEdit) payload.password = form.password
    if (form.role === 'AGENT') payload.departments = form.departments

    setSubmitting(true)
    try {
      const url = isEdit && editUser ? `/api/users/${editUser.id}` : '/api/users'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }
      onClose()
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="uw-name" className="text-xs">Name</Label>
            <Input
              id="uw-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Jane Smith"
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="uw-email" className="text-xs">Email</Label>
            <Input
              id="uw-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="jane@company.com"
              className="text-sm"
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="uw-password" className="text-xs">Password</Label>
              <Input
                id="uw-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="uw-role" className="text-xs">Role</Label>
            <select
              id="uw-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, departments: [] }))}
              className="w-full text-sm border border-[#e7e5e4] rounded-md px-3 py-2 bg-white text-[#0c0a09] focus:outline-none focus:ring-2 focus:ring-[#292524]"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {form.role === 'AGENT' && (
            <div className="space-y-2">
              <Label className="text-xs">Departments</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_DEPARTMENTS.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDept(dept)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      form.departments.includes(dept)
                        ? 'bg-[#292524] text-white border-[#292524]'
                        : 'bg-white text-[#78716c] border-[#e7e5e4] hover:border-[#a8a29e]'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-[#292524] text-white hover:bg-[#44403c]"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
