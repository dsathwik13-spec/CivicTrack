import React from 'react';
import { ComplaintStatus, ComplaintPriority, ComplaintCategory } from '../types';
import { 
  CheckCircle2, Clock, AlertCircle, RefreshCw, XCircle, 
  HelpCircle, UserCheck, Flame, Wrench, Droplets, Trash2, 
  Lightbulb, Waves, Building2 
} from 'lucide-react';

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase();

  const getStatusConfig = () => {
    switch (normalized) {
      case 'submitted':
        return { label: 'Submitted', class: 'badge-submitted', icon: Clock };
      case 'acknowledged':
        return { label: 'Acknowledged', class: 'badge-acknowledged', icon: CheckCircle2 };
      case 'assigned':
        return { label: 'Assigned', class: 'badge-assigned', icon: UserCheck };
      case 'in_progress':
        return { label: 'In Progress', class: 'badge-in_progress', icon: RefreshCw };
      case 'awaiting_information':
        return { label: 'Awaiting Info', class: 'badge-awaiting_information', icon: HelpCircle };
      case 'resolved':
        return { label: 'Resolved', class: 'badge-resolved', icon: CheckCircle2 };
      case 'closed':
        return { label: 'Closed', class: 'badge-closed', icon: CheckCircle2 };
      case 'reopened':
        return { label: 'Reopened', class: 'badge-reopened', icon: AlertCircle };
      default:
        return { label: status, class: 'badge-submitted', icon: Clock };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`badge ${config.class}`}>
      <Icon size={12} />
      <span>{config.label}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: ComplaintPriority | string }> = ({ priority }) => {
  const normalized = priority.toLowerCase();

  const getConfig = () => {
    switch (normalized) {
      case 'critical':
        return { label: 'Critical', class: 'badge-critical', icon: Flame };
      case 'high':
        return { label: 'High', class: 'badge-high', icon: AlertCircle };
      case 'medium':
        return { label: 'Medium', class: 'badge-medium', icon: Clock };
      case 'low':
      default:
        return { label: 'Low', class: 'badge-low', icon: CheckCircle2 };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <span className={`badge ${config.class}`}>
      <Icon size={12} />
      <span>{config.label}</span>
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: ComplaintCategory | string }> = ({ category }) => {
  const getCategoryConfig = () => {
    switch (category) {
      case 'roads_potholes':
        return { label: 'Roads & Potholes', icon: Wrench, color: '#24483D' };
      case 'water_supply':
        return { label: 'Water Supply', icon: Droplets, color: '#3182ce' };
      case 'sanitation_waste':
        return { label: 'Sanitation & Waste', icon: Trash2, color: '#d69e2e' };
      case 'streetlights':
        return { label: 'Streetlights & Electrical', icon: Lightbulb, color: '#dd6b20' };
      case 'drainage':
        return { label: 'Drainage & Sewage', icon: Waves, color: '#805ad5' };
      case 'public_infrastructure':
        return { label: 'Public Infrastructure', icon: Building2, color: '#319795' };
      default:
        return { label: 'General / Other', icon: HelpCircle, color: '#706C63' };
    }
  };

  const config = getCategoryConfig();
  const Icon = config.icon;

  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '4px',
      fontSize: '0.8125rem',
      fontWeight: 500,
      color: 'var(--color-charcoal)'
    }}>
      <Icon size={14} style={{ color: config.color }} />
      <span>{config.label}</span>
    </span>
  );
};
