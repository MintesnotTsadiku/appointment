# API Gateway: Performance, Scalability & Security Guide

## Performance Concerns & Solutions

### Potential Bottlenecks

1. **Single Endpoint Overload**
   - **Problem**: All API calls funnel through one endpoint
   - **Impact**: Can become a bottleneck under high load
   - **Solution**: Implement caching, rate limiting, and consider edge functions

2. **Module Import Overhead**
   - **Problem**: `frappe.get_module()` is called on every request
   - **Impact**: Adds latency (typically 5-20ms per request)
   - **Solution**: Cache module imports

3. **No Request Batching**
   - **Problem**: Each API call requires a separate HTTP request
   - **Impact**: Network overhead and latency
   - **Solution**: Implement request batching for multiple operations

### Performance Optimizations

#### 1. Module Import Caching

```python
# Add to gateway.py
_module_cache = {}

def _get_cached_module(module_path):
    """Cache module imports to reduce overhead"""
    if module_path not in _module_cache:
        _module_cache[module_path] = frappe.get_module(module_path)
    return _module_cache[module_path]
```

#### 2. Response Caching

```python
import functools
from frappe.cache import cache

@frappe.whitelist(allow_guest=False, methods=['GET', 'POST'])
def route(action=None, **kwargs):
    # Cache key based on action and params
    cache_key = f"gateway:{action}:{hash(str(sorted(kwargs.items())))}"
    
    # Check cache for GET requests (read-only)
    if frappe.request.method == 'GET':
        cached = cache().get(cache_key)
        if cached:
            return cached
    
    # ... existing routing logic ...
    
    result = {
        "success": True,
        "message": function(**call_params)
    }
    
    # Cache GET responses for 60 seconds
    if frappe.request.method == 'GET':
        cache().setex(cache_key, result, 60)
    
    return result
```

#### 3. Request Batching

```python
@frappe.whitelist(allow_guest=False, methods=['POST'])
def batch(requests=None):
    """
    Execute multiple API calls in a single request
    
    Args:
        requests: List of {action, params} objects
    
    Returns:
        List of results in the same order
    """
    if not requests or not isinstance(requests, list):
        return {"success": False, "error": "Invalid batch request"}
    
    results = []
    for req in requests:
        action = req.get('action')
        params = req.get('params', {})
        
        # Reuse existing route logic
        result = _route_internal(action, **params)
        results.append(result)
    
    return {"success": True, "message": results}
```

## Scalability Architecture

### Option 1: Edge Functions (Recommended for High Scale)

**Architecture:**
```
Client → CDN/Edge Function → Frappe Backend
         (Lightweight routing)  (Heavy processing)
```

**Benefits:**
- **Auto-scaling**: Edge functions scale automatically
- **Low latency**: Runs closer to users
- **Cost-effective**: Pay per request
- **DDoS protection**: Built-in at edge level

**Implementation (Cloudflare Workers example):**

```javascript
// edge-gateway.js (Cloudflare Worker)
const ACTION_MAP = {
  'a1b2c3d4': 'frappe_appointment.scheduler.doctype.landing_page_settings.api.get_landing_page_settings',
  // ... other mappings
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    if (!action || !ACTION_MAP[action]) {
      return new Response(JSON.stringify({error: 'Invalid action'}), {status: 400});
    }
    
    // Forward to Frappe backend
    const backendUrl = `https://your-frappe-instance.com/api/method/${ACTION_MAP[action]}`;
    const backendRequest = new Request(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
    
    return fetch(backendRequest);
  }
}
```

**Deployment:**
- **Cloudflare Workers**: ~$5/month for 10M requests
- **AWS Lambda@Edge**: Pay per request
- **Vercel Edge Functions**: Included in Pro plan
- **Netlify Edge Functions**: Included in Pro plan

### Option 2: Load Balancer + Multiple Instances

**Architecture:**
```
Client → Load Balancer → [Gateway Instance 1, Gateway Instance 2, ...]
                          ↓
                    Frappe Backend
```

**Implementation:**
- Use Frappe's built-in horizontal scaling
- Deploy multiple Frappe instances behind a load balancer
- Gateway endpoint scales with Frappe instances

### Option 3: API Gateway Service (Enterprise)

**Options:**
- **Kong**: Open-source API gateway
- **AWS API Gateway**: Managed service
- **Azure API Management**: Enterprise-grade
- **Google Cloud Endpoints**: Fully managed

## Rate Limiting

### Implementation

```python
from frappe.rate_limiter import rate_limit
from frappe import _

