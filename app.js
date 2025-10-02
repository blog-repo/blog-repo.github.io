// Firebase configuration
const firebaseConfig = {

    apiKey: "AIzaSyCCt0IFU6RLUPZ8LLqcKVPEBawOaUQV0bY",

    authDomain: "movie-bacec.firebaseapp.com",

    databaseURL: "https://movie-bacec-default-rtdb.firebaseio.com",

    projectId: "movie-bacec",

    storageBucket: "movie-bacec.firebasestorage.app",

    messagingSenderId: "84381310223",

    appId: "1:84381310223:web:2b894bead516bb03f8b27a",

    measurementId: "G-D7940PLCNH"

  };
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM elements
const passwordSection = document.getElementById('passwordSection');
const appSection = document.getElementById('appSection');
const moviesGrid = document.getElementById('moviesGrid');
const loadingSpinner = document.getElementById('loadingSpinner');

// State variables
let currentMovieId = null;
let isAuthenticated = false;
let moviesRef = database.ref('Movies');
let adminRef = database.ref('Admin');

// Password configuration
const DEFAULT_PASSWORD = "admin123"; // Change this in production

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthenticationStatus();
    setupEventListeners();
});

function setupEventListeners() {
    // Enter key support for password field
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') checkPassword();
    });
}

// Check if user is already authenticated (from sessionStorage)
function checkAuthenticationStatus() {
    const savedAuth = sessionStorage.getItem('moviesAppAuthenticated');
    if (savedAuth === 'true') {
        isAuthenticated = true;
        showApp();
        loadMovies();
        initializeAdminPassword();
    } else {
        showPasswordSection();
        initializeAdminPassword();
    }
}

// Initialize admin password (set default if not exists)
function initializeAdminPassword() {
    adminRef.child('password').once('value', (snapshot) => {
        if (!snapshot.exists()) {
            // Set default password
            adminRef.child('password').set(DEFAULT_PASSWORD)
                .then(() => {
                    console.log('Default admin password set');
                })
                .catch((error) => {
                    console.error('Error setting default password:', error);
                });
        }
    });
}

// Check password against Firebase database
function checkPassword() {
    const passwordInput = document.getElementById('adminPassword').value;
    
    if (!passwordInput) {
        showMessage('passwordMessage', 'Please enter password', 'danger');
        return;
    }

    showMessage('passwordMessage', 'Checking password...', 'info');

    adminRef.child('password').once('value', (snapshot) => {
        const storedPassword = snapshot.val();
        
        if (passwordInput === storedPassword) {
            // Password correct
            isAuthenticated = true;
            sessionStorage.setItem('moviesAppAuthenticated', 'true');
            showApp();
            loadMovies();
        } else {
            // Password incorrect
            showMessage('passwordMessage', 'Incorrect password', 'danger');
            document.getElementById('adminPassword').value = '';
        }
    }).catch((error) => {
        showMessage('passwordMessage', 'Error checking password: ' + error.message, 'danger');
    });
}

// Change admin password
function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showMessage('changePasswordMessage', 'Please fill all fields', 'danger');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('changePasswordMessage', 'New password must be at least 6 characters', 'danger');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showMessage('changePasswordMessage', 'New passwords do not match', 'danger');
        return;
    }

    // Verify current password first
    adminRef.child('password').once('value', (snapshot) => {
        const storedPassword = snapshot.val();
        
        if (currentPassword !== storedPassword) {
            showMessage('changePasswordMessage', 'Current password is incorrect', 'danger');
            return;
        }

        // Update to new password
        adminRef.child('password').set(newPassword)
            .then(() => {
                showMessage('changePasswordMessage', 'Password changed successfully!', 'success');
                
                // Clear form and close modal after 2 seconds
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
                    document.getElementById('currentPassword').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmNewPassword').value = '';
                    showMessage('changePasswordMessage', '', 'success');
                }, 2000);
            })
            .catch((error) => {
                showMessage('changePasswordMessage', 'Error changing password: ' + error.message, 'danger');
            });
    });
}

function showPasswordSection() {
    passwordSection.classList.remove('hidden');
    appSection.classList.add('hidden');
}

function showApp() {
    passwordSection.classList.add('hidden');
    appSection.classList.remove('hidden');
}

function logout() {
    isAuthenticated = false;
    sessionStorage.removeItem('moviesAppAuthenticated');
    showPasswordSection();
    document.getElementById('adminPassword').value = '';
    showMessage('passwordMessage', '', 'success');
}

function showMessage(elementId, message, type = 'danger') {
    const element = document.getElementById(elementId);
    if (message) {
        element.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    } else {
        element.innerHTML = '';
    }
}

function showChangePasswordModal() {
    const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    modal.show();
}

