'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { localDb } from '@/utils/localDb'

// Helper para comprobar si estamos en modo local sin Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder.supabase.co')

// Helper para validar sesión de forma segura
async function getAuthedClient() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return supabase
}

export async function createDebtor(prevState: any, formData: FormData) {
  try {
    const name = (formData.get('name') as string)?.trim()
    let phone = (formData.get('phone') as string)?.trim()
    const totalDebtStr = formData.get('total_debt') as string

    if (!name || name.length === 0) {
      return { error: 'El nombre es obligatorio.' }
    }

    if (!phone || phone.length < 8) {
      return { error: 'El teléfono debe tener al menos 8 dígitos.' }
    }

    // Sanitizar teléfono (solo números y +)
    phone = phone.replace(/[^\d+]/g, '')

    const totalDebt = parseFloat(totalDebtStr)
    if (isNaN(totalDebt) || totalDebt < 0) {
      return { error: 'El monto total de deuda debe ser un número positivo o cero.' }
    }

    if (isMockMode) {
      localDb.createDebtor(name, phone, totalDebt)
      revalidatePath('/clientes')
      revalidatePath('/dashboard')
      return { success: true }
    }

    const supabase = await getAuthedClient()

    const { error: insertError } = await supabase
      .from('debtors')
      .insert({
        name,
        phone,
        total_debt: totalDebt,
      })

    if (insertError) {
      console.error('Error insertando deudor:', insertError)
      return { error: 'No se pudo registrar al cliente. Intente nuevamente.' }
    }

    revalidatePath('/clientes')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return { error: 'Sesión no válida. Inicie sesión nuevamente.' }
    }
    console.error('Error del servidor:', err)
    return { error: 'Ocurrió un error interno en el servidor.' }
  }
}

export async function createPaymentPlan(prevState: any, formData: FormData) {
  try {
    const debtorId = formData.get('debtor_id') as string
    const amountDueStr = formData.get('amount_due') as string
    const dueDate = formData.get('due_date') as string

    if (!debtorId) {
      return { error: 'El ID de cliente es obligatorio.' }
    }

    const amountDue = parseFloat(amountDueStr)
    if (isNaN(amountDue) || amountDue <= 0) {
      return { error: 'El monto de la cuota debe ser mayor a cero.' }
    }

    if (!dueDate) {
      return { error: 'La fecha límite de pago es obligatoria.' }
    }

    if (isMockMode) {
      localDb.createPaymentPlan(debtorId, amountDue, dueDate)
      revalidatePath('/clientes')
      revalidatePath('/dashboard')
      return { success: true }
    }

    const supabase = await getAuthedClient()

    const { error: insertError } = await supabase
      .from('payment_plans')
      .insert({
        debtor_id: debtorId,
        amount_due: amountDue,
        due_date: dueDate,
        status: 'pending',
      })

    if (insertError) {
      console.error('Error insertando cuota:', insertError)
      return { error: 'No se pudo programar el pago. Intente nuevamente.' }
    }

    revalidatePath('/clientes')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return { error: 'Sesión no válida. Inicie sesión nuevamente.' }
    }
    console.error('Error del servidor:', err)
    return { error: 'Ocurrió un error interno en el servidor.' }
  }
}

