# API Documentation
## SAP Unified Learning Hub Navigator (ULHN)

**API Version:** 1.0  
**Base URL:** `https://api.ulhn.com/v1`  
**Date:** November 16, 2025  

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [User Management](#2-user-management)
3. [Resources](#3-resources)
4. [Search](#4-search)
5. [Personalization](#5-personalization)
6. [Modules, Processes & Roles](#6-modules-processes--roles)
7. [Admin](#7-admin)
8. [Analytics](#8-analytics)
9. [Error Handling](#9-error-handling)
10. [Rate Limiting](#10-rate-limiting)

---

## API Overview

### Base Information
- **Protocol**: HTTPS only
- **Format**: JSON (application/json)
- **Authentication**: JWT Bearer tokens
- **Versioning**: URL path (`/v1`, `/v2`)
- **Charset**: UTF-8

### Standard Headers
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
Accept: application/json
X-API-Version: 1.0
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 204 | No Content - Success, no body |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## 1. Authentication

### 1.1 Register User

**Endpoint**: `POST /auth/register`  
**Authentication**: None  
**Rate Limit**: 10/hour per IP

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "acceptTerms": true
}
```

**Response**: `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "registered",
    "status": "active",
    "emailVerified": false,
    "createdAt": "2025-11-16T10:00:00Z"
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Errors**:
- `400`: Invalid email format
- `400`: Password does not meet requirements
- `409`: Email already registered

---

### 1.2 Login

**Endpoint**: `POST /auth/login`  
**Authentication**: None  
**Rate Limit**: 10/min per IP

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response**: `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "registered",
    "status": "active"
  }
}
```

**Errors**:
- `401`: Invalid credentials
- `401`: Email not verified
- `403`: Account suspended
- `429`: Too many failed attempts (15 min lockout)

---

### 1.3 OAuth Login (Google/Microsoft)

**Endpoint**: `GET /auth/{provider}`  
**Authentication**: None  
**Providers**: `google`, `microsoft`

**Redirect to OAuth provider, then callback**:

**Callback**: `GET /auth/{provider}/callback?code=xxx`

**Response**: Redirects to frontend with tokens in URL params or sets cookies.

---

### 1.4 Refresh Token

**Endpoint**: `POST /auth/refresh`  
**Authentication**: Refresh token required

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**: `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Errors**:
- `401`: Invalid refresh token
- `401`: Refresh token expired

---

### 1.5 Logout

**Endpoint**: `POST /auth/logout`  
**Authentication**: Required

**Response**: `204 No Content`

Revokes refresh token and adds access token to blacklist.

---

### 1.6 Request Password Reset

**Endpoint**: `POST /auth/forgot-password`  
**Authentication**: None  
**Rate Limit**: 3/hour per email

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**: `200 OK`
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

---

### 1.7 Reset Password

**Endpoint**: `POST /auth/reset-password`  
**Authentication**: None

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass123!"
}
```

**Response**: `200 OK`
```json
{
  "message": "Password reset successful. Please login with your new password."
}
```

**Errors**:
- `400`: Invalid or expired token
- `400`: New password same as old

---

## 2. User Management

### 2.1 Get Current User

**Endpoint**: `GET /users/me`  
**Authentication**: Required

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "registered",
  "status": "active",
  "emailVerified": true,
  "lastLoginAt": "2025-11-16T10:00:00Z",
  "createdAt": "2025-11-01T10:00:00Z",
  "preferences": {
    "language": "en",
    "theme": "light",
    "primaryRoleId": "uuid",
    "trackHistory": true,
    "emailNotifications": true
  }
}
```

---

### 2.2 Update User Profile

**Endpoint**: `PATCH /users/me`  
**Authentication**: Required

**Request Body**:
```json
{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "registered",
  "updatedAt": "2025-11-16T10:30:00Z"
}
```

---

### 2.3 Update User Preferences

**Endpoint**: `PATCH /users/me/preferences`  
**Authentication**: Required

**Request Body**:
```json
{
  "language": "hi",
  "theme": "dark",
  "primaryRoleId": "uuid",
  "trackHistory": false,
  "emailNotifications": false
}
```

**Response**: `200 OK`
```json
{
  "language": "hi",
  "theme": "dark",
  "primaryRoleId": "uuid",
  "trackHistory": false,
  "emailNotifications": false,
  "updatedAt": "2025-11-16T10:30:00Z"
}
```

---

### 2.4 Change Password

**Endpoint**: `POST /users/me/password`  
**Authentication**: Required

**Request Body**:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response**: `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

**Errors**:
- `400`: Current password incorrect
- `400`: New password same as current

---

### 2.5 Delete Account

**Endpoint**: `DELETE /users/me`  
**Authentication**: Required

**Request Body**:
```json
{
  "password": "UserPass123!",
  "confirmation": "DELETE"
}
```

**Response**: `204 No Content`

Account soft-deleted (30-day grace period).

---

## 3. Resources

### 3.1 List Resources

**Endpoint**: `GET /resources`  
**Authentication**: Optional (public endpoint)  
**Rate Limit**: 100/min

**Query Parameters**:
```
?page=1                  # Page number (default: 1)
&limit=20                # Items per page (default: 20, max: 100)
&sourceType=course       # Filter by source type
&moduleCode=FI           # Filter by module
&processCode=P2P         # Filter by process
&roleCode=AP_CLERK       # Filter by role
&difficulty=beginner     # Filter by difficulty
&language=en             # Filter by language
&sort=createdAt          # Sort field (createdAt, views, favorites)
&order=desc              # Sort order (asc, desc)
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Invoice Posting in SAP Fiori",
      "description": "Learn how to post invoices using Fiori app F0710",
      "url": "https://help.sap.com/...",
      "sourceType": "demo",
      "sourceName": "SAP Enable Now",
      "thumbnailUrl": "https://cdn.ulhn.com/...",
      "duration": 15,
      "difficulty": "beginner",
      "language": "en",
      "fioriAppId": "F0710",
      "tCode": "FB60",
      "modules": [
        {
          "id": "uuid",
          "code": "FI",
          "name": "Financial Accounting"
        }
      ],
      "processes": [
        {
          "id": "uuid",
          "code": "P2P",
          "name": "Procure-to-Pay"
        }
      ],
      "roles": [
        {
          "id": "uuid",
          "code": "AP_CLERK",
          "name": "Accounts Payable Clerk",
          "relevanceScore": 95
        }
      ],
      "tags": ["invoice", "posting", "fiori"],
      "viewsCount": 1523,
      "favoritesCount": 234,
      "isFavorited": false,
      "createdAt": "2025-10-01T10:00:00Z",
      "updatedAt": "2025-11-15T10:00:00Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 50,
    "totalItems": 1000,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### 3.2 Get Resource by ID

**Endpoint**: `GET /resources/:id`  
**Authentication**: Optional

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "title": "Invoice Posting in SAP Fiori",
  "description": "Detailed description...",
  "url": "https://help.sap.com/...",
  "sourceType": "demo",
  "sourceName": "SAP Enable Now",
  "thumbnailUrl": "https://cdn.ulhn.com/...",
  "duration": 15,
  "difficulty": "beginner",
  "language": "en",
  "fioriAppId": "F0710",
  "tCode": "FB60",
  "modules": [...],
  "processes": [...],
  "roles": [...],
  "tags": [...],
  "relatedResources": [
    {
      "id": "uuid",
      "title": "Related Resource",
      "sourceType": "video"
    }
  ],
  "viewsCount": 1523,
  "favoritesCount": 234,
  "isFavorited": true,
  "userNote": {
    "id": "uuid",
    "content": "My personal notes...",
    "updatedAt": "2025-11-16T10:00:00Z"
  },
  "createdAt": "2025-10-01T10:00:00Z",
  "updatedAt": "2025-11-15T10:00:00Z",
  "lastValidatedAt": "2025-11-15T00:00:00Z"
}
```

**Errors**:
- `404`: Resource not found

---

### 3.3 Track Resource View

**Endpoint**: `POST /resources/:id/view`  
**Authentication**: Optional (tracked anonymously if not logged in)

**Request Body**:
```json
{
  "duration": 120
}
```

**Response**: `204 No Content`

Records view in history and increments views count.

---

## 4. Search

### 4.1 Global Search

**Endpoint**: `POST /search`  
**Authentication**: Optional  
**Rate Limit**: 30/min (registered), 10/min (anonymous)

**Request Body**:
```json
{
  "query": "invoice posting",
  "filters": {
    "sourceTypes": ["demo", "video"],
    "moduleCodes": ["FI"],
    "processCodes": ["P2P"],
    "roleCodes": ["AP_CLERK"],
    "difficulties": ["beginner", "intermediate"],
    "languages": ["en"],
    "fioriAppId": "F0710",
    "tCode": "FB60"
  },
  "sort": {
    "field": "relevance",
    "order": "desc"
  },
  "page": 1,
  "limit": 20
}
```

**Response**: `200 OK`
```json
{
  "query": "invoice posting",
  "results": {
    "demos": {
      "count": 15,
      "items": [...]
    },
    "courses": {
      "count": 8,
      "items": [...]
    },
    "videos": {
      "count": 22,
      "items": [...]
    },
    "pdfs": {
      "count": 12,
      "items": [...]
    },
    "apps": {
      "count": 3,
      "items": [...]
    }
  },
  "totalResults": 60,
  "searchTime": "0.345s",
  "suggestions": ["invoice verification", "invoice payment"],
  "meta": {
    "currentPage": 1,
    "totalPages": 3,
    "itemsPerPage": 20
  }
}
```

---

### 4.2 Search Autocomplete

**Endpoint**: `GET /search/autocomplete`  
**Authentication**: Optional  
**Rate Limit**: 60/min

**Query Parameters**:
```
?q=invo               # Query string (min 2 chars)
&limit=10             # Max suggestions (default: 10)
```

**Response**: `200 OK`
```json
{
  "suggestions": [
    {
      "text": "invoice posting",
      "type": "query",
      "count": 1523
    },
    {
      "text": "Invoice Posting in SAP Fiori",
      "type": "resource",
      "resourceId": "uuid",
      "sourceType": "demo"
    },
    {
      "text": "F0710 - Invoice Posting",
      "type": "app",
      "fioriAppId": "F0710"
    }
  ]
}
```

---

### 4.3 Search by Fiori App ID

**Endpoint**: `GET /search/fiori/:appId`  
**Authentication**: Optional

**Response**: `200 OK`
```json
{
  "fioriAppId": "F0710",
  "appName": "Post Supplier Invoice",
  "resources": [
    {
      "id": "uuid",
      "title": "Demo: Post Supplier Invoice",
      "sourceType": "demo",
      "url": "https://..."
    }
  ],
  "totalResults": 12
}
```

---

### 4.4 Search by T-Code

**Endpoint**: `GET /search/tcode/:tcode`  
**Authentication**: Optional

**Response**: `200 OK`
```json
{
  "tCode": "FB60",
  "description": "Enter Supplier Invoice",
  "resources": [
    {
      "id": "uuid",
      "title": "FB60 - Enter Supplier Invoice",
      "sourceType": "video",
      "url": "https://..."
    }
  ],
  "totalResults": 18
}
```

---

## 5. Personalization

### 5.1 Favorites

#### 5.1.1 List Favorites

**Endpoint**: `GET /users/me/favorites`  
**Authentication**: Required

**Query Parameters**:
```
?page=1
&limit=20
&folder=Work              # Filter by folder
&sourceType=demo          # Filter by type
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "resource": {
        "id": "uuid",
        "title": "Invoice Posting",
        "sourceType": "demo",
        "url": "https://..."
      },
      "folderName": "Work",
      "createdAt": "2025-11-10T10:00:00Z"
    }
  ],
  "folders": ["Work", "Study", "Personal"],
  "meta": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 48
  }
}
```

---

#### 5.1.2 Add Favorite

**Endpoint**: `POST /users/me/favorites`  
**Authentication**: Required

**Request Body**:
```json
{
  "resourceId": "uuid",
  "folderName": "Work"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "resourceId": "uuid",
  "folderName": "Work",
  "createdAt": "2025-11-16T10:00:00Z"
}
```

**Errors**:
- `409`: Resource already favorited
- `403`: Favorite limit reached (50 for free, unlimited for premium)

---

#### 5.1.3 Remove Favorite

**Endpoint**: `DELETE /users/me/favorites/:id`  
**Authentication**: Required

**Response**: `204 No Content`

---

### 5.2 Playlists

#### 5.2.1 List Playlists

**Endpoint**: `GET /users/me/playlists`  
**Authentication**: Required

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "AP Learning Path",
      "description": "My custom AP learning journey",
      "visibility": "private",
      "itemsCount": 12,
      "shareToken": null,
      "viewsCount": 0,
      "createdAt": "2025-11-01T10:00:00Z",
      "updatedAt": "2025-11-16T10:00:00Z"
    }
  ],
  "meta": {
    "totalPlaylists": 5,
    "limit": 5,
    "usage": "5/5"
  }
}
```

---

#### 5.2.2 Get Playlist by ID

**Endpoint**: `GET /users/me/playlists/:id`  
**Authentication**: Required (or public with share token)

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "name": "AP Learning Path",
  "description": "My custom AP learning journey",
  "visibility": "private",
  "shareToken": "abc123",
  "viewsCount": 45,
  "items": [
    {
      "id": "uuid",
      "resource": {
        "id": "uuid",
        "title": "Invoice Posting Basics",
        "sourceType": "demo",
        "duration": 15
      },
      "sortOrder": 1,
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ],
  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2025-11-16T10:00:00Z"
}
```

---

#### 5.2.3 Create Playlist

**Endpoint**: `POST /users/me/playlists`  
**Authentication**: Required

**Request Body**:
```json
{
  "name": "New Learning Path",
  "description": "Description here",
  "visibility": "private"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "name": "New Learning Path",
  "description": "Description here",
  "visibility": "private",
  "shareToken": null,
  "createdAt": "2025-11-16T10:00:00Z"
}
```

**Errors**:
- `403`: Playlist limit reached (5 for free, unlimited for premium)

---

#### 5.2.4 Update Playlist

**Endpoint**: `PATCH /users/me/playlists/:id`  
**Authentication**: Required

**Request Body**:
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "visibility": "public"
}
```

**Response**: `200 OK`

---

#### 5.2.5 Delete Playlist

**Endpoint**: `DELETE /users/me/playlists/:id`  
**Authentication**: Required

**Response**: `204 No Content`

---

#### 5.2.6 Add Item to Playlist

**Endpoint**: `POST /users/me/playlists/:id/items`  
**Authentication**: Required

**Request Body**:
```json
{
  "resourceId": "uuid",
  "sortOrder": 5
}
```

**Response**: `201 Created`

**Errors**:
- `409`: Resource already in playlist
- `403`: Playlist item limit reached (20 for free)

---

#### 5.2.7 Reorder Playlist Items

**Endpoint**: `PATCH /users/me/playlists/:id/items/reorder`  
**Authentication**: Required

**Request Body**:
```json
{
  "items": [
    { "id": "uuid1", "sortOrder": 1 },
    { "id": "uuid2", "sortOrder": 2 },
    { "id": "uuid3", "sortOrder": 3 }
  ]
}
```

**Response**: `200 OK`

---

#### 5.2.8 Remove Item from Playlist

**Endpoint**: `DELETE /users/me/playlists/:playlistId/items/:itemId`  
**Authentication**: Required

**Response**: `204 No Content`

---

#### 5.2.9 Generate Share Token

**Endpoint**: `POST /users/me/playlists/:id/share`  
**Authentication**: Required

**Response**: `200 OK`
```json
{
  "shareToken": "abc123xyz",
  "shareUrl": "https://ulhn.com/playlists/share/abc123xyz"
}
```

---

#### 5.2.10 Get Public Playlist (by share token)

**Endpoint**: `GET /playlists/share/:token`  
**Authentication**: None

**Response**: `200 OK` (same as 5.2.2)

---

### 5.3 Notes

#### 5.3.1 List Notes

**Endpoint**: `GET /users/me/notes`  
**Authentication**: Required

**Query Parameters**:
```
?page=1
&limit=20
&search=invoice          # Search within notes content
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "resource": {
        "id": "uuid",
        "title": "Invoice Posting",
        "sourceType": "demo"
      },
      "content": "My notes about this resource...",
      "createdAt": "2025-11-10T10:00:00Z",
      "updatedAt": "2025-11-15T12:00:00Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 35
  }
}
```

---

#### 5.3.2 Get Note by Resource ID

**Endpoint**: `GET /users/me/notes/resource/:resourceId`  
**Authentication**: Required

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "resourceId": "uuid",
  "content": "My notes...",
  "createdAt": "2025-11-10T10:00:00Z",
  "updatedAt": "2025-11-15T12:00:00Z"
}
```

**Errors**:
- `404`: No note found for this resource

---

#### 5.3.3 Create/Update Note

**Endpoint**: `PUT /users/me/notes/resource/:resourceId`  
**Authentication**: Required

**Request Body**:
```json
{
  "content": "Updated notes content..."
}
```

**Response**: `200 OK`

Creates if doesn't exist, updates if exists.

---

#### 5.3.4 Delete Note

**Endpoint**: `DELETE /users/me/notes/:id`  
**Authentication**: Required

**Response**: `204 No Content`

---

### 5.4 History

#### 5.4.1 Get History

**Endpoint**: `GET /users/me/history`  
**Authentication**: Required

**Query Parameters**:
```
?page=1
&limit=50
&sourceType=demo
&from=2025-11-01          # Date range filter
&to=2025-11-16
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "resource": {
        "id": "uuid",
        "title": "Invoice Posting",
        "sourceType": "demo"
      },
      "viewedAt": "2025-11-16T09:45:00Z",
      "duration": 120
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 487
  }
}
```

---

#### 5.4.2 Clear History

**Endpoint**: `DELETE /users/me/history`  
**Authentication**: Required

**Query Parameters**:
```
?before=2025-11-01        # Optional: delete only before date
```

**Response**: `204 No Content`

---

## 6. Modules, Processes & Roles

### 6.1 List Modules

**Endpoint**: `GET /modules`  
**Authentication**: Optional

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "FI",
      "name": "Financial Accounting",
      "description": "General ledger, AP, AR...",
      "icon": "finance-icon.svg",
      "parentId": null,
      "subModules": [
        {
          "id": "uuid",
          "code": "FI-AP",
          "name": "Accounts Payable"
        }
      ],
      "resourcesCount": 1234,
      "sortOrder": 1
    }
  ]
}
```

---

### 6.2 Get Module by Code

**Endpoint**: `GET /modules/:code`  
**Authentication**: Optional

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "code": "FI",
  "name": "Financial Accounting",
  "description": "Detailed description...",
  "icon": "finance-icon.svg",
  "subModules": [...],
  "relatedProcesses": [...],
  "relatedRoles": [...],
  "topResources": [...],
  "resourcesCount": 1234
}
```

