# Contributing to Nongorr (নোঙর)

Thank you for your interest in contributing to Nongorr! This guide will help you get started.

## 🚀 Quick Start

```bash
# 1. Fork & Clone
git clone https://github.com/YOUR_USERNAME/nongor-brand.git
cd nongor-brand

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your credentials (see Environment Variables in README)

# 4. Start development
npm run dev          # Vite dev server (hot reload)
npm run watch:css    # Tailwind CSS watcher (separate terminal)
```

## 📁 Project Structure

```
├── api/             # Serverless API (Vercel Functions)
├── js/              # Frontend JavaScript modules
├── assets/          # CSS, images, fonts
├── tests/           # Vitest test files
├── scripts/         # Database migrations
├── utils/           # Server-side utilities (email, etc.)
└── *.html           # Page templates
```

## 🧪 Testing

We use [Vitest](https://vitest.dev/) for unit testing with jsdom environment.

```bash
# Run all tests
npm test

# Run tests in watch mode
npx vitest

# Run with coverage report
npx vitest run --coverage

# Run a specific test file
npx vitest run tests/utils.test.js
```

### Test Structure

| File | Module | Tests |
|------|--------|-------|
| `utils.test.js` | Utility helpers | 23 |
| `cart.test.js` | Cart CRUD, localStorage | 14 |
| `checkout.test.js` | Order payload, validation | 14 |
| `sanitize.test.js` | XSS prevention, encoding | 21 |
| `products.test.js` | Filtering, sorting, parsing | 27 |
| `custom-sizing.test.js` | Measurement validation | 19 |
| `navigation.test.js` | Search routing, scroll state | 16 |
| `cache.test.js` | Rate limiting logic | 11 |

**Total: 145 tests**

### Writing Tests

- Tests go in the `tests/` directory
- Name test files `[module].test.js`
- Replicate the function logic in the test file (since modules use `window.*` globals)
- Cover: happy path, edge cases, boundary values, error states

## 🔀 Git Workflow

### Branch Naming

```
feature/add-wishlist-page
fix/cart-quantity-overflow
docs/update-api-reference
perf/optimize-image-loading
```

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add wishlist page with localStorage persistence
fix: resolve cart drawer not closing on mobile
docs: add JSDoc to cart module functions
perf: add preconnect hints for Cloudinary CDN
test: add rate limiter boundary tests
```

## 📝 Code Style

### JavaScript
- **ES2022** syntax (async/await, optional chaining, nullish coalescing)
- Use `window.*` prefix for all shared global state
- Add JSDoc comments to all exported functions
- Use `const` by default, `let` when reassignment needed

### HTML
- Tailwind CSS utility classes for styling
- Semantic HTML5 elements (`<nav>`, `<main>`, `<section>`, `<article>`)
- Bengali text in UI, English in code comments
- Unique `id` attributes on all interactive elements

### CSS
- Custom animations go in `assets/animations.css`
- Tailwind config in `tailwind.config.js`
- Source CSS in `src/input.css`

## 🔒 Security Guidelines

- **Never** commit `.env` or secrets
- **Always** use parameterized queries for SQL
- **Always** sanitize user input (use `sanitize.js`)
- **Always** validate phone numbers with `isValidBangladeshiPhone()`
- **Never** use `innerHTML` with unsanitized user input — use `textContent` or `escapeHtml()`

## 🐛 Reporting Bugs

Open an issue with:
1. **Steps to reproduce** (exact clicks/inputs)
2. **Expected behavior** vs **actual behavior**
3. **Browser & device** (e.g., Chrome 120, iPhone 15)
4. **Console errors** (screenshot or paste)

## 📋 Pull Request Checklist

- [ ] Tests pass: `npm test`
- [ ] No console errors in browser
- [ ] Mobile responsive (test at 375px width)
- [ ] Bengali text renders correctly
- [ ] No hardcoded API URLs (use `window.API_URL`)
- [ ] Commit messages follow conventional format

---

Built with ❤️ by the Nongorr team
