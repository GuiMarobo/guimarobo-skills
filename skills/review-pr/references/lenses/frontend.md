# Lens: Frontend

Applies to `.tsx` / `.jsx` / `.vue` / `.svelte` / `.html` and client-side code.

## Security

- XSS sinks: `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, `{@html}`, and `href` / `src` built from user data (`javascript:` URLs). Sanitize (DOMPurify) or avoid. (CWE-79)
- Secrets in the client bundle: env vars inlined into client code (`NEXT_PUBLIC_*`, `VITE_*`) holding a private key or token.
- Session identifiers or sensitive data in `localStorage` (always readable by JavaScript, so by any XSS). Prefer HttpOnly cookies.
- Authorization decided only in the client (hidden button ≠ protected action): confirm the API enforces it.
- Open redirects from query params; `message` event handlers that don't verify `event.origin`.

## Correctness (React; adapt for other frameworks)

- Hooks rules; effect dependency arrays missing values (stale closures) or causing loops.
- Fetches in effects without abort/ignore on unmount or param change (race: an older response overwrites a newer one).
- Unstable or index `key`s in lists that reorder.
- State duplicated from props or server data and drifting out of sync.
- Missing loading, error, and empty states; double submit on forms.

## Accessibility (WCAG 2.2 AA basics)

- Interactive elements are `<button>` / `<a>`, not clickable `<div>`s; everything is keyboard-reachable with a visible focus.
- Inputs have labels; errors are announced and linked (`aria-describedby`).
- Images have meaningful `alt` (or `alt=""` if decorative).
- Contrast meets AA for new colours; target size ≥ 24×24 px.
- ARIA only when native semantics can't do it; dialogs trap and restore focus.

## Performance

- Large lists without virtualization; heavy computations in render without memoization.
- New large dependencies in the client bundle; images without size/lazy loading.

## Sources

- WCAG 2.2 (incl. 2.5.8 Target Size (Minimum), AA, 24×24 CSS px): https://www.w3.org/TR/WCAG22/
- OWASP Cross Site Scripting Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- OWASP HTML5 Security Cheat Sheet (localStorage, postMessage): https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
- React docs: Rules of React https://react.dev/reference/rules · `useEffect`, fetching data (race / `ignore` flag) https://react.dev/reference/react/useEffect · Rendering lists (keys) https://react.dev/learn/rendering-lists · `dangerouslySetInnerHTML` https://react.dev/reference/react-dom/components/common
- Next.js environment variables: https://nextjs.org/docs/app/guides/environment-variables · Vite env: https://vite.dev/guide/env-and-mode
- MDN `Window.postMessage` (verify origin): https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- DOMPurify: https://github.com/cure53/DOMPurify
- W3C "Using ARIA" (native HTML first; discontinued, superseded by the ARIA Authoring Practices Guide): https://www.w3.org/TR/using-aria/ · https://www.w3.org/WAI/ARIA/apg/
