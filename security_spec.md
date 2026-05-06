# Security Specification for TechSprint

## Data Invariants
1. Products can only be created/modified by Admins.
2. User profiles strictly belong to the user (`request.auth.uid`).
3. User preferences (saved items/alerts) strictly belong to the user (`request.auth.uid`).
4. Notifications are created by the system/admin and read/deleted only by the targeted user.
5. Reviews can be created by signed-in users, modified/deleted by owners or admins.
6. Stock alerts belong to the user who created them.
7. Users cannot elevate their own permissions (cannot change `role` or `isAdmin`).
8. All document IDs and string fields must be bounded in length.
9. Email verification is required for all write operations.

## The "Dirty Dozen" Payload Tests

| Payload ID | Target Collection | Malicious Content | Expected Result |
|------------|-------------------|-------------------|-----------------|
| P1 | `products` | Create product as non-admin | `PERMISSION_DENIED` |
| P2 | `users` | Update another user's profile | `PERMISSION_DENIED` |
| P3 | `users` | Self-elevate to `role: 'admin'` | `PERMISSION_DENIED` |
| P4 | `user_prefs` | Update another user's preferences | `PERMISSION_DENIED` |
| P5 | `notifications` | Read another user's notifications | `PERMISSION_DENIED` |
| P6 | `notifications` | Create notification as non-admin | `PERMISSION_DENIED` |
| P7 | `reviews` | Edit another user's review | `PERMISSION_DENIED` |
| P8 | `products` | Inject 2MB string into `description` | `PERMISSION_DENIED` |
| P9 | `users` | Spoof email without verification | `PERMISSION_DENIED` |
| P10 | `stock_alerts` | Subscribe another user to an alert | `PERMISSION_DENIED` |
| P11 | `announcements` | Create announcement as non-admin | `PERMISSION_DENIED` |
| P12 | `usernames` | Hijack an existing username mapping | `PERMISSION_DENIED` |

## Relational Truth
- `isAdmin()` is based on the `users` collection or hardcoded whitelist.
- `userId` (UID) is the primary identifier for user-owned data.
- `usernames` collection ensures uniqueness and handles login mapping.
