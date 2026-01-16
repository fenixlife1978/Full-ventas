'use client'

import { useState, useEffect, useMemo, ReactNode } from 'react'
import {
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  BarChart,
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
  cardClassName,
}: {
  title: string
  value: ReactNode
  subtitle?: ReactNode
  icon: React.ElementType
  isLoading: boolean
  cardClassName?: string
}) => (
  <Card className={cn(cardClassName)}>
    <CardContent className="flex items-center justify-between p-6">
      {isLoading ? (
        <div className="flex w-full items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-[120px]" />
            <Skeleton className="h-8 w-[90px]" />
          </div>
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase opacity-80">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
             {subtitle && (
              <p className="text-xs opacity-80">{subtitle}</p>
            )}
          </div>
          <Icon className="h-10 w-10 opacity-90" />
        </>
      )}
    </CardContent>
  </Card>
)

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

  const { data: products, isLoading: isLoadingProducts } =
    useCollection<Product>(productsCollection)
  const { data: sales, isLoading: isLoadingSales } =
    useCollection<Sale>(salesCollection)
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

    // Product stats
    const totalProducts = products.length
    const lowStockProducts = products.filter(
      (p) => p.stock <= (p.minStock || 0)
    ).length

    // Sales stats
    const today = new Date()
    const monthStartDate = startOfMonth(today)

    const todaySalesData = sales.filter((s) => {
        const saleDate = (s.saleDate as any).toDate ? (s.saleDate as any).toDate() : new Date(s.saleDate)
        return isToday(saleDate)
    })
    const todaySalesCount = todaySalesData.length
    const todayRevenueCents = todaySalesData.reduce((sum, s) => sum + Math.round((s.totalAmount || 0) * 100), 0)

    const monthSalesData = sales.filter((s) => {
        const saleDate = (s.saleDate as any).toDate ? (s.saleDate as any).toDate() : new Date(s.saleDate)
        return saleDate >= monthStartDate
    })
    const monthSalesCount = monthSalesData.length
    const monthRevenueCents = monthSalesData.reduce((sum, s) => sum + Math.round((s.totalAmount || 0) * 100), 0)

    // Top products this month
    const productSales: { [key: string]: { productName: string, quantity: number, revenueCents: number } } = {}
    const monthItems = monthSalesData.flatMap(s => s.items || [])
    monthItems.forEach((item) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = {
          productName: item.productName,
          quantity: 0,
          revenueCents: 0,
        }
      }
      productSales[item.productId].quantity += item.quantity
      const itemRevenueCents = Math.round(item.unitPrice * item.quantity * 100);
      productSales[item.productId].revenueCents += itemRevenueCents;
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
      todaySales: todaySalesCount,
      monthSales: monthSalesCount,
      todayRevenue: todayRevenueCents / 100,
      monthRevenue: monthRevenueCents / 100,
    })
    setTopProducts(topProductsArray)
  }, [products, sales])

  const isLoading = isLoadingProducts || isLoadingSales || isLoadingSettings
  
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

  return (
    <Layout currentPageName="Dashboard">
      <div className="space-y-8 p-4 md:p-8">
        <div>
          <h1 className="text-4xl font-bold text-primary">
            Dashboard Financiero
          </h1>
          <p className="text-muted-foreground mt-2">
            Un resumen de tu actividad financiera
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Productos"
            value={stats.totalProducts}
            icon={Package}
            isLoading={isLoading}
            cardClassName="bg-primary text-primary-foreground"
          />
           <StatCard
            title="Ingresos del Mes"
            value={formatCurrency(stats.monthRevenue, 'VES')}
            subtitle={bcvRate ? formatCurrency(stats.monthRevenue, 'USD') : undefined}
            icon={DollarSign}
            isLoading={isLoading}
            cardClassName="bg-primary text-primary-foreground"
          />
           <StatCard
            title="Stock Bajo"
            value={stats.lowStockProducts}
            icon={AlertTriangle}
            isLoading={isLoading}
            cardClassName="bg-secondary text-secondary-foreground"
          />
          <StatCard
            title="Ventas del Mes"
            value={stats.monthSales}
            icon={BarChart}
            isLoading={isLoading}
            cardClassName="bg-primary text-primary-foreground"
          />
           <StatCard
            title="Ventas Hoy"
            value={stats.todaySales}
            subtitle={formatCurrency(stats.todayRevenue, 'VES')}
            icon={ShoppingCart}
            isLoading={isLoading}
            cardClassName="bg-primary text-primary-foreground"
          />
        </div>

        {/* Top Products */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Productos Más Vendidos (Este Mes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({length: 3}).map((_, i) => (
                        <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-3/5" />
                                <Skeleton className="h-4 w-2/5" />
                            </div>
                            <Skeleton className="h-6 w-1/4" />
                        </div>
                    ))}
                </div>
            ) : topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b border-border/20 pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {product.productName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} unidades vendidas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(product.revenue, 'VES')}
                      </p>
                      {bcvRate && <p className="text-sm text-muted-foreground">{formatCurrency(product.revenue, 'USD')}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No hay ventas registradas este mes
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
