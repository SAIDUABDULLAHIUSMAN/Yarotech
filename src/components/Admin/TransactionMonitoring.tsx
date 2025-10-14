import { useState, useEffect } from 'react';
import { Filter, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Sale {
  id: string;
  customer_name: string;
  issuer_name: string;
  total_amount: number;
  created_at: string;
  status: string;
}

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function TransactionMonitoring() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchStaff, setSearchStaff] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sales, fromDate, toDate, searchStaff, searchCustomer]);

  const loadSales = async () => {
    const { data } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setSales(data);
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

    if (searchStaff) {
      filtered = filtered.filter((sale) =>
        sale.issuer_name.toLowerCase().includes(searchStaff.toLowerCase())
      );
    }

    setFilteredSales(filtered);
  };

  const loadSaleDetails = async (saleId: string) => {
    const { data } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId);

    if (data) {
      setSaleItems(data);
      setSelectedSale(saleId);
    }
  };

  const calculateTotal = () => {
    return filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  };

  if (loading) {
    return <div className="text-gray-500">Loading transactions...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">All Transactions</h2>

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex items-center space-x-2 mb-4">
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
              Staff Member
            </label>
            <input
              type="text"
              value={searchStaff}
              onChange={(e) => setSearchStaff(e.target.value)}
              placeholder="Search by staff name..."
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
              placeholder="Search by customer..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing {filteredSales.length} of {sales.length} transactions
          </p>
          <p className="text-lg font-semibold text-gray-800 mt-1">
            Total: N {calculateTotal().toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Staff Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {sale.id.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(sale.created_at), 'dd MMM yyyy, hh:mm a')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.issuer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    N {Number(sale.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => loadSaleDetails(sale.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">{sale.customer_name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {sale.id.substring(0, 8)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(sale.created_at), 'dd MMM yyyy, hh:mm a')}
                  </p>
                </div>
                <button
                  onClick={() => loadSaleDetails(sale.id)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Eye size={20} />
                </button>
              </div>
              <div className="flex justify-between items-center mt-3">
                <div>
                  <p className="text-xs text-gray-500">Staff</p>
                  <p className="text-sm text-gray-700">{sale.issuer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    N {Number(sale.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredSales.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No transactions found
          </div>
        )}
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">Transaction Details</h3>
              <p className="text-sm text-gray-500 mt-1">ID: {selectedSale.substring(0, 8)}</p>
            </div>

            <div className="p-6">
              <h4 className="font-semibold text-gray-800 mb-3">Items Purchased</h4>
              <div className="space-y-2">
                {saleItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × N {item.unit_price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      N {item.total_price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
