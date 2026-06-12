# V2 Separation Checklist

To make V1 and V2 install and run independently on the same Windows machine, perform the following 5 changes.

## 1. package.json

File: `apps/desktop/package.json`

| Field | Current Value | V2 Value |
|---------|---------|---------|
| `appId` | `com.claimmanagement.desktop` | `com.claimmanagement.desktop.v2` |
| `productName` | `Claim Management` | `Claim Management V2` |
| `build.directories.output` | `release` | `release-v2` |

### Why

- `appId` makes Windows treat V2 as a separate application.
- `productName` changes the application name shown to users.
- `output` prevents build artifacts from colliding with V1.

---

## 2. main.ts

### Single Instance Lock

Change:

```ts
claim-mgmt-
```

to:

```ts
claim-mgmt-v2-
```

This prevents V1 and V2 from blocking each other through the Electron single-instance lock.

---

### Auto-Start Registry Entry

Change:

```ts
ClaimManagement-Backend
```

to:

```ts
ClaimManagement-Backend-V2
```

This prevents V2 from overwriting V1's Windows startup registration.

---

## Firewall Rule

Current firewall rule:

```ts
ClaimManagement-Backend-${port}
```

No change required.

If V1 and V2 use different ports, Windows will treat them separately. The current naming is acceptable.

---

# Final Summary

## Required Changes (5 Total)

### package.json

1. `appId` → `com.claimmanagement.desktop.v2`
2. `productName` → `Claim Management V2`
3. `output` → `release-v2`

### main.ts

4. `claim-mgmt-` → `claim-mgmt-v2-`
5. `ClaimManagement-Backend` → `ClaimManagement-Backend-V2`

After these changes:

- V1 and V2 can be installed simultaneously.
- Both versions appear separately in Windows.
- Startup registration does not conflict.
- Single-instance locks do not conflict.
- Build outputs remain isolated.
