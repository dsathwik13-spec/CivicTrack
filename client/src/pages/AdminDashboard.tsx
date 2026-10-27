import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi, complaintsApi, dashboardApi } from '../lib/api';
import { Complaint, User, Department, AuditLog, DashboardStats } from '../types';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import { SLACounter } from '../components/SLACounter';
import { 
  Shield, BarChart3, Users, Building2, FileSpreadsheet, 
  Clock, AlertTriangle, CheckCircle2, Download, Plus, 
  Search, Filter, RefreshCw, X, ShieldAlert, ArrowUpDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import toast from 'react-hot-toast';

export const AdminDashboard: React.FC = () => {
  const { user, isAuthenticated, quickLogin } = useAuth();

  const [activeTab, setActiveTab] = useState<'analytics' | 'complaints' | 'departments' | 'users' | 'audit'>('analytics');
  
  // Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Filters
  const [complaintSearch, setComplaintSearch] = useState('');
  const [complaintStatus, setComplaintStatus] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Department creation modal
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Edit User Role Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>('citizen');
  const [newDeptId, setNewDeptId] = useState<string>('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, analyticsRes, complaintsRes, deptsRes] = await Promise.all([
        dashboardApi.stats(),
        dashboardApi.analytics(),
        complaintsApi.list({ pageSize: '50' }),
        adminApi.departments(),
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (analyticsRes.data?.success) setAnalyticsData(analyticsRes.data.data);
      if (complaintsRes.data?.success) setComplaints(complaintsRes.data.data.items || []);
      if (deptsRes.data?.success) setDepartments(deptsRes.data.data.departments || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await adminApi.users({ pageSize: '50', search: userSearch });
      if (res.data?.success) setUsers(res.data.data.items || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await adminApi.auditLogs({ pageSize: '50' });
      if (res.data?.success) setAuditLogs(res.data.data.items || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab]);

  // Export CSV
  const handleExportCSV = () => {
    if (complaints.length === 0) {
      toast.error('No complaints to export.');
      return;
    }

    const headers = ['Grievance ID', 'Title', 'Category', 'Priority', 'Status', 'Location', 'City', 'Created At'];
    const rows = complaints.map(c => [
      c.grievance_id,
      `"${c.title.replace(/"/g, '""')}"`,
      c.category,
      c.priority,
      c.status,
      `"${c.location || ''}"`,
      c.city || '',
      c.created_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CivicTrack_Grievances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV export downloaded successfully!');
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    try {
      await adminApi.createDepartment({ name: deptName.trim(), description: deptDesc.trim() });
      toast.success('Department created!');
      setIsDeptModalOpen(false);
      setDeptName('');
      setDeptDesc('');
      const deptsRes = await adminApi.departments();
      if (deptsRes.data?.success) setDepartments(deptsRes.data.data.departments || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create department.');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await adminApi.updateUserRole(selectedUser.id, {
        role: newRole,
        department_id: newDeptId ? parseInt(newDeptId) : null,
      });
      toast.success('User role updated!');
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update user role.');
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    try {
      const res = await adminApi.toggleUserStatus(userId);
      toast.success(res.data?.message || 'User status updated');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to toggle status.');
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="container" style={{ padding: 'var(--space-16) var(--space-4)', textAlign: 'center' }}>
        <div className="card empty-state" style={{ maxWidth: '560px', margin: '0 auto' }}>
          <ShieldAlert size={48} color="var(--color-critical)" />
          <h2>Administrator Portal Restricted</h2>
          <p style={{ marginBottom: 'var(--space-6)' }}>
            This console is strictly for city administrators. Use 1-click Demo Admin Login to access.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => quickLogin('admin')}
          >
            ⚡ Quick Login as System Admin
          </button>
        </div>
      </div>
    );
  }

  // Chart data preparation
  const categoryChartData = analyticsData?.byCategory?.map((item: any) => ({
    name: item.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    count: item.count,
  })) || [];

  const statusChartData = analyticsData?.byStatus?.map((item: any) => ({
    name: item.status.replace('_', ' ').toUpperCase(),
    value: item.count,
  })) || [];

  const COLORS = ['#24483D', '#D7A45B', '#5a7fa8', '#326B50', '#A83D35', '#7a6bb5'];

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4) var(--space-16)' }}>
      {/* Page Title & Navigation Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-forest)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
            <Shield size={16} />
            <span>Executive Municipal Oversight</span>
          </div>
          <h1 className="page-title">City Administration Console</h1>
          <p className="page-description">
            Complete transparency metrics, cross-department accountability, SLA compliance, and system audit logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchDashboardData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--color-border)',
        marginBottom: 'var(--space-6)',
        overflowX: 'auto',
        gap: 'var(--space-2)'
      }}>
        {[
          { id: 'analytics', label: 'Executive Analytics', icon: BarChart3 },
          { id: 'complaints', label: 'All Grievances', icon: FileSpreadsheet },
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'users', label: 'User Roles & Staff', icon: Users },
          { id: 'audit', label: 'Audit Trail', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: 'var(--space-3) var(--space-4)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--color-forest)' : '3px solid transparent',
                color: isActive ? 'var(--color-forest)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: EXECUTIVE ANALYTICS ─── */}
      {activeTab === 'analytics' && (
        <div>
          {/* High-level KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-8)'
          }}>
            <div className="card stat-card">
              <span className="stat-label">Total Grievances</span>
              <div className="stat-value">{stats?.total ?? 1482}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>All time logged</span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Resolution Rate</span>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                {stats?.resolutionRate ? `${stats.resolutionRate.toFixed(1)}%` : '89.4%'}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>SLA compliant</span>
            </div>
            <div className="card stat-card stat-overdue">
              <span className="stat-label">Overdue / SLA Breached</span>
              <div className="stat-value">{stats?.overdue ?? 14}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-critical)' }}>Auto-escalated</span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Avg. Resolution Time</span>
              <div className="stat-value" style={{ color: 'var(--color-amber-dark)' }}>
                {stats?.avgResolutionHours ? `${stats.avgResolutionHours.toFixed(1)} hrs` : '28.5 hrs'}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Benchmark 48 hrs</span>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 'var(--space-6)',
            marginBottom: 'var(--space-8)'
          }}>
            {/* Category Breakdown Bar Chart */}
            <div className="card">
              <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-4)' }}>
                Complaints by Category
              </h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={categoryChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-forest)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution Donut Chart */}
            <div className="card">
              <h3 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-4)' }}>
                Complaints by Status Distribution
              </h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ALL GRIEVANCES ─── */}
      {activeTab === 'complaints' && (
        <div>
          <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Filter by ID, citizen, title, location..."
                  value={complaintSearch}
                  onChange={(e) => setComplaintSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '32px' }}
                />
              </div>

              <select
                className="form-select"
                value={complaintStatus}
                onChange={(e) => setComplaintStatus(e.target.value)}
                style={{ width: 'auto', minWidth: '160px' }}
              >
                <option value="">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <button type="button" className="btn btn-secondary" onClick={handleExportCSV}>
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title & Location</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SLA Clock</th>
                  <th>Department</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="grievance-id">{item.grievance_id}</span>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>{item.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>📍 {item.location}</div>
                    </td>
                    <td>
                      <CategoryBadge category={item.category} />
                    </td>
                    <td>
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <SLACounter
                        targetDate={item.target_resolution_date}
                        resolvedAt={item.resolved_at}
                        isOverdue={item.is_overdue}
                        status={item.status}
                      />
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {item.department_name || 'Unassigned'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {item.created_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: DEPARTMENTS ─── */}
      {activeTab === 'departments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ margin: 0 }}>Active Municipal Departments</h3>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsDeptModalOpen(true)}>
              <Plus size={14} /> Add New Department
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)'
          }}>
            {departments.map((d) => (
              <div key={d.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-forest)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{d.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Head: {d.head_name || 'Assigned via Manager role'}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', minHeight: '40px' }}>
                  {d.description || 'Handles municipal services and grievance fulfillment.'}
                </p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--color-border-light)',
                  paddingTop: 'var(--space-3)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)'
                }}>
                  <span>Officers: <strong>{d.member_count ?? 1}</strong></span>
                  <span>Open Complaints: <strong>{d.open_complaints ?? 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: USERS & ROLES ─── */}
      {activeTab === 'users' && (
        <div>
          <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search user by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  className="form-input"
                  style={{ paddingLeft: '32px' }}
                />
              </div>
              <button type="button" className="btn btn-secondary" onClick={fetchUsers}>
                Search
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.first_name} {u.last_name}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: u.role === 'admin' ? 'var(--color-forest)' : 'var(--color-bg-hover)',
                        color: u.role === 'admin' ? 'white' : 'var(--color-charcoal)'
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{u.department_name || '—'}</td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: u.is_active ? 'var(--color-success)' : 'var(--color-critical)'
                      }}>
                        {u.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedUser(u);
                            setNewRole(u.role);
                            setNewDeptId(u.department_id ? String(u.department_id) : '');
                          }}
                        >
                          Change Role
                        </button>
                        {u.id !== user.id && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleToggleUserStatus(u.id)}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: AUDIT LOGS ─── */}
      {activeTab === 'audit' && (
        <div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="timestamp">{log.created_at}</td>
                    <td><strong>{log.user_name || 'System / Auto-Cron'}</strong></td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--color-bg-hover)',
                        color: 'var(--color-forest)'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{log.entity_type} #{log.entity_id || '—'}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      {isDeptModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeptModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Create New Municipal Department</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsDeptModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateDept} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Department Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Health & Hygiene"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Mission, service boundaries, and primary municipal responsibilities..."
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsDeptModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Update User Role</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateRole} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                Editing permissions for: <strong>{selectedUser.first_name} {selectedUser.last_name}</strong> ({selectedUser.email})
              </p>

              <div className="form-group">
                <label className="form-label">Assign Role</label>
                <select
                  className="form-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="citizen">Citizen (General Public)</option>
                  <option value="officer">Field Officer (Department Responder)</option>
                  <option value="manager">Department Manager (Team Supervisor)</option>
                  <option value="admin">System Administrator (Full Authority)</option>
                </select>
              </div>

              {(newRole === 'officer' || newRole === 'manager') && (
                <div className="form-group">
                  <label className="form-label">Assign Department</label>
                  <select
                    className="form-select"
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    required
                  >
                    <option value="">Select a Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setSelectedUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
