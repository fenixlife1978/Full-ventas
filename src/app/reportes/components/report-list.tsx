'use client'

import type { Report } from '../page'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Download, Trash2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportListProps {
  reports: Report[]
  onView: (reportId: string) => void
  onDelete: (reportId: string) => void
  onDownload: (report: Report) => void
}

export function ReportList({
  reports,
  onView,
  onDelete,
  onDownload,
}: ReportListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reportes Generados</CardTitle>
        <CardDescription>
          Aquí puede ver y administrar sus reportes generados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length > 0 ? (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell>
                    {new Intl.DateTimeFormat('es-ES', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    }).format(report.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        report.status === 'Completado'
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-destructive/80 text-destructive-foreground'
                      )}
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(report.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>Ver</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDownload(report)}
                          disabled={report.status === 'Fallido'}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          <span>Descargar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(report.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Eliminar</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Aún no hay reportes generados.</p>
                    </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
