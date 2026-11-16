# Mocking

## Replace only system boundaries

Replace things you don't own or can't make deterministic:

- third-party HTTP APIs (payments, email, SMS, other services);
- message brokers when not under test;
- clock and randomness;
- the file system or cloud storage (sometimes).

Never mock your own modules, services, repositories, or internal collaborators. If a unit is painful to test without mocking its own collaborators, the seam is wrong: test higher, or extract the rule into a pure function.

## Database: real, not mocked

A mocked repository tests that you called the ORM, not that the data is right. Prefer a real database, with per-test cleanup (transaction rollback or truncate). If the project has no test DB, follow the fallback order in seams.md. Pure business rules don't need a DB at all: extract them and test them directly.

## Prefer fakes over mocks

A **fake** is a small working implementation (an in-memory outbox, a fake payment gateway that records charges). Assert on its state, not on mock call mechanics.

```ts
// BAD: mock mechanics
expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@x.com' }));

// GOOD: fake records what was sent
expect(fakeMailer.sent).toContainEqual(expect.objectContaining({ to: 'a@x.com', template: 'welcome' }));
```

Asserting that a boundary was called is fine when the call **is** the behaviour (an email was sent, a charge was made). Asserting on calls between your own classes is never fine.

## Design for replaceable boundaries

- Inject boundary clients (constructor / Nest providers). Don't `new` them inside logic.
- Prefer specific methods (`payments.charge(order)`) over a generic `http.request(url, opts)`, so each fake returns one shape with no conditionals.
- Inject a clock (`() => Date`) or use fake timers. Never read `Date.now()` deep inside rules.
- External HTTP in integration tests: intercept at the network layer (`nock`, `msw`) or override the client provider with a fake.

## NestJS overrides

```ts
const moduleRef = await Test.createTestingModule({ imports: [OrdersModule] })
  .overrideProvider(PaymentGateway).useValue(fakePaymentGateway) // boundary only
  .compile();
```

Override boundary providers only. If you are overriding your own services, you are testing at the wrong seam.

## Sources

- Matt Pocock's `tdd` skill (`mocking.md`): mock at system boundaries, SDK-style interfaces.
- NestJS Testing, `overrideProvider`: https://docs.nestjs.com/fundamentals/testing
- Jest fake timers: https://jestjs.io/docs/jest-object · Vitest `vi.useFakeTimers`: https://vitest.dev/api/vi.html · Node `MockTimers`: https://nodejs.org/api/test.html
- M. Fowler, "Mocks Aren't Stubs" (fakes vs mocks): https://martinfowler.com/articles/mocksArentStubs.html
