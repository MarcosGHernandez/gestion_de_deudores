import fs from 'fs'
import path from 'path'

// Definición de Interfaces
export interface Debtor {
  id: string
  name: string
  phone: string
  total_debt: number
  created_at: string
}

export interface PaymentPlan {
  id: string
  debtor_id: string
  amount_due: number
  due_date: string // YYYY-MM-DD
  status: 'pending' | 'paid'
  description?: string
  created_at: string
}

export interface Payment {
  id: string
  plan_id: string
  amount_paid: number
  paid_at: string
}

interface DatabaseSchema {
  debtors: Debtor[]
  payment_plans: PaymentPlan[]
  payments: Payment[]
}

const DB_FILE_PATH = path.join(process.cwd(), 'db_local.json')

// Inicializar base de datos con datos de prueba realistas si no existe
function getInitialData(): DatabaseSchema {
  const nowStr = new Date().toISOString()
  
  // Para las fechas del plan de pagos, tomamos como referencia hoy (17 de Junio de 2026)
  const idDebtor1 = 'd1111111-1111-1111-1111-111111111111'
  const idDebtor2 = 'd2222222-2222-2222-2222-222222222222'
  const idDebtor3 = 'd3333333-3333-3333-3333-333333333333'

  const idPlan1 = 'p1111111-1111-1111-1111-111111111111' // Vencido
  const idPlan2 = 'p2222222-2222-2222-2222-222222222222' // Pendiente a futuro
  const idPlan3 = 'p3333333-3333-3333-3333-333333333333' // Pagado
  const idPlan4 = 'p4444444-4444-4444-4444-444444444444' // Vence Hoy (17 de junio)
  const idPlan5 = 'p5555555-5555-5555-5555-555555555555' // Vence en 3 días (20 de junio)

  return {
    debtors: [
      {
        id: idDebtor1,
        name: 'María López (Atrasada)',
        phone: '5512345678',
        total_debt: 1500.0,
        created_at: nowStr,
      },
      {
        id: idDebtor2,
        name: 'Carlos Gómez (Al Día)',
        phone: '5587654321',
        total_debt: 0.0,
        created_at: nowStr,
      },
      {
        id: idDebtor3,
        name: 'Ana Martínez (Vence Hoy / Pronto)',
        phone: '5599998888',
        total_debt: 1200.0,
        created_at: nowStr,
      },
    ],
    payment_plans: [
      // María López: $1500 total. Plan: $500 vencido hace una semana, $1000 futuro
      {
        id: idPlan1,
        debtor_id: idDebtor1,
        amount_due: 500.0,
        due_date: '2026-06-10', // Vencido
        status: 'pending',
        description: 'Apartado de Chamarra Piel (1/3)',
        created_at: nowStr,
      },
      {
        id: idPlan2,
        debtor_id: idDebtor1,
        amount_due: 1000.0,
        due_date: '2026-06-28', // Futuro
        status: 'pending',
        description: 'Apartado de Chamarra Piel (2/3 & 3/3)',
        created_at: nowStr,
      },
      // Carlos Gómez: $0 total deuda. Tuvo un plan de $600 ya pagado.
      {
        id: idPlan3,
        debtor_id: idDebtor2,
        amount_due: 600.0,
        due_date: '2026-06-12',
        status: 'paid',
        description: 'Pantalón Mezclilla Azul (1/1)',
        created_at: nowStr,
      },
      // Ana Martínez: $1200 total. Plan: $400 vence hoy, $400 en 3 días, $400 a futuro
      {
        id: idPlan4,
        debtor_id: idDebtor3,
        amount_due: 400.0,
        due_date: '2026-06-17', // Vence Hoy (Precaución)
        status: 'pending',
        description: 'Vestido de Fiesta Negro (1/3)',
        created_at: nowStr,
      },
      {
        id: idPlan5,
        debtor_id: idDebtor3,
        amount_due: 800.0,
        due_date: '2026-06-20', // Vence Pronto (Precaución)
        status: 'pending',
        description: 'Vestido de Fiesta Negro (2/3 & 3/3)',
        created_at: nowStr,
      },
    ],
    payments: [
      // Pago de Carlos Gómez por $600
      {
        id: 'pay11111-1111-1111-1111-111111111111',
        plan_id: idPlan3,
        amount_paid: 600.0,
        paid_at: new Date('2026-06-12T14:30:00Z').toISOString(),
      },
    ],
  }
}

// Leer la base de datos desde el archivo
export function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      const initialData = getInitialData()
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8')
      return initialData
    }
    const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8')
    return JSON.parse(fileContent)
  } catch (err) {
    console.error('Error leyendo la BD local:', err)
    return { debtors: [], payment_plans: [], payments: [] }
  }
}

// Escribir en la base de datos
export function writeDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error escribiendo en la BD local:', err)
  }
}

// ==========================================
// MÉTODOS CRUD DE SIMULACIÓN
// ==========================================

