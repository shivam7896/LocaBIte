# LocaBite Backend API & Real-Time Engine

> Production-ready, TypeScript-powered Express REST API & Socket.IO server designed for hyper-speed campus food delivery and 10-minute dark store grocery operations.

---

## 🛠️ Tech Stack & Architecture

- **Runtime & Language**: Node.js (v18+) with TypeScript
- **Web Framework**: Express.js
- **Database & ODM**: MongoDB Atlas with Mongoose (includes automatic local in-memory fallback for immediate zero-config developer onboarding)
- **Authentication**: JWT access tokens + HTTP refresh tokens, bcryptjs password hashing, OTP generation architecture
- **Validation**: Strict schema validation with Zod middleware
- **Payments**: Razorpay Node SDK with HMAC-SHA256 signature verification, idempotency checks, and webhook handling
- **Media Uploads**: Cloudinary API with Multer memory storage
- **Real-Time Engine**: Socket.IO for live driver GPS telemetry and order lifecycle event dispatching
- **Security**: Helmet, CORS with whitelist origin, express-rate-limit, MongoDB query sanitization, audit logging for administrative mutations

```
server/
├── src/
│   ├── config/          # Environment, MongoDB, Razorpay, Cloudinary configurations
│   ├── controllers/     # Express route handlers
│   ├── middleware/      # Auth, Zod validation, error handling, rate limiting, audit logging
│   ├── models/          # Mongoose schemas & indexes (User, Restaurant, MenuItem, Cart, Order, etc.)
│   ├── routes/          # REST route declarations & endpoint grouping
│   ├── seed/            # Seed data and database populator
│   ├── services/        # Business logic (OTP, Razorpay payment processing, Cloudinary uploads)
│   ├── sockets/         # Socket.IO connection handling & room events
│   ├── types/           # TypeScript interfaces & declarations
│   ├── utils/           # API response helpers, JWT signer/verifier, Winston/console logger
│   ├── validations/     # Zod schema definitions for request bodies
│   ├── app.ts           # Express app setup & middleware pipeline
│   └── index.ts         # Server bootstrap, MongoDB connection & Socket.IO listener
├── .env.example         # Template for environment variables
├── package.json         # Server scripts & dependencies
├── tsconfig.json        # TypeScript compiler options
└── README.md            # Comprehensive documentation
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` to configure your credentials or use the provided test defaults.

### 3. Start Development Server
```bash
npm run dev
```
The server will start on `http://localhost:5000`. If no remote MongoDB Atlas URI is reachable, the server automatically starts an isolated **MongoDB Memory Server** instance and automatically populates it with realistic LocaBite seed data (eateries, menus, 10-min groceries, campus hubs, student accounts, and admin profiles).

### 4. Manually Seed or Reset Database
```bash
npm run seed
```

---

## 🍃 MongoDB Atlas Configuration

To connect the backend to your live production MongoDB Atlas cluster:

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user with `Read and write to any database` privileges.
3. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere) or your server's static IP.
4. Go to **Clusters** → **Connect** → **Drivers** and copy your connection string:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/locabite?retryWrites=true&w=majority
   ```
5. Paste this connection string into your `server/.env` file.

---

## 💳 Razorpay Payment Gateway Configuration

LocaBite integrates standard Razorpay checkout with server-side signature validation:

1. Sign up or log into [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Switch to **Test Mode** (toggle in upper right header).
3. Navigate to **Settings** → **API Keys** → **Generate Key**.
4. Copy the generated credentials and paste into `server/.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_YourKeyHere
   RAZORPAY_KEY_SECRET=YourSecretHere
   ```
5. To configure Webhooks:
   - Navigate to **Settings** → **Webhooks** → **Add New Webhook**.
   - URL: `https://your-domain.com/api/payments/webhook`
   - Active Events: `payment.captured`, `payment.failed`, `order.paid`.
   - Set a webhook secret and put it in `RAZORPAY_WEBHOOK_SECRET`.

---

## ☁️ Cloudinary Media Storage Configuration

For outlet banners, food photos, and student avatars:

