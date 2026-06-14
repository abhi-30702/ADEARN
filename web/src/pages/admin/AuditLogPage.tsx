import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { getAuditLog, type AuditLogRow } from '../../lib/api';

const ACTION_OPTIONS = [
  '',
  'cashback_processed',
  'fraud_flagged',
  'fraud_approved',
  'fraud_rejected',
  'campaign_created',
  'campaign_status_changed',
  'user_suspended',
  'advertiser_approved',
];

const ENTITY_TYPE_OPTIONS = [
  '',
  'cashback_transaction',
  'campaign',
  'user',
  'advertiser',
  'attribution_session',
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Nav */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <Link to="/admin" className="text-sm text-orange-500 hover:text-orange-700 font-medium">
          &larr; Admin
        </Link>
        <h1 className="text-lg font-semibold text-gray-800">Audit Log</h1>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filter row */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600" htmlFor="action-filter">
              Action
            </label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? 'All actions' : opt}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600" htmlFor="entity-type-filter">
              Entity Type
            </label>
            <select
              id="entity-type-filter"
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? 'All entity types' : opt}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => void refetch()}
            className="ml-auto text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {isLoading && (
            <div className="p-6 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 rounded h-10" />
              ))}
            </div>
          )}

          {isError && (
            <div className="p-6">
              <p className="text-red-500">Failed to load audit log.</p>
            </div>
          )}

          {!isLoading && !isError && data && (
            <>
              {data.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-10">
                  No audit log entries match the current filters.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <th className="px-5 py-3">Time</th>
                        <th className="px-5 py-3">Actor</th>
                        <th className="px-5 py-3">Action</th>
                        <th className="px-5 py-3">Entity Type</th>
                        <th className="px-5 py-3">Entity ID</th>
                        <th className="px-5 py-3">IP</th>
                        <th className="px-5 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.map((row) => (
                        <>
                          <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                              {formatDate(row.created_at)}
                            </td>
                            <td className="px-5 py-3 text-gray-800">
                              {row.actor_mobile ?? '—'}
                            </td>
                            <td className="px-5 py-3 font-medium text-gray-900">
                              {row.action}
                            </td>
                            <td className="px-5 py-3 text-gray-700">
                              {row.entity_type}
                            </td>
                            <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                              {row.entity_id ? `${row.entity_id.slice(0, 8)}…` : '—'}
                            </td>
                            <td className="px-5 py-3 text-gray-500">
                              {row.ip_address ?? '—'}
                            </td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() =>
                                  setExpandedId(expandedId === row.id ? null : row.id)
                                }
                                className="text-orange-500 hover:text-orange-700 font-medium text-xs underline"
                              >
                                {expandedId === row.id ? 'Hide' : 'View'}
                              </button>
                            </td>
                          </tr>

                          {expandedId === row.id && (
                            <tr key={`${row.id}-detail`} className="bg-gray-50">
                              <td colSpan={7} className="px-5 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                                      Before
                                    </p>
                                    <pre className="text-xs bg-white rounded-lg p-3 overflow-auto max-h-48 border border-gray-100">
                                      {row.before_state
                                        ? JSON.stringify(row.before_state, null, 2)
                                        : 'null'}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                                      After
                                    </p>
                                    <pre className="text-xs bg-white rounded-lg p-3 overflow-auto max-h-48 border border-gray-100">
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
        </div>
      </div>
    </div>
  );
}
