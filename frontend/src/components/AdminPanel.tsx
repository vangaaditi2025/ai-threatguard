import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { apiUrl } from '../api'

type UserSummary = {
  id: number
  email: string
  is_active: boolean
  is_superuser: boolean
  roles: string[]
}

type RoleSummary = {
  id: number
  name: string
  permissions: string[]
}

type PermissionSummary = {
  id: number
  name: string
  description?: string
}

type AuditLogItem = {
  id: number
  actor: string
  action: string
  target?: string
  details?: string
  created_at: string
}

type ActivityLogItem = {
  id: number
  user_id?: number
  action: string
  details?: string
  ip_address?: string
  created_at: string
}

type ThreatAnalytics = {
  total_file_scans: number
  total_url_scans: number
  total_email_scans: number
  high_risk_scans: number
  medium_risk_scans: number
  benign_scans: number
  active_users: number
  user_roles: Record<string, number>
}

const riskColors = ['#ef4444', '#f59e0b', '#22c55e']

export default function AdminPanel() {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [roles, setRoles] = useState<RoleSummary[]>([])
  const [permissions, setPermissions] = useState<PermissionSummary[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([])
  const [analytics, setAnalytics] = useState<ThreatAnalytics | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)
  const [roleInput, setRoleInput] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    loadAdminData()
  }, [])

  function getAuthHeaders() {
    const token = window.localStorage.getItem('ADMIN_TOKEN')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function loadAdminData() {
    try {
      const headers = getAuthHeaders()
      const [usersResp, rolesResp, permsResp, analyticsResp, auditResp, activityResp] = await Promise.all([
        fetch(apiUrl('/admin/users'), { headers }),
        fetch(apiUrl('/admin/roles'), { headers }),
        fetch(apiUrl('/admin/permissions'), { headers }),
        fetch(apiUrl('/admin/threat-analytics'), { headers }),
        fetch(apiUrl('/admin/audit-logs'), { headers }),
        fetch(apiUrl('/admin/activity-logs'), { headers }),
      ])
      if (usersResp.ok) setUsers((await usersResp.json()) as UserSummary[])
      if (rolesResp.ok) setRoles((await rolesResp.json()) as RoleSummary[])
      if (permsResp.ok) setPermissions((await permsResp.json()) as PermissionSummary[])
      if (analyticsResp.ok) setAnalytics((await analyticsResp.json()) as ThreatAnalytics)
      if (auditResp.ok) setAuditLogs((await auditResp.json()) as AuditLogItem[])
      if (activityResp.ok) setActivityLogs((await activityResp.json()) as ActivityLogItem[])
    } catch {
      setStatus('Unable to load admin data. Ensure the backend is running and the admin token is configured.')
    }
  }

  async function updateRoles(user: UserSummary) {
    const roles = roleInput.split(',').map(role => role.trim()).filter(Boolean)
    if (!roles.length) {
      setStatus('Enter at least one role separated by commas.')
      return
    }
    setStatus('Updating roles...')
    try {
      const response = await fetch(apiUrl(`/admin/users/${user.id}/roles`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ roles }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setStatus(payload.detail || 'Failed to update roles')
        return
      }
      setSelectedUser(payload as UserSummary)
      setStatus('Roles updated successfully')
      await loadAdminData()
    } catch {
      setStatus('Unable to update roles. Check admin backend connectivity.')
    }
  }

  async function toggleActivation(user: UserSummary) {
    setStatus('Updating activation...')
    try {
      const response = await fetch(apiUrl(`/admin/users/${user.id}/activation`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setStatus(payload.detail || 'Failed to update activation')
        return
      }
      setSelectedUser(payload as UserSummary)
      setStatus('User activation updated')
      await loadAdminData()
    } catch {
      setStatus('Unable to update user activation. Check backend connectivity.')
    }
  }

  const threatData = analytics
    ? [
        { name: 'High Risk', value: analytics.high_risk_scans },
        { name: 'Medium Risk', value: analytics.medium_risk_scans },
        { name: 'Benign', value: analytics.benign_scans },
      ]
    : []

  const roleBreakdownData = analytics
    ? Object.entries(analytics.user_roles).map(([name, count]) => ({ name, value: count }))
    : []

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Admin Control Panel</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Manage users, roles, permissions, and review threat analytics and audit trails.</p>
          </div>
        </div>
        {status && <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">{status}</p>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Threat analytics</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Security metrics</h3>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm text-slate-500 dark:text-slate-400">File scans</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{analytics?.total_file_scans ?? 0}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm text-slate-500 dark:text-slate-400">URL scans</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{analytics?.total_url_scans ?? 0}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm text-slate-500 dark:text-slate-400">Email scans</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{analytics?.total_email_scans ?? 0}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm text-slate-500 dark:text-slate-400">Active users</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">{analytics?.active_users ?? 0}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Risk distribution</h4>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={threatData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                        {threatData.map((entry, index) => (
                          <Cell key={entry.name} fill={riskColors[index % riskColors.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Role assignments</h4>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roleBreakdownData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">User management</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Manage users</h3>
              </div>
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <table className="min-w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 font-semibold">Email</th>
                      <th className="px-3 py-2 font-semibold">Roles</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-3 py-3">{user.email}</td>
                        <td className="px-3 py-3">{user.roles.join(', ') || 'user'}</td>
                        <td className="px-3 py-3">{user.is_active ? 'Active' : 'Inactive'}</td>
                        <td className="px-3 py-3 space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(user)
                              setRoleInput(user.roles.join(', '))
                            }}
                            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActivation(user)}
                            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedUser && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit {selectedUser.email}</h4>
                  <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">Roles (comma separated)</label>
                  <input
                    value={roleInput}
                    onChange={event => setRoleInput(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                    placeholder="admin, user, analyst"
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => updateRoles(selectedUser)}
                      className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Save roles
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Permissions</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Role permissions</h3>
            </div>
            <div className="mt-6 space-y-4">
              {roles.map(role => (
                <div key={role.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{role.name}</p>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{role.permissions.length} permissions</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{role.permissions.join(', ') || 'No permissions assigned'}</p>
                </div>
              ))}
            </div>
            {permissions.length > 0 && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Available permissions</h4>
                <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  {permissions.map(permission => (
                    <div key={permission.id}>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{permission.name}</p>
                      <p>{permission.description || 'No description available.'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Audit log</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Recent changes</h3>
            </div>
            <div className="mt-6 space-y-4">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">No audit records available.</p>
              ) : (
                auditLogs.slice(0, 6).map(log => (
                  <div key={log.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{log.action}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{log.details || 'No additional details.'}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{log.actor} · {new Date(log.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Activity log</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">User activity</h3>
            </div>
            <div className="mt-6 space-y-4">
              {activityLogs.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">No activity records available.</p>
              ) : (
                activityLogs.slice(0, 6).map(entry => (
                  <div key={entry.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{entry.action}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.details || 'No details available.'}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">User {entry.user_id ?? 'system'} · {entry.ip_address || 'No IP'} · {new Date(entry.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
