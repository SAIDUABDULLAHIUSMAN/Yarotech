import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface Sale {
  id: string;
  customer_name: string;
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

export function MyTransactions() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    loadMySales();
  }, [user]);

  const loadMySales = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('issuer_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setSales(data);
    }
    setLoading(false);
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
    return sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  };

  if (loading) {
    return <div className="text-gray-500">Loading your transactions...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Transaction History</h2>
        <p className="text-gray-600 mt-1">View all sales you have processed</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-blue-700 font-medium">Total Transactions</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">{sales.length}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700 font-medium">Total Sales Amount</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">
              N {calculateTotal().toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>
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
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {sale.id.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(sale.created_at), 'dd MMM yyyy, hh:mm a')}
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
          {sales.map((sale) => (
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
              <div className="mt-3 text-right">
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-lg font-semibold text-gray-900">
                  N {Number(sale.total_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {sales.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            You haven't processed any sales yet
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
              <h4 className="font-semibold text-gray-800 mb-3">Items Sold</h4>
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