---

### 6.3 List Processes

**Endpoint**: `GET /processes`  
**Authentication**: Optional

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "P2P",
      "name": "Procure-to-Pay",
      "description": "End-to-end procurement...",
      "icon": "p2p-icon.svg",
      "steps": [
        {
          "number": 1,
          "name": "Create Purchase Requisition",
          "resourcesCount": 45
        }
      ],
      "resourcesCount": 456
    }
  ]
}
```

---

### 6.4 Get Process by Code

**Endpoint**: `GET /processes/:code`  
**Authentication**: Optional

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "code": "P2P",
  "name": "Procure-to-Pay",
  "description": "Detailed description...",
  "steps": [
    {
      "number": 1,
      "name": "Create Purchase Requisition",
      "description": "Step description...",
      "resources": [...]
    }
  ],
  "relatedModules": [...],
  "relatedRoles": [...],
  "resourcesCount": 456
}
```

---

### 6.5 List Roles

**Endpoint**: `GET /roles`  
**Authentication**: Optional

**Query Parameters**:
```
?category=Finance         # Filter by category
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "AP_CLERK",
      "name": "Accounts Payable Clerk",
      "category": "Finance",
      "description": "Responsible for...",
      "icon": "ap-icon.svg",
      "resourcesCount": 234
    }
  ],
  "categories": ["Finance", "Logistics", "Sales", "Technical"]
}
```

