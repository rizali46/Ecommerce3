/**
 * Dirty Dozen Security Verification Spec for firestore.rules
 */
export interface DirtyDozenTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Product Update',
    operation: 'update',
    path: '/products/prod-01',
    auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
    payload: { stock: 5, soldCount: 2, isFeaturedHack: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Role on User Profile Creation',
    operation: 'create',
    path: '/users/user-1',
    auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
    payload: { uid: 'user-1', displayName: 'Attacker', role: 'admin' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Admin Spoof',
    operation: 'delete',
    path: '/products/prod-01',
    auth: { uid: 'spoof-admin', email: 'babybau1010@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Cross-User Read on Isolated Private Subcollection',
    operation: 'get',
    path: '/users/user-1/private/info',
    auth: { uid: 'user-2', email: 'user2@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unfiltered Order List Scraping',
    operation: 'list',
    path: '/orders',
    auth: { uid: 'user-2', email: 'user2@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Terminal Order State Reversal After Delivered',
    operation: 'update',
    path: '/orders/ord-delivered',
    auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
    payload: { status: 'processing' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Order Total Manipulation on Customer Update',
    operation: 'update',
    path: '/orders/ord-1',
    auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
    payload: { totalAmount: 0.01, status: 'packed' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Orphaned Review Creation for Non-Existent Product',
    operation: 'create',
    path: '/reviews/rev-orphan',
    auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
    payload: { productId: 'non-existent-prod', userId: 'user-1', rating: 5 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery on Order Creation',
    operation: 'create',
    path: '/orders/ord-forged',
    auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID Poisoning Attack with Disallowed Characters',
    operation: 'create',
    path: '/reviews/invalid$id!99',
    auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
    payload: { productId: 'prod-01', userId: 'user-1', rating: 5 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning on Review Rating Out of Range',
    operation: 'update',
    path: '/reviews/rev-1',
    auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
    payload: { rating: 999, title: 'Poisoned', comment: 'Invalid rating value' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Negative Stock Exhaustion on Product Inventory Update',
    operation: 'update',
    path: '/products/prod-01',
    auth: { uid: 'user-1', email: 'user1@example.com', email_verified: true },
    payload: { stock: -10, soldCount: 100 },
    expectedResult: 'PERMISSION_DENIED',
  },
];
