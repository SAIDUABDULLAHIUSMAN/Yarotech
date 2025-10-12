import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingCart, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfWeek, startOfMonth, subDays, subMonths } from 'date-fns';

interface Stats {
  weeklyTotal: number;
  weeklyCount: number;
  monthlyTotal: number;
  monthlyCount: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    weeklyTotal: 0,
    weeklyCount: 0,
    monthlyTotal: 0,
    monthlyCount: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadStats();
    loadChartData();
  }, [period]);

  const loadStats = async () => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const lastWeekStart = subDays(weekStart, 7);
    const lastMonthStart = subMonths(monthStart, 1);

    const { data: weekSales } = await supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', weekStart.toISOString());

    const { data: monthSales } = await supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', monthStart.toISOString());

    const { data: lastWeekSales } = await supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', lastWeekStart.toISOString())
      .lt('created_at', weekStart.toISOString());

    const { data: lastMonthSales } = await supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', lastMonthStart.toISOString())
      .lt('created_at', monthStart.toISOString());

    const weeklyTotal = weekSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const monthlyTotal = monthSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const lastWeekTotal = lastWeekSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const lastMonthTotal = lastMonthSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

    const weeklyGrowth = lastWeekTotal > 0
      ? ((weeklyTotal - lastWeekTotal) / lastWeekTotal) * 100
      : 0;

    const monthlyGrowth = lastMonthTotal > 0
      ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

    setStats({
      weeklyTotal,
      weeklyCount: weekSales?.length || 0,
      monthlyTotal,
      monthlyCount: monthSales?.length || 0,
      weeklyGrowth,
      monthlyGrowth,
    });

    setLoading(false);
  };

  const loadChartData = async () => {
    const days = period === 'week' ? 7 : 30;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const { data: sales } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      const total = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

      data.push({
        date: format(date, 'MMM dd'),
        amount: total,
        count: sales?.length || 0,
      });
    }

    setChartData(data);
  };

  if (loading) {
    return <div className="text-gray-500">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Statistics</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Calendar size={24} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">This Week</span>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-blue-900">
            N {stats.weeklyTotal.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-blue-700 mt-1">{stats.weeklyCount} transactions</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <DollarSign size={24} className="text-green-600" />
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">This Month</span>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-green-900">
            N {stats.monthlyTotal.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-green-700 mt-1">{stats.monthlyCount} transactions</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp size={24} className="text-orange-600" />
            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Weekly Growth</span>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-orange-900">
            {stats.weeklyGrowth > 0 ? '+' : ''}
            {stats.weeklyGrowth.toFixed(1)}%
          </p>
          <p className="text-sm text-orange-700 mt-1">vs last week</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <ShoppingCart size={24} className="text-purple-600" />
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Monthly Growth</span>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-purple-900">
            {stats.monthlyGrowth > 0 ? '+' : ''}
            {stats.monthlyGrowth.toFixed(1)}%
          </p>
          <p className="text-sm text-purple-700 mt-1">vs last month</p>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
        <h4 className="text-md font-semibold text-gray-800 mb-4">
          Sales Trend ({period === 'week' ? 'Last 7 Days' : 'Last 30 Days'})
        </h4>
        <div className="w-full overflow-x-auto">
          <ResponsiveContainer width="100%" height={300} minWidth={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="amount" fill="#3b82f6" name="Amount (N)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
