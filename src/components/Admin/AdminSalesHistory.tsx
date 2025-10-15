import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar, User, DollarSign, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateInvoicePDF } from '../../utils/invoiceGenerator';
import { format } from 'date-fns';

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Sale {
  id: string;
  customer_name: string;
  issuer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  items?: SaleItem[];
}

interface CompanySettings {
  company_name: string;
  address: string;
  email: string;
  phone: string;
  currency_symbol: string;
}

export function AdminSalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadSales();
    loadCompanySettings();
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, statusFilter]);

  const loadCompanySettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('company_name, address, email, phone, currency_symbol')
      .maybeSingle();

    if (data) setCompanySettings(data);
  };

  const loadSales = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sales')
      .select('id, customer_name, issuer_name, total_amount, status, created_at')
      .order('created_at', { ascending: false });

    if (data) setSales(data);
    setLoading(false);
  };

  const filterSales = () => {
    let filtered = [...sales];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (sale) =>
          sale.customer_name.toLowerCase().includes(term) ||
          sale.issuer_name.toLowerCase().includes(term) ||
          sale.id.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((sale) => sale.status === statusFilter);
    }

    setFilteredSales(filtered);
  };

  const loadSaleItems = async (saleId: string) => {
    const { data } = await supabase
      .from('sale_items')
      .select('product_name, quantity, unit_price, total_price')
      .eq('sale_id', saleId)
      .order('created_at');

    return data || [];
  };

  const toggleExpand = async (saleId: string) => {
    if (expandedSaleId === saleId) {
      setExpandedSaleId(null);
      return;
    }

    const sale = sales.find((s) => s.id === saleId);
    if (sale && !sale.items) {
      const items = await loadSaleItems(saleId);
      setSales(sales.map((s) => (s.id === saleId ? { ...s, items } : s)));
    }

    setExpandedSaleId(saleId);
  };

  const handleDownloadInvoice = async (sale: Sale) => {
    if (!companySettings) return;

    let saleData = sale;
    if (!sale.items) {
      const items = await loadSaleItems(sale.id);
      saleData = { ...sale, items };
    }

    const doc = await generateInvoicePDF(saleData, companySettings);
    doc.save(`Invoice_${sale.id.substring(0, 8)}_${sale.customer_name}.pdf`);
  };

  const calculateTotalRevenue = () => {
    return filteredSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading all sales...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Sales</p>
              <p className="text-2xl font-bold text-blue-900">{filteredSales.length}</p>
            </div>
            <FileText size={32} className="text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900">
                N {calculateTotalRevenue().toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign size={32} className="text-green-600" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Avg Sale Value</p>
              <p className="text-2xl font-bold text-gray-900">
                N {filteredSales.length > 0
                  ? (calculateTotalRevenue() / filteredSales.length).toLocaleString('en-NG', { minimumFractionDigits: 2 })
                  : '0.00'}
              </p>
            </div>
            <DollarSign size={32} className="text-gray-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <FileText size={24} className="text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">All Sales History</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <input
                type="text"
                placeholder="Search by customer, staff, or invoice ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={20} className="text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sales Found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Sales history will appear here once transactions are created.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="hover:bg-gray-50 transition">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Invoice #{sale.id.substring(0, 8).toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          sale.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {sale.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <User size={16} />
                          <span className="font-medium">Customer:</span>
                          <span>{sale.customer_name}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <User size={16} />
                          <span className="font-medium">Staff:</span>
                          <span>{sale.issuer_name}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar size={16} />
                          <span>{format(new Date(sale.created_at), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-900 font-semibold">
                          <DollarSign size={16} />
                          <span>N {sale.total_amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleExpand(sale.id)}
                        className="flex items-center space-x-1 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm"
                      >
                        {expandedSaleId === sale.id ? (
                          <>
                            <ChevronUp size={16} />
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <Eye size={16} />
                            <span>View</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(sale)}
                        className="flex items-center space-x-1 px-3 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition text-sm"
                      >
                        <Download size={16} />
                        <span>Invoice</span>
                      </button>
                    </div>
                  </div>

                  {expandedSaleId === sale.id && sale.items && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Sale Items</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Product</th>
                              <th className="px-4 py-2 text-center font-medium text-gray-600">Qty</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-600">Unit Price</th>
                              <th className="px-4 py-2 text-right font-medium text-gray-600">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {sale.items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2">{item.product_name}</td>
                                <td className="px-4 py-2 text-center">{item.quantity}</td>
                                <td className="px-4 py-2 text-right">
                                  N {item.unit_price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-2 text-right font-semibold">
                                  N {item.total_price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-4 py-2 text-right font-semibold">Grand Total:</td>
                              <td className="px-4 py-2 text-right font-bold text-blue-600">
                                N {sale.total_amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
