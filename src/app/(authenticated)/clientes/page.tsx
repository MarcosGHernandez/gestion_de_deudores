import React from 'react'
import { createClient } from '@/utils/supabase/server'
import ClientesClient from './ClientesClient'
import { localDb } from '@/utils/localDb'

interface PageProps {
  searchParams: Promise<{ id?: string; search?: string }>
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const selectedId = params.id
  const search = params.search

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder.supabase.co')

  let safeDebtors: any[] = []
  let selectedDebtor: any = null
  let plans: any[] = []
  let payments: any[] = []

  if (isMockMode) {
    // 1. Obtener lista de deudores local
    safeDebtors = localDb.getDebtors(search)

    // 2. Obtener detalles del deudor seleccionado local
    if (selectedId) {
      const debtor = localDb.getDebtorById(selectedId)
      if (debtor) {
        selectedDebtor = debtor

        // Obtener planes de pago local y ordenar por fecha de vencimiento
        plans = localDb.getPaymentPlans(selectedId)
        plans.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

        // Obtener historial de abonos local
        if (plans.length > 0) {
          const planIds = plans.map((p) => p.id)
          const rawPayments = localDb.getPayments(planIds)
          
          payments = rawPayments.map((pay) => {
            const plan = plans.find((p) => p.id === pay.plan_id)
            return {
              ...pay,
              payment_plans: plan ? { due_date: plan.due_date } : null,
            }
          })
          
          // Ordenar pagos del más reciente al más antiguo
          payments.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
        }
      }
    }
  } else {
    const supabase = await createClient()

    // 1. Obtener lista de deudores (filtrada si hay búsqueda)
    let debtorsQuery = supabase.from('debtors').select('*').order('name')
    if (search) {
      debtorsQuery = debtorsQuery.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }
    const { data: debtors } = await debtorsQuery
    safeDebtors = debtors || []

    // 2. Obtener detalles del deudor seleccionado si hay ID
    if (selectedId) {
      const { data: debtor } = await supabase
        .from('debtors')
        .select('*')
        .eq('id', selectedId)
        .single()

      if (debtor) {
        selectedDebtor = debtor

        // Obtener planes de pago
        const { data: planData } = await supabase
          .from('payment_plans')
          .select('*')
          .eq('debtor_id', selectedId)
          .order('due_date', { ascending: true })

        plans = planData || []

        // Obtener historial de abonos relacionados
        if (plans.length > 0) {
          const planIds = plans.map((p) => p.id)
          const { data: paymentData } = await supabase
            .from('payments')
            .select('*, payment_plans(due_date)')
            .in('plan_id', planIds)
            .order('paid_at', { ascending: false })

          payments = paymentData || []
        }
      }
    }
  }

  return (
    <ClientesClient
      debtors={safeDebtors}
      selectedDebtor={selectedDebtor}
      plans={plans}
      payments={payments}
    />
  )
}

