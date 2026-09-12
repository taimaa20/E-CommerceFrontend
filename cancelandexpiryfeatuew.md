# Full Implementation Prompt — Cancel Order & Waste Management Feature
## RestaurantPos.Client (Next.js)

---

## CONTEXT & GROUND RULES

You are implementing two new features in an existing **Next.js Restaurant POS system** called `RestaurantPos.Client`. The system already has working screens for: order creation, kitchen display (KDS), order management, and a basic cancel action.

**Non-negotiable rules before writing a single line:**
1. **Do NOT modify any existing API routes, database schema columns, or component props** that are currently working — only ADD new tables, columns, routes, and components.
2. **Do NOT remove or rename existing functions** — only extend them.
3. Every new UI component must follow the **existing design system** (same font, same color tokens, same card/button patterns already used in the project).
4. Every new page/component must be **fully typed** (TypeScript interfaces for every data shape).
5. Before implementing anything, **read the existing files** listed in each section to understand current patterns.

---

## FEATURE 1 — ENHANCED CANCEL ORDER FLOW

### 1.1 — What already exists (read these first)

Read and understand these files before touching anything:
- `app/(pos)/orders/page.tsx` — current order list page
- `app/(pos)/orders/[id]/page.tsx` — order detail page (if exists)
- `components/orders/OrderCard.tsx` — existing order card component
- `components/orders/CancelButton.tsx` — existing cancel button (if exists)
- `lib/api/orders.ts` — existing order API calls
- `types/order.ts` — existing Order and OrderItem types
- `prisma/schema.prisma` — full database schema

### 1.2 — New database additions (Prisma — additive only)

Add the following to `prisma/schema.prisma`. Do NOT change any existing model fields.

```prisma
// Add to existing Order model — new fields only:
model Order {
  // ... all existing fields stay exactly as they are ...
  cancelledAt       DateTime?
  cancelledByUserId String?
  cancelledBy       User?     @relation("OrderCancelledBy", fields: [cancelledByUserId], references: [id])
  cancelReason      String?
  cancelScope       CancelScope? // FULL_ORDER or ITEM
  kitchenAckAt      DateTime?
  kitchenAckByUserId String?
  kitchenAckBy      User?     @relation("OrderKitchenAck", fields: [kitchenAckByUserId], references: [id])
}

// Add to existing OrderItem model — new fields only:
model OrderItem {
  // ... all existing fields stay exactly as they are ...
  isCancelled       Boolean  @default(false)
  cancelledAt       DateTime?
  cancelReason      String?
}

// New model — cancel product log (separate from waste log)
model CancelProductLog {
  id              String     @id @default(cuid())
  orderId         String
  order           Order      @relation(fields: [orderId], references: [id])
  orderItemId     String?    // null = full order cancel
  orderItem       OrderItem? @relation(fields: [orderItemId], references: [id])
  scope           CancelScope
  cancelReason    String
  cancelledByName String     // snapshot: "Nour (Garçon)"
  cancelledByRole String     // CASHIER | GARCON
  orderTime       DateTime   // snapshot of order.createdAt
  cancelledAt     DateTime   @default(now())
  kitchenAckByName String?   // populated only if order was In Preparation
  kitchenAckAt    DateTime?
  createdAt       DateTime   @default(now())
}

enum CancelScope {
  FULL_ORDER
  ITEM
}
```

Run after editing schema:
```bash
npx prisma migrate dev --name add_cancel_and_waste_features
npx prisma generate
```

### 1.3 — New TypeScript types

Create `types/cancel.ts` — do not modify `types/order.ts`:

```typescript
export type CancelScope = 'FULL_ORDER' | 'ITEM';

export type CancelReason =
  | 'CLIENT_CHANGED_MIND'
  | 'WRONG_ORDER_ENTERED'
  | 'CLIENT_LEFT'
  | 'ALLERGY_CONCERN'
  | 'ITEM_UNAVAILABLE'
  | 'OTHER';

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  CLIENT_CHANGED_MIND: 'Client changed mind',
  WRONG_ORDER_ENTERED: 'Wrong order entered',
  CLIENT_LEFT:         'Client left',
  ALLERGY_CONCERN:     'Allergy discovered',
  ITEM_UNAVAILABLE:    'Item unavailable',
  OTHER:               'Other',
};

export interface CancelProductLogEntry {
  id:               string;
  orderId:          string;
  orderItemId:      string | null;
  scope:            CancelScope;
  cancelReason:     string;
  cancelledByName:  string;
  cancelledByRole:  string;
  orderTime:        string; // ISO string
  cancelledAt:      string; // ISO string
  kitchenAckByName: string | null;
  kitchenAckAt:     string | null;
}

export interface CancelOrderPayload {
  orderId:       string;
  orderItemId?:  string;       // omit for full order
  scope:         CancelScope;
  cancelReason:  CancelReason;
  cancelNote?:   string;
  orderStatus:   string;       // current order status — determines flow path
}

export interface KitchenAckPayload {
  orderId:      string;
  orderItemId?: string;
  outcome:      'DISCARDED' | 'ALREADY_SERVED';
  ackByUserId:  string;
}
```