export const localDb = {
  // --- Deudores ---
  getDebtors(search?: string): Debtor[] {
    const db = readDb()
    if (!search) return db.debtors
    const lowerSearch = search.toLowerCase()
    return db.debtors.filter(
      (d) =>
        d.name.toLowerCase().includes(lowerSearch) ||
        d.phone.includes(lowerSearch)
    )
  },

  getDebtorById(id: string): Debtor | null {
    const db = readDb()
    return db.debtors.find((d) => d.id === id) || null
  },

  createDebtor(name: string, phone: string, totalDebt: number): Debtor {
    const db = readDb()
    const newDebtor: Debtor = {
      id: crypto.randomUUID(),
      name,
      phone,
      total_debt: totalDebt,
      created_at: new Date().toISOString(),
    }
    db.debtors.push(newDebtor)
    writeDb(db)
    return newDebtor
  },

  updateDebtorDebt(id: string, newDebt: number): void {
    const db = readDb()
    const debtorIndex = db.debtors.findIndex((d) => d.id === id)
    if (debtorIndex !== -1) {
      db.debtors[debtorIndex].total_debt = newDebt
      writeDb(db)
    }
  },

  // --- Planes de Pago ---
  getPaymentPlans(debtorId?: string): PaymentPlan[] {
    const db = readDb()
    if (debtorId) {
      return db.payment_plans.filter((p) => p.debtor_id === debtorId)
    }
    return db.payment_plans
  },

  getPaymentPlanById(id: string): PaymentPlan | null {
    const db = readDb()
    return db.payment_plans.find((p) => p.id === id) || null
  },

  createPaymentPlan(debtorId: string, amountDue: number, dueDate: string, description?: string): PaymentPlan {
    const db = readDb()
    const newPlan: PaymentPlan = {
      id: crypto.randomUUID(),
      debtor_id: debtorId,
      amount_due: amountDue,
      due_date: dueDate,
      status: 'pending',
      description: description || '',
      created_at: new Date().toISOString(),
    }
    db.payment_plans.push(newPlan)
    
    // Al agregar un plan, opcionalmente podemos incrementar la deuda total del deudor
    const debtorIndex = db.debtors.findIndex((d) => d.id === debtorId)
    if (debtorIndex !== -1) {
      db.debtors[debtorIndex].total_debt += amountDue
    }

    writeDb(db)
    return newPlan
  },

  updatePlanStatus(id: string, status: 'pending' | 'paid'): void {
    const db = readDb()
    const planIndex = db.payment_plans.findIndex((p) => p.id === id)
    if (planIndex !== -1) {
      db.payment_plans[planIndex].status = status
      writeDb(db)
    }
  },

  // --- Abonos (Pagos) ---
  getPayments(planIds?: string[]): Payment[] {
    const db = readDb()
    if (planIds && planIds.length > 0) {
      return db.payments.filter((p) => planIds.includes(p.plan_id))
    }
    return db.payments
  },

  createPayment(planId: string, amountPaid: number): Payment {
    const db = readDb()
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      plan_id: planId,
      amount_paid: amountPaid,
      paid_at: new Date().toISOString(),
    }
    db.payments.push(newPayment)
    writeDb(db)
    return newPayment
  },

  deleteDebtor(id: string): void {
    const db = readDb()
    
    // 1. Obtener los planes del deudor
    const debtorPlans = db.payment_plans.filter((p) => p.debtor_id === id)
    const planIds = debtorPlans.map((p) => p.id)

    // 2. Eliminar abonos asociados
    db.payments = db.payments.filter((pay) => !planIds.includes(pay.plan_id))

    // 3. Eliminar planes asociados
    db.payment_plans = db.payment_plans.filter((p) => p.debtor_id !== id)

    // 4. Eliminar deudor
    db.debtors = db.debtors.filter((d) => d.id !== id)

    writeDb(db)
  },

  deletePaymentPlan(id: string): void {
    const db = readDb()
    const plan = db.payment_plans.find((p) => p.id === id)
    if (!plan) return

    // 1. Calcular el monto total ya pagado por esta cuota
    const planPayments = db.payments.filter((p) => p.plan_id === id)
    const totalPaidOnPlan = planPayments.reduce((acc, curr) => acc + Number(curr.amount_paid), 0)

    // 2. Calcular la porción pendiente de la cuota
    const pendingBalance = Math.max(0, Number(plan.amount_due) - totalPaidOnPlan)

    // 3. Restar la porción pendiente del saldo total del deudor
    const debtorIndex = db.debtors.findIndex((d) => d.id === plan.debtor_id)
    if (debtorIndex !== -1) {
      db.debtors[debtorIndex].total_debt = Math.max(0, db.debtors[debtorIndex].total_debt - pendingBalance)
    }

    // 4. Eliminar abonos correspondientes de la cuota
    db.payments = db.payments.filter((p) => p.plan_id !== id)

    // 5. Eliminar la cuota
    db.payment_plans = db.payment_plans.filter((p) => p.id !== id)

    writeDb(db)
  },

  settleDebtorAccount(debtorId: string): void {
    const db = readDb()
    const debtorIndex = db.debtors.findIndex((d) => d.id === debtorId)
    if (debtorIndex === -1) return

    // 1. Obtener todos los planes pendientes de este deudor
    const pendingPlans = db.payment_plans.filter(
      (p) => p.debtor_id === debtorId && p.status === 'pending'
    )

    // 2. Para cada plan pendiente, calcular el saldo restante e insertar el abono
    pendingPlans.forEach((plan) => {
      const planPayments = db.payments.filter((pay) => pay.plan_id === plan.id)
      const totalPaidOnPlan = planPayments.reduce((acc, curr) => acc + Number(curr.amount_paid), 0)
      const remainingAmount = Math.max(0, Number(plan.amount_due) - totalPaidOnPlan)

      if (remainingAmount > 0) {
        // Crear abono físico para el historial de caja
        db.payments.push({
          id: crypto.randomUUID(),
          plan_id: plan.id,
          amount_paid: remainingAmount,
          paid_at: new Date().toISOString(),
        })
      }

      // Marcar el plan como pagado
      const pIdx = db.payment_plans.findIndex((p) => p.id === plan.id)
      if (pIdx !== -1) {
        db.payment_plans[pIdx].status = 'paid'
      }
    })

    // 3. Poner la deuda total del cliente en cero
    db.debtors[debtorIndex].total_debt = 0.0

    writeDb(db)
  },
}

