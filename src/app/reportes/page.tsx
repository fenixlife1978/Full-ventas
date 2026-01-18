'use client'

import { useState, useMemo, useEffect } from 'react'
import { useCollection, useFirestore, useDoc } from '@/firebase'
import { collection, doc } from 'firebase/firestore'
import { useMemoFirebase } from '@/firebase/provider'
import { Download, BarChart3, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dynamic from 'next/dynamic'
import {
  startOfToday,
  startOfWeek,
  startOfMonth,
  startOfYear,
  format,
} from 'date-fns'
import { es } from 'date-fns/locale'
import Layout from '@/app/layout-app'
import { Skeleton } from '@/components/ui/skeleton'
import { type Sale } from '../ventas/page'
import { type Product } from '../productos/page'
import { type Setting } from '../configuraciones/page'

const ReportBody = dynamic(
  () => import('./components/report-body').then((mod) => mod.ReportBody),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[358px] w-full" />
          <Skeleton className="h-[358px] w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    ),
  }
)

export default function ReportesPage() {
  const firestore = useFirestore()
  const [period, setPeriod] = useState('month')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const salesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sales') : null),
    [firestore]
  )
  const productsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  )
  const settingsDoc = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  )

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection)
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)
  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDoc)
  const bcvRate = useMemo(() => settings?.bcvRate || null, [settings])
  
  const formattedSales = useMemo(() => {
    return sales?.map(sale => ({
      ...sale,
      saleDate: (sale.saleDate as any).toDate ? (sale.saleDate as any).toDate() : new Date(sale.saleDate)
    })).sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime()) || []
  }, [sales])


  const reportData = useMemo(() => {
    if (!sales || !isClient) {
      return {
        dailySales: [],
        topProducts: [],
        salesByPayment: [],
        summary: {
          totalSales: 0,
          totalRevenue: 0,
          averageTicket: 0,
          totalQuantity: 0,
        },
      }
    }

    let filteredSales = formattedSales
    let startDate

    const now = new Date();
    if (period === 'today') {
      startDate = startOfToday()
      filteredSales = filteredSales.filter((s) => s.saleDate >= startDate)
    } else if (period === 'week') {
      startDate = startOfWeek(now)
      filteredSales = filteredSales.filter((s) => s.saleDate >= startDate)
    } else if (period === 'month') {
      startDate = startOfMonth(now)
      filteredSales = filteredSales.filter((s) => s.saleDate >= startDate)
    } else if (period === 'year') {
      startDate = startOfYear(now)
      filteredSales = filteredSales.filter((s) => s.saleDate >= startDate)
    }

    const allItems = filteredSales.flatMap(s => s.items || [])

    // Summary
    const totalSales = filteredSales.length
    const totalRevenueCents = filteredSales.reduce((sum, s) => sum + Math.round((s.totalAmount || 0) * 100), 0)
    const totalRevenue = totalRevenueCents / 100
    const totalQuantity = allItems.reduce((sum, item) => sum + item.quantity, 0)
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

    // Daily Sales
    const salesByDate: { [key: string]: { date: string, ingresosCents: number, ventas: number } } = {}
    filteredSales.forEach((sale) => {
      const dateKey = format(sale.saleDate, 'yyyy-MM-dd')
      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = {
          date: format(sale.saleDate, 'dd/MM'),
          ingresosCents: 0,
          ventas: 0
        }
      }
      salesByDate[dateKey].ingresosCents += Math.round((sale.totalAmount || 0) * 100)
      salesByDate[dateKey].ventas += 1;
    })
    const dailySales = Object.values(salesByDate).map(d => ({ ...d, ingresos: d.ingresosCents / 100 })).sort((a,b) => a.date.localeCompare(b.date));


    // Top Products
    const productSales: { [key: string]: { productName: string, quantity: number, revenueCents: number, sales: number } } = {}
    allItems.forEach((item) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = {
          productName: item.productName,
          quantity: 0,
          revenueCents: 0,
          sales: 0, // This is harder to track now, represents how many transactions included this product
        }
      }
      productSales[item.productId].quantity += item.quantity
      const itemRevenueCents = Math.round(item.unitPrice * item.quantity * 100)
      productSales[item.productId].revenueCents += itemRevenueCents
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(p => ({
        productName: p.productName,
        quantity: p.quantity,
        sales: p.sales,
        revenue: p.revenueCents / 100,
      }))

    // Sales by Payment
    const paymentMethods: { [key: string]: { method: string, totalCents: number, cantidad: number } } = {}
     const getPaymentMethodLabel = (method: string) => {
        const labels = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' };
        // @ts-ignore
        return labels[method] || method;
    };
    filteredSales.forEach((sale) => {
      const method = sale.paymentMethod || 'other'
      if (!paymentMethods[method]) {
        paymentMethods[method] = {
          method: getPaymentMethodLabel(method),
          totalCents: 0,
          cantidad: 0
        }
      }
      paymentMethods[method].totalCents += Math.round((sale.totalAmount || 0) * 100)
      paymentMethods[method].cantidad += 1
    })
    const salesByPayment = Object.values(paymentMethods).map(p => ({ ...p, total: p.totalCents / 100 }));

    return {
      dailySales,
      topProducts,
      salesByPayment,
      summary: {
        totalSales,
        totalRevenue,
        averageTicket,
        totalQuantity,
      },
    }
  }, [formattedSales, period, isClient])

  const getPeriodLabel = () => {
    const labels = {
      today: 'Hoy',
      week: 'Esta Semana',
      month: 'Este Mes',
      year: 'Este Año',
      all: 'Todo el Tiempo',
    }
    // @ts-ignore
    return labels[period] || period
  }
  
  const formatCurrency = (value: number, currency: 'USD' | 'VES' = 'USD') => {
    if (currency === 'VES' ) {
       if (!bcvRate) return 'Bs. --,--'
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

  const exportToPDF = () => {
    const doc = new jsPDF()
    const periodLabel = getPeriodLabel()

    // Title
    doc.setFontSize(20)
    doc.text(`Reporte de Ventas: ${periodLabel}`, 14, 22)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 28)

    // Summary Section
    const summaryData = [
      ['Total Transacciones', reportData.summary.totalSales.toString()],
      ['Ingresos Totales', formatCurrency(reportData.summary.totalRevenue, 'VES')],
      ['Ticket Promedio', formatCurrency(reportData.summary.averageTicket, 'VES')],
      ['Productos Vendidos', reportData.summary.totalQuantity.toString()],
    ]

    autoTable(doc, {
      startY: 35,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [26, 48, 37] },
    })
    
    let lastTableY = (doc as any).lastAutoTable.finalY;

    // Top Products Table
    if (reportData.topProducts.length > 0) {
      autoTable(doc, {
        startY: lastTableY + 10,
        head: [['#', 'Producto', 'Cantidad', 'Ingresos (VES)']],
        body: reportData.topProducts.map((p, i) => [
          i + 1,
          p.productName,
          p.quantity,
          formatCurrency(p.revenue, 'VES'),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [26, 48, 37] },
      })
      lastTableY = (doc as any).lastAutoTable.finalY;
    }
    
    // Payment Methods Table
     if (reportData.salesByPayment.length > 0) {
        autoTable(doc, {
            startY: lastTableY + 10,
            head: [['Método de Pago', 'Cantidad', 'Total (VES)']],
            body: reportData.salesByPayment.map(p => [
                p.method,
                p.cantidad,
                formatCurrency(p.total, 'VES')
            ]),
            theme: 'striped',
            headStyles: { fillColor: [26, 48, 37] },
        })
    }


    doc.save(`reporte-ventas-${period}-${format(new Date(), 'yyyyMMdd')}.pdf`)
  }

  const isLoading = isLoadingSales || isLoadingProducts || isLoadingSettings;

  if (isLoading) {
    return (
      <Layout currentPageName="Reportes">
        <div className="space-y-6 p-4 md:p-8">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-10 w-36" />
            </div>
          </div>
          {/* Summary cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          {/* Body Skeleton */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-[358px] w-full" />
              <Skeleton className="h-[358px] w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPageName="Reportes">
      <div className="space-y-6 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Reportes</h1>
            <p className="text-muted-foreground mt-2">Análisis de ventas y productos</p>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px] border-border/50 focus:ring-ring">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mes</SelectItem>
                <SelectItem value="year">Este Año</SelectItem>
                <SelectItem value="all">Todo</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={exportToPDF}
              className="bg-gray-100 border-2 border-gray-300 text-gray-900 px-6 py-3 rounded-xl font-bold uppercase tracking-tighter hover:bg-gray-200 transition-all duration-200"
            >
              <Download className="mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transacciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {reportData.summary.totalSales}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(reportData.summary.totalRevenue, 'VES')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(reportData.summary.totalRevenue, 'USD')}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(reportData.summary.averageTicket, 'VES')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(reportData.summary.averageTicket, 'USD')}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Productos Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {reportData.summary.totalQuantity.toLocaleString('es-VE')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{getPeriodLabel()}</p>
            </CardContent>
          </Card>
        </div>

        {isClient && (
          <ReportBody
            reportData={reportData}
            formatCurrency={formatCurrency}
            bcvRate={bcvRate}
          />
        )}
      </div>
    </Layout>
  )
}