### 1.4 — New API routes

#### `app/api/orders/[id]/cancel/route.ts` (NEW file — do not modify any existing route)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CancelOrderPayload } from '@/types/cancel';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: CancelOrderPayload = await req.json();
  const { orderId, orderItemId, scope, cancelReason, cancelNote, orderStatus } = body;

  // Determine if kitchen was already preparing
  const kitchenWasActive = ['IN_PREPARATION', 'PREPARING'].includes(orderStatus);

  // Build the cancel reason string (reason + optional note)
  const reasonText = cancelNote ? `${cancelReason} — ${cancelNote}` : cancelReason;

  // --- FULL ORDER cancel ---
  if (scope === 'FULL_ORDER') {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status:           'CANCELLED',
          cancelledAt:      new Date(),
          cancelledByUserId: session.user.id,
          cancelReason:     reasonText,
          cancelScope:      'FULL_ORDER',
        },
      }),
      prisma.orderItem.updateMany({
        where: { orderId },
        data:  { isCancelled: true, cancelledAt: new Date(), cancelReason: reasonText },
      }),
      // Only log waste if kitchen had already started (food was prepared)
      ...(kitchenWasActive ? [
        prisma.wasteLog.create({
          data: {
            category:        'CANCEL_PRODUCT',
            itemName:        'Full order #' + orderId,
            quantity:        1,
            unit:            'order',
            orderId,
            cancelReason:    reasonText,
            loggedByName:    session.user.name ?? 'Unknown',
            loggedByRole:    session.user.role ?? 'CASHIER',
            requiresKitchenAck: true,
          },
        }),
      ] : []),
      prisma.cancelProductLog.create({
        data: {
          orderId,
          scope:           'FULL_ORDER',
          cancelReason:    reasonText,
          cancelledByName: `${session.user.name} (${session.user.role})`,
          cancelledByRole: session.user.role ?? 'CASHIER',
          orderTime:       new Date(), // replace with actual order.createdAt via lookup
        },
      }),
    ]);
  }

  // --- ITEM cancel ---
  if (scope === 'ITEM' && orderItemId) {
    const item = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    await prisma.$transaction([
      prisma.orderItem.update({
        where: { id: orderItemId },
        data:  { isCancelled: true, cancelledAt: new Date(), cancelReason: reasonText },
      }),
      ...(kitchenWasActive ? [
        prisma.wasteLog.create({
          data: {
            category:        'CANCEL_PRODUCT',
            itemName:        item.name,
            quantity:        item.quantity,
            unit:            'portion',
            orderId,
            orderItemId,
            cancelReason:    reasonText,
            loggedByName:    session.user.name ?? 'Unknown',
            loggedByRole:    session.user.role ?? 'CASHIER',
            requiresKitchenAck: true,
          },
        }),
      ] : []),
      prisma.cancelProductLog.create({
        data: {
          orderId,
          orderItemId,
          scope:           'ITEM',
          cancelReason:    reasonText,
          cancelledByName: `${session.user.name} (${session.user.role})`,
          cancelledByRole: session.user.role ?? 'CASHIER',
          orderTime:       new Date(),
        },
      }),
    ]);
  }

  return NextResponse.json({ success: true, kitchenNotificationRequired: kitchenWasActive });
}
```

#### `app/api/orders/[id]/kitchen-ack/route.ts` (NEW file)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { KitchenAckPayload } from '@/types/cancel';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: KitchenAckPayload = await req.json();
  const { orderId, orderItemId, outcome } = body;

  const ackName = `${session.user.name} (Kitchen)`;

  if (outcome === 'DISCARDED') {
    // Update the pending waste log entry with kitchen ack
    await prisma.wasteLog.updateMany({
      where: { orderId, orderItemId: orderItemId ?? null, requiresKitchenAck: true, kitchenAckAt: null },
      data: {
        kitchenAckByName: ackName,
        kitchenAckAt:     new Date(),
        requiresKitchenAck: false,
      },
    });
    // Also stamp the cancel log
    await prisma.cancelProductLog.updateMany({
      where: { orderId, orderItemId: orderItemId ?? null },
      data:  { kitchenAckByName: ackName, kitchenAckAt: new Date() },
    });
  }

  if (outcome === 'ALREADY_SERVED') {
    // Remove the waste log entry — food was consumed, not wasted
    await prisma.wasteLog.deleteMany({
      where: { orderId, orderItemId: orderItemId ?? null, requiresKitchenAck: true },
    });
    // Add note to cancel log
    await prisma.cancelProductLog.updateMany({
      where: { orderId, orderItemId: orderItemId ?? null },
      data:  { cancelReason: 'ALREADY_SERVED — served despite cancel request' },
    });
  }

  return NextResponse.json({ success: true, outcome });
}
```

