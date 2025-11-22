'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  LogOut,
  Menu,
  X,
  FolderKanban,
  FileText
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userStr));
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/clients', label: 'Clients', icon: Users },
    { href: '/dashboard/employees', label: 'Employees', icon: UserCog },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 z-40 p-4 flex items-center justify-between shadow-lg">
        <h1 className="text-xl font-bold text-white">Biztal Admin</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-blue-800 text-white transition"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-screen w-64 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
            <h1 className="text-2xl font-bold text-white">Biztal Admin</h1>
            <p className="text-xs text-blue-100 mt-1">Management Portal</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md transform scale-105'
                      : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 bg-white">
            {user && (
              <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-600 mt-1">{user.email}</p>
              </div>
            )}
            <div className="flex flex-row gap-4">
            <Link
              href="/dashboard/profile"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center justify-center px-2 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-300 shadow-md hover:shadow-md"
            >
              <UserCog size={20} />
            </Link>
            <span
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-2 py-1 rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-md hover:shadow-lg"
            >
              <LogOut size={20} />
            </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64 pt-16 lg:pt-0">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
