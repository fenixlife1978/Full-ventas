import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  FileText,
  LayoutDashboard,
  BarChart3,
  Settings,
  Bot,
  Package,
} from 'lucide-react'
import { UserProfile } from '@/components/user-profile'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2 justify-center group-data-[collapsible=icon]:justify-center">
            <Bot className="w-8 h-8 text-primary shrink-0" />
            <div className="overflow-hidden">
                <h1 className="text-xl font-semibold text-sidebar-foreground">Reportes AI</h1>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard">
                <Link href="#">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Productos">
                <Link href="/productos">
                  <Package />
                  <span>Productos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive tooltip="Reportes">
                <Link href="/reportes">
                  <FileText />
                  <span>Reportes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Analíticas">
                <Link href="#">
                  <BarChart3 />
                  <span>Analíticas</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className='mt-auto'>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Configuración">
                <Link href="#">
                  <Settings />
                  <span>Configuración</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <UserProfile />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="min-h-screen">
          <header className="p-4 border-b md:hidden">
            <SidebarTrigger />
          </header>
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
