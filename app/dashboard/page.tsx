'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Users, UserCog, DollarSign, FileText, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalClients: number;
  totalEmployees: number;
  totalRevenue: number;
  pendingInvoices: number;
  recentClients: any[];
  recentPayments: any[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchDashboardData();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/dashboard', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      }
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Failed to load dashboard data</div>
      </div>
    );
  }

  const formatIndianAmount = (num: number) => {
    // Handles Arbitrary Large Indian Currency Categories: K, Lakh, Crore, Arab, Kharab, Neel, Padma, Shankh, etc.
    const categories = [
      { value: 1e17, suffix: 'Shankh' },
      { value: 1e15, suffix: 'Padma' },
      { value: 1e13, suffix: 'Neel' },
      { value: 1e11, suffix: 'Kharab' },
      { value: 1e9,  suffix: 'Arab' },
      { value: 1e7,  suffix: 'Cr' },
      { value: 1e5,  suffix: 'Lakh' },
      { value: 1e3,  suffix: 'K' },
    ];
    for (const cat of categories) {
      if (num >= cat.value) {
        return `${(num / cat.value).toFixed(2)} ${cat.suffix}`;
      }
    }
    return `₹${num.toFixed(2)}`;
  };

  const statCards = [
    {
      title: 'Clients',
      value: stats.totalClients,
      icon: Users,
      color: 'bg-blue-500',
      href: '/dashboard/clients',
    },
    {
      title: 'Employees',
      value: stats.totalEmployees,
      icon: UserCog,
      color: 'bg-green-500',
      href: '/dashboard/employees',
    },
    {
      title: 'Revenue',
      value: (() => {
        return formatIndianAmount(stats.totalRevenue);
      })(),
      icon: DollarSign,
      color: 'bg-purple-500',
    },
    {
      title: 'Pending Invoices',
      value: stats.pendingInvoices,
      icon: FileText,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-blue-100 mt-2">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const content = (
            <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">{stat.title}</p>
                  <p className="text-xl font-bold text-gray-800 mt-3">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-xl shadow-lg`}>
                  <Icon className="text-white" size={15} />
                </div>
              </div>
            </div>
          );

          return stat.href ? (
            <Link key={stat.title} href={stat.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={stat.title}>{content}</div>
          );
        })}
      </div>

      {/* Recent Clients */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Users className="mr-2 text-blue-600" size={24} />
            Recent Clients
          </h2>
        </div>
        <div className="p-6">
          {stats.recentClients.length > 0 ? (
            <div className="space-y-3">
              {stats.recentClients.map((client) => (
                <Link key={client.id} href={`/dashboard/clients/${client.id}`}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:from-blue-50 hover:to-white border border-gray-100 hover:border-blue-200 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{client.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{client.email}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                      client.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : client.status === 'INACTIVE'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}
                  >
                    {client.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto text-gray-300 mb-2" size={48} />
              <p className="text-gray-600">No recent clients</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

