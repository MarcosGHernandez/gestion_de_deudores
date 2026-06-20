'use client'

import React, { useState, useActionState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  createDebtor,
  createPaymentPlan,
  registerPayment,
  createPurchase,
  deleteDebtorAction,
  deletePaymentPlanAction,
  settleAccountAction,
} from '@/app/actions/debtors'

interface Debtor {
  id: string
  name: string
  phone: string
  total_debt: number
  created_at: string
}

interface PaymentPlan {
  id: string
  debtor_id: string
  amount_due: number
  due_date: string
  status: string
  description?: string
}

interface Payment {
  id: string
  plan_id: string
  amount_paid: number
  paid_at: string
  payment_plans?: {
    due_date: string
  }
}

interface ClientesClientProps {
  debtors: Debtor[]
  selectedDebtor: Debtor | null
  plans: PaymentPlan[]
  payments: Payment[]
}

export default function ClientesClient({
  debtors,
  selectedDebtor,
  plans,
  payments,
}: ClientesClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  
  // Modales
  const [showDebtorModal, setShowDebtorModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedPlanDueAmount, setSelectedPlanDueAmount] = useState<number>(0)

  // Estados para acciones de eliminación y liquidación
  const [isActionPending, setIsActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // useActionState para formularios
  const [debtorState, debtorAction, debtorPending] = useActionState(createDebtor, null)
  const [planState, planAction, planPending] = useActionState(createPaymentPlan, null)
  const [purchaseState, purchaseAction, purchasePending] = useActionState(createPurchase, null)
  const [paymentState, paymentAction, paymentPending] = useActionState(registerPayment, null)

  const handleDeleteDebtor = async () => {
    if (!selectedDebtor) return
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar al cliente "${selectedDebtor.name}"? Se borrarán de forma permanente todos sus planes de pago e historial de abonos.`
      )
    ) {
      return
    }

    setIsActionPending(true)
    setActionError(null)
    try {
      const res = await deleteDebtorAction(selectedDebtor.id)
      if (res.error) {
        setActionError(res.error)
      } else {
        router.push('/clientes')
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      setActionError('Ocurrió un error inesperado al eliminar el cliente.')
    } finally {
      setIsActionPending(false)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (
      !window.confirm(
        '¿Estás seguro de que deseas eliminar esta cuota? Se borrarán sus abonos asociados y se ajustará el saldo total del cliente.'
      )
    ) {
      return
    }

    setIsActionPending(true)
    setActionError(null)
    try {
      const res = await deletePaymentPlanAction(planId)
      if (res.error) {
        setActionError(res.error)
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      setActionError('Ocurrió un error inesperado al eliminar la cuota.')
    } finally {
      setIsActionPending(false)
    }
  }

  const handleSettleAccount = async () => {
    if (!selectedDebtor) return
    if (
      !window.confirm(
        `¿Estás seguro de que deseas liquidar la cuenta de "${selectedDebtor.name}"? Esto marcará todas las cuotas como pagadas y registrará los abonos correspondientes para la caja.`
      )
    ) {
      return
    }

    setIsActionPending(true)
    setActionError(null)
    try {
      const res = await settleAccountAction(selectedDebtor.id)
      if (res.error) {
        setActionError(res.error)
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      setActionError('Ocurrió un error inesperado al liquidar la cuenta.')
    } finally {
      setIsActionPending(false)
    }
  }

  // Cerrar modales tras éxito
  useEffect(() => {
    if (debtorState?.success) {
      setShowDebtorModal(false)
      router.refresh()
    }
  }, [debtorState, router])

  useEffect(() => {
    if (planState?.success) {
      setShowPlanModal(false)
      router.refresh()
    }
  }, [planState, router])

  useEffect(() => {
    if (paymentState?.success) {
      setShowPaymentModal(false)
      setSelectedPlanId(null)
      router.refresh()
    }
  }, [paymentState, router])

  useEffect(() => {
    if (purchaseState?.success) {
      setShowPurchaseModal(false)
      router.refresh()
    }
  }, [purchaseState, router])

  // Manejar búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    router.push(`/clientes?${params.toString()}`)
  }

  // Seleccionar cliente
  const selectDebtor = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('id', id)
    router.push(`/clientes?${params.toString()}`)
  }

  // Alertas visuales dinámicas
  const getPlanAlertStyle = (plan: PaymentPlan) => {
    if (plan.status === 'paid') {
      return {
        badgeClass: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        text: 'Pagado',
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(plan.due_date + 'T00:00:00')
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        badgeClass: 'text-red-600 bg-red-50 border-red-200',
        text: `Vencido (${Math.abs(diffDays)}d)`,
      }
    } else if (diffDays === 0) {
      return {
        badgeClass: 'text-amber-600 bg-amber-50 border-amber-200',
        text: 'Vence Hoy',
      }
    } else if (diffDays <= 7) {
      return {
        badgeClass: 'text-amber-600 bg-amber-50 border-amber-200',
        text: `Vence en ${diffDays}d`,
      }
    } else {
      return {
        badgeClass: 'text-slate-600 bg-slate-50 border-slate-200',
        text: `Pendiente (${plan.due_date})`,
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Directorio de Clientes</h1>
          <p className="text-slate-500 text-sm">Gestiona la cartera de deudores y sus planes de cuotas.</p>
        </div>
        <button
          onClick={() => setShowDebtorModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer self-start sm:self-auto"
        >
          Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna Izquierda: Buscador e historial de deudores */}
        <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden lg:col-span-1 ${selectedDebtor ? 'hidden lg:block' : 'block'}`}>
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Buscar por nombre o celular..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
              />
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {debtors.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No se encontraron clientes.
              </div>
            ) : (
              debtors.map((debtor) => {
                const isSelected = selectedDebtor?.id === debtor.id
                return (
                  <button
                    key={debtor.id}
                    onClick={() => selectDebtor(debtor.id)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 ${
                      isSelected ? 'bg-slate-50 border-l-4 border-slate-900 pl-3' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{debtor.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{debtor.phone}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-slate-900">${Number(debtor.total_debt).toFixed(2)}</p>
                      <p className="text-xs text-slate-400">Deuda</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Detalles del deudor seleccionado */}
        <div className={`lg:col-span-2 ${selectedDebtor ? 'block' : 'hidden lg:block'}`}>
          {selectedDebtor ? (
            <div className="space-y-6">
              {/* Botón Volver (Solo visible en Móvil) */}
              <button
                onClick={() => router.push('/clientes')}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-4 font-semibold lg:hidden cursor-pointer bg-white px-3 py-2 border border-slate-200 rounded-lg shadow-sm w-fit"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al Directorio
              </button>

              {/* Error feedback for settlement or deletion */}
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium flex justify-between items-center mb-4">
                  <span>{actionError}</span>
                  <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-800 font-bold ml-2">X</button>
                </div>
              )}

              {/* Resumen del Cliente */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedDebtor.name}</h2>
                    <button
                      onClick={handleDeleteDebtor}
                      disabled={isActionPending}
                      title="Eliminar Cliente"
                      className="text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-slate-500 text-sm mt-1">
                    Teléfono celular: <span className="font-medium text-slate-700">{selectedDebtor.phone}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Registrado el {new Date(selectedDebtor.created_at).toLocaleDateString('es-MX', { dateStyle: 'medium' })}
                  </p>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-100 text-left sm:text-right shrink-0 flex flex-col justify-between items-start sm:items-end gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Pendiente</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      ${Number(selectedDebtor.total_debt).toFixed(2)}
                    </div>
                  </div>
                  {Number(selectedDebtor.total_debt) > 0 && (
                    <button
                      onClick={handleSettleAccount}
                      disabled={isActionPending}
                      className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer w-full sm:w-auto text-center disabled:opacity-50"
                    >
                      {isActionPending ? 'Procesando...' : 'Liquidar Cuenta'}
                    </button>
                  )}
                </div>
              </div>

              {/* Botones para agregar compra y programar cuota */}
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-900 text-lg">Plan de Pagos / Cuotas</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPurchaseModal(true)}
                    className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Agregar Compra (Deuda)
                  </button>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="text-xs border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Programar Cuota
                  </button>
                </div>
              </div>

              {/* Lista de Planes de Pago */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {plans.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No hay cuotas programadas para este cliente. Utilice &quot;Programar Cuota&quot; para crear un plan.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                          <th className="px-6 py-3">Cuota</th>
                          <th className="px-6 py-3">Fecha Límite</th>
                          <th className="px-6 py-3">Estado</th>
                          <th className="px-6 py-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {plans.map((plan, index) => {
                          const style = getPlanAlertStyle(plan)
                          return (
                            <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900">
                                <div>
                                  {plan.description || `Cuota #${index + 1}`}
                                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                                    ${Number(plan.amount_due).toFixed(2)}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-600">
                                {new Date(plan.due_date + 'T00:00:00').toLocaleDateString('es-MX', { dateStyle: 'medium' })}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 border text-xs font-medium rounded-full ${style.badgeClass}`}>
                                  {style.text}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {plan.status === 'pending' && (
                                    <button
                                      onClick={() => {
                                        setSelectedPlanId(plan.id)
                                        setSelectedPlanDueAmount(Number(plan.amount_due))
                                        setShowPaymentModal(true)
                                      }}
                                      disabled={isActionPending}
                                      className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-2.5 py-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      Abonar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeletePlan(plan.id)}
                                    disabled={isActionPending}
                                    title="Eliminar Cuota"
                                    className="text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 p-1.5 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Historial de Abonos */}
              <h3 className="font-semibold text-slate-900 text-lg mt-8">Historial de Abonos</h3>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {payments.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No se han registrado abonos para este cliente todavía.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                          <th className="px-6 py-3">Monto Abonado</th>
                          <th className="px-6 py-3">Fecha de Abono</th>
                          <th className="px-6 py-3">Asociado a Cuota Vence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">
                              ${Number(payment.amount_paid).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {new Date(payment.paid_at).toLocaleString('es-MX', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                              {payment.payment_plans?.due_date
                                ? new Date(payment.payment_plans.due_date + 'T00:00:00').toLocaleDateString('es-MX', { dateStyle: 'medium' })
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm shadow-sm h-full flex flex-col justify-center items-center gap-2">
              <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              Selecciona un cliente de la lista para ver su estado de cuenta, cuotas e historial de abonos.
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL: REGISTRAR CLIENTE                   */}
      {/* ========================================== */}
      {showDebtorModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Registrar Nuevo Cliente</h3>
              <button
                onClick={() => setShowDebtorModal(false)}
                className="text-slate-400 hover:text-slate-900 rounded-lg p-1"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form action={debtorAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="name">
                  Nombre Completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Ej. María López"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="phone">
                  Teléfono Celular
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  required
                  placeholder="Ej. 3312345678"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="total_debt">
                  Monto de Deuda Inicial ($)
                </label>
                <input
                  id="total_debt"
                  name="total_debt"
                  type="number"
                  step="0.01"
                  required
                  defaultValue="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>

              {debtorState?.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
                  {debtorState.error}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDebtorModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={debtorPending}
                  className={`bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors ${
                    debtorPending ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {debtorPending ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: PROGRAMAR CUOTA                     */}
      {/* ========================================== */}
      {showPlanModal && selectedDebtor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Programar Nueva Cuota</h3>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-400 hover:text-slate-900 rounded-lg p-1"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Programando fecha límite y monto para: <span className="font-semibold text-slate-700">{selectedDebtor.name}</span>
            </p>

            <form action={planAction} className="space-y-4">
              <input type="hidden" name="debtor_id" value={selectedDebtor.id} />

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="amount_due">
                  Monto Esperado ($)
                </label>
                <input
                  id="amount_due"
                  name="amount_due"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="due_date">
                  Fecha Límite de Pago
                </label>
                <input
                  id="due_date"
                  name="due_date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              {planState?.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
                  {planState.error}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={planPending}
                  className={`bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors ${
                    planPending ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {planPending ? 'Programando...' : 'Programar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: REGISTRAR ABONO                     */}
      {/* ========================================== */}
      {showPaymentModal && selectedPlanId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Registrar Abono en Efectivo</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedPlanId(null)
                }}
                className="text-slate-400 hover:text-slate-900 rounded-lg p-1"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Registrar abono de dinero en efectivo. Monto sugerido de la cuota: <span className="font-semibold text-slate-700">${selectedPlanDueAmount.toFixed(2)}</span>
            </p>

            <form action={paymentAction} className="space-y-4">
              <input type="hidden" name="plan_id" value={selectedPlanId} />

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="amount_paid">
                  Monto Recibido ($)
                </label>
                <input
                  id="amount_paid"
                  name="amount_paid"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={selectedPlanDueAmount}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>

              {paymentState?.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
                  {paymentState.error}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false)
                    setSelectedPlanId(null)
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={paymentPending}
                  className={`bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors ${
                    paymentPending ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {paymentPending ? 'Registrando...' : 'Registrar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: AGREGAR COMPRA (NUEVA DEUDA)        */}
      {/* ========================================== */}
      {showPurchaseModal && selectedDebtor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Agregar Nueva Deuda / Compra</h3>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-slate-400 hover:text-slate-900 rounded-lg p-1"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Registrar prenda o artículo y autogenerar plan de cuotas para: <span className="font-semibold text-slate-700">{selectedDebtor.name}</span>
            </p>

            <form action={purchaseAction} className="space-y-4">
              <input type="hidden" name="debtor_id" value={selectedDebtor.id} />

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="concept">
                  Concepto / Prenda
                </label>
                <input
                  id="concept"
                  name="concept"
                  type="text"
                  required
                  placeholder="Ej. Pantalón de mezclilla, Chamarra"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="total_amount">
                  Monto Total ($)
                </label>
                <input
                  id="total_amount"
                  name="total_amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ej. 500.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="frequency">
                    Frecuencia de Pagos
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    required
                    defaultValue="quincenal"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="installments_count">
                    Cantidad de Cuotas
                  </label>
                  <input
                    id="installments_count"
                    name="installments_count"
                    type="number"
                    required
                    min="1"
                    defaultValue="4"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="first_due_date">
                  Fecha del Primer Pago
                </label>
                <input
                  id="first_due_date"
                  name="first_due_date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              {purchaseState?.error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
                  {purchaseState.error}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={purchasePending}
                  className={`bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors ${
                    purchasePending ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {purchasePending ? 'Guardando...' : 'Agregar Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
