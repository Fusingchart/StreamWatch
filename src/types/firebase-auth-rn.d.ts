import type { Persistence } from 'firebase/auth';

// firebase v12's package.json "exports" map for "firebase/auth" has no
// "react-native" condition, so even though Metro resolves this export
// correctly at runtime (via @firebase/auth's own react-native field),
// tsc's exports-map resolution can't see it and reports it missing.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
