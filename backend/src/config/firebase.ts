
import * as admin from 'firebase-admin';
import serviceAccount from '../../serviceAccountKey.json';

let db: admin.firestore.Firestore;
let firebaseInitialized = false;

try {

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL: 'https://studio-1505924677-8e6ee.firebaseio.com'
  });

  db = admin.firestore();
  firebaseInitialized = true;
  // eslint-disable-next-line no-console
  console.log('✅ Firebase initialized successfully');
} catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
        // eslint-disable-next-line no-console
        console.warn('⚠️  Firebase service account key not found at `serviceAccountKey.json`. Firebase features will be disabled.');
        // eslint-disable-next-line no-console
        console.warn('Please download the key from your Firebase project settings and place it in the root directory.');
    } else {
        // eslint-disable-next-line no-console
        console.error('❌ Error initializing Firebase: ', error);
    }
}

export { db, firebaseInitialized };
