# Internal REST Client Summary

## What Was Built

Created a complete client library for accessing n8n's internal REST endpoints that use cookie-based authentication.

## Architecture

### Before
```
n8n Integration
└── N8nClient (API key auth → /api/v1/*)
```

### After
```
n8n Integration
├── N8nClient (API key auth → /api/v1/*)
└── N8nInternalClient (cookie auth → /rest/*)
```

## New Components

### 1. `N8nInternalClient` (`extension/src/n8n/internal-client.ts`)

Client for internal REST endpoints:
- `getCommunityNodeTypes()` - Fetch installed community nodes
- `getNodeTypes()` - Fetch all available node types

**Authentication:** Cookie-based (browser session)
**Usage:** Content scripts only (shares same origin with n8n)

### 2. `internalFetch` (`extension/src/platform/internal-fetch.ts`)

Specialized fetch wrapper for internal endpoints:
- `credentials: 'include'` - Sends cookies with requests
- Same error handling as `apiFetch`
- Timeout support
- JSON/text parsing

**vs apiFetch:**
- apiFetch: `credentials: 'omit'` (prevents cookie conflicts with API key auth)
- internalFetch: `credentials: 'include'` (requires cookies for session auth)

### 3. Cookie Extractors (`extension/src/platform/cookie-extractor.ts`)

Utilities for extracting cookies from n8n pages:
- `extractPageCookies()` - Get all cookies from current page
- `extractUrlCookies(url)` - Get cookies using Chrome API
- `extractSpecificCookies(names)` - Extract specific cookies by name
- `extractN8nSessionCookies()` - Get only n8n session cookies

### 4. Documentation (`extension/src/n8n/README.md`)

Complete documentation covering:
- When to use each client type
- Architecture diagram
- Code examples
- Separation of concerns table

## Clean Separation of Concerns

| Aspect | Public API | Internal REST |
|--------|-----------|---------------|
| **Endpoints** | `/api/v1/*` | `/rest/*` |
| **Auth** | API key in header | Cookies from browser |
| **Client** | `N8nClient` | `N8nInternalClient` |
| **Fetch** | `apiFetch` | `internalFetch` |
| **Credentials** | `omit` | `include` |
| **Usage** | Any context | Content scripts only |
| **Status** | Documented, stable | Undocumented, may change |

## Usage Examples

### Content Script (Cookie-based)

```typescript
import { N8nInternalClient } from '@n8n'

const client = new N8nInternalClient()
const communityNodes = await client.getCommunityNodeTypes()
```

### Background Script (API key-based)

```typescript
import { N8nClient } from '@n8n'

const client = new N8nClient({ apiKey: 'n8n_api_xxx' })
const workflows = await client.getWorkflows()
```

## Why This Architecture?

### Problem
n8n has two types of endpoints:
1. Public API (`/api/v1/*`) - Uses API keys, documented
2. Internal REST (`/rest/*`) - Uses cookies, undocumented

Using the same client for both would cause conflicts:
- API requests would send unwanted cookies
- Cookie requests would need API keys unnecessarily

### Solution
**Two specialized clients:**
1. **N8nClient** - API key auth, no cookies
2. **N8nInternalClient** - Cookie auth, no API keys

Each client uses its own fetch wrapper with appropriate credential handling.

## Benefits

✅ **No credential conflicts** - API key and cookie auth are separate
✅ **Clear separation** - Public vs internal endpoints isolated
✅ **Type-safe** - Full TypeScript definitions
✅ **Reusable** - Cookie extraction utilities available everywhere
✅ **Documented** - Complete README with examples
✅ **Testable** - Each client can be tested independently

## Internal Endpoints Supported

Based on the network request example provided:

### `/rest/community-node-types`
- **Method:** GET
- **Auth:** Cookie (n8n-auth, browser-id, etc.)
- **Returns:** List of installed community nodes
- **Client method:** `getCommunityNodeTypes()`

### `/rest/node-types` (speculative)
- **Method:** GET  
- **Auth:** Cookie
- **Returns:** All available node types
- **Client method:** `getNodeTypes()`

## Future Extensibility

The internal client can easily be extended with more endpoints:

```typescript
// Example: Add workflow execution endpoint
async triggerWorkflow(id: string): Promise<ExecutionResult>
{
  const url = `${this.baseUrl}/rest/workflows/${id}/trigger`
  return internalFetch<ExecutionResult>(url, {
    method: 'POST',
    headers: this.buildHeaders()
  })
}
```

## Files Created

1. `extension/src/n8n/internal-client.ts` - Internal REST client class
2. `extension/src/platform/internal-fetch.ts` - Fetch with cookie auth
3. `extension/src/platform/cookie-extractor.ts` - Cookie extraction utilities
4. `extension/src/n8n/README.md` - Complete documentation
5. `extension/src/n8n/index.ts` - Updated exports
6. `extension/src/platform/index.ts` - Updated exports

## Testing

Build succeeded ✅

To test:
```typescript
// In content script
import { N8nInternalClient } from '@n8n'

const client = new N8nInternalClient()
try {
  const nodes = await client.getCommunityNodeTypes()
  console.log('Community nodes:', nodes)
} catch (error) {
  console.error('Failed to fetch:', error)
}
```

## References

- Endpoint discovered from network inspection: `GET /rest/community-node-types`
- Cookie auth required: `n8n-auth`, `browser-id`, session cookies
- Same-origin required for cookie sharing (content script context)