export async function registerPayment(prevState: any, formData: FormData) {
  try {
    const planId = formData.get('plan_id') as string
    const amountPaidStr = formData.get('amount_paid') as string

    if (!planId) {
      return { error: 'El plan de pago es obligatorio.' }
    }

    const amountPaid = parseFloat(amountPaidStr)
    if (isNaN(amountPaid) || amountPaid <= 0) {
      return { error: 'El abono debe ser mayor a cero.' }
    }

    if (isMockMode) {
      // 1. Obtener la información de la cuota
      const plan = localDb.getPaymentPlanById(planId)
      if (!plan) {
        return { error: 'El plan de pago especificado no existe.' }
      }

      const debtor = localDb.getDebtorById(plan.debtor_id)
      if (!debtor) {
        return { error: 'El deudor asociado a este plan no existe.' }
      }

      // 2. Insertar el abono en la base de datos local
      localDb.createPayment(planId, amountPaid)

      // 3. Obtener el total pagado históricamente para este plan de pago
      const allPayments = localDb.getPayments([planId])
      const totalPaidOnPlan = allPayments.reduce(
        (acc, curr) => acc + Number(curr.amount_paid),
        0
      )

      // 4. Si el total abonado es mayor o igual a lo esperado, marcar como pagado (paid)
      if (totalPaidOnPlan >= Number(plan.amount_due)) {
        localDb.updatePlanStatus(planId, 'paid')
      }

      // 5. Reducir la deuda total del deudor
      const newTotalDebt = Math.max(0, Number(debtor.total_debt) - amountPaid)
      localDb.updateDebtorDebt(debtor.id, newTotalDebt)

      revalidatePath('/clientes')
      revalidatePath('/dashboard')
      revalidatePath('/pagos')
      return { success: true }
    }

    const supabase = await getAuthedClient()

    // 1. Obtener la información de la cuota
    const { data: plan, error: fetchPlanError } = await supabase
      .from('payment_plans')
      .select('*, debtors(id, total_debt)')
      .eq('id', planId)
      .single()

    if (fetchPlanError || !plan) {
      console.error('Error obteniendo plan de pago:', fetchPlanError)
      return { error: 'El plan de pago especificado no existe.' }
    }

    const debtor = plan.debtors as any
    if (!debtor) {
      return { error: 'El deudor asociado a este plan no existe.' }
    }

    // 2. Insertar el abono en la tabla 'payments'
    const { error: insertPaymentError } = await supabase
      .from('payments')
      .insert({
        plan_id: planId,
        amount_paid: amountPaid,
      })

    if (insertPaymentError) {
      console.error('Error registrando abono:', insertPaymentError)
      return { error: 'No se pudo registrar el abono. Intente nuevamente.' }
    }

    // 3. Obtener el total pagado históricamente para este plan de pago
    const { data: allPayments, error: fetchPaymentsError } = await supabase
      .from('payments')
      .select('amount_paid')
      .eq('plan_id', planId)

    if (fetchPaymentsError) {
      console.error('Error calculando abonos acumulados:', fetchPaymentsError)
      return { error: 'Error al recalcular el estado de la cuota.' }
    }

    const totalPaidOnPlan = allPayments.reduce(
      (acc, curr) => acc + Number(curr.amount_paid),
      0
    )

    // 4. Si el total abonado es mayor o igual a lo esperado, marcar como pagado (paid)
    if (totalPaidOnPlan >= Number(plan.amount_due)) {
      const { error: updatePlanError } = await supabase
        .from('payment_plans')
        .update({ status: 'paid' })
        .eq('id', planId)

      if (updatePlanError) {
        console.error('Error actualizando estado del plan:', updatePlanError)
      }
    }

    // 5. Reducir la deuda total del deudor
    const newTotalDebt = Math.max(0, Number(debtor.total_debt) - amountPaid)
    const { error: updateDebtorError } = await supabase
      .from('debtors')
      .update({ total_debt: newTotalDebt })
      .eq('id', debtor.id)

    if (updateDebtorError) {
      console.error('Error reduciendo deuda del cliente:', updateDebtorError)
    }

    revalidatePath('/clientes')
    revalidatePath('/dashboard')
    revalidatePath('/pagos')
    return { success: true }
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return { error: 'Sesión no válida. Inicie sesión nuevamente.' }
    }
    console.error('Error del servidor:', err)
    return { error: 'Ocurrió un error interno en el servidor.' }
  }
}

