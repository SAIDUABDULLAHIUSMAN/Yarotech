import { useState, useEffect } from 'react';
import { Download, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Sale {
  id: string;
  customer_name: string;
  issuer_name: string;
  total_amount: number;
  created_at: string;
  status: string;
}

export function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchIssuer, setSearchIssuer] = useState('');

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sales, fromDate, toDate, searchCustomer, searchIssuer]);

  const loadSales = async () => {
    const { data } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setSales(data);
      setFilteredSales(data);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...sales];

    if (fromDate) {
      filtered = filtered.filter(
        (sale) => new Date(sale.created_at) >= new Date(fromDate)
      );
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((sale) => new Date(sale.created_at) <= endDate);
    }

    if (searchCustomer) {
      filtered = filtered.filter((sale) =>
        sale.customer_name.toLowerCase().includes(searchCustomer.toLowerCase())
      );
    }

    if (searchIssuer) {
      filtered = filtered.filter((sale) =>
        sale.issuer_name.toLowerCase().includes(searchIssuer.toLowerCase())
      );
    }

    setFilteredSales(filtered);
  };

  const calculateTotal = () => {
    return filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();

    const { data: settings } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const companyName = settings?.company_name || 'YAROTECH NETWORK LIMITED';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(companyName, 105, 15, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('Transaction Report', 105, 22, { align: 'center' });

    doc.setFontSize(10);
    if (fromDate || toDate) {
      const dateRange = `Period: ${fromDate || 'Start'} to ${toDate || 'End'}`;
      doc.text(dateRange, 105, 28, { align: 'center' });
    }

    const tableData = filteredSales.map((sale) => [
      format(new Date(sale.created_at), 'dd/MM/yyyy'),
      sale.customer_name,
      sale.issuer_name,
      `N ${Number(sale.total_amount).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Date', 'Customer', 'Issued By', 'Amount']],
      body: tableData,
      foot: [['', '', 'Total:', `N ${calculateTotal().toFixed(2)}`]],
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [229, 231, 235],
        textColor: 0,
        fontStyle: 'bold',
      },
    });

    doc.save(`Transaction_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Customer', 'Issued By', 'Amount', 'Status'];
    const rows = filteredSales.map((sale) => [
      format(new Date(sale.created_at), 'yyyy-MM-dd HH:mm:ss'),
      sale.customer_name,
      sale.issuer_name,
      sale.total_amount,
      sale.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
      '',
      `Total,,,${calculateTotal().toFixed(2)},`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Transaction_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-gray-500">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Filter size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <input
              type="text"
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              placeholder="Search customer..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Issuer
            </label>
            <input
              type="text"
              value={searchIssuer}
              onChange={(e) => setSearchIssuer(e.target.value)}
              placeholder="Search issuer..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-6 gap-4">
          <div>
            <p className="text-sm text-gray-600">
              Showing {filteredSales.length} of {sales.length} transactions
            </p>
            <p className="text-lg font-semibold text-gray-800 mt-1">
              Total: N {calculateTotal().toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download size={18} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={exportToPDF}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Download size={18} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issued By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(sale.created_at), 'dd MMM yyyy, hh:mm a')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.issuer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    N {Number(sale.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSales.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No transactions found matching your filters
            </div>
          )}
        </div>

        <div className="md:hidden divide-y divide-gray-200">
          {filteredSales.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No transactions found matching your filters
            </div>
          ) : (
            filteredSales.map((sale) => (
              <div key={sale.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{sale.customer_name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(sale.created_at), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    {sale.status}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Issued by</p>
                    <p className="text-sm text-gray-700">{sale.issuer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-lg font-semibold text-gray-900">
                      N {Number(sale.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
