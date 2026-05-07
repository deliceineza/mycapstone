# Tenant Payment & Communication API - Swagger Documentation

## Access the Swagger UI

Once the API server is running, visit:
```
http://localhost:3001/api-docs
```

## API Base URL

Development: `http://localhost:3001`
Production: `https://api.example.com`

## Authentication

All endpoints except registration and login require Bearer token authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

### To get a token:

1. Register or login at `/api/auth/register` or `/api/auth/login`
2. Use the returned `token` in the Authorization header

## Available Test Accounts

After seeding:
- **Landlord**: landlord@example.com / Password123!
- **Tenant**: tenant@example.com / Password123!

---

## API Endpoints

### Authentication Routes `/api/auth`

#### POST /register
Register a new user (landlord or tenant)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "landlord" // or "tenant"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### POST /login
Authenticate with an email address or phone number and receive JWT tokens

**Request Body:**
```json
{
  "identifier": "landlord@example.com",
  "password": "Password123!"
}
```

You may also send `"email"` or `"phone"` instead of `"identifier"`.

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### POST /refresh
Refresh the access token

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-token",
    "refreshToken": "new-refresh-token"
  }
}
```

#### GET /me
Get current authenticated user details

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "role": "landlord",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### PUT /profile
Update user profile (authenticated users only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "profileImage": "https://example.com/image.jpg",
  "notificationPreferences": {
    "email": true,
    "push": true,
    "sms": false
  }
}
```

#### PUT /change-password
Change user password (authenticated users only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### PUT /push-token
Update user push notification token

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "pushToken": "device-push-token"
}
```

#### POST /logout
Logout (authenticated users only)

**Headers:** `Authorization: Bearer <token>`

---

### Properties Routes `/api/properties`

#### GET /
List all properties (landlord only)

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10) - Items per page
- `sortBy` - Property: name, createdAt, etc.
- `order` - ASC or DESC

**Response (200):**
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "uuid",
        "name": "Sunset Apartments",
        "address": "123 Main Street",
        "city": "Los Angeles",
        "state": "CA",
        "zipCode": "90001",
        "propertyType": "apartment",
        "unitCount": 2,
        "description": "Beautiful apartments",
        "amenities": ["parking", "gym"],
        "units": [],
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

#### POST /
Create a new property (landlord only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Sunset Apartments",
  "address": "123 Main Street",
  "city": "Los Angeles",
  "state": "CA",
  "zipCode": "90001",
  "propertyType": "apartment",
  "unitCount": 2,
  "description": "Beautiful apartment complex",
  "amenities": ["parking", "gym", "pool"],
  "images": []
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Property created successfully",
  "data": { /* property object */ }
}
```

#### GET /:id
Get property details

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": { /* property details with units */ }
}
```

#### PUT /:id
Update property details (landlord only)

**Headers:** `Authorization: Bearer <token>`

#### DELETE /:id
Delete property (landlord only)

**Headers:** `Authorization: Bearer <token>`

#### GET /:propertyId/units
List all units in a property

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "units": [
      {
        "id": "uuid",
        "propertyId": "uuid",
        "unitNumber": "101",
        "floor": 1,
        "bedrooms": 2,
        "bathrooms": 1,
        "squareFeet": 850,
        "rentAmount": 1500.00,
        "status": "occupied",
        "features": ["balcony", "dishwasher"]
      }
    ]
  }
}
```

#### POST /:propertyId/units
Create a new unit (landlord only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "unitNumber": "102",
  "floor": 1,
  "bedrooms": 1,
  "bathrooms": 1,
  "squareFeet": 650,
  "rentAmount": 1200.00,
  "depositAmount": 1200.00,
  "status": "vacant",
  "features": ["updated kitchen"]
}
```

---

### Leases Routes `/api/leases`

#### GET /
List all leases (with filters based on role)

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `limit` - Pagination
- `status` - active, terminated, pending
- `tenantId` - Filter by tenant
- `propertyId` - Filter by property

**Response (200):**
```json
{
  "success": true,
  "data": {
    "leases": [
      {
        "id": "uuid",
        "unitId": "uuid",
        "tenantId": "uuid",
        "landlordId": "uuid",
        "startDate": "2024-01-01",
        "endDate": "2025-01-01",
        "monthlyRent": 1500.00,
        "securityDeposit": 1500.00,
        "paymentDueDay": 1,
        "status": "active"
      }
    ],
    "pagination": { /* ... */ }
  }
}
```

#### POST /
Create a new lease (landlord only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "unitId": "uuid",
  "tenantId": "uuid",
  "startDate": "2024-01-01",
  "endDate": "2025-01-01",
  "monthlyRent": 1500.00,
  "securityDeposit": 1500.00,
  "paymentDueDay": 1,
  "lateFeeAmount": 50.00,
  "lateFeeGracePeriod": 5
}
```

#### GET /:id
Get lease details

**Headers:** `Authorization: Bearer <token>`

#### PUT /:id
Update lease details (landlord only)

#### POST /:id/terminate
Terminate a lease (landlord only)

#### GET /tenant/current
Get current tenant's lease

**Headers:** `Authorization: Bearer <token>`

**Response:** Single lease object for authenticated tenant

---

### Payments Routes `/api/payments`

