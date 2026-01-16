'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Home, 
  ShoppingBag, 
  Settings,
} from 'lucide-react';

// Definimos la interfaz para las props del componente
interface LayoutAppProps {
  children: React.ReactNode;
  currentPageName?: string;
}

export default function Layout({ children, currentPageName }: LayoutAppProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Productos', href: '/productos', icon: Package },
    { name: 'Ventas', href: '/ventas', icon: ShoppingCart },
    { name: 'Compras', href: '/compras', icon: ShoppingBag },
    { name: 'Reportes', href: '/reportes', icon: BarChart3 },
    { name: 'Configuraciones', href: '/configuraciones', icon: Settings },
  ];

  // Tipamos el parámetro href como string
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <svg
              role="img"
              aria-label="Full-Ventas Logo"
              className="w-10 h-10"
              viewBox="0 0 64 64"
            >
              <defs>
                <linearGradient id="logo-gold" x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0" stopColor="#f4d03f" />
                  <stop offset="1" stopColor="#b5830d" />
                </linearGradient>
                <linearGradient id="logo-green" x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0" stopColor="#1dd1a1" />
                  <stop offset="1" stopColor="#108967" />
                </linearGradient>
              </defs>
              <path
                d="M32 2C52 8 62 26 62 38 62 52 48 62 32 62 16 62 2 52 2 38 2 26 12 8 32 2z"
                stroke="url(#logo-gold)"
                strokeWidth="4"
                fill="none"
              />
              <path
                d="M32 6C49 12 58 27 58 38c0 12-12 20-26 20S6 50 6 38C6 27 15 12 32 6z"
                fill="url(#logo-green)"
                stroke="none"
              />
              <g
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 48l3-18h31l-4.5 13H19" />
                <circle cx="22" cy="53" r="3" fill="#fff" stroke="none" />
                <circle cx="43" cy="53" r="3" fill="#fff" stroke="none" />
                <path d="M16 30l-3-9" />
                <path d="M22 42v-8m8 8v-12m8 12v-16" />
                <path d="M24 30l12-10 12 4" />
                <path d="M42 21l4-5-5-2" />
              </g>
              <text
                x="32.5"
                y="56"
                fill="url(#logo-gold)"
                stroke="#6c4e06"
                strokeWidth="0.5"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                $
              </text>
            </svg>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">
              Full-Ventas
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-white/80"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3.5 mb-2 rounded-xl transition-all duration-200 group ${
                  active
                    ? 'bg-white text-primary font-bold shadow-lg scale-[1.02]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 ${active ? 'text-primary' : 'text-white/60 group-hover:text-white'}`} />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-8 left-0 right-0 px-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/5">
            <p className="text-white text-xs font-black uppercase tracking-widest opacity-60">Versión 1.0</p>
            <p className="text-white/90 text-sm font-bold mt-1">Soporte Activo</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-primary hover:bg-gray-100 rounded-lg mr-2"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-tighter italic">
              {currentPageName || 'Panel de Control'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-black text-primary uppercase">Sistema Online</span>
              <span className="text-xs text-gray-400 font-medium">Full-Ventas App</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
