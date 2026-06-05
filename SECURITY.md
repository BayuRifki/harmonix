# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |
| < 0.0.1 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Harmonix, please report it privately:

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. Email the maintainers (see repository contacts) with:
   - A clear description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. You should receive a response within 72 hours.
4. We will work with you to understand the issue and coordinate a fix.

## Disclosure Policy

- We follow a **coordinated disclosure** process.
- We aim to patch critical issues within 7 days of confirmation.
- We will credit reporters in the fix commit (unless you prefer anonymity).

## Scope

The following are in scope:
- Code execution vulnerabilities in the Electron main process
- Cross-site scripting (XSS) in the renderer
- OAuth token theft or leakage
- Local file system access beyond intended scope
- IPC channel abuse (privilege escalation)

The following are **out of scope**:
- Vulnerabilities in third-party dependencies (report upstream)
- Issues requiring physical access to the device
- Social engineering attacks
- Issues in unofficial source integrations (e.g., YouTube Music scrapers) that are inherent to the unofficial nature

## Safe Harbor

We will not pursue legal action against security researchers who:
- Act in good faith
- Do not access or modify user data beyond what's necessary
- Do not degrade the service for others
- Report vulnerabilities through the channels above