---

### 6.6 Get Role by Code

**Endpoint**: `GET /roles/:code`  
**Authentication**: Optional

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "code": "AP_CLERK",
  "name": "Accounts Payable Clerk",
  "category": "Finance",
  "description": "Detailed description...",
  "topFioriApps": [...],
  "topResources": [...],
  "relatedProcesses": [...],
  "learningPath": [...],
  "resourcesCount": 234
}
```

---

## 7. Admin

### 7.1 User Management

#### 7.1.1 List Users

**Endpoint**: `GET /admin/users`  
**Authentication**: Required (Admin role)

**Query Parameters**:
```
?page=1
&limit=50
&role=registered
&status=active
&search=john@example.com
&sortBy=createdAt
&order=desc
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "registered",
      "status": "active",
      "emailVerified": true,
      "lastLoginAt": "2025-11-16T10:00:00Z",
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 100,
    "totalItems": 4987
  },
  "stats": {
    "totalUsers": 4987,
    "activeUsers": 4823,
    "suspendedUsers": 164,
    "newThisMonth": 342
  }
}
```

---

#### 7.1.2 Get User by ID

**Endpoint**: `GET /admin/users/:id`  
**Authentication**: Required (Admin)

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "registered",
  "status": "active",
  "preferences": {...},
  "stats": {
    "favoritesCount": 48,
    "playlistsCount": 5,
    "notesCount": 23,
    "historyCount": 487
  },
  "activity": {
    "lastLoginAt": "2025-11-16T10:00:00Z",
    "totalSessions": 234,
    "totalSearches": 1234
  },
  "createdAt": "2025-11-01T10:00:00Z"
}
```

