import React from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface SLACounterProps {
  targetDate?: string | null;
  resolvedAt?: string | null;
  isOverdue?: boolean | number;
  status: string;
}

export const SLACounter: React.FC<SLACounterProps> = ({ targetDate, resolvedAt, isOverdue, status }) => {
  if (status === 'resolved' || status === 'closed') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--color-success)',
        backgroundColor: 'var(--color-success-light)',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)'
      }}>
        <CheckCircle size={12} />
        Resolved
      </span>
    );
  }

  if (!targetDate) {
    return (
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        SLA Pending
      </span>
    );
  }

  const now = new Date().getTime();
  const target = new Date(targetDate.replace(' ', 'T') + 'Z').getTime();
  const diffHours = Math.round((target - now) / (1000 * 60 * 60));

  const overdue = isOverdue === 1 || isOverdue === true || diffHours < 0;

  if (overdue) {
    const overdueHrs = Math.abs(diffHours);
    return (
      <span className="overdue-indicator">
        <AlertTriangle size={11} />
        Overdue by {overdueHrs > 24 ? `${Math.floor(overdueHrs / 24)}d ${overdueHrs % 24}h` : `${overdueHrs}h`}
      </span>
    );
  }

  // Not overdue, remaining
  const isUrgent = diffHours <= 12;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '0.75rem',
      fontWeight: 600,
      color: isUrgent ? 'var(--color-amber-dark)' : 'var(--color-forest)',
      backgroundColor: isUrgent ? 'var(--color-amber-light)' : 'var(--color-border-light)',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)'
    }}>
      <Clock size={11} />
      {diffHours > 24 ? `${Math.floor(diffHours / 24)}d ${diffHours % 24}h left` : `${diffHours}h left`}
    </span>
  );
};
