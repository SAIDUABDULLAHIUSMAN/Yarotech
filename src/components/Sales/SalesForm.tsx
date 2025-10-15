import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Product {
  id: string;
  name: string;
  unit_price: number;
}

interface SalesFormProps {
  onSaleCreated: (saleId: string) => void;
}

export function SalesForm({ onSaleCreated }: SalesFormProps) {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [issuerName, setIssuerName] = useState('');

  useEffect(() => {
    loadProducts();
    loadUserProfile();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, unit_price')
      .eq('is_active', true)
      .order('name');

    if (data) setProducts(data);
  };

  const loadUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (data) setIssuerName(data.full_name);
  };

  const addItem = () => {
    if (products.length === 0) return;

    const firstProduct = products[0];
    setItems([
      ...items,
      {
        product_id: firstProduct.id,
        product_name: firstProduct.name,
        quantity: 1,
        unit_price: firstProduct.unit_price,
        total_price: firstProduct.unit_price,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === 'product_id') {
      const product = products.find((p) => p.id === value);
      if (product) {
        item.product_id = product.id;
        item.product_name = product.name;
        item.unit_price = product.unit_price;
        item.total_price = item.quantity * product.unit_price;
      }
    } else if (field === 'quantity') {
      item.quantity = Number(value);
      item.total_price = item.quantity * item.unit_price;
    } else if (field === 'unit_price') {
      item.unit_price = Number(value);
      item.total_price = item.quantity * item.unit_price;
    }

    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const sendEmailNotification = async (saleId: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sale-notification`;

      const { data: { session } } = await supabase.auth.getSession();

      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ saleId }),
      });
    } catch (err) {
      console.error('Failed to send email notification:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    if (items.length === 0) {
      setError('Add at least one item');
      return;
    }

    setLoading(true);

    try {
      const totalAmount = calculateTotal();

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_name: customerName,
          issuer_id: user?.id,
          issuer_name: issuerName,
          total_amount: totalAmount,
          status: 'completed',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = items.map((item) => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      sendEmailNotification(saleData.id);

      setCustomerName('');
      setItems([]);
      onSaleCreated(saleData.id);
    } catch (err) {
      setError('Failed to create sale. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">New Sale</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter customer name"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Items
            </label>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
            >
              <Plus size={16} />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Click "Add Item" to start creating a sale
              </div>
            ) : (
              <>
                <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 text-xs font-medium text-gray-600">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-2">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-3 rounded-lg space-y-2 md:space-y-0"
                  >
                    <div className="md:hidden">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Product
                          </label>
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="1"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Unit Price (N)
                          </label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Total (N)
                          </label>
                          <div className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg text-sm font-semibold">
                            {item.total_price.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div className="col-span-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                          >
                            <Trash2 size={16} />
                            <span className="text-sm font-medium">Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="hidden md:grid md:grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          min="1"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div className="col-span-2">
                        <div className="w-full px-2 py-1 bg-gray-200 border border-gray-300 rounded text-sm font-medium text-right">
                          {item.total_price.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex justify-end">
            <div className="bg-blue-50 px-6 py-4 rounded-lg w-full md:w-auto">
              <p className="text-sm text-gray-600 text-center md:text-left">Total Amount</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-600 text-center md:text-left">
                N {calculateTotal().toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Sale...' : 'Create Sale'}
        </button>
      </form>
    </div>
  );
}