### 1.5 — New UI components

#### `components/orders/CancelOrderModal.tsx` (NEW — do not touch existing cancel UI)

This modal handles both "FULL_ORDER" and "ITEM" cancel scopes. It must:

- Accept props: `isOpen`, `onClose`, `orderId`, `orderItemId?`, `itemName?`, `orderStatus`, `onSuccess`
- Detect if `orderStatus` is `IN_PREPARATION` or `PREPARING` → show yellow warning banner: "Kitchen has already started this item. Cancelling will create a waste record."
- Show a 2×3 grid of reason buttons (the `CANCEL_REASON_LABELS` from types/cancel.ts)
- Confirm button is **disabled** until a reason is selected
- On confirm: call `POST /api/orders/[id]/cancel`, then call `onSuccess(kitchenNotificationRequired)`
- If `kitchenNotificationRequired === true` → do not close modal; instead show the `KitchenPendingAlert` inline inside the modal
- Design: use existing modal/overlay pattern from the project. If none exists, use a centered card on a semi-transparent overlay (not `position:fixed` — use a flow-positioned overlay div). Colors must use existing Tailwind tokens.

#### `components/orders/KitchenPendingAlert.tsx` (NEW)

Shown inside `CancelOrderModal` or on the KDS screen. Must:

- Show a pulsing red border card: "CANCEL REQUEST — Order #{id}"
- Display item name, reason, and instructions for kitchen staff
- Two action buttons: "Discarded — confirm cancel" and "Cannot stop — already served"
- Each button calls `POST /api/orders/[id]/kitchen-ack` with the correct `outcome`
- On success: close the alert, call `onAckComplete(outcome)`

#### Modify `components/orders/OrderCard.tsx` — additive changes only

Add cancel buttons following this logic (do NOT remove existing buttons):

```typescript
// Add this display logic inside the existing OrderCard render:
// Show cancel buttons ONLY when order.status === 'READY' or 'IN_PREPARATION'
// For item-level: add a small "Cancel item" button per OrderItem row
// For order-level: add a "Cancel entire order" button in the card footer action bar
// Import and render <CancelOrderModal> — manage open state locally
```

---

## FEATURE 2 — WASTE LOG

### 2.1 — New database additions

Add to `prisma/schema.prisma` (additive only):

```prisma
model WasteLog {
  id                  String       @id @default(cuid())
  category            WasteCategory
  itemName            String
  quantity            Float
  unit                String       // "portion", "kg", "L", "order"
  orderId             String?
  order               Order?       @relation(fields: [orderId], references: [id])
  orderItemId         String?
  cancelReason        String?
  loggedByName        String       // snapshot
  loggedByRole        String
  requiresKitchenAck  Boolean      @default(false)
  kitchenAckByName    String?
  kitchenAckAt        DateTime?
  loggedAt            DateTime     @default(now())
  createdAt           DateTime     @default(now())
}

enum WasteCategory {
  CANCEL_PRODUCT  // prepared food cancelled by client/staff
  EXPIRY_PRODUCT  // ingredient expired — auto-detected
}
```

### 2.2 — New TypeScript types

Add to `types/waste.ts` (NEW file):

```typescript
export type WasteCategory = 'CANCEL_PRODUCT' | 'EXPIRY_PRODUCT';

export interface WasteLogEntry {
  id:                string;
  category:          WasteCategory;
  itemName:          string;
  quantity:          number;
  unit:              string;
  orderId:           string | null;
  orderItemId:       string | null;
  cancelReason:      string | null;
  loggedByName:      string;
  loggedByRole:      string;
  requiresKitchenAck: boolean;
  kitchenAckByName:  string | null;
  kitchenAckAt:      string | null;
  loggedAt:          string;
}

export interface WasteLogFilters {
  category?:  WasteCategory;
  dateFrom?:  string;
  dateTo?:    string;
  page?:      number;
  pageSize?:  number;
}
```

