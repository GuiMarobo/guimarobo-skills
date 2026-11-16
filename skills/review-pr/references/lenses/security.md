# Lens: Security

Frameworks: OWASP Top 10:2025 (A01–A10), OWASP API Security Top 10:2023 (API1–API10), CWE, and the OWASP Top 10 for LLM Applications 2025 when the diff touches an LLM. Cite the most specific ID. Where an issue has no Top 10 category, cite the CWE only.

Framework notes: items marked **[Nest]** apply when `@nestjs/*` is a dependency. For Express/Fastify/Koa/Next route handlers, check the equivalent: schema validation (zod / joi / express-validator / Fastify JSON schema), auth middleware or hooks on every route, `helmet` / `@fastify/helmet`, a rate-limit middleware.

## Method

1. **List the entry points** the diff adds or changes: HTTP routes, GraphQL resolvers, WebSocket gateways, webhooks, queue consumers, cron jobs, CLI commands, file uploads.
2. For each one, check **who can call it** (authentication) and **what they can touch** (authorization).
3. **Trace untrusted data** from every source (body, query, params, headers, cookies, uploaded files, webhook payloads, queue messages, third-party API responses, LLM output) to every sink (SQL/ORM, shell, file paths, HTML, redirects, outbound URLs, logs, `eval`, object keys).
4. Every finding states: **attacker** (anonymous, user, other tenant), **entry point**, **payload or steps**, **impact**. If it only works combined with another bug, say so and lower the severity.

## A01:2025 Broken Access Control · API1 / API3 / API5:2023

- A new route/resolver/gateway without an auth guard or middleware, or a broad skip-auth decorator (`@Public()`). WebSocket gateways and GraphQL field resolvers need their own checks.
- **IDOR:** a resource loaded by id without an owner/tenant condition (`findOne({ where: { id } })` instead of `{ id, tenantId: user.tenantId }`). Checking ownership *after* loading is fine only if it can't be skipped. (CWE-639)
- A permission enforced on one route but not its siblings (list vs detail vs export vs bulk). (API5)
- **Mass assignment (API3):** `repo.save({ ...dto })`, `Object.assign(entity, body)`, `prisma.x.update({ data: body })` letting the caller set `role`, `ownerId`, `tenantId`, `isAdmin`, `price`, `status`. Defence: DTOs or an explicit allowlist of editable fields, never a blocklist. DTOs don't replace the authorization check on the object. (CWE-915)
- **Excessive data exposure (API3):** responses built from entities; `passwordHash`, tokens, or internal flags returned. **[Nest]** `ClassSerializerInterceptor` + `@Exclude()` only work when the handler returns a **class instance**, not a plain object.
- **SSRF** (rolled into A01 in 2025; API7:2023): an outbound request to a user-influenced URL. (CWE-918) Expected defences:
  - fixed targets: accept an id/domain, not a full URL, and build the URL server-side from an allowlist;
  - arbitrary URLs (e.g. user webhooks): block loopback, RFC1918, link-local incl. `169.254.169.254` / `metadata.google.internal`, and IPv6 `fc00::/7`, `fe80::/10`, IPv4-mapped `::ffff:0:0/96`, after **canonicalising** the address;
  - resolve once and connect to the validated IP (DNS rebinding);
  - redirects disabled in the HTTP client.
- **Open redirect** from `redirect` / `returnUrl` params. (CWE-601)
- **CSRF** on cookie-authenticated state-changing routes. Use the framework's CSRF protection; SameSite cookies alone are not a sufficient mitigation; `csurf` is archived. (CWE-352)

## A05:2025 Injection

- SQL: string-built queries in `query()`, `createQueryBuilder().where(\`col = ${x}\`)`, Prisma `$queryRawUnsafe` / `$executeRawUnsafe` **with concatenated input**. Prisma's tagged `$queryRaw\`…${x}\`` and the parameterized form `$queryRawUnsafe(sql, ...params)` are escaped. Column/sort names from input need an allowlist (they can't be bound parameters). (CWE-89)
- NoSQL operator injection: `{ "email": { "$ne": null } }` reaching a Mongo query because types aren't enforced. Query strings parse into objects/arrays too (`?a[b]=c`). (CWE-943)
- OS command: `child_process.exec` runs through a shell. With interpolated input, use `execFile` / `spawn` with an args array and no `shell: true`. (CWE-78)
- Path traversal: `path.join(base, userInput)` without `path.resolve` plus a prefix check; `sendFile` / `createReadStream` with user paths. (CWE-22)
- Code: `eval`, `new Function`, `vm`, or template compilation fed user input. (CWE-94)
- XSS in server-rendered HTML or e-mails built by string concatenation. `escape-html` covers only HTML text and quoted attributes; use DOMPurify / sanitize-html for user HTML. (CWE-79)

