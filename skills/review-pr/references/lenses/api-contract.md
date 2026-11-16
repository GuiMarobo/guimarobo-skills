# Lens: API contract

Applies to controllers, DTOs, GraphQL schema/resolvers, exported library types, and event/message schemas. Who consumes this contract, and does anything break for them?

## Checklist

**Breaking changes** (Major, or Blocker if clients break on deploy)
- Removed or renamed fields, changed types/formats, a new **required** request field, removed enum values.
- Changed status codes, error shape, default sort, pagination semantics, or auth requirements.
- These are acceptable only if versioned, or if every consumer ships together. Say which you assumed.

**Shape and conventions** (compare with existing endpoints, not ideals)
- Responses use DTOs/view models, not ORM entities.
- Status codes are consistent with the project: 201 + location/body on create, 204 with no body, 400 vs 422, 401 vs 403. 404 for resources the caller may not see, if the project hides existence.
- Errors go through the project's exception filter and keep its format.
- Pagination, filtering, and date formats (ISO 8601, UTC) match the existing API.
- Names use the domain glossary.

**Semantics**
- `PUT` / `DELETE` idempotent; `POST` retries considered.
- Partial updates (`PATCH`) distinguish "absent" from `null`.
- Large or unbounded responses paginated.

**Documentation**
- `@nestjs/swagger` decorators / OpenAPI / GraphQL descriptions updated to match the new behaviour, including error responses.
- Events: schema versioned; consumers tolerate unknown fields; producers don't remove fields consumers read.

## Sources

- OWASP API Security Top 10:2023 (API3 data exposure, API9 inventory): https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- NestJS OpenAPI: https://docs.nestjs.com/openapi/introduction
- RFC 9110 HTTP Semantics (methods, idempotency, status codes): https://www.rfc-editor.org/rfc/rfc9110
- RFC 9457 Problem Details for HTTP APIs (error shape): https://www.rfc-editor.org/rfc/rfc9457
- IETF draft "The Idempotency-Key HTTP Header Field" (fault-tolerant POST/PATCH): https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
