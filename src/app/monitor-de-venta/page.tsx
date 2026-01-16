'use client'

import { useState, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useCollection, useFirestore, useDoc } from '@/firebase'
import { collection, doc, Timestamp, runTransaction } from 'firebase/firestore'
import { useMemoFirebase } from '@/firebase/provider'
import { type Product } from '../productos/page'
import { type Sale } from '../ventas/page'
import { SaleForm, type SaleFormValues, type CartItem } from '../ventas/components/sale-form'
import Layout from '@/app/layout-app'
import { type Setting } from '../configuraciones/page'
import { Skeleton } from '@/components/ui/skeleton'

export default function MonitorDeVentaPage() {
  const { toast } = useToast()
  const firestore = useFirestore()

  const salesCollection = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, 'sales')
  }, [firestore])

  const productsCollection = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, 'products')
  }, [firestore])

  const settingsDoc = useMemoFirebase(() => {
    if (!firestore) return null
    return doc(firestore, 'settings', 'global')
  }, [firestore])

  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesCollection)
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection)
  const { data: settings, isLoading: isLoadingSettings } = useDoc<Setting>(settingsDoc)

  const bcvRate = useMemo(() => settings?.bcvRate || null, [settings])

  const activeProducts = useMemo(() => {
    return products?.filter(p => p.status === 'active') || []
  }, [products])

  const handleFormSubmit = async (values: SaleFormValues & { items: CartItem[], totalAmount: number, saleNumber: number }) => {
    if (!firestore) return

    const saleData = {
      saleNumber: values.saleNumber,
      items: values.items.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      totalAmount: values.totalAmount,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      saleDate: Timestamp.fromDate(values.saleDate),
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const salesRef = doc(collection(firestore, 'sales'))

        for (const item of values.items) {
           const productRef = doc(firestore, 'products', item.id)
           const productDoc = await transaction.get(productRef)
           if (!productDoc.exists()) {
             throw new Error(`El producto "${item.name}" no existe.`)
           }
           const currentStock = productDoc.data().stock
           const newStock = currentStock - item.quantity
           if (newStock < 0) {
             throw new Error(`Stock insuficiente para "${item.name}".`)
           }
           transaction.update(productRef, { stock: newStock })
        }
        
        transaction.set(salesRef, saleData)
      })

      toast({
        title: 'Venta Registrada',
        description: `La venta Nº${values.saleNumber.toString().padStart(7, '0')} se ha registrado exitosamente.`,
      })
      // The form should reset itself after a successful submission. This will be handled inside SaleForm.

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar la venta',
        description: error.message || 'Ocurrió un error inesperado.',
      })
    }
  }
  
  const isLoading = isLoadingSales || isLoadingProducts || isLoadingSettings;

  return (
    <Layout currentPageName="Monitor de Venta">
      <div className="p-0 md:p-0">
       {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
       ) : (
        <SaleForm
          onSubmit={handleFormSubmit}
          products={activeProducts}
          isLoadingProducts={isLoadingProducts}
          bcvRate={bcvRate}
          saleCount={sales?.length || 0}
        />
       )}
      </div>
    </Layout>
  )
}
