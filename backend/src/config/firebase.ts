import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let db: admin.firestore.Firestore;
let firebaseInitialized = false;

try {
    if (
        !process.env.FIREBASE_PROJECT_ID ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        !process.env.FIREBASE_PRIVATE_KEY
    ) {
        throw new Error('Missing Firebase environment variables');
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,

            privateKey:
                process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),

        databaseURL:
            'https://studio-1505924677-8e6ee.firebaseio.com',
    });

    db = admin.firestore();

    firebaseInitialized = true;

    console.log('✅ Firebase initialized successfully');

} catch (error) {
    console.warn('⚠️ Firebase initialization skipped');

    console.error(error);
}

export { db, firebaseInitialized };
