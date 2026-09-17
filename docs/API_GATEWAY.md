# API Gateway for Privacy Protection

## Overview

The API Gateway system provides a privacy-focused layer that obfuscates your internal API structure from end users. Instead of exposing endpoint paths like `appointment.api.manage.get_management_hierarchy`, all API calls are routed through a single gateway endpoint using obfuscated action codes.

## Architecture

### Backend (`appointment/api/gateway.py`)

The gateway endpoint accepts:
- **action**: An obfuscated 8-character code (e.g., `e5f6g7h8`)
- **params**: All other parameters are passed directly to the target function

**Endpoint**: `/api/method/appointment.api.gateway.route`

### Frontend (`frontend/src/lib/apiGateway.ts`)

Provides utility functions and React hooks:
- `gatewayGet()` - For GET requests
- `gatewayPost()` - For POST requests
- `useGatewayGet()` - React hook for GET requests
- `useGatewayPost()` - React hook for POST requests

## How It Works

### Before (Exposed API Structure)
```typescript
// Users can see the full endpoint path in Network tab
const response = await fetch(
  '/api/method/appointment.api.manage.get_management_hierarchy'
);
```

### After (Obfuscated)
```typescript
// Only shows: /api/method/appointment.api.gateway.route?action=e5f6g7h8
const response = await gatewayGet(
  'appointment.api.manage.get_management_hierarchy'
);
```

## Action Code Mapping

Action codes are 8-character alphanumeric strings that map to actual endpoints:

| Endpoint | Action Code |
|----------|-------------|
| `appointment.api.manage.get_management_hierarchy` | `e5f6g7h8` |
| `appointment.scheduler.doctype.landing_page_settings.api.get_landing_page_settings` | `a1b2c3d4` |
| ... | ... |

The mapping is defined in both:
- Backend: `appointment/api/gateway.py` → `ACTION_MAP`
- Frontend: `frontend/src/lib/apiGateway.ts` → `ACTION_MAP`

## Usage Examples

### Basic GET Request
```typescript
import { gatewayGet } from '@/lib/apiGateway';

// Get management hierarchy
const hierarchy = await gatewayGet<ManagementHierarchy>(
  'appointment.api.manage.get_management_hierarchy'
);
```

### GET Request with Parameters
```typescript
// Get location availability
const availability = await gatewayGet(
  'appointment.availability.get_location_availability',
  {
    location_id: 'LOC-001',
    date: '2024-01-15'
  }
);
```

### POST Request
```typescript
import { gatewayPost } from '@/lib/apiGateway';

// Create a service
const result = await gatewayPost(
  'appointment.api.manage.create_service',
  {
    service_name: 'Consultation',
    duration: 30,
    organization: 'ORG-001'
  }
);
```

### React Hook for GET
```typescript
import { useGatewayGet } from '@/lib/apiGateway';

function MyComponent() {
  const { data, isLoading, error } = useGatewayGet<ManagementHierarchy>(
    'appointment.api.manage.get_management_hierarchy'
  );
  
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return <div>{/* Render data */}</div>;
}
```

### React Hook for POST
```typescript
import { useGatewayPost } from '@/lib/apiGateway';

function MyComponent() {
  const { call, loading, error } = useGatewayPost(
    'appointment.api.manage.create_service'
  );
  
  const handleCreate = async () => {
    try {
      const result = await call({
        service_name: 'Consultation',
        duration: 30
      });
      console.log('Created:', result);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  return (
    <button onClick={handleCreate} disabled={loading}>
      Create Service
    </button>
  );
}
```

## Adding New Endpoints

To add a new endpoint to the gateway:

1. **Add to Backend** (`appointment/api/gateway.py`):
```python
ACTION_MAP = {
    # ... existing mappings ...
    'x9y0z1a2': ('appointment.new_module', 'new_function'),
}
```

2. **Add to Frontend** (`frontend/src/lib/apiGateway.ts`):
```typescript
const ACTION_MAP: Record<string, string> = {
  // ... existing mappings ...
  'appointment.new_module.new_function': 'x9y0z1a2',
};
```

3. **Generate Action Code** (optional):
You can use the `_generate_action_code()` function in the backend to create consistent codes:
```python
from appointment.api.gateway import _generate_action_code
code = _generate_action_code('appointment.new_module', 'new_function')
```

## Security Considerations

1. **Action Code Mapping**: The mapping between endpoints and action codes should be kept consistent between frontend and backend. In production, consider:
   - Hardcoding the mapping in the frontend (already done)
   - Disabling or restricting the `get_action_map()` endpoint
   - Using environment-specific mappings

2. **Authentication**: The gateway endpoint requires authentication (`allow_guest=False`). Ensure all target endpoints also have proper authentication.

3. **Rate Limiting**: Consider adding rate limiting to the gateway endpoint to prevent abuse.

4. **Logging**: The gateway logs all routing errors. Monitor these logs for suspicious activity.

## Limitations

1. **Network Tab Visibility**: While endpoint paths are hidden, the gateway endpoint itself is still visible. However, the action codes are meaningless without the mapping.

2. **Request Size**: All parameters are still visible in the Network tab. Sensitive data should be encrypted or handled server-side.

3. **Not True Security**: This is privacy through obfuscation, not encryption. Determined users could still reverse-engineer the system, but it significantly raises the barrier.

## Migration Guide

To migrate existing code to use the gateway:

### Replace Direct Fetch Calls
```typescript
// Before
const response = await fetch(
  '/api/method/appointment.api.manage.get_management_hierarchy'
);

// After
const response = await gatewayGet(
  'appointment.api.manage.get_management_hierarchy'
);
```

### Replace Frappe React SDK Hooks
```typescript
// Before
import { useFrappeGetCall } from 'frappe-react-sdk';
const { data } = useFrappeGetCall('appointment.api.manage.get_management_hierarchy');

// After
import { useGatewayGet } from '@/lib/apiGateway';
const { data } = useGatewayGet('appointment.api.manage.get_management_hierarchy');
```

### Replace Frappe Post Calls
```typescript
// Before
import { useFrappePostCall } from 'frappe-react-sdk';
const { call } = useFrappePostCall('appointment.api.manage.create_service');

// After
import { useGatewayPost } from '@/lib/apiGateway';
const { call } = useGatewayPost('appointment.api.manage.create_service');
```

## Testing

Test the gateway endpoint directly:

```bash
# GET request
curl "http://localhost:8000/api/method/appointment.api.gateway.route?action=e5f6g7h8"

# POST request
curl -X POST "http://localhost:8000/api/method/appointment.api.gateway.route" \
  -H "Content-Type: application/json" \
  -d '{"action": "m3n4o5p6", "service_name": "Test", "duration": 30}'
```

## Future Enhancements

Potential improvements:
1. **Request Encryption**: Encrypt request parameters for additional privacy
2. **Dynamic Action Codes**: Rotate action codes periodically
3. **Request Batching**: Combine multiple API calls into a single gateway request
4. **Caching Layer**: Add caching for frequently accessed endpoints
5. **Analytics**: Track gateway usage patterns