## Node.js-specific (no Top 10 category: cite the CWE)

- **Prototype pollution:** deep merge/clone of user objects; `obj[userKey] = value` where the key may be `__proto__` / `constructor` / `prototype`. Prefer `Map` / `Set` or `Object.create(null)` for user-keyed data; `node --disable-proto=delete` is defence in depth only (pollution via `constructor.prototype` still works). (CWE-1321)
- **ReDoS:** user input matched against "evil" regexes (grouped repetition or overlapping alternation, e.g. `(a+)+`, `(a|a)*`) that get stuck on crafted input. (CWE-1333)
- **Event-loop blocking:** sync crypto/zlib/fs/child_process APIs in handlers; `JSON.parse` / `JSON.stringify` on large input. Request body limits set per content type, since JSON parsing is blocking. (API4:2023)

## Input validation

- **[Nest]** A global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` (or a schema pipe) is active, and the new DTOs use it. `forbidNonWhitelisted` only works together with `whitelist`.
- **[Nest]** Nested objects need `@ValidateNested()`, and class-validator only validates a nested object that is a class instance. `transform: true` turns the payload into DTO instances, and class-transformer needs `@Type(() => NestedDto)` to instantiate nested objects. Without it, nested input isn't validated against the nested DTO. Arrays need `{ each: true }`.
- `@IsOptional()` skips all validators when the value is `null` **or** `undefined`. Check the code handles `null`.
- Bounds everywhere: max lengths, array sizes, numeric ranges, integer vs float, `NaN`.
- Route params parsed (`ParseIntPipe` / `ParseUUIDPipe`, or the schema).
- Webhooks, queue messages, and third-party responses are validated too. The HTTP pipe doesn't cover them; third-party data is untrusted. (API10)

## A07:2025 Authentication Failures · API2:2023

- Self-contained tokens (JWT): the signature/MAC is verified **before** the contents are trusted (`jsonwebtoken`: `jwt.verify`; `jwt.decode` doesn't verify and must not be used on untrusted tokens); accepted algorithms allowlisted (`algorithms` option, never `none`); `exp` / `nbf` checked; the key comes from config, not a literal. (ASVS V9)
- Password hashing per the OWASP Password Storage Cheat Sheet: **Argon2id** (min m=19 MiB, t=2, p=1), else scrypt; bcrypt only for legacy systems (cost ≥ 10, 72-byte input limit); PBKDF2-HMAC-SHA256 (600k iterations) when FIPS is required. Never plain or fast hashes (MD5, SHA-*).
- Login, reset, and registration return **generic messages** ("Invalid user ID or password"; "If that e-mail exists, we sent a link"). No early return when the user doesn't exist: the timing difference reveals accounts.
- Brute force: failures counted **per account** as well as per IP; lockout/backoff; rate limits on login, reset, OTP, invite.
- Secret/token comparison with `crypto.timingSafeEqual`. (CWE-208) Security tokens from `crypto.randomBytes` / `randomUUID`, never `Math.random`. (CWE-338)
- Reset tokens single-use, expiring, stored hashed. Password change requires the current password.
- Cookies: `HttpOnly`, `Secure`, `SameSite`.

## A04:2025 Cryptographic Failures

Weak or legacy algorithms (MD5/SHA1 for security purposes, ECB mode, `crypto.createCipher` / `createDecipher`, which use a weak key derivation and were removed in Node 22, DEP0106); hardcoded keys; reused IVs/nonces; TLS certificate validation disabled (`rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, which per the Node docs makes TLS and HTTPS insecure); sensitive data stored or sent unencrypted.

## A02:2025 Security Misconfiguration · API8:2023

- CORS reflecting any request origin (`cors({ origin: true, credentials: true })`, the same in `app.enableCors`). Browsers refuse `*` for credentialed requests, but a reflected origin bypasses that, so any site can make authenticated calls.
- No `helmet` (or equivalent security headers) on a public HTTP API; `X-Powered-By` exposed (helmet removes it by default).
- Swagger UI, GraphQL playground/introspection, or debug routes exposed in production without auth. Unused routes left registered.
- Stack traces or internal messages in error responses.
- TypeORM `synchronize: true` reachable outside local dev.
- No env validation at startup; unsafe defaults when an env var is missing.

## API4:2023 Unrestricted Resource Consumption · API6:2023 Sensitive Business Flows

- No rate limiting on expensive or sensitive endpoints. **[Nest]** `@nestjs/throttler` stores counters **in memory by default**: with several instances, each counts separately unless shared storage (e.g. Redis) is configured.
- No max page size; `take` / `limit` from the query unbounded.
- Request body size limits missing.
- Uploads without size/count limits, or type checks that trust the `Content-Type` header (spoofable). Expect an extension allowlist plus content validation; a file-signature check alone is easy to bypass.
- Calls to paid services per request (SMS, e-mail, LLM) without limits.
- Business flows worth automating for abuse (signup, coupons, ticket purchase, OTP send) with no anti-automation.

