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
  Image as ImageIcon,
} from 'lucide-react';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase'; 
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { type Setting } from './configuraciones/page';

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
  
  const firestore = useFirestore();
  const settingsDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'global');
  }, [firestore]);
  const { data: settings } = useDoc<Setting>(settingsDocRef);


  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/welcome');
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
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header del Sidebar con Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-sidebar-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-sidebar-accent rounded-full h-12 w-12 flex items-center justify-center overflow-hidden">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-sidebar-foreground/50" />
                )}
              </div>
              <h1 className="text-lg font-black text-sidebar-foreground tracking-tighter uppercase leading-none">
                Full<span className="text-sidebar-foreground/40">-</span>Ventas
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground hover:text-sidebar-foreground/80 transition-colors"
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
                      ? 'bg-primary text-primary-foreground font-bold shadow-lg scale-[1.02]'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className={`h-5 w-5 mr-3 shrink-0 ${active ? '' : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground'}`} />
                  <span className="text-sm tracking-wide">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile / Logout Section */}
        <div className="p-4 border-t border-sidebar-border bg-black/20">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/20 shrink-0">
              <AvatarFallback className="bg-primary-foreground text-primary font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-sidebar-foreground truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase font-black tracking-widest">Admin</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout} 
              className="text-sidebar-foreground/40 hover:bg-destructive hover:text-destructive-foreground transition-all rounded-lg h-9 w-9"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen w-full">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-primary hover:bg-accent rounded-lg mr-2"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-sm md:text-lg font-bold text-foreground uppercase tracking-wider">
              {currentPageName || 'Panel de Control'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">Sistema Online</span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">Full-Ventas PWA</span>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-background p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
