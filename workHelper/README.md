# WorkHelper Backend Integration

This folder contains the core Firebase backend integration for the Personal Scheduling PWA.

## Included services

- `firebaseApp.js` - initializes Firebase app, Firestore, and Auth. Enables offline Firestore persistence.
- `firestoreService.js` - generic Firestore CRUD wrappers with query and listener helpers.
- `authService.js` - Email/password auth flow with single-authorized-user enforcement.
- `userService.js` - user profile/config/settings initialization and update helpers.
- `backendService.js` - central initializer that wires the services together.
- `index.js` - exports the main backend initialization function.

## Usage

```js
import { createBackend, getAuthService, getUserService } from './workHelper/index.js';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const { authService, userService, firestoreService } = await createBackend(firebaseConfig);

try {
  const user = await authService.signInWithEmail('email@example.com', 'password123');
  await userService.initializeUserWorkspace(user);
  const profile = await userService.getUserProfile(user.uid);
  console.log('Signed in user profile:', profile);
} catch (error) {
  console.error('Backend auth failed:', error);
}
```

## Authorization behavior

- The first successful signed-in email account creates `system/authorizedUser`.
- Subsequent sign-ins are allowed only if the signed-in UID matches the stored authorized UID.
- Unauthorized users are immediately signed out and rejected.