### 2.3 — Waste log API routes (NEW files)

#### `app/api/waste-log/route.ts`

```typescript
// GET: fetch paginated waste log with optional category filter
// Query params: category, dateFrom, dateTo, page, pageSize
// Returns: { data: WasteLogEntry[], total: number, page: number }
// Auth required: ADMIN or MANAGER role only

// POST: manually add a waste log entry (for admin manual entries)
// Body: { category, itemName, quantity, unit, cancelReason }
// Auth required: ADMIN or MANAGER
```

Implement both handlers fully using `prisma.wasteLog.findMany` with `where`, `skip`, `take`, `orderBy: { loggedAt: 'desc' }`.

### 2.4 — Waste log page

Create `app/(pos)/waste-log/page.tsx` (NEW page — do not touch any existing page):

**Layout requirements:**
- Page title: "Waste log"
- Two summary metric cards at the top: "Cancel product — today" count | "Expiry product — today" count
- Tab bar to filter: All | Cancel product | Expiry product
- Date range picker (from/to) — use existing date input components if available
- Data table with columns: Category (badge) | Item | Reason | Staff | Order time | Logged at
- Category badge: purple pill for Cancel product, red pill for Expiry product
- New rows added during the session should briefly highlight in amber (CSS transition, 2s)
- Empty state: illustration-free, just a muted text "No waste entries for this period"
- Pagination: show 20 rows per page, standard prev/next controls

**Access control:** Only render this page link in the sidebar for users with role `ADMIN` or `MANAGER`. If a cashier navigates directly, show a 403 card.

Add the page to the sidebar navigation by **adding a new entry** to the existing nav config — do not remove or reorder existing nav items.

---

## FEATURE 3 — EXPIRY AUTO-DETECTION

### 3.1 — What this does

A scheduled job runs daily and queries the inventory for items where `expiry_date <= today AND quantity > 0`. For each match, it creates a `WasteLog` entry with `category: EXPIRY_PRODUCT` and sends an admin notification. This runs **without any human action**.

### 3.2 — Inventory model addition (additive only)

Add to the existing `InventoryItem` model in `prisma/schema.prisma`:

```prisma
model InventoryItem {
  // ... all existing fields unchanged ...
  expiryDate    DateTime?
  expiryStatus  ExpiryStatus @default(VALID)
}

enum ExpiryStatus {
  VALID
  NEAR_EXPIRY   // within configured warning days (default 3)
  EXPIRED
}
```

### 3.3 — Expiry check job

Create `lib/jobs/expiryCheck.ts`:

```typescript
import { prisma } from '@/lib/prisma';

export async function runExpiryCheck(): Promise<{
  expiredCount: number;
  nearExpiryCount: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const warningDays = parseInt(process.env.EXPIRY_WARNING_DAYS ?? '3');
  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + warningDays);

  // Find newly expired items
  const expiredItems = await prisma.inventoryItem.findMany({
    where: {
      expiryDate:   { lte: today },
      expiryStatus: { not: 'EXPIRED' },
      quantity:     { gt: 0 },
    },
  });

  // Find near-expiry items (not yet expired)
  const nearExpiryItems = await prisma.inventoryItem.findMany({
    where: {
      expiryDate:   { gt: today, lte: warningDate },
      expiryStatus: { not: 'NEAR_EXPIRY' },
      quantity:     { gt: 0 },
    },
  });

  // Create waste log entries for expired items
  if (expiredItems.length > 0) {
    await prisma.$transaction([
      // Waste log entries
      ...expiredItems.map(item =>
        prisma.wasteLog.create({
          data: {
            category:    'EXPIRY_PRODUCT',
            itemName:    item.name,
            quantity:    item.quantity,
            unit:        item.unit ?? 'unit',
            cancelReason: 'Expired — auto-detected by system',
            loggedByName: 'System',
            loggedByRole: 'SYSTEM',
          },
        })
      ),
      // Mark inventory items as EXPIRED
      prisma.inventoryItem.updateMany({
        where: { id: { in: expiredItems.map(i => i.id) } },
        data:  { expiryStatus: 'EXPIRED' },
      }),
      // Create admin notification
      prisma.notification.create({
        data: {
          type:    'EXPIRY_ALERT',
          title:   `${expiredItems.length} expired item(s) detected`,
          body:    expiredItems.map(i => `${i.name} (${i.quantity} ${i.unit ?? 'unit'})`).join(', '),
          forRole: 'ADMIN',
          isRead:  false,
        },
      }),
    ]);
  }

  // Mark near-expiry items
  if (nearExpiryItems.length > 0) {
    await prisma.inventoryItem.updateMany({
      where: { id: { in: nearExpiryItems.map(i => i.id) } },
      data:  { expiryStatus: 'NEAR_EXPIRY' },
    });
    // Optional: create near-expiry warning notification
    await prisma.notification.create({
      data: {
        type:    'NEAR_EXPIRY_WARNING',
        title:   `${nearExpiryItems.length} item(s) expiring within ${warningDays} days`,
        body:    nearExpiryItems.map(i => `${i.name} — expires ${i.expiryDate?.toDateString()}`).join(', '),
        forRole: 'ADMIN',
        isRead:  false,
      },
    });
  }

  return { expiredCount: expiredItems.length, nearExpiryCount: nearExpiryItems.length };
}
```

