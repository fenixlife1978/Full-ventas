'use client'

import { useState, useEffect, useMemo, ReactNode } from 'react'
import {
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  BarChart,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCollection, useFirestore, useDoc } from '@/firebase'
import { collection, doc } from 'firebase/firestore'
import { useMemoFirebase } from '@/firebase/provider'
import { type Product } from './productos/page'
import { type Sale } from './ventas/page'
import { startOfMonth, isToday } from 'date-fns'
import Layout from './layout-app'
import { Skeleton } from '@/components/ui/skeleton'
import { type Setting } from './configuraciones/page'
import { cn } from '@/lib/utils'

interface TopProduct {
  productName: string
  quantity: number
  revenue: number
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  isLoading,
  variant = 'default',
}: {
  title: string
  value: ReactNode
  subtitle?: ReactNode
  icon: React.ElementType
  isLoading: boolean
  variant?: 'default' | 'highlight' | 'warning'
}) => {
  const variants = {
    default: "bg-card border-border text-foreground",
    highlight: "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
    warning: "bg-white border-2 border-destructive/20 text-foreground",
  }

  return (
    <Card className={cn("overflow-hidden transition-all duration-300 hover:shadow-md", variants[variant])}>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex w-full items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-[120px]" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className={cn(
                "text-xs font-black uppercase tracking-widest opacity-70",
                variant === 'highlight' ? "text-white/80" : "text-muted-foreground"
              )}>
                {title}
              </p>
              <p className="text-3xl font-black tracking-tighter">{value}</p>
              {subtitle && (
                <p className={cn("text-xs font-medium mt-1", variant === 'highlight' ? "text-white/60" : "text-muted-foreground")}>
                  {subtitle}
                </p>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-2xl",
              variant === 'highlight' ? "bg-white/20" : "bg-primary/10 text-primary"
            )}>
              <Icon className="h-7 w-7" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const firestore = useFirestore()

  const productsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  )
  const salesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sales') : null),
    [firestore]
  )
  const settingsDoc = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  )

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection)
  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDoc)

  const bcvRate = useMemo(() => settings?.bcvRate || null, [settings])

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    todaySales: 0,
    monthSales: 0,
    todayRevenue: 0,
    monthRevenue: 0,
  })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  useEffect(() => {
    if (!products || !sales) return

    const totalProducts = products.length
    const lowStockProducts = products.filter((p) => p.stock <= (p.minStock || 0)).length

    const today = new Date()
    const monthStartDate = startOfMonth(today)

    const todaySalesData = sales.filter((s) => {
      const saleDate = (s.saleDate as any).toDate ? (s.saleDate as any).toDate() : new Date(s.saleDate)
      return isToday(saleDate)
    })
    const todayRevenueCents = todaySalesData.reduce((sum, s) => sum + Math.round((s.totalAmount || 0) * 100), 0)

    const monthSalesData = sales.filter((s) => {
      const saleDate = (s.saleDate as any).toDate ? (s.saleDate as any).toDate() : new Date(s.saleDate)
      return saleDate >= monthStartDate
    })
    const monthRevenueCents = monthSalesData.reduce((sum, s) => sum + Math.round((s.totalAmount || 0) * 100), 0)

    const productSales: { [key: string]: { productName: string, quantity: number, revenueCents: number } } = {}
    monthSalesData.flatMap(s => s.items || []).forEach((item) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { productName: item.productName, quantity: 0, revenueCents: 0 }
      }
      productSales[item.productId].quantity += item.quantity
      productSales[item.productId].revenueCents += Math.round(item.unitPrice * item.quantity * 100)
    })

    const topProductsArray = Object.values(productSales)
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 5)
      .map(p => ({
        productName: p.productName,
        quantity: p.quantity,
        revenue: p.revenueCents / 100,
      }))

    setStats({
      totalProducts,
      lowStockProducts,
      todaySales: todaySalesData.length,
      monthSales: monthSalesData.length,
      todayRevenue: todayRevenueCents / 100,
      monthRevenue: monthRevenueCents / 100,
    })
    setTopProducts(topProductsArray)
  }, [products, sales])

  const isLoading = isLoadingProducts || isLoadingSales || isLoadingSettings
  
  const formatCurrency = (value: number, currency: 'USD' | 'VES' = 'USD') => {
    if (currency === 'VES' && bcvRate) {
      const vesValue = value * bcvRate
      return `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(vesValue)}`
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  return (
    <Layout currentPageName="Resumen Financiero">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-primary uppercase tracking-tighter italic">
              Dashboard Financiero
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Vista general del rendimiento de Full-Ventas
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-border shadow-sm flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-xs font-bold text-primary uppercase">BCV: {bcvRate ? `Bs. ${bcvRate}` : '---'}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Ingresos del Mes"
            value={formatCurrency(stats.monthRevenue, 'USD')}
            subtitle={formatCurrency(stats.monthRevenue, 'VES')}
            icon={DollarSign}
            isLoading={isLoading}
            variant="highlight"
          />
          <StatCard
            title="Ventas de Hoy"
            value={stats.todaySales}
            subtitle={`Total: ${formatCurrency(stats.todayRevenue, 'USD')}`}
            icon={ShoppingCart}
            isLoading={isLoading}
          />
          <StatCard
            title="Alerta de Stock"
            value={stats.lowStockProducts}
            subtitle="Productos por agotarse"
            icon={AlertTriangle}
            isLoading={isLoading}
            variant={stats.lowStockProducts > 0 ? 'warning' : 'default'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products Table */}
          <Card className="lg:col-span-2 bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-gray-50/50">
              <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 text-primary">
                <TrendingUp className="h-5 w-5" />
                Productos Estrella
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                </div>
              ) : topProducts.length > 0 ? (
                <div className="divide-y divide-border">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-foreground uppercase text-sm leading-none mb-1">
                            {product.productName}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {product.quantity} unidades desplazadas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-primary leading-none">
                          {formatCurrency(product.revenue, 'USD')}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-bold">
                          {formatCurrency(product.revenue, 'VES')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-muted-foreground italic">No hay datos suficientes este mes</div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats Sidebar */}
          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-primary text-white p-2 rounded-lg">
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary uppercase">Inventario Total</p>
                  <p className="text-2xl font-black text-primary">{stats.totalProducts}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-border shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-4">Actividad Mensual</p>
                <div className="flex items-end justify-between gap-2 h-20">
                  {/* Gráfico simple de barras decorativo */}
                  {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                    <div key={i} className="bg-primary/20 w-full rounded-t-sm group hover:bg-primary transition-colors cursor-help" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">{stats.monthSales} Ventas</span>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">ONLINE</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}
