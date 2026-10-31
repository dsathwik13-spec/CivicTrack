import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { complaintsApi, adminApi } from '../lib/api';
import { Complaint, ComplaintStatus, ComplaintPriority, VALID_TRANSITIONS, STATUS_LABELS } from '../types';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/StatusBadge';
import { SLACounter } from '../components/SLACounter';
import { 
  Briefcase, CheckCircle2, Clock, AlertTriangle, RefreshCw, 
  MessageSquare, FileText, UserCheck, Search, Filter, 
  X, Check, ShieldAlert, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export const OfficerDashboard: React.FC = () => {
  const { user, isAuthenticated, quickLogin } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('in_progress');
  const [statusReason, setStatusReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [publicUpdateMessage, setPublicUpdateMessage] = useState('');
  const [internalNoteMessage, setInternalNoteMessage] = useState('');
  const [actionTab, setActionTab] = useState<'status' | 'update' | 'note'>('status');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { pageSize: '50' };
      if (selectedStatus) params.status = selectedStatus;
      if (search) params.search = search;

      const res = await complaintsApi.list(params);
      if (res.data?.success) {
        setComplaints(res.data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load officer complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchComplaints();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, selectedStatus]);

  const handleOpenAction = (item: Complaint) => {
    setSelectedComplaint(item);
    const validNext = VALID_TRANSITIONS[item.status as ComplaintStatus] || [];
    setNewStatus((validNext[0] || item.status) as ComplaintStatus);
    setStatusReason('');
    setResolutionNotes('');
    setPublicUpdateMessage('');
    setInternalNoteMessage('');
    setIsActionModalOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      setSubmittingAction(true);
      const payload: { status: string; reason?: string; resolution_notes?: string } = {
        status: newStatus,
        reason: statusReason.trim() || undefined,
      };

      if (newStatus === 'resolved') {
        if (!resolutionNotes.trim()) {
          toast.error('Resolution notes are required when marking a grievance as resolved.');
          setSubmittingAction(false);
          return;
        }
        payload.resolution_notes = resolutionNotes.trim();
      }

      await complaintsApi.updateStatus(selectedComplaint.id, payload);
      toast.success(`Ticket status updated to: ${newStatus}`);
      setIsActionModalOpen(false);
      fetchComplaints();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handlePublicUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !publicUpdateMessage.trim()) return;

    try {
      setSubmittingAction(true);
      await complaintsApi.addUpdate(selectedComplaint.id, { message: publicUpdateMessage.trim() });
      toast.success('Public update posted to citizen!');
      setPublicUpdateMessage('');
      setIsActionModalOpen(false);
      fetchComplaints();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to post update.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleInternalNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !internalNoteMessage.trim()) return;

    try {
      setSubmittingAction(true);
      await complaintsApi.addNote(selectedComplaint.id, { note: internalNoteMessage.trim() });
      toast.success('Internal note saved to ticket.');
      setInternalNoteMessage('');
      setIsActionModalOpen(false);
      fetchComplaints();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save note.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (!isAuthenticated || (user?.role !== 'officer' && user?.role !== 'manager' && user?.role !== 'admin')) {
    return (
      <div className="container" style={{ padding: 'var(--space-16) var(--space-4)', textAlign: 'center' }}>
        <div className="card empty-state" style={{ maxWidth: '560px', margin: '0 auto' }}>
          <Briefcase size={48} color="var(--color-forest)" />
          <h2>Department Officer Portal</h2>
          <p style={{ marginBottom: 'var(--space-6)' }}>
            This portal is restricted to municipal field officers, department engineers, and managers.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => quickLogin('officer')}
            >
              ⚡ Quick Login as Field Officer
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => quickLogin('manager')}
            >
              👔 Login as Dept Manager
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Count summaries
  const totalCount = complaints.length;
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;
  const overdueCount = complaints.filter(c => c.is_overdue === 1 || c.is_overdue === true).length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-4) var(--space-16)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-8)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-forest)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
            <Briefcase size={16} />
            <span>
              {user.role === 'manager' ? 'Department Head Queue' : 'Field Operations Queue'} • {user.department_name || 'Roads & Infrastructure'}
            </span>
          </div>
          <h1 className="page-title">Grievance Redressal Workspace</h1>
          <p className="page-description">
            Review assigned civic issues, record inspections, upload fix proof, and resolve tickets within SLA targets.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchComplaints}
          >
            <RefreshCw size={14} /> Refresh Queue
          </button>
        </div>
      </div>

      {/* Stats Counter Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)'
      }}>
        <div className="card stat-card">
          <span className="stat-label">Active Queue</span>
          <div className="stat-value">{totalCount}</div>
        </div>
        <div className="card stat-card">
          <span className="stat-label">In Progress Repairs</span>
          <div className="stat-value" style={{ color: 'var(--color-amber-dark)' }}>{inProgressCount}</div>
        </div>
        <div className="card stat-card stat-overdue">
          <span className="stat-label">SLA Breached / Overdue</span>
          <div className="stat-value">{overdueCount}</div>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Resolved</span>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{resolvedCount}</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {[
              { id: '', label: 'All Tickets' },
              { id: 'submitted', label: 'Submitted' },
              { id: 'acknowledged', label: 'Acknowledged' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'resolved', label: 'Resolved' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`btn btn-sm ${selectedStatus === tab.id ? 'btn-primary' : 'btn-ghost'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
            <input
              type="text"
              placeholder="Search ID, title, keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchComplaints()}
              className="form-input"
              style={{ paddingLeft: '32px', fontSize: '0.8125rem' }}
            />
          </div>
        </div>
      </div>

      {/* Master Queue Table */}
      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
        </div>
      ) : complaints.length === 0 ? (
        <div className="card empty-state">
          <CheckCircle2 size={44} color="var(--color-success)" />
          <h3>Queue is Empty</h3>
          <p>No active grievances in this view. Great job!</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Title & Location</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>SLA Clock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="grievance-id">{item.grievance_id}</span>
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-charcoal)', marginBottom: '2px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      📍 {item.location}, {item.city}
                    </div>
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
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenAction(item)}
                    >
                      Update / Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal */}
      {isActionModalOpen && selectedComplaint && (
        <div className="modal-overlay" onClick={() => setIsActionModalOpen(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '600px' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
              <div>
                <span className="grievance-id">{selectedComplaint.grievance_id}</span>
                <h3 style={{ fontSize: '1.25rem', marginTop: '4px' }}>{selectedComplaint.title}</h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Current Status: <strong>{selectedComplaint.status.toUpperCase()}</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsActionModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Action Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-4)' }}>
              <button
                type="button"
                className={`btn btn-sm ${actionTab === 'status' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '0' }}
                onClick={() => setActionTab('status')}
              >
                <RefreshCw size={14} /> Update Status / Resolve
              </button>
              <button
                type="button"
                className={`btn btn-sm ${actionTab === 'update' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '0' }}
                onClick={() => setActionTab('update')}
              >
                <MessageSquare size={14} /> Public Update
              </button>
              <button
                type="button"
                className={`btn btn-sm ${actionTab === 'note' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '0' }}
                onClick={() => setActionTab('note')}
              >
                <FileText size={14} /> Internal Note
              </button>
            </div>

            {/* Tab 1: Status Update & Resolution */}
            {actionTab === 'status' && (
              <form onSubmit={handleStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">New Status</label>
                  <select
                    className="form-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                  >
                    {(() => {
                      const validOptions = selectedComplaint
                        ? (VALID_TRANSITIONS[selectedComplaint.status as ComplaintStatus] || [])
                        : [];
                      if (validOptions.length === 0 && selectedComplaint) {
                        return (
                          <option value={selectedComplaint.status}>
                            {STATUS_LABELS[selectedComplaint.status as ComplaintStatus] || selectedComplaint.status} (Final State)
                          </option>
                        );
                      }
                      return validOptions.map((st) => (
                        <option key={st} value={st}>
                          {STATUS_LABELS[st] || st}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status Change Reason / Action Log</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Work crew dispatched to 80ft road with asphalt mix"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>

                {newStatus === 'resolved' && (
                  <div className="form-group" style={{ backgroundColor: 'var(--color-success-light)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                    <label className="form-label" style={{ color: 'var(--color-success)' }}>
                      Official Resolution Notes <span className="required">*</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      placeholder="Detail how the grievance was fixed: work completed, materials used, engineer signed off..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                      required
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      This resolution report will be permanently recorded and displayed on the public tracking portal.
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setIsActionModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingAction}>
                    {submittingAction ? 'Saving...' : 'Apply Status Change'}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Public Update */}
            {actionTab === 'update' && (
              <form onSubmit={handlePublicUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Message to Citizen</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Write a clear progress update that will be visible to the citizen and public on the tracking page..."
                    value={publicUpdateMessage}
                    onChange={(e) => setPublicUpdateMessage(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setIsActionModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingAction || !publicUpdateMessage.trim()}>
                    {submittingAction ? 'Posting...' : 'Post Public Update'}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Internal Note */}
            {actionTab === 'note' && (
              <form onSubmit={handleInternalNoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Internal Department Note</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Add an internal note visible only to municipal officers and department administrators (e.g. contractor details, budget allocation, material supply delay)..."
                    value={internalNoteMessage}
                    onChange={(e) => setInternalNoteMessage(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setIsActionModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingAction || !internalNoteMessage.trim()}>
                    {submittingAction ? 'Saving...' : 'Save Internal Note'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