### 3.4 — Job trigger API route

Create `app/api/jobs/expiry-check/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { runExpiryCheck } from '@/lib/jobs/expiryCheck';

export async function POST(req: NextRequest) {
  // Secure with a shared secret header — only your cron service calls this
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const result = await runExpiryCheck();
  return NextResponse.json({ success: true, ...result });
}
```

**Schedule this route** using Vercel Cron (add to `vercel.json`) or an external cron:

```json
// vercel.json — additive, do not change existing config:
{
  "crons": [
    {
      "path": "/api/jobs/expiry-check",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Add to `.env`:
```
EXPIRY_WARNING_DAYS=3
CRON_SECRET=your-secret-here
```

---

## FEATURE 4 — CANCEL PRODUCT LOG PAGE

Create `app/(pos)/cancel-log/page.tsx` (NEW page — separate from waste log):

**This page shows the cancel log entries only (not waste/expiry). Accessible to: ADMIN, MANAGER, CASHIER.**

**Layout:**
- Page title: "Cancel log"
- Summary cards: "Cancelled orders today" | "Cancelled items today"  
- Table columns: Order | Scope (badge: Full order / Item) | Item cancelled | Reason | Cancelled by | Order time | Cancelled at | Kitchen ack?
- Kitchen ack column: green "Acked by [name]" if populated, amber "Pending" if `requiresKitchenAck` is true, dash if kitchen was not involved
- Filter by date range and by scope (All / Full order / Item)

---

## FEATURE 5 — KITCHEN DISPLAY (KDS) — CANCEL REQUEST ALERTS

### 5.1 — What already exists

Read `app/(pos)/kitchen/page.tsx` (or wherever the KDS currently lives) before modifying.

### 5.2 — Additive changes to KDS

**Add a new section at the top of the kitchen display** (above the existing order tiles) called "Cancel requests" that only appears when there are pending cancel requests.

```typescript
// Fetch pending cancel requests:
// GET /api/orders/cancel-requests/pending
// Returns orders/items where requiresKitchenAck === true AND kitchenAckAt IS NULL