// Load all movies from Firebase
function loadMovies() {
    if (!isAuthenticated) return;

    moviesRef.on('value', (snapshot) => {
        moviesGrid.innerHTML = '';
        const movies = snapshot.val();
        
        if (!movies) {
            moviesGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-film fa-3x text-muted mb-3"></i>
                    <h3 class="text-muted">No movies found</h3>
                    <p class="text-muted">Add your first movie to get started!</p>
                </div>
            `;
            loadingSpinner.style.display = 'none';
            return;
        }

        Object.keys(movies).forEach(movieId => {
            const movie = movies[movieId];
            if (movie && movie.name) {
                createMovieCard(movieId, movie);
            }
        });
        
        loadingSpinner.style.display = 'none';
    });
}

// Create movie card HTML
function createMovieCard(movieId, movie) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    
    col.innerHTML = `
        <div class="card movie-card h-100">
            <img src="${movie.cover_url || 'https://via.placeholder.com/300x400?text=No+Cover'}" 
                 class="card-img-top cover-image" 
                 alt="${movie.name}"
                 onerror="this.src='https://via.placeholder.com/300x400?text=No+Cover'">
            <div class="card-body">
                <h5 class="card-title">${movie.name}</h5>
                <p class="card-text">
                    <small class="text-muted">
                        <i class="fas fa-calendar"></i> ${movie.year} | 
                        <i class="fas fa-language"></i> ${movie.language}<br>
                        <i class="fas fa-clock"></i> ${movie.duration} min | 
                        <i class="fas fa-eye"></i> ${movie.views || 0} views<br>
                        <i class="fas fa-user"></i> ${movie.uploaded_by}
                    </small>
                </p>
            </div>
            <div class="card-footer">
                <button class="btn btn-outline-primary btn-sm" onclick="playMovie('${movie.m3u8_url}')">
                    <i class="fas fa-play"></i> Play
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="editMovie('${movieId}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="confirmDelete('${movieId}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    moviesGrid.appendChild(col);
}

// Play movie (opens in new tab)
function playMovie(m3u8Url) {
    if (m3u8Url) {
        window.open(m3u8Url, '_blank');
    } else {
        alert('No video URL available');
    }
}

// Open modal for adding new movie
function openAddMovieModal() {
    if (!isAuthenticated) return;
    
    currentMovieId = null;
    document.getElementById('modalTitle').textContent = 'Add New Movie';
    document.getElementById('movieForm').reset();
    document.getElementById('views').value = '0';
    
    const modal = new bootstrap.Modal(document.getElementById('movieModal'));
    modal.show();
}

// Edit movie
function editMovie(movieId) {
    if (!isAuthenticated) return;

    moviesRef.child(movieId).once('value', (snapshot) => {
        const movie = snapshot.val();
        if (movie) {
            currentMovieId = movieId;
            document.getElementById('modalTitle').textContent = 'Edit Movie';
            
            // Fill form with movie data
            document.getElementById('movieId').value = movieId;
            document.getElementById('name').value = movie.name || '';
            document.getElementById('year').value = movie.year || '';
            document.getElementById('language').value = movie.language || '';
            document.getElementById('views').value = movie.views || 0;
            document.getElementById('duration').value = movie.duration || '';
            document.getElementById('m3u8_url').value = movie.m3u8_url || '';
            document.getElementById('cover_url').value = movie.cover_url || '';
            document.getElementById('uploaded_by').value = movie.uploaded_by || '';
            
            const modal = new bootstrap.Modal(document.getElementById('movieModal'));
            modal.show();
        }
    });
}

// Save movie (create or update)
function saveMovie() {
    if (!isAuthenticated) return;

    const movieData = {
        name: document.getElementById('name').value,
        year: parseInt(document.getElementById('year').value),
        language: document.getElementById('language').value,
        views: parseInt(document.getElementById('views').value) || 0,
        duration: parseInt(document.getElementById('duration').value),
        m3u8_url: document.getElementById('m3u8_url').value,
        cover_url: document.getElementById('cover_url').value,
        uploaded_by: document.getElementById('uploaded_by').value,
        last_updated: new Date().toISOString()
    };

    // Validate required fields
    if (!movieData.name || !movieData.year || !movieData.language || 
        !movieData.duration || !movieData.m3u8_url || !movieData.cover_url || 
        !movieData.uploaded_by) {
        alert('Please fill in all required fields');
        return;
    }

    if (currentMovieId) {
        // Update existing movie
        moviesRef.child(currentMovieId).update(movieData)
            .then(() => {
                alert('Movie updated successfully!');
                bootstrap.Modal.getInstance(document.getElementById('movieModal')).hide();
            })
            .catch((error) => {
                alert('Error updating movie: ' + error.message);
            });
    } else {
        // Create new movie
        const newMovieRef = moviesRef.push();
        movieData.id = newMovieRef.key;
        movieData.created_at = new Date().toISOString();
        
        newMovieRef.set(movieData)
            .then(() => {
                alert('Movie added successfully!');
                bootstrap.Modal.getInstance(document.getElementById('movieModal')).hide();
            })
            .catch((error) => {
                alert('Error adding movie: ' + error.message);
            });
    }
}

// Confirm delete
function confirmDelete(movieId) {
    if (!isAuthenticated) return;
    
    currentMovieId = movieId;
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

// Delete movie
function deleteMovie() {
    if (!isAuthenticated || !currentMovieId) return;

    moviesRef.child(currentMovieId).remove()
        .then(() => {
            alert('Movie deleted successfully!');
            bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        })
        .catch((error) => {
            alert('Error deleting movie: ' + error.message);
        });
}