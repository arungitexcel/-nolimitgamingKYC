# KYC System – API Documentation

This document describes the KYC (Know Your Customer) system: how it works, all APIs, request/response formats, and cURL examples.

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Environment Variables](#environment-variables)
4. [Document Types & Required Files](#document-types--required-files)
5. [Status Flow](#status-flow)
6. [Base URL & Headers](#base-url--headers)
7. [KYC APIs](#kyc-apis)
8. [Admin APIs (API Key Management)](#admin-apis-api-key-management)
9. [Error Responses](#error-responses)
10. [Notifications & Webhooks](#notifications--webhooks)

---

## Overview

The KYC system allows:

- **Users** to submit identity documents (Passport, Driver’s License, Aadhaar, PAN) and a selfie.
- **Admins** to list submissions, view details, download documents, and approve or reject KYC.

Key behaviour:

- One submission per user per document type: submitting the same document type again **updates** the existing record instead of creating a duplicate.
- Submissions start in `pending_review`; admins move them to `approved` or `rejected`.
- Optional email notifications and webhooks when status changes to approved/rejected.

---

## How It Works

### User flow

1. User sends `POST /kyc/submit` with `userId`, `documentType`, personal details, and files (per document type).
2. If a submission for that `userId` + `documentType` already exists, it is **updated** (same KYC record, new files and data). Otherwise a new submission is created.
3. Status is set to `pending_review`.
4. User can check status with `GET /kyc/status?userId=...` or `?kycId=...`.

### Admin flow

1. Admin calls `GET /kyc/review` (optionally `?status=pending_review`) to list submissions.
2. Admin calls `GET /kyc/review/:kycId` to get full details and `filePaths`.
3. Admin can download a file with `GET /kyc/document/:kycId/:filename`.
4. Admin approves with `POST /kyc/approve` or rejects with `POST /kyc/reject`.
5. If `notifyEmail` is sent in approve/reject and email is configured, the user receives an email. If `KYC_WEBHOOK_URL` is set, a webhook is sent.

### Authentication

- **User-facing endpoints** (`/kyc/submit`, `/kyc/status`): no auth; your app should identify users via `userId`.
- **Admin endpoints** (`/kyc/review`, `/kyc/review/:kycId`, `/kyc/document/...`, `/kyc/approve`, `/kyc/reject`): require header `X-Admin-Key` (master key from `ADMIN_API_KEY` or a key created via `/admin/api-keys`).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | e.g. `development` |
| `PORT` | No | Server port (default `3000`) |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |
| `ADMIN_API_KEY` | Yes (for admin) | Master admin key; also used to create API keys |
| `EMAIL_SERVICE` | No | e.g. `gmail` (for nodemailer) |
| `EMAIL_USER` | No | Email account for sending |
| `EMAIL_PASSWORD` | No | Password or app password |
| `EMAIL_FROM` | No | From address (defaults to `EMAIL_USER`) |
| `KYC_WEBHOOK_URL` | No | URL to POST KYC status change events |

---

## Document Types & Required Files

| Document Type | Value | Required Form Fields (files) |
|---------------|--------|-------------------------------|
| Passport | `passport` | `passport`, `selfie` |
| Driver’s License | `drivers_license` | `driver_front`, `driver_back`, `selfie` |
| Aadhaar | `aadhaar` | `aadhaar_front`, `selfie` |
| PAN | `pan` | `pan_front`, `selfie` |

- **Allowed file types:** JPEG, PNG, PDF.  
- **Max file size:** 10 MB per file.

---

## Status Flow

| Status | Description |
|--------|-------------|
| `draft` | Reserved; not used on submit |
| `submitted` | Legacy; new submissions use `pending_review` |
| `pending_review` | Just submitted or resubmitted; waiting for admin |
| `approved` | Admin approved the KYC |
| `rejected` | Admin rejected (see `rejectionReason`) |

Flow: **Submit → `pending_review` → `approved` or `rejected`**. After reject, user can resubmit; same record is updated and set back to `pending_review`.

---

## Base URL & Headers

- **Base URL:** `http://localhost:3019` (or your `PORT` and host).
- **Admin requests:** Include `X-Admin-Key: YOUR_ADMIN_KEY` and `Content-Type: application/json` (or `multipart/form-data` for submit).

---

## KYC APIs

### 1. Submit KYC

Creates or updates a KYC submission for the given user and document type.

- **Endpoint:** `POST /kyc/submit`
- **Auth:** None
- **Content-Type:** `multipart/form-data`

**Form fields (required):**

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Your user identifier |
| `documentType` | string | `passport` \| `drivers_license` \| `aadhaar` \| `pan` |
| `fullName` | string | Full name as on document |
| `dateOfBirth` | string | Date of birth |
| `idNumber` | string | Document number (e.g. Aadhaar/PAN number) |
| + file fields | files | As per [Document Types](#document-types--required-files) |

**Success response:** `201 Created`

```json
{
  "status": "success",
  "data": {
    "kycId": "507f1f77bcf86cd799439011",
    "status": "pending_review",
    "documentType": "aadhaar"
  }
}
```

**cURL (Aadhaar example):**

```bash
curl -X POST http://localhost:3019/kyc/submit \
  -F "userId=user123" \
  -F "documentType=aadhaar" \
  -F "fullName=John Doe" \
  -F "dateOfBirth=1990-01-15" \
  -F "idNumber=123456789012" \
  -F "aadhaar_front=@/path/to/aadhaar_front.jpg" \
  -F "selfie=@/path/to/selfie.jpg"
```

**cURL (Passport example):**

```bash
curl -X POST http://localhost:3019/kyc/submit \
  -F "userId=user123" \
  -F "documentType=passport" \
  -F "fullName=Jane Smith" \
  -F "dateOfBirth=1985-06-20" \
  -F "idNumber=P1234567" \
  -F "passport=@/path/to/passport.pdf" \
  -F "selfie=@/path/to/selfie.png"
```

---

### 2. Get KYC Status

Returns the KYC submission for a user (latest by `createdAt`) or by `kycId`.

- **Endpoint:** `GET /kyc/status`
- **Auth:** None
- **Query:** either `userId` or `kycId` (one required)

**Success response:** `200 OK`

```json
{
  "status": "success",
  "data": {
    "kycId": "507f1f77bcf86cd799439011",
    "userId": "user123",
    "status": "pending_review",
    "documentType": "aadhaar",
    "fullName": "John Doe",
    "dateOfBirth": "1990-01-15",
    "idNumber": "123456789012",
    "rejectionReason": null,
    "reviewedAt": null,
    "createdAt": "2025-02-27T10:00:00.000Z",
    "updatedAt": "2025-02-27T10:00:00.000Z"
  }
}
```

**cURL by userId:**

```bash
curl -X GET "http://localhost:3019/kyc/status?userId=user123"
```

**cURL by kycId:**

```bash
curl -X GET "http://localhost:3019/kyc/status?kycId=507f1f77bcf86cd799439011"
```

---

### 3. List Submissions for Review (Admin)

Returns a list of KYC submissions, optionally filtered by status.

- **Endpoint:** `GET /kyc/review`
- **Auth:** `X-Admin-Key` required
- **Query:** `status` (optional) – e.g. `pending_review`, `approved`, `rejected`

**Success response:** `200 OK`

```json
{
  "status": "success",
  "data": [
    {
      "kycId": "507f1f77bcf86cd799439011",
      "userId": "user123",
      "documentType": "aadhaar",
      "status": "pending_review",
      "fullName": "John Doe",
      "dateOfBirth": "1990-01-15",
      "idNumber": "123456789012",
      "rejectionReason": null,
      "reviewedAt": null,
      "reviewedBy": null,
      "createdAt": "2025-02-27T10:00:00.000Z",
      "updatedAt": "2025-02-27T10:00:00.000Z"
    }
  ]
}
```

**cURL (all statuses):**

```bash
curl -X GET http://localhost:3019/kyc/review \
  -H "X-Admin-Key: your-secret-admin-key"
```

**cURL (pending only):**

```bash
curl -X GET "http://localhost:3019/kyc/review?status=pending_review" \
  -H "X-Admin-Key: your-secret-admin-key"
```

---

### 4. Get Single KYC Details (Admin)

Returns full submission details including `filePaths` for viewing or downloading documents.

- **Endpoint:** `GET /kyc/review/:kycId`
- **Auth:** `X-Admin-Key` required
- **Params:** `kycId` – MongoDB ObjectId of the submission

**Success response:** `200 OK`

```json
{
  "status": "success",
  "data": {
    "kycId": "507f1f77bcf86cd799439011",
    "userId": "user123",
    "documentType": "aadhaar",
    "status": "pending_review",
    "fullName": "John Doe",
    "dateOfBirth": "1990-01-15",
    "idNumber": "123456789012",
    "filePaths": {
      "aadhaar_front": "user123/507f1f77bcf86cd799439011/aadhaar_front.jpg",
      "selfie": "user123/507f1f77bcf86cd799439011/selfie.jpg"
    },
    "rejectionReason": null,
    "reviewedAt": null,
    "reviewedBy": null,
    "createdAt": "2025-02-27T10:00:00.000Z",
    "updatedAt": "2025-02-27T10:00:00.000Z"
  }
}
```

**cURL:**

```bash
curl -X GET http://localhost:3019/kyc/review/507f1f77bcf86cd799439011 \
  -H "X-Admin-Key: your-secret-admin-key"
```

---

### 5. Download Document (Admin)

Streams a single file (image or PDF) for a given KYC submission.

- **Endpoint:** `GET /kyc/document/:kycId/:filename`
- **Auth:** `X-Admin-Key` required
- **Params:** `kycId`, `filename` – e.g. `aadhaar_front.jpg`, `selfie.png`

**Success response:** `200 OK` with body as the file (e.g. `Content-Type: image/jpeg` or `application/pdf`).

**cURL (save to file):**

```bash
curl -X GET "http://localhost:3019/kyc/document/507f1f77bcf86cd799439011/aadhaar_front.jpg" \
  -H "X-Admin-Key: your-secret-admin-key" \
  -o aadhaar_front.jpg
```

**cURL (selfie):**

```bash
curl -X GET "http://localhost:3019/kyc/document/507f1f77bcf86cd799439011/selfie.jpg" \
  -H "X-Admin-Key: your-secret-admin-key" \
  -o selfie.jpg
```

---

### 6. Approve KYC (Admin)

Marks a submission as approved and optionally sends email/webhook.

- **Endpoint:** `POST /kyc/approve`
- **Auth:** `X-Admin-Key` required
- **Content-Type:** `application/json`

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kycId` | string | Yes | Submission ID |
| `reviewedBy` | string | No | Admin identifier for audit |
| `notifyEmail` | string | No | User email for approval notification |

**Success response:** `200 OK`

```json
{
  "status": "success",
  "data": {
    "kycId": "507f1f77bcf86cd799439011",
    "status": "approved"
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3019/kyc/approve \
  -H "X-Admin-Key: your-secret-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"kycId":"507f1f77bcf86cd799439011","reviewedBy":"admin1","notifyEmail":"user@example.com"}'
```

**cURL (minimal):**

```bash
curl -X POST http://localhost:3019/kyc/approve \
  -H "X-Admin-Key: your-secret-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"kycId":"507f1f77bcf86cd799439011"}'
```

---

### 7. Reject KYC (Admin)

Marks a submission as rejected with a reason and optionally sends email/webhook.

- **Endpoint:** `POST /kyc/reject`
- **Auth:** `X-Admin-Key` required
- **Content-Type:** `application/json`

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kycId` | string | Yes | Submission ID |
| `reason` | string | Yes | Rejection reason (shown to user) |
| `reviewedBy` | string | No | Admin identifier |
| `notifyEmail` | string | No | User email for rejection notification |

**Success response:** `200 OK`

```json
{
  "status": "success",
  "data": {
    "kycId": "507f1f77bcf86cd799439011",
    "status": "rejected"
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3019/kyc/reject \
  -H "X-Admin-Key: your-secret-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"kycId":"507f1f77bcf86cd799439011","reason":"Document image is blurry. Please resubmit a clear photo.","reviewedBy":"admin1","notifyEmail":"user@example.com"}'
```

**cURL (minimal):**

```bash
curl -X POST http://localhost:3019/kyc/reject \
  -H "X-Admin-Key: your-secret-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"kycId":"507f1f77bcf86cd799439011","reason":"Document not clearly visible"}'
```

---

## Admin APIs (API Key Management)

All admin key management routes require the **master** `X-Admin-Key` (value of `ADMIN_API_KEY`). Created API keys can then be used as `X-Admin-Key` for KYC admin endpoints.

### 8. Create API Key

Creates a new API key. The raw key is returned **only once**; store it securely.

- **Endpoint:** `POST /admin/api-keys`
- **Auth:** Master `X-Admin-Key` required
- **Content-Type:** `application/json`

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Label for this key (e.g. "Dashboard", "Integration") |

**Success response:** `201 Created`

```json
{
  "message": "API key created. Store the key securely; it will not be shown again.",
  "apiKey": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Dashboard",
    "key": "kyc_xxxxxxxxxxxxxxxxxxxxxxxx",
    "prefix": "kyc_",
    "createdAt": "2025-02-27T10:00:00.000Z"
  }
}
```

**cURL:**

```bash
curl -X POST http://localhost:3019/admin/api-keys \
  -H "X-Admin-Key: your-secret-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"Dashboard"}'
```

---

### 9. List API Keys

Lists all API keys (raw key is never returned). Optional filter for active only.

- **Endpoint:** `GET /admin/api-keys`
- **Auth:** Master `X-Admin-Key` required
- **Query:** `active` (optional) – `true` to list only non-revoked keys

**Success response:** `200 OK`

```json
{
  "apiKeys": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Dashboard",
      "prefix": "kyc_",
      "createdAt": "2025-02-27T10:00:00.000Z",
      "lastUsedAt": "2025-02-27T11:00:00.000Z",
      "revokedAt": null
    }
  ]
}
```

**cURL (all keys):**

```bash
curl -X GET http://localhost:3019/admin/api-keys \
  -H "X-Admin-Key: your-secret-admin-key"
```

**cURL (active only):**

```bash
curl -X GET "http://localhost:3019/admin/api-keys?active=true" \
  -H "X-Admin-Key: your-secret-admin-key"
```

---

### 10. Revoke API Key

Revokes an API key by ID. Revoked keys can no longer be used.

- **Endpoint:** `DELETE /admin/api-keys/:id`
- **Auth:** Master `X-Admin-Key` required
- **Params:** `id` – API key document ID

**Success response:** `200 OK`

```json
{
  "message": "API key revoked",
  "id": "507f1f77bcf86cd799439012",
  "revokedAt": "2025-02-27T12:00:00.000Z"
}
```

**cURL:**

```bash
curl -X DELETE http://localhost:3019/admin/api-keys/507f1f77bcf86cd799439012 \
  -H "X-Admin-Key: your-secret-admin-key"
```

---

## Health Check

- **Endpoint:** `GET /health`
- **Auth:** None

**Success response:** `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2025-02-27T12:00:00.000Z",
  "uptime": 3600.5
}
```

**cURL:**

```bash
curl -X GET http://localhost:3019/health
```

---

## Error Responses

Failed requests return a JSON body and an appropriate HTTP status.

**Validation error (400):**

```json
{
  "status": "error",
  "message": "userId is required"
}
```

**Not found (404):**

```json
{
  "status": "error",
  "message": "KYC submission not found"
}
```

**Unauthorized – missing or invalid admin key (401):**

```json
{
  "status": "error",
  "message": "Missing admin key"
}
```

or

```json
{
  "status": "error",
  "message": "Invalid or expired admin key"
}
```

---

## Notifications & Webhooks

### Email

- Configure `EMAIL_USER`, `EMAIL_PASSWORD` (and optionally `EMAIL_SERVICE`, `EMAIL_FROM`).
- When approving or rejecting, send `notifyEmail` in the request body.
- The system sends an email to that address with approval or rejection (including reason).

### Webhook

- Set `KYC_WEBHOOK_URL` to your endpoint URL.
- On every approve/reject, the server sends a `POST` request with JSON like:

```json
{
  "userId": "user123",
  "status": "approved",
  "timestamp": "2025-02-27T12:00:00.000Z",
  "kycId": "507f1f77bcf86cd799439011",
  "fullName": "John Doe",
  "reason": null
}
```

For rejections, `reason` contains the rejection reason. The server does not retry on failure; implement idempotency and retries on your side if needed.

---

## Summary of Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/kyc/submit` | None | Submit or update KYC (multipart) |
| GET | `/kyc/status` | None | Get status by `userId` or `kycId` |
| GET | `/kyc/review` | Admin | List submissions (optional `?status=`) |
| GET | `/kyc/review/:kycId` | Admin | Get one submission with file paths |
| GET | `/kyc/document/:kycId/:filename` | Admin | Download document file |
| POST | `/kyc/approve` | Admin | Approve KYC |
| POST | `/kyc/reject` | Admin | Reject KYC |
| POST | `/admin/api-keys` | Master | Create API key |
| GET | `/admin/api-keys` | Master | List API keys |
| DELETE | `/admin/api-keys/:id` | Master | Revoke API key |

All KYC admin routes accept either the master `ADMIN_API_KEY` or a key created via `POST /admin/api-keys` in the `X-Admin-Key` header.
