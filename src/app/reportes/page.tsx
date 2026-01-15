'use client'

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { ReportGenerator } from './components/report-generator'
import { ReportList } from './components/report-list'
import { ReportViewDialog } from './components/report-view-dialog'
import {
  generateDynamicReport,
  type DynamicReportInput,
} from '@/ai/flows/dynamic-report-generation'

export interface Report {
  id: string
  title: string
  createdAt: Date
  status: 'Completado' | 'Fallido'
  content: string
}

export default function ReportesPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [viewingReport, setViewingReport] = useState<Report | null>(null)
  const { toast } = useToast()

  const handleGenerateReport = async (
    data: Omit<DynamicReportInput, 'reportTitle'> & { reportTitle: string }
  ) => {
    setIsGenerating(true)
    try {
      const result = await generateDynamicReport(data)
      if (!result || !result.reportContent) {
        throw new Error('Empty response from AI')
      }
      const newReport: Report = {
        id: new Date().toISOString(),
        title: data.reportTitle,
        createdAt: new Date(),
        status: 'Completado',
        content: result.reportContent,
      }
      setReports((prev) => [newReport, ...prev])
      toast({
        title: 'Reporte Generado',
        description: `El reporte "${data.reportTitle}" se ha creado exitosamente.`,
      })
    } catch (error) {
      console.error('Failed to generate report:', error)
      setReports((prev) => [
        ...prev,
        {
          id: new Date().toISOString(),
          title: data.reportTitle,
          createdAt: new Date(),
          status: 'Fallido',
          content: 'No se pudo generar el contenido del reporte.',
        },
      ])
      toast({
        title: 'Error',
        description: 'No se pudo generar el reporte.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteReport = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId))
    toast({
      title: 'Reporte Eliminado',
      description: 'El reporte ha sido eliminado.',
    })
  }

  const handleViewReport = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId)
    if (report) {
      setViewingReport(report)
    }
  }

  const handleDownloadReport = (report: Report) => {
    toast({
      title: 'Función no implementada',
      description: `La descarga del reporte "${report.title}" no está disponible.`,
    })
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Reportes
          </h1>
          <p className="text-muted-foreground">
            Genere, vea y administre sus reportes dinámicos.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2">
          <ReportGenerator
            onGenerate={handleGenerateReport}
            isGenerating={isGenerating}
          />
        </div>
        <div className="lg:col-span-3">
          <ReportList
            reports={reports}
            onView={handleViewReport}
            onDelete={handleDeleteReport}
            onDownload={handleDownloadReport}
          />
        </div>
      </div>

      <ReportViewDialog
        report={viewingReport}
        open={!!viewingReport}
        onOpenChange={(isOpen) => !isOpen && setViewingReport(null)}
      />
    </div>
  )
}