// Render each as a pulsing red alert card:
// - Order number, table number
// - Item cancelled (or "Full order")
// - Reason
// - Two buttons: "Discarded" | "Already served"
// - Calls POST /api/orders/[id]/kitchen-ack
```

Create `app/api/orders/cancel-requests/pending/route.ts`:

```typescript
// GET: return all WasteLog entries where requiresKitchenAck === true AND kitchenAckAt IS NULL
// Join with order details for display
// Auth: any kitchen/cashier role
```

The pulsing alert card must use the existing card component with an added `animate-pulse` ring (Tailwind) or equivalent CSS. Do not replace the existing kitchen card design — add this as a new component `KitchenCancelAlert.tsx`.

---

## FEATURE 6 — ADMIN NOTIFICATION PANEL

### 6.1 — Notification model

Add to `prisma/schema.prisma` (only if `Notification` model does not already exist):

```prisma
model Notification {
  id        String   @id @default(cuid())
  type      String   // EXPIRY_ALERT | NEAR_EXPIRY_WARNING | CANCEL_ALERT
  title     String
  body      String
  forRole   String   // ADMIN | MANAGER
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

### 6.2 — Notification bell component

Create `components/layout/NotificationBell.tsx`:

- Renders a bell icon in the top navigation bar (additive — do not touch the existing header layout, just add this component to it)
- Shows an unread count badge when `count > 0`
- On click: opens a dropdown listing the latest 10 notifications
- Each notification shows: title, body preview, time ago
- "Mark all read" button calls `PATCH /api/notifications/mark-read`
- Expiry/near-expiry notifications are styled red/amber respectively
- New notifications auto-appear without full page refresh (poll `/api/notifications/unread-count` every 30 seconds using `setInterval` — do not add a WebSocket dependency)

Create `app/api/notifications/route.ts` and `app/api/notifications/mark-read/route.ts` (GET and PATCH).

---

## DESIGN SYSTEM RULES — APPLY TO ALL NEW COMPONENTS

These rules ensure new components feel native to the existing UI:

1. **Colors:** Use only existing Tailwind color tokens already present in `tailwind.config.js`. Do not add new colors. If the project uses a custom palette (e.g. `primary`, `danger`, `warning`), use those exact names.

2. **Typography:** Match the existing font size scale. If the project uses `text-sm` for table rows, use `text-sm` everywhere in tables.

3. **Cards:** Use the same card component pattern. If a `<Card>` component exists in `components/ui/Card.tsx`, use it — do not create a raw `<div>` with inline styles.

4. **Badges/Pills:** Create `components/ui/WasteCategoryBadge.tsx` and `components/ui/CancelScopeBadge.tsx` using the existing badge pattern. Purple for Cancel product. Red for Expiry product. Gray for Full order. Amber for Item.

5. **Buttons:** Use the existing `<Button>` component with existing variants (`variant="danger"`, `variant="warning"`, etc.). If a button variant doesn't exist, add it to the existing button component following the same pattern.

6. **Modals:** Use the existing modal/dialog component. If the project uses Radix UI `Dialog`, use that. If it uses a custom modal, use that. Do not install a new modal library.

7. **Tables:** If the project has a `<DataTable>` component, use it. If not, create `components/ui/DataTable.tsx` following the exact same style as existing tables.

8. **Loading states:** Use the same loading skeleton or spinner pattern already present.

9. **Empty states:** Plain centered text with `text-muted` color. No illustrations needed.

10. **Animations:** The pulsing cancel alert on the KDS uses `animate-pulse` (Tailwind built-in). No other animation libraries needed.

---

## IMPLEMENTATION ORDER — FOLLOW THIS SEQUENCE

Work in this exact order to avoid breaking running code:

```
Step 1:  Add Prisma schema changes → migrate → generate
Step 2:  Add types/cancel.ts and types/waste.ts
Step 3:  Add lib/jobs/expiryCheck.ts
Step 4:  Add all new API routes (cancel, kitchen-ack, waste-log, notifications, jobs)
Step 5:  Add CancelOrderModal.tsx and KitchenPendingAlert.tsx
Step 6:  Add KitchenCancelAlert.tsx
Step 7:  Modify OrderCard.tsx — additive changes only
Step 8:  Add waste-log page and cancel-log page
Step 9:  Add NotificationBell.tsx and add it to the header
Step 10: Add new nav entries to sidebar config
Step 11: Add vercel.json cron entry
Step 12: Test full flow: order → prepare → cancel → kitchen ack → waste log → admin notification
```

---

## TESTING CHECKLIST

After implementing, verify each scenario manually:

- [ ] Order in `PENDING` status → cancel → no waste log entry created, cancel log entry created
- [ ] Order in `IN_PREPARATION` status → cancel → warning shown → kitchen alert shown → kitchen clicks "Discarded" → waste log entry created with `CANCEL_PRODUCT`, cancel log entry created
- [ ] Order in `IN_PREPARATION` → cancel → kitchen clicks "Already served" → NO waste log entry, cancel log notes "already served"
- [ ] Order in `READY` status → cancel → waste log entry created automatically (no kitchen ack needed)
- [ ] Item-level cancel on a `READY` order → only that item cancelled, order becomes `PARTIAL`
- [ ] Run expiry check job manually via `POST /api/jobs/expiry-check` with correct header → expired inventory items appear in waste log as `EXPIRY_PRODUCT`
- [ ] Admin sees notification bell with unread count after expiry check runs
- [ ] Waste log page filters correctly by category and date
- [ ] Cancel log page shows all cancel entries with correct kitchen ack status
- [ ] KDS shows pulsing cancel requests at top, disappears after kitchen ack
- [ ] Cashier role cannot access waste log page (403 shown)
- [ ] No existing order functionality is broken (create, update status, KDS display)
```