---

#### 7.1.3 Update User

**Endpoint**: `PATCH /admin/users/:id`  
**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "role": "premium",
  "status": "active"
}
```

**Response**: `200 OK`

---

#### 7.1.4 Suspend User

**Endpoint**: `POST /admin/users/:id/suspend`  
**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "reason": "Terms violation"
}
```

**Response**: `200 OK`

---

#### 7.1.5 Delete User

**Endpoint**: `DELETE /admin/users/:id`  
**Authentication**: Required (Super Admin)

**Response**: `204 No Content`

Permanent deletion (not soft delete).

---

### 7.2 Content Management

#### 7.2.1 List Resources (Admin)

**Endpoint**: `GET /admin/resources`  
**Authentication**: Required (Admin)

**Query Parameters**:
```
?page=1
&limit=50
&isActive=true
&sourceType=demo
&sortBy=createdAt
```

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Invoice Posting",
      "url": "https://...",
      "sourceType": "demo",
      "isActive": true,
      "viewsCount": 1234,
      "favoritesCount": 234,
      "lastValidatedAt": "2025-11-15T00:00:00Z",
      "createdAt": "2025-10-01T10:00:00Z"
    }
  ],
  "meta": {...},
  "stats": {
    "totalResources": 15234,
    "activeResources": 14987,
    "brokenLinks": 247
  }
}
```

---

#### 7.2.2 Update Resource

**Endpoint**: `PATCH /admin/resources/:id`  
**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "isActive": true,
  "moduleCodes": ["FI", "CO"],
  "processCodes": ["P2P"],
  "roleCodes": ["AP_CLERK"],
  "tags": ["invoice", "posting"]
}
```

