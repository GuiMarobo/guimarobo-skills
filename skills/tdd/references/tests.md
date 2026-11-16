# Good and bad tests

## The bar

A good test:
- calls the code the way its real caller does (public interface / seam);
- checks the result that caller would see;
- survives any refactor that keeps behaviour;
- reads as a specification in domain words;
- fails for a bug a caller would notice.

## Anti-patterns

**Implementation-coupled.** Mocks your own collaborators, tests private methods, asserts call counts/order, or verifies through a side channel. Tell: it breaks on refactor while behaviour is unchanged.

```ts
// BAD: verifies HOW
it('checkout calls paymentService.process', async () => {
  await checkout(cart, payment);
  expect(paymentService.process).toHaveBeenCalledWith(cart.total);
});

// BAD: bypasses the interface
it('createUser saves to database', async () => {
  await createUser({ name: 'Alice' });
  expect(await db.query('SELECT * FROM users WHERE name = $1', ['Alice'])).toBeDefined();
});

// GOOD: verifies WHAT, through the interface
it('created user can be retrieved', async () => {
  const user = await createUser({ name: 'Alice' });
  expect((await getUser(user.id)).name).toBe('Alice');
});
```

**Tautological.** The expected value is computed the way the code computes it, so the test can never disagree with the code.

```ts
// BAD
const expected = items.reduce((s, i) => s + i.price, 0);
expect(calculateTotal(items)).toBe(expected);

// GOOD: independent literal
expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
```

**Empty-implementation pass.** Would the test still pass if the function returned `undefined`, `[]`, `0`, or did nothing? Throw it out or strengthen it.

```ts
// BAD: passes for almost any implementation
expect(result).toBeDefined();
expect(() => withdraw(acc, 500)).toThrow();

// GOOD: pins the behaviour
expect(result).toEqual({ status: 'confirmed', total: 1500 });
expect(() => withdraw(acc, 500)).toThrow(InsufficientFundsError);
```

**Scaffolding left behind.** Triangulation steps that stayed as separate tests.

```ts
// BAD: three tests, one behaviour
it('free shipping at 100', ...);
it('free shipping at 150', ...);
it('free shipping at 1000', ...);

// GOOD: one class + the boundary, in one table
it.each([
  [99.99, 15],  // below threshold
  [100, 0],     // boundary
])('order of %p pays %p shipping', (total, shipping) => {
  expect(shippingFor(total)).toBe(shipping);
});
```

**Duplicated across layers.** The same rule's cases at domain level and again at HTTP level. Cases live at the lowest seam that owns the rule; the HTTP test proves wiring once.

**Horizontal slicing.** Writing all tests for the whole feature first, then all code. Tests then pin an imagined shape. Work one behaviour per cycle (its cases together in one table).

## Assertions

- Assert values, not existence. Prefer `toEqual` on the meaningful shape over many `toBeTruthy`.
- Errors: assert the type or code (`toThrow(InsufficientFundsError)`, `status 403`), not just "throws".
- Several assertions in one test are fine when they describe one behaviour.
- HTTP tests: assert status and the relevant body fields, not the whole payload (unless the payload is the contract).

## Sources

- Matt Pocock's `tdd` skill (`tests.md`): behaviour vs implementation tests, tautological tests, horizontal slicing.
- Uncle Bob's `ub-mode`: "If the test would still pass when every function returned nothing, throw it out."
- K. Beck, *Test-Driven Development: By Example*: test list, fake it, obvious implementation, triangulation.
- Equivalence partitioning and boundary value analysis: ISTQB Foundation Level syllabus, black-box techniques (https://www.istqb.org/).
- Jest `test.each`: https://jestjs.io/docs/api · Vitest `test.each`: https://vitest.dev/api/test · Node test runner: https://nodejs.org/api/test.html
