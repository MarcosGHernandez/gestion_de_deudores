'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface DebtorInfo {
  name: string
  phone: string
  total_debt: number
}

interface PaymentPlan {
  id: string
  debtor_id: string
  amount_due: number
  due_date: string
  status: string
  description?: string
  debtors: DebtorInfo | null
}

interface DashboardClientProps {
  debtors: { total_debt: number }[]
  allPlans: PaymentPlan[]
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function DashboardClient({ debtors, allPlans }: DashboardClientProps) {
  // --- Estados del Calendario ---
  const todayDate = new Date()
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth())
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear())
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null)

  // --- Estadísticas (Calculadas en caliente) ---
  const totalDebt = debtors.reduce((acc, curr) => acc + Number(curr.total_debt), 0)
  const activeDebtorsCount = debtors.filter((d) => Number(d.total_debt) > 0).length

  // Obtener planes pendientes
  const pendingPlans = allPlans.filter((p) => p.status === 'pending')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let overdueCount = 0
  let cautionCount = 0

  const alerts = pendingPlans.map((plan) => {
    const dueDate = new Date(plan.due_date + 'T00:00:00')
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    let badgeClass = ''
    let statusText = ''
    let severity: 'overdue' | 'caution' | 'pending' = 'pending'

    if (diffDays < 0) {
      badgeClass = 'text-red-600 bg-red-50 border-red-200'
      statusText = `Vencido (${Math.abs(diffDays)}d)`
      severity = 'overdue'
      overdueCount++
    } else if (diffDays === 0) {
      badgeClass = 'text-amber-600 bg-amber-50 border-amber-200'
      statusText = 'Vence Hoy'
      severity = 'caution'
      cautionCount++
    } else if (diffDays <= 7) {
      badgeClass = 'text-amber-600 bg-amber-50 border-amber-200'
      statusText = `Vence en ${diffDays}d`
      severity = 'caution'
      cautionCount++
    } else {
      badgeClass = 'text-slate-600 bg-slate-50 border-slate-200'
      statusText = `Pendiente (${plan.due_date})`
      severity = 'pending'
    }

    return {
      ...plan,
      statusText,
      badgeClass,
      severity,
      diffDays,
    }
  })

  // Ordenar alertas: primero vencidos más antiguos, luego vence hoy, luego esta semana
  alerts.sort((a, b) => {
    if (a.severity === 'overdue' && b.severity !== 'overdue') return -1
    if (a.severity !== 'overdue' && b.severity === 'overdue') return 1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  // --- Generación del Grid del Calendario ---
  const firstDay = new Date(currentYear, currentMonth, 1)
  const firstDayOfWeek = firstDay.getDay() // 0 = Dom, 1 = Lun, ...
  const startingOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const calendarDays = []
  // Padding del mes anterior
  for (let i = 0; i < startingOffset; i++) {
    calendarDays.push({ dayNumber: null, dateStr: null })
  }
  // Días del mes actual
  for (let i = 1; i <= daysInMonth; i++) {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0')
    const formattedDay = String(i).padStart(2, '0')
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`
    calendarDays.push({ dayNumber: i, dateStr })
  }

  // Cambiar Mes
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((prev) => prev - 1)
    } else {
      setCurrentMonth((prev) => prev - 1)
    }
    setSelectedDateStr(null)
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((prev) => prev + 1)
    } else {
      setCurrentMonth((prev) => prev + 1)
    }
    setSelectedDateStr(null)
  }

  // Filtrar planes para la fecha seleccionada
  const selectedDayPlans = selectedDateStr
    ? allPlans.filter((p) => p.due_date === selectedDateStr)
    : []

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Resumen General
        </h1>
        <p className="text-slate-500 text-sm">
          Estado actual de créditos, alertas de cobranza y calendario de pagos.
        </p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cartera Total */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total en Cartera
            </span>
            <div className="text-2xl font-black text-slate-900 mt-2">
              ${totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-xs text-slate-400 mt-3 block">
            Monto pendiente acumulado
          </span>
        </div>

        {/* Deudores Activos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Deudores Activos
            </span>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {activeDebtorsCount}
            </div>
          </div>
          <Link
            href="/clientes"
            className="text-xs text-slate-500 hover:text-slate-950 font-medium underline mt-3 block"
          >
            Ver directorio de clientes →
          </Link>
        </div>

        {/* Pagos Atrasados */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Planes Atrasados
            </span>
            <div
              className={`text-2xl font-black mt-2 ${
                overdueCount > 0 ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {overdueCount}
            </div>
          </div>
          <span className="text-xs text-slate-400 mt-3 block">
            Requieren atención inmediata
          </span>
        </div>

        {/* Vencimientos Próximos */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vencen esta Semana
            </span>
            <div
              className={`text-2xl font-black mt-2 ${
                cautionCount > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {cautionCount}
            </div>
          </div>
          <span className="text-xs text-slate-400 mt-3 block">
            Vencimientos en los próximos 7 días
          </span>
        </div>
      </div>

      {/* Grid Central: Alertas y Calendario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Alertas de Cobranza (Tabla) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm md:text-base">Alertas de Cobranza</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
                {alerts.length} pendientes
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No hay alertas de pagos pendientes actualmente. ¡Todo al día!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Fecha de Pago</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                    {alerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <div>
                            <span className="font-semibold">{alert.debtors?.name || 'Cliente Desconocido'}</span>
                            {alert.description && (
                              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                {alert.description}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {alert.debtors?.phone || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(alert.due_date + 'T00:00:00').toLocaleDateString(
                            'es-MX',
                            { dateStyle: 'medium' }
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          ${Number(alert.amount_due).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 border text-[10px] font-semibold rounded-full ${alert.badgeClass}`}
                          >
                            {alert.statusText}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/clientes?id=${alert.debtor_id}`}
                            className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-semibold px-2.5 py-1.5 rounded-md transition-colors inline-block"
                          >
                            Cobrar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Calendario Interactivo */}
        <div className="space-y-6 lg:col-span-1">
          {/* Calendario */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            {/* Encabezado del Calendario */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 text-sm md:text-base">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="Mes anterior"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="Mes siguiente"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Días de la Semana */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAY_NAMES.map((d) => (
                <span key={d} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {d}
                </span>
              ))}
            </div>

            {/* Grid de Días */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((day, idx) => {
                if (day.dayNumber === null || !day.dateStr) {
                  return <div key={`empty-${idx}`} className="h-8 md:h-10" />
                }

                // Filtrar planes de este día
                const dayPlans = allPlans.filter((p) => p.due_date === day.dateStr)
                const isSelected = selectedDateStr === day.dateStr

                // Determinar indicadores de color
                let hasOverdue = false
                let hasCaution = false
                let hasPaid = false

                dayPlans.forEach((plan) => {
                  if (plan.status === 'paid') {
                    hasPaid = true
                  } else {
                    const dueDate = new Date(plan.due_date + 'T00:00:00')
                    const diffTime = dueDate.getTime() - today.getTime()
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    if (diffDays < 0) {
                      hasOverdue = true
                    } else {
                      hasCaution = true
                    }
                  }
                })

                return (
                  <button
                    key={day.dateStr}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDateStr(null) // deseleccionar
                      } else {
                        setSelectedDateStr(day.dateStr)
                      }
                    }}
                    className={`h-8 md:h-10 rounded-lg flex flex-col items-center justify-between py-1 transition-all relative cursor-pointer hover:bg-slate-50 ${
                      isSelected
                        ? 'bg-slate-900 text-white font-bold hover:bg-slate-900'
                        : 'text-slate-800'
                    }`}
                  >
                    <span className="text-[11px] md:text-xs">{day.dayNumber}</span>
                    
                    {/* Indicadores de colores (bolitas) */}
                    <div className="flex gap-0.5 justify-center items-center h-1.5 w-full">
                      {hasOverdue && (
                        <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
                      )}
                      {hasCaution && (
                        <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                      )}
                      {hasPaid && (
                        <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detalles de la Fecha Seleccionada */}
          {selectedDateStr && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">
                  {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('es-MX', {
                    dateStyle: 'long',
                  })}
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {selectedDayPlans.length} {selectedDayPlans.length === 1 ? 'evento' : 'eventos'}
                </span>
              </div>

              {selectedDayPlans.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">
                  No hay compromisos de pago registrados para este día.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto pr-1">
                  {selectedDayPlans.map((plan) => (
                    <div key={plan.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-slate-900">
                            {plan.debtors?.name || 'Cliente Desconocido'}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {plan.description || 'Cuota de Pago'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-950">${Number(plan.amount_due).toFixed(2)}</p>
                          <span
                            className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 border ${
                              plan.status === 'paid'
                                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                : new Date(plan.due_date + 'T00:00:00').getTime() < today.getTime()
                                ? 'text-red-600 bg-red-50 border-red-100'
                                : 'text-amber-600 bg-amber-50 border-amber-100'
                            }`}
                          >
                            {plan.status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-400">{plan.debtors?.phone || ''}</span>
                        {plan.status === 'pending' && (
                          <Link
                            href={`/clientes?id=${plan.debtor_id}`}
                            className="text-[10px] text-slate-950 font-bold hover:underline"
                          >
                            Ir a abonar
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
