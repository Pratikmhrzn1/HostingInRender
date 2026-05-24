"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebaseInitialized = exports.db = void 0;
const admin = __importStar(require("firebase-admin"));
const serviceAccountKey_json_1 = __importDefault(require("../../serviceAccountKey.json"));
let db;
let firebaseInitialized = false;
exports.firebaseInitialized = firebaseInitialized;
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey_json_1.default),
        databaseURL: 'https://studio-1505924677-8e6ee.firebaseio.com'
    });
    exports.db = db = admin.firestore();
    exports.firebaseInitialized = firebaseInitialized = true;
    // eslint-disable-next-line no-console
    console.log('✅ Firebase initialized successfully');
}
catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        // eslint-disable-next-line no-console
        console.warn('⚠️  Firebase service account key not found at `serviceAccountKey.json`. Firebase features will be disabled.');
        // eslint-disable-next-line no-console
        console.warn('Please download the key from your Firebase project settings and place it in the root directory.');
    }
    else {
        // eslint-disable-next-line no-console
        console.error('❌ Error initializing Firebase: ', error);
    }
}