**Response**: `200 OK`

---

#### 7.2.3 Delete Resource

**Endpoint**: `DELETE /admin/resources/:id`  
**Authentication**: Required (Admin)

**Response**: `204 No Content`

---

#### 7.2.4 Bulk Update Resources

**Endpoint**: `PATCH /admin/resources/bulk`  
**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "resourceIds": ["uuid1", "uuid2", "uuid3"],
  "updates": {
    "isActive": false
  }
}
```

**Response**: `200 OK`
```json
{
  "updatedCount": 3
}
```

---

### 7.3 Crawler Management

#### 7.3.1 List Crawlers

**Endpoint**: `GET /admin/crawlers`  
**Authentication**: Required (Admin)

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "SAP Learning Crawler",
      "sourceUrl": "https://learning.sap.com",
      "crawlerType": "sap-learning",
      "schedule": "0 0 * * 0",
      "rateLimit": 1,
      "isActive": true,
      "lastRunAt": "2025-11-15T00:00:00Z",
      "lastStatus": "success",
      "nextRunAt": "2025-11-22T00:00:00Z"
    }
  ]
}
```

---

#### 7.3.2 Get Crawler by ID

**Endpoint**: `GET /admin/crawlers/:id`  
**Authentication**: Required (Admin)

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "name": "SAP Learning Crawler",
  "config": {...},
  "lastRuns": [
    {
      "id": "uuid",
      "status": "success",
      "itemsProcessed": 1234,
      "itemsAdded": 23,
      "itemsUpdated": 45,
      "errors": [],
      "startedAt": "2025-11-15T00:00:00Z",
      "completedAt": "2025-11-15T02:34:12Z",
      "duration": "2h 34m"
    }
  ]
}
```

---

#### 7.3.3 Update Crawler

**Endpoint**: `PATCH /admin/crawlers/:id`  
**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "schedule": "0 0 * * *",
  "rateLimit": 2,
  "isActive": true
}
```