## A03:2025 Software Supply Chain Failures

Use the dependency-audit output and the manual checks in tools.md: new deps justified, maintained, not typosquats, no surprise install scripts, lockfile committed, versions not floating; known-vulnerable or unmaintained components (CWE-1104, CWE-1395). CI/workflow changes that pull unpinned actions or run untrusted code.

## A08:2025 Software or Data Integrity Failures

- Webhooks without signature verification. The signature is computed over the **unmodified raw body** (a re-serialized `JSON.stringify(req.body)` breaks it) and compared in constant time. Use the provider's own replay protection where it offers one (see its docs).
- Deserialization of untrusted data (`node-serialize`, unsafe YAML loaders, transforming untrusted input into class instances with side-effecting setters).

## A09:2025 Security Logging and Alerting Failures

- Authentication successes/failures, authorization denials, validation failures, and high-risk admin actions on new code paths are logged.
- Never logged: passwords, session ids, access tokens, keys, connection strings, card data, sensitive PII. (CWE-532)
- Structured (JSON) logs; CR/LF from user input neutralised and its length limited. (CWE-117)

## A10:2025 Mishandling of Exceptional Conditions

- **Fail-open:** a `catch` that grants access or skips a check when a dependency errors. (CWE-636)
- Error messages containing sensitive information. (CWE-209)
- Errors leaving exploitable partial state (charged but not recorded, or recorded but not charged).
- `process.on('uncaughtException')` handlers that keep serving: the Node docs say it is not safe to resume normal operation, so the process must clean up and exit. Unhandled rejections are raised as uncaught exceptions by default (`--unhandled-rejections=throw`), so a stray rejection can take the process down (DoS).

## LLM features (only if the diff calls an LLM): OWASP LLM Top 10 2025

- **LLM01 Prompt Injection:** user or retrieved content mixed into instructions; tools reachable from injected text.
- **LLM02 Sensitive Information Disclosure:** secrets, PII, or other tenants' data sent to or returned by the model.
- **LLM05 Improper Output Handling:** model output used as SQL, HTML, shell, URL, or tool arguments without validation (→ XSS, SSRF, RCE).
- **LLM06 Excessive Agency:** tools with more functionality, permission, or autonomy than the feature needs; destructive actions without confirmation.
- **LLM07 System Prompt Leakage:** secrets or authorization rules placed in the system prompt. It is not a secret and not a security control.
- **LLM08 Vector and Embedding Weaknesses:** RAG retrieval without tenant/permission filtering; untrusted documents ingested.
- **LLM10 Unbounded Consumption:** no token, cost, or rate limits (denial of wallet).

## Not this lens

Generic bugs without security impact (correctness), performance (unless it is a DoS vector), style.

## Sources

- OWASP Top 10:2025: https://top10.owasp.org/2025/
- OWASP API Security Top 10:2023: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP Top 10 for LLM Applications 2025: https://genai.owasp.org/llm-top-10/
- OWASP ASVS 5.0 (deeper requirements by area): https://asvs.owasp.org/
- OWASP Cheat Sheets: Node.js Security, Mass Assignment, SSRF Prevention, Prototype Pollution Prevention, Authentication, Password Storage, Logging, File Upload, Cross-Site Request Forgery Prevention. https://cheatsheetseries.owasp.org/
- CWE definitions: https://cwe.mitre.org/data/definitions/<id>.html
- NestJS: Validation, Serialization, Rate limiting, Helmet, CORS. https://docs.nestjs.com/
- class-validator, nested objects: https://github.com/typestack/class-validator · class-transformer `@Type`: https://github.com/typestack/class-transformer
- Prisma raw queries: https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries · TypeORM "Using parameters to escape data": https://github.com/typeorm/typeorm/blob/master/docs/docs/query-builder/1-select-query-builder.md
- jsonwebtoken README (`decode` vs `verify`, `algorithms`): https://github.com/auth0/node-jsonwebtoken
- MDN CORS, "Credentialed requests and wildcards": https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS · expressjs/cors (`origin: true`): https://github.com/expressjs/cors
- GitHub, validating webhook deliveries: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries · Stripe webhooks (raw body): https://docs.stripe.com/webhooks
- Node.js docs: `child_process` (`exec` spawns a shell), `path`, `crypto` (`timingSafeEqual`, `randomBytes`), deprecations (DEP0106), CLI (`--disable-proto`, `--unhandled-rejections`, `NODE_TLS_REJECT_UNAUTHORIZED`), `process` (`uncaughtException`). https://nodejs.org/api/
- MDN `Math.random()` (not cryptographically secure): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
- helmet README: https://github.com/helmetjs/helmet