@frappe.whitelist(allow_guest=False, methods=['GET', 'POST'])
@rate_limit(key="gateway", limit=100, seconds=60)  # 100 requests per minute
def route(action=None, **kwargs):
    # ... existing code ...
```

### Per-User Rate Limiting

```python
from frappe.cache import cache
import time

def _check_rate_limit(user, action):
    """Rate limit per user and action"""
    key = f"rate_limit:{user}:{action}"
    current = cache().get(key) or 0
    
    # 10 requests per minute per action
    if current >= 10:
        frappe.throw(_("Rate limit exceeded. Please try again later."))
    
    cache().setex(key, current + 1, 60)
    return True

@frappe.whitelist(allow_guest=False, methods=['GET', 'POST'])
def route(action=None, **kwargs):
    user = frappe.session.user
    
    # Check rate limit
    _check_rate_limit(user, action)
    
    # ... rest of routing logic ...
```

### Recommended Limits

| User Type | Requests/Minute | Requests/Hour |
|-----------|----------------|---------------|
| Guest | 10 | 100 |
| Authenticated | 100 | 5,000 |
| Admin | 500 | 20,000 |

## Security Best Practices

### 1. Input Validation

```python
import re

def _validate_action_code(action):
    """Validate action code format"""
    if not action or not isinstance(action, str):
        return False
    # Action codes should be exactly 8 alphanumeric characters
    return bool(re.match(r'^[a-z0-9]{8}$', action))

@frappe.whitelist(allow_guest=False, methods=['GET', 'POST'])
def route(action=None, **kwargs):
    # Validate action code format
    if not _validate_action_code(action):
        frappe.log_error(f"Invalid action code format: {action}", "API Gateway Security")
        return {
            "success": False,
            "error": "Invalid action code"
        }
    
    # ... rest of code ...
```

### 2. Parameter Sanitization

```python
def _sanitize_params(params):
    """Remove potentially dangerous parameters"""
    dangerous_keys = ['__class__', '__dict__', '__globals__', 'eval', 'exec']
    sanitized = {}
    
    for key, value in params.items():
        if any(dk in key.lower() for dk in dangerous_keys):
            continue
        # Recursively sanitize nested dicts
        if isinstance(value, dict):
            sanitized[key] = _sanitize_params(value)
        else:
            sanitized[key] = value
    
    return sanitized
```

### 3. Request Size Limits

```python
@frappe.whitelist(allow_guest=False, methods=['GET', 'POST'])
def route(action=None, **kwargs):
    # Limit request size (prevent DoS)
    request_size = len(str(kwargs))
    if request_size > 100000:  # 100KB limit
        return {
            "success": False,
            "error": "Request too large"
        }
    
    # ... rest of code ...
```

### 4. Audit Logging

```python
import json
from datetime import datetime

def _log_gateway_request(action, user, success, error=None):
    """Log all gateway requests for security auditing"""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "user": user,
        "action": action,
        "success": success,
        "error": error,
        "ip": frappe.local.request.environ.get('REMOTE_ADDR'),
    }
    
    # Log to Frappe's error log
    frappe.log_error(
        json.dumps(log_entry),
        "API Gateway Audit"
    )
    
    # Optionally log to a custom doctype for analytics
    # frappe.get_doc({
    #     "doctype": "API Gateway Log",
    #     **log_entry
    # }).insert(ignore_permissions=True)
```

### 5. Action Code Rotation

```python
# Rotate action codes periodically for additional security
# Store in database instead of hardcoded

def get_action_map():
    """Get action map from database (allows rotation)"""
    return frappe.get_all(
        "API Gateway Mapping",
        fields=["action_code", "module_path", "function_name"],
        as_dict=True
    )
```

### 6. IP Whitelisting (Optional)

```python
def _check_ip_whitelist():
    """Optional: Restrict gateway to specific IPs"""
    allowed_ips = frappe.conf.get('gateway_allowed_ips', [])
    if not allowed_ips:
        return True  # No restriction
    
    client_ip = frappe.local.request.environ.get('REMOTE_ADDR')
    return client_ip in allowed_ips