**Response**: `200 OK`

---

#### 7.3.4 Trigger Crawler

**Endpoint**: `POST /admin/crawlers/:id/run`  
**Authentication**: Required (Admin)

**Response**: `202 Accepted`
```json
{
  "message": "Crawler job queued",
  "jobId": "uuid"
}
```

---

### 7.4 Analytics

#### 7.4.1 Get Dashboard Stats

**Endpoint**: `GET /admin/analytics/dashboard`  
**Authentication**: Required (Admin)

**Query Parameters**:
```
?from=2025-11-01
&to=2025-11-16
```

**Response**: `200 OK`
```json
{
  "users": {
    "total": 10000,
    "new": 342,
    "active": 4823,
    "dau": 1234,
    "mau": 5678
  },
  "content": {
    "totalResources": 15234,
    "newResources": 123,
    "brokenLinks": 247,
    "resourcesByType": {
      "course": 3456,
      "demo": 4567,
      "video": 5678
    }
  },
  "engagement": {
    "totalSearches": 123456,
    "totalViews": 234567,
    "avgSessionDuration": "8m 34s",
    "favoritesAdded": 2345,
    "playlistsCreated": 234
  },
  "performance": {
    "avgSearchTime": "0.456s",
    "avgApiResponseTime": "123ms",
    "uptime": "99.97%",
    "errorRate": "0.12%"
  }
}
```

