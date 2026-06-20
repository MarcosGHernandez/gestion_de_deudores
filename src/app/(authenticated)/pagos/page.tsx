import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { localDb } from '@/utils/localDb'

interface DebtorInfo {
  name: string
  phone: string
}

interface PlanInfo {
  debtors: DebtorInfo | null
}

interface PaymentItem {
  id: string
  amount_paid: number
  paid_at: string
  payment_plans: PlanInfo | null
}

export default async function PagosPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder.supabase.co')

  let typedPayments: PaymentItem[] = []

  if (isMockMode) {
    const rawPayments = localDb.getPayments()
    typedPayments = rawPayments.map((pay) => {
      const plan = localDb.getPaymentPlanById(pay.plan_id)
      const debtor = plan ? localDb.getDebtorById(plan.debtor_id) : null
      return {
        id: pay.id,
        amount_paid: pay.amount_paid,
        paid_at: pay.paid_at,
        payment_plans: plan
          ? {
              debtors: debtor
                ? {
                    name: debtor.name,
                    phone: debtor.phone,
                  }
                : null,
            }
          : null,
      }
    })
    // Ordenar del más reciente al más antiguo
    typedPayments.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
  } else {
    const supabase = await createClient()

    // Obtener historial de todos los pagos ordenados del más reciente al más antiguo
    const { data: payments } = await supabase
      .from('payments')
      .select(`
        id,
        amount_paid,
        paid_at,
        payment_plans (
          debtors (
            name,
            phone
          )
        )
      `)
      .order('paid_at', { ascending: false })

    typedPayments = (payments as unknown as PaymentItem[]) || []
  }

  const totalCollected = typedPayments.reduce(
    (acc, curr) => acc + Number(curr.amount_paid),
    0
  )

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Historial de Caja
        </h1>
        <p className="text-slate-500 text-sm">
          Registro histórico general de todos los abonos recibidos en efectivo.
        </p>
      </div>

      {/* Resumen de Caja */}
      <div className="max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Total Recaudado
        </span>
        <div className="text-3xl font-extrabold text-emerald-600 mt-2">
          ${totalCollected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Suma acumulada de todos los abonos en efectivo registrados.
        </p>
      </div>

      {/* Tabla del Historial de Caja */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Transacciones de Abonos</h2>
        </div>

        {typedPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No se han registrado abonos todavía en el sistema.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3">Fecha y Hora</th>
                  <th className="px-6 py-3 text-right">Monto Recibido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {typedPayments.map((payment) => {
                  const debtor = payment.payment_plans?.debtors
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div>
                          {debtor?.name || 'Cliente Desconocido'}
                          <div className="text-xs text-slate-400 font-normal mt-0.5">
                            {debtor?.phone || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(payment.paid_at).toLocaleString('es-MX', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-right">
                        ${Number(payment.amount_paid).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