1. Sign up for a free account at [Cloudinary](https://cloudinary.com/).
2. On your Cloudinary Dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Add them to `server/.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

---

## 🔑 Demo Accounts & Pre-Seeded Credentials

| Role | Email / Phone | Password | Features Accessible |
|---|---|---|---|
| **Super Administrator** | `admin@locabite.com` | `AdminPassword@123` | Complete Admin Panel, Revenue Stats, Role Management, Driver Telemetry, Audit Logs |
| **Verified Student** | `aarav.sharma@quantum.edu.in` / `+91 98765 43210` | `Password@123` (OTP: `481920`) | Student discounts, Saved dorm addresses, Tray checkout, Live order tracking |
| **Guest / New Student** | Direct phone/email registration | User-defined | Personalized onboarding, ₹100 discount coupon (`LOCAFIRST`) |

---

## 🖥️ Admin Dashboard Overview

Authorized administrators can navigate to **`/admin`** in the application to access:

- **Executive Analytics**: Real-time Gross Merchandise Value (GMV), total completed orders, active customers, average order value (AOV), and campus delivery partner fleet status.
- **Live Order Control**: View incoming orders, adjust stages (`placed` → `confirmed` → `preparing` → `ready` → `picked_up` → `out_for_delivery` → `delivered`), with immediate Socket.IO dispatching to customer screens.
- **Outlet & Grocery Catalog**: Activate or disable restaurants, adjust open/closed status, update pricing, and modify stock quantities.
- **User & Role Administration**: Promote or demote accounts (`customer`, `restaurant_owner`, `grocery_owner`, `delivery_partner`, `admin`) and toggle account locks.
- **Promotions & Coupons**: Create promotional codes with percentage discounts, minimum order thresholds, and expiry dates.
- **Security Audit Logs**: Tamper-evident administrative audit trail tracking every staff action with IP address, timestamps, resource IDs, and changes made.

---

## 📡 REST API Reference

All successful responses follow the standard JSON envelope:
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}
```

### 1. Authentication & User Profile
- `POST /api/auth/send-otp` - Send 6-digit OTP to phone or email
- `POST /api/auth/verify-otp` - Verify code and obtain JWT access & refresh tokens
- `POST /api/auth/register` (or `/signup`) - Standard email/password registration
- `POST /api/auth/login` - Email or phone login with password
- `POST /api/auth/demo-login` - Instant single-click authentication for demo testing
- `POST /api/auth/refresh` - Issue fresh access token via refresh token
- `POST /api/auth/logout` - Invalidate session
- `GET /api/auth/profile` - Fetch authenticated user profile and preferences
- `PUT /api/auth/profile` - Update name, avatar, or contact details
- `PUT /api/auth/preferences` - Save dietary tags (`veg`, `non-veg`) and ordering modes (`food`, `mart`)
- `GET /api/auth/addresses` - Retrieve user saved campus/hostel addresses
- `POST /api/auth/addresses` - Add new delivery address
- `PUT /api/auth/addresses/:id/default` - Set primary delivery address
- `DELETE /api/auth/addresses/:id` - Remove saved address

### 2. Marketplace & Discovery
- `GET /api/restaurants` - List campus restaurants with rating, cuisine, and delivery ETA filters
- `GET /api/restaurants/:id` - Fetch outlet profile, delivery metrics, and menu categories
- `GET /api/restaurants/:id/menu` - Fetch complete food items and customizations for an outlet
- `GET /api/groceries` - List 10-minute dark store grocery items with in-stock status
- `GET /api/groceries/categories` - Fetch grocery taxonomy (Dairy, Beverages, Study Munchies, etc.)
- `GET /api/search?q=query&type=all|food|grocery` - Unified marketplace fuzzy search

### 3. Persistent Server-Side Cart & Coupons
- `GET /api/cart` - Retrieve persistent server-side cart with calculated fees & taxes
- `POST /api/cart/items` - Add food item or grocery SKU with customizations
- `PUT /api/cart/items/:cartItemId` - Increment or decrement item quantity
- `DELETE /api/cart/items/:cartItemId` - Remove line item from cart
- `POST /api/cart/coupon` - Validate and apply voucher code (`LOCAFIRST`, `WELCOME50`, `CAMPUSFEST`, `STUDY50`)
- `DELETE /api/cart/coupon` - Remove applied voucher
- `PUT /api/cart/tip` - Update driver gratuity amount
- `PUT /api/cart/instruction` - Set delivery drop instructions
- `DELETE /api/cart` - Clear entire cart

### 4. Orders & Checkout
- `POST /api/orders` - Place order from cart with immutable price & item snapshots
- `GET /api/orders` - List active and historical orders for the authenticated user
- `GET /api/orders/:id` - Fetch detailed order status timeline and driver telemetry
- `POST /api/orders/:id/cancel` - Cancel order if still in placed/confirmed stage
- `POST /api/orders/:id/reorder` - Clone items from a past order back into active cart

### 5. Payments (Razorpay)
- `POST /api/payments/razorpay-order` - Create Razorpay order ID for authenticated checkout
- `POST /api/payments/verify` - Verify Razorpay signature and capture transaction
- `POST /api/payments/webhook` - Asynchronous webhook handler for captured transactions

### 6. Real-Time Tracking & Telemetry
- `GET /api/tracking/:orderId` - Retrieve live GPS coordinates, rider details, and remaining ETA
- `PUT /api/tracking/:orderId/status` - Update order stage (triggers Socket.IO broadcast)
- `PUT /api/tracking/:orderId/location` - Broadcast updated driver GPS coordinates

### 7. Administrative APIs (`role: admin`)
- `GET /api/admin/stats` - Platform revenue, active users, orders count, and partner counts
- `GET /api/admin/users` - Paginated user management table with role filters
- `PUT /api/admin/users/:id/role` - Assign role (`customer`, `admin`, `restaurant_owner`, etc.)
- `PUT /api/admin/users/:id/status` - Toggle user active / suspended state
- `GET /api/admin/orders` - Paginated list of all platform orders
- `PUT /api/admin/orders/:id/status` - Update order status with audit log
- `POST /api/admin/restaurants` - Register new campus eatery
- `PUT /api/admin/restaurants/:id` - Edit eatery metadata
- `DELETE /api/admin/restaurants/:id` - Remove eatery
- `POST /api/admin/coupons` - Create new promotional code
- `DELETE /api/admin/coupons/:code` - Deactivate coupon code
- `GET /api/admin/delivery-partners` - List campus riders and fleet status
- `GET /api/admin/audit-logs` - Inspect tamper-evident audit records

---

## ⚡ Socket.IO Real-Time Events

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `join_order_room` | Client → Server | `{ orderId }` | Subscribes client socket to a specific order room |
| `leave_order_room` | Client → Server | `{ orderId }` | Unsubscribes client from an order room |
| `order_status_updated` | Server → Client | `Order` object | Broadcast when order advances (e.g. `preparing`, `out_for_delivery`) |
| `driver_location_updated`| Server → Client | `{ lat, lng }` | Real-time GPS coordinates of the delivery rider |

---

## 🧪 Testing Backend End-to-End

Run the included automated verification script to validate all backend pipelines:
```bash
powershell -ExecutionPolicy Bypass -File .\test_e2e.ps1
```
This tests registration, address persistence, cart calculations, coupon validation, order snapshotting, Razorpay order generation, admin status transitions, re-order flows, and audit log persistence in one run.