export async function createPurchase(prevState: any, formData: FormData) {
  try {
    const debtorId = formData.get('debtor_id') as string
    const concept = (formData.get('concept') as string)?.trim()
    const totalAmountStr = formData.get('total_amount') as string
    const frequency = formData.get('frequency') as string // 'semanal' | 'quincenal' | 'mensual'
    const installmentsCountStr = formData.get('installments_count') as string
    const firstDueDate = formData.get('first_due_date') as string

    if (!debtorId) {
      return { error: 'El ID de cliente es obligatorio.' }
    }

    if (!concept || concept.length === 0) {
      return { error: 'El concepto o descripción de la compra es obligatorio.' }
    }

    const totalAmount = parseFloat(totalAmountStr)
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return { error: 'El monto total debe ser un número mayor a cero.' }
    }

    const installmentsCount = parseInt(installmentsCountStr)
    if (isNaN(installmentsCount) || installmentsCount <= 0) {
      return { error: 'La cantidad de cuotas debe ser mayor a cero.' }
    }

    if (!firstDueDate) {
      return { error: 'La fecha de la primera cuota es obligatoria.' }
    }

    // Calcular monto exacto por cuota (redondeando a 2 decimales)
    const amountDuePerInstallment = parseFloat((totalAmount / installmentsCount).toFixed(2))

    // Generar la lista de cuotas en memoria
    const plansToCreate = []
    let currentDueDate = new Date(firstDueDate + 'T00:00:00')

    for (let i = 1; i <= installmentsCount; i++) {
      const year = currentDueDate.getFullYear()
      const month = String(currentDueDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDueDate.getDate()).padStart(2, '0')
      const dueDateStr = `${year}-${month}-${day}`

      plansToCreate.push({
        debtor_id: debtorId,
        amount_due: amountDuePerInstallment,
        due_date: dueDateStr,
        status: 'pending',
        description: `${concept} (${i}/${installmentsCount})`,
      })

      // Sumar días/meses según la frecuencia seleccionada
      if (frequency === 'semanal') {
        currentDueDate.setDate(currentDueDate.getDate() + 7)
      } else if (frequency === 'quincenal') {
        currentDueDate.setDate(currentDueDate.getDate() + 15)
      } else if (frequency === 'mensual') {
        currentDueDate.setMonth(currentDueDate.getMonth() + 1)
      }
    }

    if (isMockMode) {
      // Registrar en base de datos local
      plansToCreate.forEach((plan) => {
        localDb.createPaymentPlan(plan.debtor_id, plan.amount_due, plan.due_date, plan.description)
      })

      revalidatePath('/clientes')
      revalidatePath('/dashboard')
      return { success: true }
    }

    const supabase = await getAuthedClient()

    // 1. Insertar todos los planes de pago en lote
    const { error: insertError } = await supabase
      .from('payment_plans')
      .insert(plansToCreate)

    if (insertError) {
      console.error('Error creando cuotas en Supabase:', insertError)
      return { error: 'No se pudieron programar las cuotas en la base de datos.' }
    }

    // 2. Incrementar la deuda total del deudor
    const { data: debtor, error: fetchDebtorError } = await supabase
      .from('debtors')
      .select('total_debt')
      .eq('id', debtorId)
      .single()

    if (fetchDebtorError || !debtor) {
      console.error('Error al recuperar deudor para ajustar deuda:', fetchDebtorError)
      return { error: 'La compra se creó, pero no se pudo actualizar el balance total del deudor.' }
    }

    const newTotalDebt = Number(debtor.total_debt) + totalAmount
    const { error: updateError } = await supabase
      .from('debtors')
      .update({ total_debt: newTotalDebt })
      .eq('id', debtorId)

    if (updateError) {
      console.error('Error actualizando total de deuda del deudor:', updateError)
    }

    revalidatePath('/clientes')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return { error: 'Sesión no válida. Inicie sesión nuevamente.' }
    }
    console.error('Error del servidor al registrar compra:', err)
    return { error: 'Ocurrió un error interno en el servidor.' }
  }
}

export async function deleteDebtorAction(debtorId: string) {
  try {
    if (!debtorId) {
      return { error: 'El ID de cliente es obligatorio.' }
    }

    if (isMockMode) {
      localDb.deleteDebtor(debtorId)
      revalidatePath('/clientes')
      revalidatePath('/dashboard')
      revalidatePath('/pagos')
      return { success: true }
    }

    const supabase = await getAuthedClient()
    const { error: deleteError } = await supabase
      .from('debtors')
      .delete()
      .eq('id', debtorId)

    if (deleteError) {
      console.error('Error al eliminar deudor:', deleteError)
      return { error: 'No se pudo eliminar el cliente de la base de datos.' }
    }

    revalidatePath('/clientes')
    revalidatePath('/dashboard')
    revalidatePath('/pagos')
    return { success: true }
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return { error: 'Sesión no válida. Inicie sesión nuevamente.' }
    }
    console.error('Error del servidor al eliminar deudor:', err)
    return { error: 'Ocurrió un error interno en el servidor.' }
  }
}

export async function deletePaymentPlanAction(planId: string) {
  try {
    if (!planId) {
      return { error: 'El ID de la cuota es obligatorio.' }
    }

    if (isMockMode) {
      localDb.deletePaymentPlan(planId)
      revalidatePath('/clientes')
      revalidatePath('/dashboard')
      revalidatePath('/pagos')
      return { success: true }
    }

    const supabase = await getAuthedClient()

    // 1. Obtener la cuota y su deudor
    const { data: plan, error: fetchPlanError } = await supabase
      .from('payment_plans')
      .select('*, debtors(id, total_debt)')
      .eq('id', planId)
      .single()

    if (fetchPlanError || !plan) {
      console.error('Error obteniendo plan de pago:', fetchPlanError)
      return { error: 'El plan de pago especificado no existe.' }
    }

    const debtor = plan.debtors as any
    if (!debtor) {
      return { error: 'El deudor asociado a este plan no existe.' }
    }

    // 2. Obtener los abonos acumulados para este plan de pago
    const { data: allPayments, error: fetchPaymentsError } = await supabase
      .from('payments')
      .select('amount_paid')
      .eq('plan_id', planId)

    if (fetchPaymentsError) {
      console.error('Error calculando abonos acumulados:', fetchPaymentsError)
      return { error: 'Error al calcular el saldo de la cuota.' }
    }

    const totalPaidOnPlan = allPayments.reduce(
      (acc, curr) => acc + Number(curr.amount_paid),
      0
    )

    const pendingBalance = Math.max(0, Number(plan.amount_due) - totalPaidOnPlan)

    // 3. Restar el saldo pendiente del saldo total de deuda del deudor
    const newTotalDebt = Math.max(0, Number(debtor.total_debt) - pendingBalance)
    
    // 4. Actualizar la deuda total del deudor
    const { error: updateDebtorError } = await supabase
      .from('debtors')
      .update({ total_debt: newTotalDebt })
      .eq('id', debtor.id)

    if (updateDebtorError) {
      console.error('Error actualizando total de deuda del deudor:', updateDebtorError)
      return { error: 'No se pudo actualizar la deuda del deudor.' }
    }

    // 5. Eliminar el plan de pagos (y por cascada, sus abonos)
    const { error: deletePlanError } = await supabase
      .from('payment_plans')
      .delete()
      .eq('id', planId)

    if (deletePlanError) {
      console.error('Error eliminando plan de pago:', deletePlanError)
      return { error: 'No se pudo eliminar el plan de pago.' }
    }

    revalidatePath('/clientes')
    revalidatePath('/dashboard')
    revalidatePath('/pagos')
    return { success: true }
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return { error: 'Sesión no válida. Inicie sesión nuevamente.' }
    }
    console.error('Error del servidor al eliminar plan de pagos:', err)
    return { error: 'Ocurrió un error interno en el servidor.' }
  }
}