```

## Privacy Considerations

### 1. Hide Action Codes from Logs

```python
# Don't log action codes in error messages visible to users
frappe.log_error(
    f"Gateway error for action: [REDACTED]",  # Don't log actual code
    "API Gateway Error"
)
```

### 2. Obfuscate Error Messages

```python
# Don't expose internal module paths in errors
except Exception as e:
    # Generic error for users
    return {
        "success": False,
        "error": "Request failed"  # Generic message
    }
    # Detailed error only in server logs
    frappe.log_error(f"Detailed error: {str(e)}", "API Gateway Error")
```

### 3. Request/Response Encryption (Advanced)

For highly sensitive data, consider encrypting request/response payloads:

```python
from cryptography.fernet import Fernet

# Generate key: Fernet.generate_key()
ENCRYPTION_KEY = frappe.conf.get('gateway_encryption_key')

def _encrypt_response(data):
    """Encrypt response data"""
    if not ENCRYPTION_KEY:
        return data
    
    f = Fernet(ENCRYPTION_KEY)
    encrypted = f.encrypt(json.dumps(data).encode())
    return {"encrypted": encrypted.decode()}
```

### 4. Disable Action Map Endpoint in Production

```python
@frappe.whitelist(allow_guest=False)
def get_action_map():
    """Disable in production"""
    # Check if in production
    if frappe.conf.developer_mode == 0:
        frappe.throw("This endpoint is disabled in production")
    
    # Only allow System Managers
    if 'System Manager' not in frappe.get_roles():
        frappe.throw("Permission denied")
    
    # ... rest of code ...
```

## Monitoring & Analytics

### 1. Performance Metrics

```python
import time

@frappe.whitelist(allow_guest=False, methods=['GET', 'POST'])
def route(action=None, **kwargs):
    start_time = time.time()
    
    try:
        # ... routing logic ...
        result = function(**call_params)
        
        # Log performance
        duration = time.time() - start_time
        if duration > 1.0:  # Log slow requests
            frappe.log_error(
                f"Slow gateway request: {action} took {duration:.2f}s",
                "API Gateway Performance"
            )
        
        return {"success": True, "message": result}
    except Exception as e:
        # Log errors
        frappe.log_error(f"Gateway error: {str(e)}", "API Gateway Error")
        raise
```

### 2. Usage Analytics

Track which actions are most used:

```python
def _track_usage(action):
    """Track API usage for analytics"""
    key = f"gateway_stats:{action}"
    cache().incr(key)
    cache().expire(key, 86400)  # 24 hours
```

## Recommended Production Setup

### Phase 1: Basic (Current Implementation)
- ✅ Gateway endpoint with action codes
- ✅ Basic error handling
- ⚠️ Add rate limiting
- ⚠️ Add caching

### Phase 2: Optimized
- ✅ Module import caching
- ✅ Response caching for GET requests
- ✅ Rate limiting per user
- ✅ Request size limits
- ✅ Audit logging

### Phase 3: Enterprise (High Scale)
- ✅ Edge function deployment
- ✅ Request batching
- ✅ Advanced monitoring
- ✅ Action code rotation
- ✅ Request/response encryption

## Cost Analysis

### Current Setup (Frappe Only)
- **Cost**: Included in Frappe hosting
- **Scalability**: Limited by Frappe instance
- **Latency**: Depends on server location

### Edge Function Setup
- **Cloudflare Workers**: $5/month (10M requests) + $0.50 per million after
- **AWS Lambda@Edge**: ~$0.60 per million requests
- **Latency**: 10-50ms (vs 100-300ms for direct)

### Recommendation
- **< 1M requests/month**: Current setup + caching
- **1-10M requests/month**: Add edge function
- **> 10M requests/month**: Full API gateway service

## Checklist

### Security
- [ ] Rate limiting implemented
- [ ] Input validation on action codes
- [ ] Parameter sanitization
- [ ] Request size limits
- [ ] Audit logging enabled
- [ ] Action map endpoint restricted/disabled
- [ ] Error messages don't expose internals

### Performance
- [ ] Module import caching
- [ ] Response caching for GET requests
- [ ] Request batching (if needed)
- [ ] Performance monitoring
- [ ] Slow query logging

### Scalability
- [ ] Load balancer configured (if multiple instances)
- [ ] Edge function deployed (if high scale)
- [ ] Auto-scaling enabled
- [ ] CDN configured

### Privacy
- [ ] Action codes not logged in user-facing errors
- [ ] Internal paths not exposed
- [ ] Sensitive data encrypted (if needed)
- [ ] Analytics don't track PII




