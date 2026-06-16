import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { getAuditLog, type AuditLogRow } from '../../lib/api';
import { AppLayout } from '../../components/AppLayout';
import { GlassCard, Button, Select, Skeleton } from '../../components/ui';

// ─── filter options ───────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: '',                       label: 'All actions'              },
  { value: 'cashback_processed',     label: 'cashback_processed'       },
  { value: 'fraud_flagged',          label: 'fraud_flagged'            },
  { value: 'fraud_approved',         label: 'fraud_approved'           },
  { value: 'fraud_rejected',         label: 'fraud_rejected'           },
  { value: 'campaign_created',       label: 'campaign_created'         },
  { value: 'campaign_status_changed',label: 'campaign_status_changed'  },
  { value: 'user_suspended',         label: 'user_suspended'           },
  { value: 'advertiser_approved',    label: 'advertiser_approved'      },
];

const ENTITY_TYPE_OPTIONS = [
  { value: '',                       label: 'All entity types'         },
  { value: 'cashback_transaction',   label: 'cashback_transaction'     },
  { value: 'campaign',               label: 'campaign'                 },
  { value: 'user',                   label: 'user'                     },
  { value: 'advertiser',             label: 'advertiser'               },
  { value: 'attribution_session',    label: 'attribution_session'      },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── table constants ──────────────────────────────────────────────────────────

const thClass =
  'text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 whitespace-nowrap border-b border-white/[0.08]';
const tdClass = 'py-3 px-4 text-slate-300 text-sm';
const trClass = 'border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors duration-100 cursor-pointer';

// ─── page ─────────────────────────────────────────────────────────────────────

export function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<AuditLogRow[]>({
    queryKey: ['admin-audit-log', actionFilter, entityTypeFilter],
    queryFn: () =>
      getAuditLog({
        action: actionFilter || undefined,
        entity_type: entityTypeFilter || undefined,
      }),
  });

  const backButton = (
    <Link to="/admin">
      <Button variant="ghost" size="sm" icon={<ChevronLeft className="w-4 h-4" />}>
        Back
      </Button>
    </Link>
  );

  return (
    <AppLayout title="Audit Log" actions={backButton}>
      <div className="space-y-6">
        {/* Filter row */}
        <GlassCard className="p-4 flex flex-wrap items-end gap-4">
          <div className="w-56">
            <Select
              label="Action"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-56">
            <Select
              label="Entity Type"
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => void refetch()}
            className="ml-auto self-end"
          >
            Refresh
          </Button>
        </GlassCard>

        {/* Table */}
        <GlassCard className="overflow-hidden">
          {isLoading && (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          )}

          {isError && (
            <div className="p-8 text-center">
              <p className="text-red-400">Failed to load audit log.</p>
            </div>
          )}

          {!isLoading && !isError && data && (
            <>
              {data.length === 0 ? (
                <p className="py-16 text-center text-slate-400 text-sm">
                  No audit log entries match the current filters.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className={thClass}>Time</th>
                        <th className={thClass}>Actor</th>
                        <th className={thClass}>Action</th>
                        <th className={thClass}>Entity Type</th>
                        <th className={thClass}>Entity ID</th>
                        <th className={thClass}>IP</th>
                        <th className={thClass}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row) => (
                        <>
                          <tr
                            key={row.id}
                            className={trClass}
                            onClick={() =>
                              setExpandedId(expandedId === row.id ? null : row.id)
                            }
                          >
                            <td className={`${tdClass} whitespace-nowrap text-slate-400`}>
                              {formatDate(row.created_at)}
                            </td>
                            <td className={tdClass}>{row.actor_mobile ?? '—'}</td>
                            <td className={`${tdClass} font-medium text-slate-200`}>
                              {row.action}
                            </td>
                            <td className={tdClass}>{row.entity_type}</td>
                            <td className={`${tdClass} font-mono text-xs text-slate-400`}>
                              {row.entity_id ? `${row.entity_id.slice(0, 8)}…` : '—'}
                            </td>
                            <td className={`${tdClass} text-slate-400`}>
                              {row.ip_address ?? '—'}
                            </td>
                            <td className={tdClass}>
                              <span className="text-teal-300 text-xs font-medium hover:text-teal-200">
                                {expandedId === row.id ? 'Hide ▲' : 'View ▼'}
                              </span>
                            </td>
                          </tr>

                          {expandedId === row.id && (
                            <tr key={`${row.id}-detail`}>
                              <td
                                colSpan={7}
                                className="px-4 py-4 bg-white/[0.02] border-b border-white/[0.08]"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 mb-2">
                                      Before
                                    </p>
                                    <pre
                                      className={[
                                        'font-mono text-xs leading-relaxed',
                                        'text-slate-300 bg-white/[0.04] border border-white/[0.08]',
                                        'rounded-lg p-3 overflow-auto max-h-48',
                                      ].join(' ')}
                                    >
                                      {row.before_state
                                        ? JSON.stringify(row.before_state, null, 2)
                                        : 'null'}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.7px] text-slate-400 mb-2">
                                      After
                                    </p>
                                    <pre
                                      className={[
                                        'font-mono text-xs leading-relaxed',
                                        'text-slate-300 bg-white/[0.04] border border-white/[0.08]',
                                        'rounded-lg p-3 overflow-auto max-h-48',
                                      ].join(' ')}
                                    >
                                      {row.after_state
                                        ? JSON.stringify(row.after_state, null, 2)
                                        : 'null'}
                                    </pre>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </GlassCard>
      </div>
    </AppLayout>
  );
}
