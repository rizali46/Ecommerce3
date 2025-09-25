# Security Specification — Kanso & Co. Storefront

## 1. Data Invariants
1. **Master Gate & Relational Sync**:
   - `/users/{userId}/private/{docId}` cannot exist or be accessed unless parent `/users/{userId}` exists and `request.auth.uid == userId` (or `isAdmin()`).
   - `/orders/{orderId}/items/{itemId}` requires parent `/orders/{orderId}` to exist and belong to `request.auth.uid` (or `isAdmin()`).
   - `/reviews/{reviewId}` creation requires the target `/products/{productId}` to exist (`exists(/databases/$(database)/documents/products/$(incoming().productId))`).
2. **PII Isolation (Split Collection)**:
   - Customer email, phone, street address, postal code, and payment card summary are strictly isolated inside `/users/{userId}/private/info` and never exposed in `/users/{userId}`.
3. **Privilege & Identity Integrity**:
   - Users cannot self-assign `role: 'admin'` in `/users/{userId}` unless `isAdmin()` is true.
   - All write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
   - Temporal fields (`createdAt`, `updatedAt`) must strictly equal `request.time`.
   - Terminal states (`delivered`, `cancelled`) on `/orders/{orderId}` lock further non-admin mutations.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on Product Update**: Adding `"isFeaturedHack": true` to `/products/prod-1`.
2. **Self-Assigned Admin Role**: Creating `/users/user-1` with `role: "admin"` as a non-admin user.
3. **Unverified Email Admin Spoof**: Attempting admin action with `email: "babybau1010@gmail.com"` and `email_verified: false`.
4. **PII Cross-User Read**: Authenticated `user-2` attempting `get` on `/users/user-1/private/info`.
5. **Unfiltered Order List Scraping**: Authenticated `user-2` attempting `list` on `/orders` without `where('userId', '==', 'user-2')`.
6. **Terminal Order State Reversal**: Customer attempting to update `/orders/ord-1` after `status == 'delivered'`.
7. **Order Total Manipulation on Update**: Customer attempting to modify `totalAmount` during a tracking or cancellation update.
8. **Orphaned Review Creation**: Creating `/reviews/rev-99` referencing a non-existent `productId: "ghost-prod"`.
9. **Client Timestamp Forgery**: Creating `/orders/ord-1` with a past or future `createdAt` instead of `request.time`.
10. **ID Poisoning Attack**: Creating a document with an invalid ID containing spaces or special characters (`id: "bad/id$123"`).
11. **Value Poisoning on Review Rating**: Updating `/reviews/rev-1` with `rating: 999` or string instead of integer `1..5`.
12. **Negative Stock Exhaustion**: Customer updating `/products/prod-1` with `stock: -50`.
