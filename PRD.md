# Documento de Requerimientos de Producto (PRD): Gestor de Créditos y Cobranza

## Resumen Ejecutivo

Plataforma web interna de uso exclusivo para la administración de una tienda de ropa. Su propósito central es digitalizar y optimizar la gestión de "apartados" y créditos de clientes. La herramienta permite registrar deudores, estructurar planes de pago, registrar abonos en efectivo y visualizar alertas de atrasos de forma automática, garantizando el control total de la cartera vencida mediante una interfaz minimalista y un costo de infraestructura cercano a cero.

## User Stories

Historias de usuario enfocadas en el MVP para la dueña del local:

- **Como administradora**, quiero registrar un nuevo cliente deudor (nombre, teléfono y monto total de deuda) para tener su historial centralizado.

- **Como administradora**, quiero generar un plan de pagos con fechas límite y montos esperados para saber exactamente cuándo debo recibir dinero.

- **Como administradora**, quiero registrar un pago parcial o total en efectivo para que el sistema descuente automáticamente el saldo pendiente del cliente.

- **Como administradora**, quiero ver un dashboard inicial con alertas visuales de los pagos atrasados para priorizar mis esfuerzos de cobranza de hoy.

- **Como administradora**, quiero ver el historial de transacciones de un cliente específico para aclarar cualquier duda sobre sus abonos anteriores.

## Arquitectura Técnica

Nos mantendremos en el stack de confianza, optimizado para despliegue gratuito o de muy bajo costo (Vercel + Supabase). No habrá automatizaciones externas; la lógica de alertas de atraso se calculará dinámicamente en el frontend/backend al consultar la base de datos.

- **Frontend / Backend Lógico:** Next.js (App Router) usando Server Actions.
- **Base de Datos y Autenticación:** Supabase (PostgreSQL).
- **Hosting:** Vercel.

### Esquema de Base de Datos (Supabase):

| Tabla | Campos Principales | Descripción |
|-------|-------------------|-------------|
| **profiles** | `id` (UUID), `role` | Vinculado a la autenticación. Solo habrá un perfil (Dueña). |
| **debtors** | `id`, `name`, `phone`, `total_debt`, `created_at` | Registro central de los clientes que deben dinero. |
| **payment_plans** | `id`, `debtor_id`, `amount_due`, `due_date`, `status` | El calendario de pagos. Estados: `pending`, `paid`, `overdue`. |
| **payments** | `id`, `plan_id`, `amount_paid`, `paid_at` | Registro histórico de cada abono en efectivo realizado. |

## Diseño y Estilo

Aplicaremos el principio "Less is more". La dueña no necesita gráficos complejos, necesita saber quién le debe y cuándo cobrar.

- **Paleta de Colores:** Escala de grises y fondo blanco para reducir la fatiga visual. Solo usaremos tres colores de acento con propósito funcional:
  - **Rojo:** Para alertas de pagos atrasados (Overdue).
  - **Naranja/Amarillo:** Para pagos que vencen hoy o esta semana (Pending).
  - **Verde:** Para pagos completados y saldos en ceros (Paid).

- **Tipografía:** Inter o Roboto. Sans-serif, limpia y legible para lectura de datos numéricos.

- **Navegación:** Un menú lateral (Sidebar) colapsable con solo 3 opciones:
  - **Dashboard** (Vista general y alertas de atraso).
  - **Clientes** (Directorio de deudores y creación de perfiles).
  - **Pagos** (Historial general de caja/abonos).

## Protocolos de Seguridad

Aunque el sistema maneja pagos en efectivo, la privacidad de los datos de los clientes y el estado financiero de la tienda requiere protección desde el diseño.

- **Autenticación Cerrada:** Sistema de Email & Password mediante Supabase Auth. El registro público estará desactivado; la cuenta de la dueña se creará directamente desde el panel de Supabase.

- **Row Level Security (RLS):** Las políticas RLS de Supabase estarán configuradas para que solo el usuario autenticado pueda realizar operaciones SELECT, INSERT, UPDATE y DELETE.

- **Protección de Endpoints:** Todas las Server Actions en Next.js verificarán la sesión activa del usuario antes de ejecutar cualquier consulta a la base de datos.