export async function settleAccountAction(debtorId: string) {
  try {
    if (!debtorId) {
      return { error: 'El ID de cliente es obligatorio.' }
    }

    if (isMockMode) {
      localDb.settleDebtorAccount(debtorId)
      revalidatePath('/clientes')
      revalidatePath('/dashboard')
      revalidatePath('/pagos')
      return { success: true }
    }

    const supabase = await getAuthedClient()

    // 1. Obtener todos los planes de pago pendientes para este deudor
    const { data: pendingPlans, error: plansError } = await supabase
      .from('payment_plans')
      .select('id, amount_due')
      .eq('debtor_id', debtorId)
      .eq('status', 'pending')

    if (plansError) {
      console.error('Error al obtener planes pendientes:', plansError)
      return { error: 'No se pudieron recuperar las cuotas pendientes del cliente.' }
    }

    if (pendingPlans && pendingPlans.length > 0) {
      const planIds = pendingPlans.map(p => p.id)

      // 2. Obtener todos los abonos existentes para estos planes de pago
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('plan_id, amount_paid')
        .in('plan_id', planIds)

      if (paymentsError) {
        console.error('Error al obtener abonos de los planes:', paymentsError)
        return { error: 'No se pudieron recuperar los abonos de las cuotas.' }
      }

      // Agrupar los pagos por plan_id para calcular el total pagado por plan
      const paymentsMap: Record<string, number> = {}
      payments?.forEach(p => {
        paymentsMap[p.plan_id] = (paymentsMap[p.plan_id] || 0) + Number(p.amount_paid)
      })

      // Preparar los nuevos abonos a insertar y los ids de planes a actualizar
      const paymentsToInsert: Array<{ plan_id: string, amount_paid: number }> = []

      pendingPlans.forEach(plan => {
        const totalPaid = paymentsMap[plan.id] || 0
        const remainingAmount = Math.max(0, Number(plan.amount_due) - totalPaid)
        if (remainingAmount > 0) {
          paymentsToInsert.push({
            plan_id: plan.id,
            amount_paid: remainingAmount
          })
        }
      })

      // Insertar abonos si hay alguno por liquidar
      if (paymentsToInsert.length > 0) {
        const { error: insertPaymentsError } = await supabase
          .from('payments')
          .insert(paymentsToInsert)

        if (insertPaymentsError) {
          console.error('Error insertando abonos de liquidacion:', insertPaymentsError)
          return { error: 'No se pudieron registrar los abonos para liquidar las cuotas.' }
        }
      }

      // Actualizar todos los planes pendientes a pagado ('paid')
      const { error: updatePlansError } = await supabase
        .from('payment_plans')
        .update({ status: 'paid' })
        .in('id', planIds)

      if (updatePlansError) {
        console.error('Error actualizando planes a pagado:', updatePlansError)
        return { error: 'No se pudieron marcar las cuotas como pagadas.' }
      }
    }

    // 3. Poner la deuda total del cliente en cero
    const { error: updateDebtorError } = await supabase
      .from('debtors')
      .update({ total_debt: 0.0 })
      .eq('id', debtorId)

    if (updateDebtorError) {
      console.error('Error al poner la deuda del cliente en cero:', updateDebtorError)
      return { error: 'Se liquidaron las cuotas, pero no se pudo actualizar la deuda total del cliente.' }
    }

    revalidatePath('/clientes')
    revalidatePath('/dashboard')
    revalidatePath('/pagos')
    return { success: true }
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return { error: 'Sesión no válida. Inicie sesión nuevamente.' }
    }
    console.error('Error del servidor al liquidar cuenta:', err)
    return { error: 'Ocurrió un error interno en el servidor.' }
  }
}