#### GET /
List payments with filters

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `limit` - Pagination
- `status` - pending, completed, failed, overdue
- `leaseId` - Filter by lease
- `fromDate`, `toDate` - Date range filters

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "leaseId": "uuid",
        "tenantId": "uuid",
        "amount": 1500.00,
        "lateFee": 0,
        "totalAmount": 1500.00,
        "dueDate": "2024-02-01",
        "status": "pending"
      }
    ],
    "pagination": { /* ... */ }
  }
}
```

#### POST /
Create a new payment (landlord only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "leaseId": "uuid",
  "tenantId": "uuid",
  "amount": 1500.00,
  "dueDate": "2024-02-01",
  "paymentType": "rent"
}
```

#### GET /:id
Get payment details

#### POST /:id/pay
Initiate Stripe payment (tenant only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "stripePaymentMethodId": "pm_..."
}
```

#### POST /:id/confirm
Confirm payment status

#### POST /:id/record-manual
Record manual/cash payment (landlord only)

**Request Body:**
```json
{
  "paymentDate": "2024-01-25",
  "paymentMethod": "cash"
}
```

#### GET /stats/summary
Get payment statistics

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCollected": 15000.00,
    "totalOutstanding": 5000.00,
    "overdueCount": 2,
    "pendingCount": 3
  }
}
```

#### POST /generate-monthly
Generate monthly payments for all leases (landlord only)

---

### Maintenance Routes `/api/maintenance`

#### GET /
List maintenance requests

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` - pending, in-progress, completed, cancelled
- `priority` - low, medium, high

#### POST /
Create a maintenance request (tenant only)

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "unitId": "uuid",
  "title": "Leaky faucet",
  "description": "Kitchen sink is leaking",
  "category": "plumbing",
  "priority": "high",
  "images": []
}
```

#### GET /:id
Get maintenance request details

#### PUT /:id
Update maintenance request (landlord only)

**Request Body:**
```json
{
  "status": "in-progress",
  "assignedTo": "John Smith",
  "estimatedCompletionDate": "2024-02-01"
}
```

#### POST /:id/cancel
Cancel maintenance request (tenant only)

#### GET /stats/summary
Get maintenance statistics

---

### Messages Routes `/api/messages`

#### GET /conversations
List all conversations

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "participantName": "John Doe",
        "lastMessage": "Thank you",
        "lastMessageTime": "2024-01-28T15:30:00Z",
        "unreadCount": 2
      }
    ]
  }
}
```

#### POST /conversations
Create a new conversation

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "participantId": "uuid",
  "subject": "Unit 101 Maintenance"
}
```

#### GET /conversations/:id/messages
Get messages in a conversation

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `limit` - Pagination

#### POST /conversations/:id/messages
Send a message

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "text": "Message content",
  "attachments": []
}
```

#### PUT /conversations/:id/archive
Archive a conversation

#### GET /unread-count
Get total unread message count

---

### Notifications Routes `/api/notifications`

#### GET /
List user notifications

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `limit` - Pagination
- `read` - true/false/all

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "payment_due",
        "title": "Payment Due",
        "message": "Rent payment is due on Feb 1",
        "read": false,
        "createdAt": "2024-01-28T00:00:00Z"
      }
    ]
  }
}
```

#### PUT /:id/read
Mark notification as read

#### PUT /read-all
Mark all notifications as read

#### DELETE /:id
Delete a notification

#### DELETE /
Clear all notifications

#### GET /unread-count
Get unread notification count

#### PUT /preferences
Update notification preferences

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": true,
  "push": true,
  "sms": false
}
```

---

### AI Routes `/api/ai`

#### POST /conversations/:conversationId/summarize
Summarize a conversation using AI

**Headers:** `Authorization: Bearer <token>`

#### GET /conversations/:conversationId/suggestions
Get AI-powered reply suggestions

#### POST /maintenance/analyze
Analyze maintenance request priority

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Leaky faucet",
  "description": "Kitchen sink is leaking",
  "category": "plumbing"
}
```

#### GET /leases/:leaseId/summary
Generate AI summary of lease

#### POST /payments/reminder-message
Generate AI payment reminder message

---

### System Endpoints

#### GET /api/health
Health check endpoint (no authentication required)

**Response (200):**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-28T15:30:00Z",
  "environment": "development"
}
```

#### GET /api
API documentation endpoint showing all available routes

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `INVALID_CREDENTIALS` - Login failed
- `UNAUTHORIZED` - Missing or invalid token
- `FORBIDDEN` - User lacks permission
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input data
- `EMAIL_EXISTS` - Email already registered
- `INTERNAL_ERROR` - Server error

---

## Rate Limiting

- General endpoints: 100 requests per 15 minutes
- Auth endpoints: 10 requests per hour for login/register

---

## Testing with cURL

### Login:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"landlord@example.com","password":"Password123!"}'
```

### List Properties:
```bash
curl -X GET http://localhost:3001/api/properties \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Maintenance Request:
```bash
curl -X POST http://localhost:3001/api/maintenance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "unitId":"unit-uuid",
    "title":"Broken window",
    "description":"Bedroom window is broken",
    "category":"structural",
    "priority":"high"
  }'
```

---

## WebSocket Endpoints (Future)

- `/ws/messages/:conversationId` - Real-time messaging
- `/ws/notifications` - Real-time notifications

---

For more details, visit the interactive Swagger UI at:
```
http://localhost:3001/api-docs
```
