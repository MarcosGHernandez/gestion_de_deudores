# 👗 Gestor de Créditos y Cobranza - Control de Deudores

Sistema web responsivo para el control y administración de deudas, créditos y abonos de clientes para tiendas de ropa y locales comerciales. Desarrollado bajo la filosofía **"Less is More"**, con un diseño corporativo ultra-austero, minimalista, limpio y optimizado para dispositivos móviles.

Creado por **VIKOTECH Solutions**.

---

## 🚀 Características Clave

- 📱 **Diseño Ultra-Responsivo (Mobile First):** Menú inferior táctil dinámico para celulares y flujo adaptativo maestro-detalle que evita scroll innecesario en pantallas pequeñas.
- 📆 **Calendario de Pagos Interactivo:** Visualización mensual en tiempo real con códigos de color de estado (rojo para vencido, amarillo para vencimientos de hoy/semana, verde para abonos pagados) y detalle por día.
- 🗃️ **Directorio Maestro de Deudores:** Búsqueda rápida, historial completo de abonos y balance general.
- 🛍️ **Cálculo Dinámico de Cuotas:** Generación automática de planes de pago semanales, quincenales o mensuales a partir de una descripción de compra o prenda.
- 💵 **Liquidar Cuenta con Historial de Caja:** Permite liquidar el saldo total de un cliente, autogenerando abonos de pago por el monto pendiente de cada cuota para mantener la integridad de los ingresos de caja.
- 🗑️ **Acciones de Corrección Seguras:** Permite eliminar clientes o cuotas individuales ajustando de forma matemática y precisa el saldo pendiente total del deudor.
- ⚡ **Doble Capa de Persistencia:**
  - **Modo Simulador Local (Sin Conexión/Offline):** Utiliza un archivo JSON plano (`db_local.json`) local para pruebas rápidas y desarrollo ágil sin configurar Supabase.
  - **Modo Supabase PostgreSQL (Producción):** Conexión en tiempo real con políticas estrictas de seguridad de nivel de fila (RLS) y autenticación segura de Next.js Server Actions.

---

## 🛠️ Stack Tecnológico

1. **Framework:** Next.js (App Router con React Server Actions)
2. **Estilos:** Tailwind CSS (Estilo minimalista en tonos pizarra/slate)
3. **Persistencia / Base de Datos:**
   - Modo Mock: Archivo JSON local simulado (`src/utils/localDb.ts`)
   - Modo Live: Supabase (PostgreSQL) con políticas RLS
4. **Validación y Seguridad:** Middleware de autenticación y sanitización rigurosa de entradas

---

## 📂 Estructura del Proyecto

```text
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (authenticated)/      # Grupo de rutas protegidas
│   │   │   ├── clientes/         # Directorio de clientes y cuotas
│   │   │   ├── dashboard/        # Estadísticas y calendario mensual
│   │   │   ├── pagos/            # Registro general e histórico de abonos
│   │   │   └── layout.tsx        # Layout común y barra inferior responsiva
│   │   ├── actions/              # Server Actions (Auth, Deudores y Pagos)
│   │   ├── login/                # Página de inicio de sesión
│   │   ├── layout.tsx            # Layout de raíz (HTML, Fonts, Metadatos)
│   │   └── page.tsx              # Redirección automática de inicio
│   ├── components/               # Componentes reutilizables (Sidebar, etc.)
│   ├── utils/
│   │   ├── supabase/             # Clientes y middleware de Supabase
│   │   └── localDb.ts            # Implementación de base de datos JSON local
│   └── proxy.ts                  # Middleware de ruteo y sesión offline/online
├── db_local.json                 # Base de datos local (Modo Mock)
├── schema.sql                    # Script SQL del esquema de base de datos
├── package.json                  # Dependencias y scripts de npm
└── AGENTS.md                     # Perfiles e instrucciones de agentes AI
```

---

## ⚙️ Configuración y Uso

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto. Dependiendo de tu URL de Supabase, el sistema iniciará en **Modo Local** o **Modo Producción**:

```env
# URL de Marcador de posición activa el modo Local Simulador (Guarda datos en db_local.json)
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
```

> **Para usar Supabase en producción:** Sustituye `https://placeholder.supabase.co` y `placeholder-key` por las credenciales reales de tu proyecto de Supabase.

### 2. Instalación de Dependencias

```bash
npm install
```

### 3. Ejecutar en Desarrollo

```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 4. Compilar para Producción

```bash
npm run build
npm start
```

---

## 🛡️ Base de Datos en Supabase (schema.sql)

Si deseas desplegar a producción con Supabase, ejecuta las sentencias del archivo `schema.sql` en el SQL Editor de tu consola de Supabase. Este script:
1. Habilita la generación de UUIDs.
2. Crea las tablas de `profiles`, `debtors`, `payment_plans` y `payments`.
3. Configura políticas RLS (Row Level Security) para restringir el acceso únicamente a usuarios autenticados.
4. Define un disparador (Trigger) para crear perfiles de administración de forma automática en el registro.

---

## 👥 Directrices de Desarrollo (AGENTS.md)

Este repositorio incluye un archivo `AGENTS.md` que detalla los lineamientos de arquitectura, diseño austero y seguridad que deben adoptar los asistentes de codificación de inteligencia artificial al trabajar sobre este proyecto.
