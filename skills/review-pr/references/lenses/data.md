# Lens: Data and migrations

Applies to migrations, entities/models, Prisma schema files, and repositories. Assume a production database with real volume, and old and new app versions running side by side during deploy.

## Checklist

**Deploy compatibility (expand → migrate → contract)**
- Renaming or dropping a column/table still read by the currently deployed code → **Blocker**. Expand first; contract in a later release.
- A new `NOT NULL` column without a default breaks old code inserting rows.
- Enum value removed or renamed while old code or stored data still uses it.

**Locks and long operations (Postgres; adapt for MySQL)**
- `CREATE INDEX` without `CONCURRENTLY` on a large table (and `CONCURRENTLY` can't run inside a transaction: check how the migration runner wraps it).
- Changes that rewrite the table and its indexes: most column type changes, or adding a column with a **volatile** default (e.g. `clock_timestamp()`, `random()`). A non-volatile default needs no rewrite.
- Adding a CHECK or FK constraint in one step (full scan under a strong lock). Use `NOT VALID`, then `VALIDATE CONSTRAINT` (lighter lock).
- Large backfills in one `UPDATE` / transaction → batch them, ideally separate from the schema migration.

**Reversibility**
- A down migration exists, or the rollback plan is stated. Destructive steps (drop, truncate, lossy type change) are called out explicitly.

**Integrity**
- Uniqueness enforced by a DB unique index, not only an application check (races).
- Foreign keys present and indexed; `ON DELETE` behaviour intentional (cascade can delete far more than expected).
- Nullability and lengths match the domain and the DTO validation.

**ORM specifics** (apply the one the stack uses; for Mongoose, Drizzle, Knex, or Sequelize, check the equivalent: schema change without migration, auto-sync in production, missing indexes)
- TypeORM: entity changes without a generated migration; `synchronize: true` outside local dev; `eager` relations added to hot entities.
- Prisma: the Prisma schema changed without a committed migration (file name and migrate commands vary by Prisma version; follow the repo); `@default` / `@updatedAt` semantics; `onDelete` defaults.

**Data semantics**
- Points in time stored as `timestamptz`, not `timestamp` (Postgres). Money as `numeric` (or integer minor units), not float and not Postgres's `money` type.
- Soft-delete: new queries filter deleted rows the way the rest of the codebase does.

**Personal data**
- New PII columns: needed? Encryption at rest for sensitive fields, retention/deletion path, excluded from logs and API responses by default.

## Sources

- PostgreSQL `CREATE INDEX` (`CONCURRENTLY` not allowed in a transaction block; a standard build locks out writes): https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL `ALTER TABLE` (`NOT VALID` + `VALIDATE CONSTRAINT`): https://www.postgresql.org/docs/current/sql-altertable.html
- Prisma migrations: https://www.prisma.io/docs/orm/migrations/how-migrations-work · TypeORM migrations: https://typeorm.io/docs/migrations/why
- Expand/contract ("parallel change"): https://martinfowler.com/bliki/ParallelChange.html
- OWASP ASVS 5.0, V14 Data Protection: https://asvs.owasp.org/
- PostgreSQL wiki "Don't Do This" (`timestamptz`; avoid the `money` type): https://wiki.postgresql.org/wiki/Don't_Do_This
