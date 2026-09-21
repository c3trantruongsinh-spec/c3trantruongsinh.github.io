// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// ⚠️ THAY THẾ CÁC GIÁ TRỊ DƯỚI ĐÂY BẰNG CONFIG CỦA BẠN TỪ FIREBASE CONSOLE
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyDGytyF7dvy-djx8QEgOOOBxFK9O_LE5_w",
    authDomain: "meetingsystem-b9e71.firebaseapp.com",
    databaseURL: "https://meetingsystem-b9e71-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "meetingsystem-b9e71",
    storageBucket: "meetingsystem-b9e71.firebasestorage.app",
    messagingSenderId: "587548729744",
    appId: "1:587548729744:web:0e8479fbf7305810e1d315"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.database();
// KHÔNG sử dụng Firebase Storage — dùng Google Drive link thay thế

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get current user UID
 * @returns {string|null}
 */
function getCurrentUid() {
    const user = auth.currentUser;
    return user ? user.uid : null;
}

/**
 * Get current user display name
 * @returns {string|null}
 */
function getCurrentUserName() {
    const user = auth.currentUser;
    return user ? user.displayName || user.email || 'Người dùng' : null;
}

/**
 * Get current user email
 * @returns {string|null}
 */
function getCurrentUserEmail() {
    const user = auth.currentUser;
    return user ? user.email : null;
}

/**
 * Get current user role from database
 * @returns {Promise<string|null>}
 */
async function getCurrentUserRole() {
    const uid = getCurrentUid();
    if (!uid) return null;
    try {
        const snapshot = await db.ref(`users/${uid}/role`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
}

/**
 * Get current user's team ID
 * @returns {Promise<string|null>}
 */
async function getCurrentUserTeamId() {
    const uid = getCurrentUid();
    if (!uid) return null;
    try {
        const snapshot = await db.ref(`users/${uid}/teamId`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting user team:', error);
        return null;
    }
}

/**
 * Get current user data
 * @returns {Promise<Object|null>}
 */
async function getCurrentUserData() {
    const uid = getCurrentUid();
    if (!uid) return null;
    try {
        const snapshot = await db.ref(`users/${uid}`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

/**
 * Check if user has role
 * @param {string} role - 'admin'|'truong_to'|'thu_ky'|'giao_vien'
 * @returns {Promise<boolean>}
 */
async function hasRole(role) {
    const userRole = await getCurrentUserRole();
    return userRole === role;
}

/**
 * Check if user is admin
 * @returns {Promise<boolean>}
 */
async function isAdmin() {
    return hasRole('admin');
}

/**
 * Check if user is team leader
 * @returns {Promise<boolean>}
 */
async function isTruongTo() {
    return hasRole('truong_to');
}

/**
 * Check if user is secretary
 * @returns {Promise<boolean>}
 */
async function isThuKy() {
    return hasRole('thu_ky');
}

/**
 * Check if user is teacher
 * @returns {Promise<boolean>}
 */
async function isGiaoVien() {
    return hasRole('giao_vien');
}

// ============================================================
// EXPORTS TO GLOBAL SCOPE
// ============================================================
window.firebase = firebase;
window.auth = auth;
window.db = db;
window.getCurrentUid = getCurrentUid;
window.getCurrentUserName = getCurrentUserName;
window.getCurrentUserEmail = getCurrentUserEmail;
window.getCurrentUserRole = getCurrentUserRole;
window.getCurrentUserTeamId = getCurrentUserTeamId;
window.getCurrentUserData = getCurrentUserData;
window.hasRole = hasRole;
window.isAdmin = isAdmin;
window.isTruongTo = isTruongTo;
window.isThuKy = isThuKy;
window.isGiaoVien = isGiaoVien;