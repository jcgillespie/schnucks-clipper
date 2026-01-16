# Data Model: Schnucks Coupon Clipper

**Feature**: 1-coupon-clipper | **Date**: 2026-01-16

## Entities

### Coupon

Represents a single coupon from the Schnucks API.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique coupon identifier |
| `title` | string | Coupon display title |
| `description` | string | Detailed coupon description |
| `expirationDate` | Date | When the coupon expires |
| `value` | string | Discount value (e.g., "$1.00 off") |
| `status` | enum | `available`, `clipped`, `redeemed`, `expired` |
| `category` | string | Product category |

**Validation Rules**:
- `id` is required and must be non-empty
- `status` must be `available` for clipping to succeed

---

### Session

Represents the authenticated browser context stored on disk.

| Field | Type | Description |
|-------|------|-------------|
| `cookies` | Cookie[] | Authentication cookies from Schnucks |
| `origins` | StorageOrigin[] | localStorage/sessionStorage data |
| `lastUpdated` | Date | Timestamp of last save |

**Storage Format**: JSON file at `/home/playwright/data/session.json`

**State Transitions**:
```
[No Session] --manual login--> [Valid] --expiration--> [Expired]
     ^                            |                        |
     |                            v                        v
     +---- manual re-auth ---- [Expired] <---- API failure detected
```

---

### ClipResult

Represents the outcome of a single coupon clipping attempt.

| Field | Type | Description |
|-------|------|-------------|
| `couponId` | string | The coupon that was processed |
| `success` | boolean | Whether clipping succeeded |
| `error` | string? | Error message if failed |
| `timestamp` | Date | When the attempt occurred |

---

### JobRun

Represents a complete execution of the clipper application.

| Field | Type | Description |
|-------|------|-------------|
| `startTime` | Date | When execution began |
| `endTime` | Date | When execution completed |
| `totalCoupons` | number | Total coupons found |
| `clippedCount` | number | Successfully clipped |
| `skippedCount` | number | Already clipped |
| `errorCount` | number | Failed to clip |
| `exitCode` | number | Process exit code |

---

## API Contracts

See [contracts/schnucks-api.yaml](file:///Users/joshgillespie/src/schnucks-coupons/specs/1-coupon-clipper/contracts/schnucks-api.yaml) for OpenAPI specification.

### GET /api/coupon-api/v1/coupons

**Response**:
```typescript
interface CouponsResponse {
  availableCoupons: Coupon[];
  clippedCoupons: Coupon[];
  totalCount: number;
}
```

### POST /api/coupon-api/v1/clipped

**Request**:
```typescript
interface ClipRequest {
  couponId: string;
}
```

**Response**:
```typescript
interface ClipResponse {
  success: boolean;
  message: string;
}
```
