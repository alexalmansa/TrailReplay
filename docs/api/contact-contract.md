# Feedback API Contract

Endpoint: `POST /api/contact`

Current version header:

- `X-TrailReplay-API-Version: v1`

Response bodies also include:

- `version: "v1"`

## Request body

```json
{
  "name": "Optional name",
  "email": "optional@example.com",
  "message": "Required feedback message",
  "website": "",
  "meta": {
    "path": "/",
    "ua": "browser user agent"
  }
}
```

## Validation

- `message` is required
- message length must be between `5` and `5000` characters
- `website` is a honeypot and should stay empty
- requests are rate-limited in memory per IP

## Response shape

Success:

```json
{
  "version": "v1",
  "ok": true,
  "id": "provider-message-id"
}
```

Error:

```json
{
  "version": "v1",
  "error": "Human-readable error message"
}
```

## Versioning strategy

- additive fields can be introduced within `v1`
- breaking request/response changes require a new version header/value
- consumer code should branch on the explicit API version, not on inferred response structure
