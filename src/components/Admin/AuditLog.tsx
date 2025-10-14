import { useState, useEffect } from 'react';
import { Shield, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  user_name: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
}

export function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, actionFilter, entityFilter, fromDate, toDate]);

  const loadAuditLogs = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (data) {
      const enrichedLogs = await Promise.all(
        data.map(async (log) => {
          if (log.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', log.user_id)
              .maybeSingle();

            return { ...log, user_name: profile?.full_name || 'Unknown User' };
          }
          return { ...log, user_name: 'System' };
        })
      );
      setLogs(enrichedLogs);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (actionFilter) {
      filtered = filtered.filter((log) =>
        log.action_type.toLowerCase().includes(actionFilter.toLowerCase())
      );
    }

    if (entityFilter) {
      filtered = filtered.filter((log) =>
        log.entity_type?.toLowerCase().includes(entityFilter.toLowerCase())
      );
    }

    if (fromDate) {
      filtered = filtered.filter(
        (log) => new Date(log.created_at) >= new Date(fromDate)
      );
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.created_at) <= endDate);
    }

    setFilteredLogs(filtered);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Shield size={28} className="text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">System Audit Log</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="CREATE, UPDATE, DELETE..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <input
              type="text"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              placeholder="products, sales..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} audit entries
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Entity Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Entity ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.user_name || 'System'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(
                        log.action_type
                      )}`}
                    >
                      {log.action_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.entity_type || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {log.entity_id ? log.entity_id.substring(0, 8) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">{log.user_name || 'System'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(
                    log.action_type
                  )}`}
                >
                  {log.action_type}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div>
                  <p className="text-gray-500">Entity</p>
                  <p className="font-medium">{log.entity_type || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Entity ID</p>
                  <p className="font-mono text-xs">
                    {log.entity_id ? log.entity_id.substring(0, 8) : '-'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No audit logs found matching your filters
          </div>
        )}
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Audit logs track all critical system activities including
          user authentication, product management, and transaction creation for security
          and accountability purposes.
        </p>
      </div>
    </div>
  );
}
