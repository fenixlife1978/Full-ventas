'use client'

import React from 'react'
import Link from 'next/link'
import { 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Settings, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users,
  Wallet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  // Datos simulados para el Dashboard
  const stats = [
    {
      title: "Ventas del Mes",
      value: "Bs. 45.280,00",
      change: "+12.5%",
      trending: "up",
      icon: Wallet,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Productos",
      value: "124",
      change: "4 bajo stock",
      trending: "down",
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Clientes",
      value: "1,240",
      change: "+18 nuevos",
      trending: "up",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50"
    }
  ]

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      {/* Header del Dashboard */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
          <p className="text-slate-500 font-medium">Bienvenido al sistema de control de inventario y ventas.</p>
        </div>
        
        <Link href="/ventas">
          <Button className="bg-[#107C41] hover:bg-[#0D6334] text-white font-black px-8 h-14 rounded-2xl shadow-lg shadow-[#107C41]/20 transition-all active:scale-95">
            <Plus className="mr-2 h-5 w-5" /> NUEVA VENTA
          </Button>
        </Link>
      </div>

      {/* Grid de Estadísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index} className="border-none shadow-sm rounded-[2rem] overflow-hidden">
            <CardContent className="p-8">
              <div className="flex justify-between items-start">
                <div className={cn("p-4 rounded-2xl", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
                <div className={cn(
                  "flex items-center text-xs font-black px-2 py-1 rounded-lg",
                  stat.trending === 'up' ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
                )}>
                  {stat.trending === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {stat.change}
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accesos Directos Modernos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <QuickAccessCard 
          title="Ventas" 
          description="Registrar y monitorear transacciones" 
          href="/ventas" 
          icon={ShoppingBag} 
          color="bg-emerald-500"
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
          href="/configuracion" 
          icon={Settings} 
          color="bg-slate-700"
        />
      </div>
    </div>
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

// Función auxiliar para clases condicionales
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}