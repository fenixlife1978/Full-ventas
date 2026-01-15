'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Package, ShoppingCart, BarChart3, Home, ShoppingBag } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Productos', href: '/productos', icon: Package },
    { name: 'Ventas', href: '/ventas', icon: ShoppingCart },
    { name: 'Compras', href: '/compras', icon: ShoppingBag },
    { name: 'Reportes', href: '/reportes', icon: BarChart3 },
  ];

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#00704a] shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#005a3c]">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6" />
            Bodega Manager
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-[#e8dcc4]"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-6 px-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-white text-[#00704a] font-semibold shadow-md'
                    : 'text-[#f7f4ed] hover:bg-[#005a3c] hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        {/* Starbucks-style decoration */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="bg-[#005a3c] rounded-lg p-4 text-center">
            <p className="text-[#f7f4ed] text-sm font-medium">Sistema de Gestión</p>
            <p className="text-[#e8dcc4] text-xs mt-1">Inventario & Ventas</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b-2 border-[#00704a] h-16 flex items-center px-4 lg:px-8 shadow-md">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[#00704a] hover:text-[#005a3c] mr-4"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-bold text-black">{currentPageName}</h2>
        </div>

        {/* Page content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
