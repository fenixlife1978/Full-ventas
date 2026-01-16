'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Menu, 
  X, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Home, 
  ShoppingBag, 
  Settings,
  LogOut,
} from 'lucide-react';
import { useUser, useAuth } from '@/firebase'; 
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface LayoutAppProps {
  children: React.ReactNode;
  currentPageName?: string;
}

export default function Layout({ children, currentPageName }: LayoutAppProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/login'); // Usamos replace para evitar volver atrás
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Productos', href: '/productos', icon: Package },
    { name: 'Ventas', href: '/ventas', icon: ShoppingCart },
    { name: 'Compras', href: '/compras', icon: ShoppingBag },
    { name: 'Reportes', href: '/reportes', icon: BarChart3 },
    { name: 'Configuraciones', href: '/configuraciones', icon: Settings },
  ];

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header del Sidebar con Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-lg shadow-inner flex items-center justify-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="logo-gold" x1="0.5" y1="0" x2="0.5" y2="1">
                      <stop offset="0" stopColor="#f4d03f" />
                      <stop offset="1" stopColor="#b5830d" />
                    </linearGradient>
                    <linearGradient id="shield-gradient" x1="0.5" y1="0" x2="0.5" y2="1">
                      <stop offset="0" stopColor="#1faa8d" />
                      <stop offset="1" stopColor="#226482" />
                    </linearGradient>
                  </defs>
                  
                  <path
                    d="M32 2C52 8 62 26 62 38 62 52 48 62 32 62 16 62 2 52 2 38 2 26 12 8 32 2z"
                    fill="url(#shield-gradient)"
                    stroke="url(#logo-gold)"
                    strokeWidth="4"
                  />
                  
                  <text x="32" y="58" fill="#f4d03f" fontSize="16" fontWeight="bold" textAnchor="middle">$</text>
                  
                  <g transform="translate(1 0)" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 24 H 15 L 19 40 H 45 L 49 28 H 17" />
                    
                    <circle cx="22" cy="43" r="3" />
                    <circle cx="39" cy="43" r="3" />
                    
                    <path d="M23 39 V 31" />
                    <path d="M29 39 V 25" />
                    <path d="M35 39 V 33" />
                    <path d="M41 39 V 22" />
                    
                    <path d="M23 31 L 29 25 L 35 33 L 41 22 L 48 16" />
                    <path d="M45 15 L 48 16 L 47 19" />
                  </g>
                </svg>
              </div>
              <h1 className="text-lg font-black text-white tracking-tighter uppercase leading-none">
                Full<span className="text-white/40">-</span>Ventas
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-white/80 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navegación */}
          <nav className="mt-6 px-4 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 mb-2 rounded-xl transition-all duration-200 group ${
                    active
                      ? 'bg-white text-primary font-bold shadow-lg scale-[1.02]'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 mr-3 shrink-0 ${active ? 'text-primary' : 'text-white/60 group-hover:text-white'}`} />
                  <span className="text-sm tracking-wide">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile / Logout Section */}
        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/20 shrink-0">
              <AvatarFallback className="bg-primary-foreground text-primary font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-white/50 uppercase font-black tracking-widest">Admin</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout} 
              className="text-white/40 hover:bg-destructive hover:text-white transition-all rounded-lg h-9 w-9"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen w-full">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-primary hover:bg-gray-100 rounded-lg mr-2"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-sm md:text-lg font-black text-gray-800 uppercase tracking-tighter italic">
              {currentPageName || 'Panel de Control'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">Sistema Online</span>
              <span className="text-[10px] text-gray-400 font-medium mt-0.5">Full-Ventas PWA</span>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-gray-50 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
