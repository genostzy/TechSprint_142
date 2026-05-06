# Security Specification for TechSprint

## Data Invariants
1. Products can only be created/modified by Admins.
2. User preferences (saved items/alerts) strictly belong to the user identified by their `username`.
3. Notifications are created by the system/admin and read only by the targeted user (`userId` matches the user's `username`).
4. Users cannot elevate their own permissions (cannot change `role` or `isAdmin`).
5. All document IDs must be sanitized and bounded in length.

## The "Dirty Dozen" Payload Tests

| Payload ID | Target Collection | Malicious Content | Expected Result |
|------------|-------------------|-------------------|-----------------|
| P1 | `products` | Create product as non-admin | `PERMISSION_DENIED` |
| P2 | `products` | Update product `id` (immutable) | `PERMISSION_DENIED` |
| P3 | `users` | Self-elevate to `role: 'admin'` | `PERMISSION_DENIED` |
| P4 | `user_prefs` | Update another user's preferences | `PERMISSION_DENIED` |
| P5 | `notifications` | Read another user's notifications | `PERMISSION_DENIED` |
| P6 | `notifications` | Create notification as non-admin | `PERMISSION_DENIED` |
| P7 | `notifications` | Update others' `userId` (spoofing) | `PERMISSION_DENIED` |
| P8 | `products` | Inject 2MB string into `description` | `PERMISSION_DENIED` |
| P9 | `users` | Spoof email without verification | `PERMISSION_DENIED` |
| P10 | `user_prefs` | Query alerts of all users as non-admin | `PERMISSION_DENIED` |
| P11 | `notifications` | Blanket list query without `userId` filter | `PERMISSION_DENIED` |
| P12 | `users` | Delete another user's profile | `PERMISSION_DENIED` |

## Relational Truth
- `isAdmin()` is the gatekeeper for inventory.
- `getUsername(uid)` is the link between Auth and App-Specific identifiers.
