'use client'

import type { Report } from '../page'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ReportViewDialogProps {
  report: Report | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportViewDialog({
  report,
  open,
  onOpenChange,
}: ReportViewDialogProps) {
  if (!report) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{report.title}</DialogTitle>
          <DialogDescription>
            Generado el{' '}
            {new Intl.DateTimeFormat('es-ES', {
              dateStyle: 'full',
              timeStyle: 'long',
            }).format(report.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md border bg-muted/50 p-4 font-mono text-foreground">
            {report.content}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