---

#### 7.4.2 Get User Analytics

**Endpoint**: `GET /admin/analytics/users`  
**Authentication**: Required (Admin)

**Response**: `200 OK`
```json
{
  "registrationTrend": [
    { "date": "2025-11-01", "count": 23 },
    { "date": "2025-11-02", "count": 34 }
  ],
  "roleDistribution": {
    "registered": 8234,
    "premium": 1523,
    "admin": 43
  },
  "topUsers": [...]
}
```

---

#### 7.4.3 Get Content Analytics

**Endpoint**: `GET /admin/analytics/content`  
**Authentication**: Required (Admin)

**Response**: `200 OK`
```json
{
  "topResources": [
    {
      "resource": {...},
      "views": 12345,
      "favorites": 2345,
      "avgRating": 4.8
    }
  ],
  "topModules": [...],
  "topSearchQueries": [
    { "query": "invoice posting", "count": 2345 }
  ],
  "brokenLinks": [...]
}
```

---

## 8. Analytics (User)

### 8.1 Get Personal Stats

**Endpoint**: `GET /users/me/analytics`  
**Authentication**: Required

**Response**: `200 OK`
```json
{
  "overview": {
    "totalResourcesViewed": 234,
    "totalFavorites": 48,
    "totalPlaylists": 5,
    "totalNotes": 23,
    "totalLearningTime": "23h 45m",
    "currentStreak": 7
  },
  "activity": {
    "viewsByDay": [
      { "date": "2025-11-10", "count": 12 },
      { "date": "2025-11-11", "count": 8 }
    ],
    "moduleBreakdown": {
      "FI": 89,
      "MM": 45,
      "SD": 34
    },
    "typeBreakdown": {
      "demo": 123,
      "video": 67,
      "course": 44
    }
  },
  "milestones": [
    {
      "title": "100 Resources Viewed",
      "achievedAt": "2025-11-10T10:00:00Z"
    }
  ]
}
```

