'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Shield, Zap, Crown, Check, AlertCircle,
  RefreshCw, ChevronLeft, ChevronRight, UserCheck, UserX
} from 'lucide-react';
import { formatTelemetryTimestamp } from '../../lib/timestamp';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  tier: 'free' | 'pro' | 'agency' | 'enterprise';
  provider: string;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
  _count: {
    apiKeys: number;
    registeredSites: number;
  };
}

interface UserStats {
  totalUsers: number;
  activeCount: number;
  inactiveCount: number;
  byTier: Record<string, number>;
}

export default function UserDirectory() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (tierFilter) params.set('tier', tierFilter);
      if (roleFilter) params.set('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch user directory`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setStats(data.stats || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, tierFilter, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateTier = async (userId: string, newTier: 'free' | 'pro' | 'agency' | 'enterprise') => {
    setUpdatingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tier: newTier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user tier');

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tier: newTier } : u))
      );
      setSuccessToast(`User tier updated to ${newTier.toUpperCase()}`);
      setTimeout(() => setSuccessToast(null), 3000);
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update account status');

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u))
      );
      setSuccessToast(currentStatus ? 'User account suspended' : 'User account activated');
      setTimeout(() => setSuccessToast(null), 3000);
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status toggle failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const tierBadges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    free: { bg: 'bg-[#1A2020] border-[rgba(187,191,191,0.12)]', text: 'text-[#878787]', icon: <Shield className="w-3 h-3" /> },
    pro: { bg: 'bg-[rgba(5,173,152,0.10)] border-[rgba(5,173,152,0.25)]', text: 'text-[#05AD98]', icon: <Zap className="w-3 h-3" /> },
    agency: { bg: 'bg-[rgba(5,173,152,0.18)] border-[rgba(5,173,152,0.35)]', text: 'text-[#05AD98]', icon: <Users className="w-3 h-3" /> },
    enterprise: { bg: 'bg-[rgba(184,160,74,0.10)] border-[rgba(184,160,74,0.25)]', text: 'text-[#B8A04A]', icon: <Crown className="w-3 h-3" /> },
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0D1512] border border-[#05AD98] text-white text-xs shadow-2xl animate-fadeIn">
          <Check className="w-4 h-4 text-[#05AD98]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Stats Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl p-4 border border-[rgba(187,191,191,0.08)] space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-[#878787] font-semibold">Total Accounts</p>
            <p className="text-xl font-extrabold text-white font-mono">{stats.totalUsers}</p>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(5,173,152,0.20)] space-y-1 bg-[rgba(5,173,152,0.03)]">
            <p className="text-[10px] uppercase tracking-wider text-[#05AD98] font-semibold">Pro Subscribers</p>
            <p className="text-xl font-extrabold text-[#05AD98] font-mono">{stats.byTier.pro || 0}</p>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(5,173,152,0.30)] space-y-1 bg-[rgba(5,173,152,0.06)]">
            <p className="text-[10px] uppercase tracking-wider text-[#05AD98] font-semibold">Agency Tier</p>
            <p className="text-xl font-extrabold text-[#05AD98] font-mono">{stats.byTier.agency || 0}</p>
          </div>
          <div className="glass-panel rounded-xl p-4 border border-[rgba(184,160,74,0.20)] space-y-1 bg-[rgba(184,160,74,0.03)]">
            <p className="text-[10px] uppercase tracking-wider text-[#B8A04A] font-semibold">Enterprise / VIP</p>
            <p className="text-xl font-extrabold text-[#B8A04A] font-mono">{stats.byTier.enterprise || 0}</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search by Name or Email */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#878787]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user by name or email..."
              className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#878787] focus:outline-none focus:border-[#05AD98]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#878787] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#05AD98]"
          >
            <option value="">All Tiers</option>
            <option value="free">Free</option>
            <option value="pro">Pro ($79)</option>
            <option value="agency">Agency ($249)</option>
            <option value="enterprise">Enterprise</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#05AD98]"
          >
            <option value="">All Roles</option>
            <option value="user">Users Only</option>
            <option value="admin">Admins Only</option>
          </select>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="p-2 rounded-xl bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] hover:text-white hover:border-[#05AD98] transition-all"
          title="Refresh list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 px-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-panel rounded-2xl border border-[rgba(187,191,191,0.10)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#111514]/60 border-b border-[rgba(187,191,191,0.10)] text-[10px] text-[#878787] uppercase tracking-wider font-semibold">
                <th className="px-5 py-3">User</th>
                <th className="px-4 py-3 text-center">Role</th>
                <th className="px-4 py-3 text-center">Current Tier</th>
                <th className="px-4 py-3 text-center">Manual Tier Override</th>
                <th className="px-4 py-3 text-center">Verified Sites</th>
                <th className="px-4 py-3 text-center">API Keys</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(187,191,191,0.06)]">
              {loading && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#878787]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#05AD98] mb-2" />
                    Loading registered accounts...
                  </td>
                </tr>
              )}

              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#878787]">
                    No accounts found matching search criteria.
                  </td>
                </tr>
              )}

              {users.map((u) => {
                const badge = tierBadges[u.tier] || tierBadges.free;
                const isUpdating = updatingId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-[#111514]/40 transition-colors">
                    {/* User info */}
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-bold text-white text-sm">{u.name || 'Unnamed User'}</p>
                        <p className="text-xs font-mono text-[#878787] mt-0.5">{u.email}</p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#878787]">
                          <span className="uppercase font-semibold tracking-wider text-[#555]">{u.provider}</span>
                          {u.lastLoginAt && (
                            <>
                              <span>·</span>
                              <span>Active {formatTelemetryTimestamp(u.lastLoginAt).relative}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'text-amber-400 bg-[rgba(251,191,36,0.10)] border border-[rgba(251,191,36,0.25)]'
                            : 'text-[#878787] bg-[rgba(255,255,255,0.04)]'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>

                    {/* Current Tier Badge */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text}`}>
                        {badge.icon}
                        <span>{u.tier.toUpperCase()}</span>
                      </span>
                    </td>

                    {/* Manual Tier Override Dropdown */}
                    <td className="px-4 py-3.5 text-center">
                      <select
                        value={u.tier}
                        disabled={isUpdating}
                        onChange={(e) =>
                          handleUpdateTier(u.id, e.target.value as 'free' | 'pro' | 'agency' | 'enterprise')
                        }
                        className="bg-[#0A0E0E] border border-[rgba(187,191,191,0.18)] rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:border-[#05AD98] hover:border-[rgba(5,173,152,0.5)] transition-colors cursor-pointer"
                      >
                        <option value="free">Free ($0/mo)</option>
                        <option value="pro">Pro ($79/mo)</option>
                        <option value="agency">Agency ($249/mo)</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>

                    {/* Verified Sites */}
                    <td className="px-4 py-3.5 text-center font-mono text-[#BBBFBF]">
                      {u._count.registeredSites}
                    </td>

                    {/* API Keys */}
                    <td className="px-4 py-3.5 text-center font-mono text-[#BBBFBF]">
                      {u._count.apiKeys}
                    </td>

                    {/* Joined Date */}
                    <td className="px-4 py-3.5 text-[11px] text-[#878787]">
                      <div>{formatTelemetryTimestamp(u.createdAt).date}</div>
                      <div className="text-[10px] text-[#555]">{formatTelemetryTimestamp(u.createdAt).relative}</div>
                    </td>

                    {/* Account Status / Toggle */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleToggleStatus(u.id, u.isActive)}
                        disabled={isUpdating}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          u.isActive
                            ? 'text-[#05AD98] bg-[rgba(5,173,152,0.10)] border-[rgba(5,173,152,0.25)] hover:border-rose-400 hover:text-rose-400'
                            : 'text-rose-400 bg-[rgba(244,63,94,0.10)] border-[rgba(244,63,94,0.25)] hover:border-[#05AD98] hover:text-[#05AD98]'
                        }`}
                        title={u.isActive ? 'Click to suspend account' : 'Click to reactivate account'}
                      >
                        {u.isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        <span>{u.isActive ? 'Active' : 'Suspended'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(187,191,191,0.08)] bg-[#111514]/40 text-xs text-[#878787]">
          <span>
            Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] disabled:opacity-40 disabled:cursor-not-allowed hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-[#1A2020] text-[#BBBFBF] border border-[rgba(187,191,191,0.12)] disabled:opacity-40 disabled:cursor-not-allowed hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
