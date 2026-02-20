## 2026-02-20 - [Insecure Session File Permissions]

**Vulnerability:** Session data containing sensitive authentication cookies was stored in a file with default system permissions (0644), making it readable by other users.
**Learning:** Default Node.js `fs.writeFile` and `fs.mkdir` behavior can lead to insecure file permissions if not explicitly configured.
**Prevention:** Always use explicit `mode: 0o600` for files containing secrets and `mode: 0o700` for directories containing them. Use `fs.chmod` to ensure permissions are corrected even if the file already exists.
