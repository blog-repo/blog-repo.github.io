class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.initAuthListener();
    }

    initAuthListener() {
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.handleSignedInUser(user);
            } else {
                this.handleSignedOutUser();
            }
        });
    }

    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            await this.auth.signInWithPopup(provider);
            Utils.showNotification('Successfully logged in!', 'success');
        } catch (error) {
            console.error('Google Sign-In Error:', error);
            Utils.showNotification('Login failed: ' + error.message, 'error');
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
            Utils.showNotification('Successfully logged out!', 'success');
        } catch (error) {
            console.error('Sign out error:', error);
            Utils.showNotification('Logout failed: ' + error.message, 'error');
        }
    }

    handleSignedInUser(user) {
        const userData = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        };
        
        localStorage.setItem('user', JSON.stringify(userData));

        // Redirect to main app if on login page
        if (window.location.pathname.includes('login.html') || window.location.pathname === '/') {
            window.location.href = 'index.html';
        }
    }

    handleSignedOutUser() {
        localStorage.removeItem('user');
        
        // Redirect to login if not on login page
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    getCurrentUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    isAuthenticated() {
        return !!this.getCurrentUser();
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Add event listener for Google login button
document.addEventListener('DOMContentLoaded', function() {
    const googleLoginBtn = document.getElementById('googleLogin');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            authManager.signInWithGoogle();
        });
    }
});