---

## 9. Error Handling

### Standard Error Response

All errors return the following format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ],
  "timestamp": "2025-11-16T10:00:00Z",
  "path": "/api/v1/auth/register"
}
```

### Common Error Scenarios

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid input data",
  "error": "Bad Request"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

#### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "An unexpected error occurred",
  "error": "Internal Server Error",
  "requestId": "uuid"
}
```

---

## 10. Rate Limiting

### Rate Limit Headers

All responses include rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

### Rate Limits by Endpoint

| Endpoint Category | Anonymous | Registered | Premium | Admin |
|-------------------|-----------|------------|---------|-------|
| **Authentication** | 10/hour | N/A | N/A | N/A |
| **Search** | 10/min | 30/min | 60/min | 200/min |
| **Resources** | 100/min | 200/min | 500/min | 1000/min |
| **Personalization** | N/A | 100/min | 200/min | 500/min |
| **Admin** | N/A | N/A | N/A | 500/min |

---

## Appendices

### A. Data Types

#### User Role Enum
```typescript
type UserRole = 'anonymous' | 'registered' | 'premium' | 'admin' | 'super_admin';
```

#### Resource Source Type
```typescript
type SourceType = 'course' | 'demo' | 'pdf' | 'video' | 'article' | 'app' | 'community';
```

#### Difficulty Level
```typescript
type Difficulty = 'beginner' | 'intermediate' | 'advanced';
```

#### Playlist Visibility
```typescript
type Visibility = 'private' | 'public' | 'organization';
```

---

**Document Control:**
- **Created**: November 16, 2025
- **Last Modified**: November 16, 2025
- **Version**: 1.0
- **API Version**: v1
