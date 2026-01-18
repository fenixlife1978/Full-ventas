'use client'

import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Settings, 
  Plus, 
  ArrowDownRight, 
  Wallet,
  ShoppingCart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCollection, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { collection, doc } from 'firebase/firestore'
import { startOfMonth } from 'date-fns'
import type { Sale } from './ventas/page'
import type { Product } from './productos/page'
import type { Purchase } from './compras/page'
import type { Setting } from './configuraciones/page'
import Layout from './layout-app'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false)
  const firestore = useFirestore()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Data fetching
  const salesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'sales') : null, [firestore])
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore])
  const purchasesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'purchases') : null, [firestore])
  const settingsDoc = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore])

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection)
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)
  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<Purchase>(purchasesCollection)
  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDoc)
  
  const bcvRate = useMemo(() => settings?.bcvRate || null, [settings])
  const isLoading = isLoadingSales || isLoadingProducts || isLoadingPurchases || isLoadingSettings

  // Memoized calculations
  const formattedSales = useMemo(() => {
    return sales?.map(sale => ({
      ...sale,
      saleDate: (sale.saleDate as any).toDate ? (sale.saleDate as any).toDate() : sale.saleDate
    })) || []
  }, [sales])

  const formattedPurchases = useMemo(() => {
    return purchases?.map(purchase => ({
      ...purchase,
      purchaseDate: (purchase.purchaseDate as any).toDate ? (purchase.purchaseDate as any).toDate() : purchase.purchaseDate
    })) || []
  }, [purchases])

  const monthlySalesStats = useMemo(() => {
    if (!isClient) return { totalRevenue: 0, salesCount: 0 }
    const monthStartDate = startOfMonth(new Date())
    const monthlySales = formattedSales.filter(s => s.saleDate >= monthStartDate)
    const totalRevenueCents = monthlySales.reduce((sum, s) => sum + Math.round((s.totalAmount || 0) * 100), 0)
    
    return {
      totalRevenue: totalRevenueCents / 100,
      salesCount: monthlySales.length,
    }
  }, [formattedSales, isClient])

  const productStats = useMemo(() => {
    if (!products) return { total: 0, lowStock: 0 }
    const activeProducts = products.filter(p => p.status === 'active');
    const lowStockCount = activeProducts.filter(p => p.stock <= (p.minStock || 0)).length
    return {
      total: activeProducts.length,
      lowStock: lowStockCount,
    }
  }, [products])

  const monthlyPurchasesStats = useMemo(() => {
    if (!isClient) return { totalAmount: 0, purchasesCount: 0 }
    const monthStartDate = startOfMonth(new Date())
    const monthlyPurchases = formattedPurchases.filter(p => p.purchaseDate >= monthStartDate)
    const totalAmountCents = monthlyPurchases.reduce((sum, p) => sum + Math.round((p.totalAmount || 0) * 100), 0)
    
    return {
      totalAmount: totalAmountCents / 100,
      purchasesCount: monthlyPurchases.length,
    }
  }, [formattedPurchases, isClient])

  const formatCurrency = (value: number, currency: 'USD' | 'VES' = 'USD') => {
    if (currency === 'VES' && bcvRate) {
      value = value * bcvRate
      return `Bs. ${new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)}`
    }
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const stats = [
    {
      title: "Ventas del Mes",
      value: formatCurrency(monthlySalesStats.totalRevenue, 'USD'),
      subValue: bcvRate ? formatCurrency(monthlySalesStats.totalRevenue, 'VES') : null,
      change: `${monthlySalesStats.salesCount} ventas`,
      icon: Wallet,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Productos Activos",
      value: productStats.total,
      change: `${productStats.lowStock} con bajo stock`,
      trending: productStats.lowStock > 0 ? "down" : "up",
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Compras del Mes",
      value: formatCurrency(monthlyPurchasesStats.totalAmount, 'USD'),
      subValue: bcvRate ? formatCurrency(monthlyPurchasesStats.totalAmount, 'VES') : null,
      change: `${monthlyPurchasesStats.purchasesCount} compras`,
      icon: ShoppingBag,
      color: "text-purple-600",
      bg: "bg-purple-50"
    }
  ]

  return (
    <Layout currentPageName="Dashboard">
      <div className="flex flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
            <p className="text-slate-500 font-medium">Bienvenido al sistema de control de inventario y ventas.</p>
          </div>
          
          <Link href="/ventas?new=true">
            <Button className="bg-primary hover:bg-primary/90 text-white font-black px-8 h-14 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95">
              <Plus className="mr-2 h-5 w-5" /> NUEVA VENTA
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {(isLoading || !isClient) ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="border-none shadow-sm rounded-[2rem] overflow-hidden">
                <CardContent className="p-8">
                  <Skeleton className="h-8 w-1/2 mb-4" />
                  <Skeleton className="h-12 w-3/4 mb-2" />
                  <Skeleton className="h-6 w-1/3" />
                </CardContent>
              </Card>
            ))
          ) : (
            stats.map((stat, index) => (
              <Card key={index} className="border-none shadow-sm rounded-[2rem] overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex justify-between items-start">
                    <div className={cn("p-4 rounded-2xl", stat.bg)}>
                      <stat.icon className={cn("h-6 w-6", stat.color)} />
                    </div>
                    {stat.change && (
                      <div className={cn(
                        "flex items-center text-xs font-black px-2 py-1 rounded-lg",
                        stat.trending === 'down' ? "text-red-600 bg-red-50" : "text-slate-500 bg-slate-100"
                      )}>
                        {stat.trending === 'down' && <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {stat.change}
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
                    {stat.subValue && <p className="text-sm text-slate-500 font-medium">{stat.subValue}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <QuickAccessCard 
            title="Ventas" 
            description="Registrar y monitorear transacciones" 
            href="/ventas" 
            icon={ShoppingCart} 
            color="bg-emerald-500"
          />
          <QuickAccessCard 
            title="Compras" 
            description="Gestionar compras de inventario" 
            href="/compras" 
            icon={ShoppingBag} 
            color="bg-purple-500"
          />
          <QuickAccessCard 
            title="Inventario" 
            description="Control de stock y productos" 
            href="/productos" 
            icon={Package} 
            color="bg-blue-500"
          />
          <QuickAccessCard 
            title="Reportes" 
            description="Análisis de rendimiento" 
            href="/reportes" 
            icon={BarChart3} 
            color="bg-amber-500"
          />
          <QuickAccessCard 
            title="Configuración" 
            description="Ajustes del sistema y tasas" 
            href="/configuraciones" 
            icon={Settings} 
            color="bg-slate-700"
          />
        </div>
      </div>
    </Layout>
  )
}

function QuickAccessCard({ title, description, href, icon: Icon, color }: any) {
  return (
    <Link href={href}>
      <div className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-full flex flex-col">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-lg", color)}>
          <Icon className="text-white h-7 w-7" />
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
        <p className="text-sm text-slate-400 font-bold mt-2 leading-relaxed">{description}</p>
      </div>
    </Link>
  )
}
