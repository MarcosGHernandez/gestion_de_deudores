import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { localDb } from '@/utils/localDb'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder.supabase.co')

  let debtors: any[] = []
  let plans: any[] = []

  if (isMockMode) {
    debtors = localDb.getDebtors()
    const rawPlans = localDb.getPaymentPlans()
    plans = rawPlans.map((p) => {
      const debtor = localDb.getDebtorById(p.debtor_id)
      return {
        ...p,
        debtors: debtor ? { name: debtor.name, phone: debtor.phone, total_debt: debtor.total_debt } : null,
      }
    })
  } else {
    const supabase = await createClient()

    // 1. Obtener deudores para estadísticas
    const { data: debtorsData } = await supabase
      .from('debtors')
      .select('total_debt')
    debtors = debtorsData || []

    // 2. Obtener todos los planes de pago para estadísticas y calendario
    const { data: plansData } = await supabase
      .from('payment_plans')
      .select('*, debtors(name, phone, total_debt)')
      .order('due_date', { ascending: true })
    plans = plansData || []
  }

  return <DashboardClient debtors={debtors} allPlans={plans} />
}
