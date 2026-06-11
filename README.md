# مركز نورا للبصريات — Nora Optics

E-commerce storefront + admin platform for an optical shop. Arabic-first, RTL.
**Stack:** React + TS + Tailwind + shadcn-style tokens (client) · Node + Express + Mongoose (server) · MongoDB · JWT auth · Cloudinary.

---

## 1. Prerequisites

- Node 18+
- MongoDB **as a replica set** (for transactions). Two easy options:
  - **MongoDB Atlas** (free tier is a replica set out of the box), or
  - **Local single-node replica set:**
    ```bash
    mongod --replSet rs0 --dbpath /your/data/path
    # then once, in mongosh:
    rs.initiate()
    ```
  - If you run a plain standalone `mongod`, the server still works — it auto-detects the
    standalone and falls back to a manual create-then-cleanup path for order creation
    (no transactions). See `server/src/lib/db.ts`.
- A Cloudinary account (for product image uploads).

## 2. Backend

```bash
cd server
cp .env.example .env        # fill in MONGODB_URI, JWT_SECRET, CLOUDINARY_*
npm install
npm run seed                # creates the admin user + sample data
npm run dev                 # http://localhost:4000
```

Seed reads `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`. Default: `admin` / `changeme123` — **change these.**

## 3. Frontend

```bash
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api -> :4000)
```

- Storefront: http://localhost:5173
- Admin: http://localhost:5173/admin/login

---

## 4. What's implemented

### Backend — complete for all core flows
- **Models:** Category, Product (colors + cost privacy), Customer, SaleFile/SaleRecord,
  EyeExam, Offer, Order, AdminUser, Settings, Counter.
- **Auth:** bcrypt + JWT, rate-limited login, admin-only middleware.
- **Public API:** categories, products (filters: category/search/inOffer/inStock/page),
  product detail, offer products, contact settings, **order creation**.
- **Admin API:** products CRUD + image upload, categories CRUD, customers,
  sale-files (+ append record), eye-exams, offers CRUD, orders (+ status).
- **Critical correctness (from the PRD review):**
  1. **Server-authoritative pricing** — `POST /api/orders` accepts only
     `{ productId, color, quantity }` + contact + zone. Server re-fetches products,
     recomputes offer-adjusted prices and the delivery fee. Client prices are ignored.
  2. **Quantity-correct profit** — `profit = (sellingPrice − cost) × quantity − accessoriesCost`.
  3. **Cancelled orders** flip `SaleFile.isVoided` so the profit ledger stays accurate.
  4. **Atomic order numbers** via a `Counter` collection (`$inc`), and **race-safe
     customer dedup** via a unique-phone upsert.
  5. **Atomic order creation** — uses a transaction on a replica set, or a
     create-then-cleanup fallback on standalone Mongo.
- Soft-delete query middleware (Product/Category), cost-stripping public serializer,
  in-memory offer resolution (no N+1), zod validation everywhere, central error handler.

### Frontend
- **Storefront (complete):** Home (hero/categories/offers/featured), Products (filters +
  search), Product detail (color gallery, add-to-cart), Offers, Cart drawer (RTL — slides
  from the left), Checkout (live delivery fee, order confirmation), Contact.
- **Admin (complete):** JWT login, layout/sidebar, **Products** (list + create/edit with
  color blocks & Cloudinary upload), **Orders** (list, detail, status update, **printable
  invoice** via react-to-print).
- **Admin (scaffolded — API ready, UI pending):** Categories, Sale Files, Eye Exams, Offers.
  These render a placeholder that confirms the live API and record counts. Build their
  CRUD screens following the `ProductsAdmin.tsx` pattern.

## 5. Next steps (in priority order)
1. Build the 4 scaffolded admin screens (Categories is the simplest — start there).
2. Sale Files POS: customer search/create → product search → pricing toggle → accessories →
   live profit. The backend (`/admin/sale-files`) already does the math.
3. Eye Exams form (the 10-cell table + IPD + source/doctor conditional).
4. Offers CRUD (3 types). Backend resolution is done; UI just needs the form.
5. Harden auth: move the admin token to an httpOnly cookie (currently localStorage —
   fine for dev, XSS-exposed in prod). See note in `client/src/lib/api.ts`.
6. Add `stockQty` to Product if you want auto sold-out instead of the manual boolean.

## 6. Project layout
```
server/src
  models/        mongoose schemas + computeRecord/nextSequence helpers
  lib/           db, cloudinary, offers (resolution), serialize (cost-strip)
  middleware/    auth, validate, error handler
  modules/       auth, products, misc, orders, saleFiles, examsOffers (router+logic)
  scripts/seed.ts
client/src
  lib/           api, types, format
  store/         cart (persisted), auth
  components/    Logo, store/*, admin/*
  pages/         store/*, admin/*
```
