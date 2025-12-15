// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGq9x3zOZXfqEZ3tMFRuUUTHnuHKNTRgI",
    authDomain: "pixelbuilder2-auth.firebaseapp.com",
    databaseURL: "https://pixelbuilder2-auth-default-rtdb.firebaseio.com",
    projectId: "pixelbuilder2-auth",
    storageBucket: "pixelbuilder2-auth.firebasestorage.app",
    messagingSenderId: "296299154171",
    appId: "1:296299154171:web:a4a68db29625b2d902fe5e",
    measurementId: "G-GGPBBJ2FYP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let currentUser = null;
let jobsData = [];
let filteredJobs = [];
let currentPage = 1;
const jobsPerPage = 10;

// DOM Elements
const loadingScreen = document.getElementById('loading');
const loginModal = document.getElementById('login-modal');
const navMenu = document.getElementById('nav-menu');
const hamburger = document.getElementById('hamburger');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize Application
async function initializeApp() {
    try {
        // Show loading screen
        showLoading();
        
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup Firebase Auth state observer
        auth.onAuthStateChanged(async (user) => {
            currentUser = user;
            updateUIForAuthState(user);
            
            if (user) {
                await loadUserProfile(user.uid);
                await loadJobs();
            } else {
                await loadSampleJobs();
            }
        });
        
        // Initialize mobile menu
        setupMobileMenu();
        
        // Hide loading screen
        hideLoading();
        
    } catch (error) {
        console.error('خطأ في تهيئة التطبيق:', error);
        showToast('خطأ في تحميل التطبيق', 'error');
        hideLoading();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Job form
    document.getElementById('job-form').addEventListener('submit', handleJobSubmission);
    
    // Profile forms
    document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
    document.getElementById('skills-form').addEventListener('submit', handleSkillsUpdate);
    
    // Search functionality
    document.getElementById('search-input').addEventListener('input', debounce(searchJobs, 300));
    document.getElementById('category-filter').addEventListener('change', filterJobs);
    document.getElementById('experience-filter').addEventListener('change', filterJobs);
    document.getElementById('location-filter').addEventListener('change', filterJobs);
    
    // Modal close on outside click
    window.addEventListener('click', function(event) {
        if (event.target === loginModal) {
            closeLogin();
        }
    });
}

// Setup Mobile Menu
function setupMobileMenu() {
    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
    
    // Close mobile menu when clicking on nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        showLoading();
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        showToast('تم تسجيل الدخول بنجاح!', 'success');
        closeLogin();
    } catch (error) {
        showToast(getErrorMessage(error.code), 'error');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
        showToast('كلمات المرور غير متطابقة', 'error');
        return;
    }
    
    try {
        showLoading();
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update user profile
        await userCredential.user.updateProfile({
            displayName: name
        });
        
        // Create user document in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            profile: {
                phone: '',
                location: '',
                linkedin: '',
                portfolio: '',
                skills: '',
                experience: '',
                education: ''
            }
        });
        
        showToast('تم إنشاء الحساب بنجاح!', 'success');
        closeLogin();
    } catch (error) {
        showToast(getErrorMessage(error.code), 'error');
    } finally {
        hideLoading();
    }
}

async function signInWithGoogle() {
    try {
        showLoading();
        const provider = new firebase.auth.GoogleAuthProvider();
        const userCredential = await auth.signInWithPopup(provider);
        
        // Create user document if it doesn't exist
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
        if (!userDoc.exists) {
            await db.collection('users').doc(userCredential.user.uid).set({
                name: userCredential.user.displayName || '',
                email: userCredential.user.email || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                profile: {
                    phone: '',
                    location: '',
                    linkedin: '',
                    portfolio: '',
                    skills: '',
                    experience: '',
                    education: ''
                }
            });
        }
        
        showToast('تم تسجيل الدخول بنجاح!', 'success');
        closeLogin();
    } catch (error) {
        showToast(getErrorMessage(error.code), 'error');
    } finally {
        hideLoading();
    }
}

async function signOut() {
    try {
        await auth.signOut();
        showToast('تم تسجيل الخروج بنجاح', 'success');
        updateUIForAuthState(null);
        showPage('home');
    } catch (error) {
        showToast('خطأ في تسجيل الخروج', 'error');
    }
}

// Job Functions
async function loadJobs() {
    try {
        const querySnapshot = await db.collection('jobs')
            .orderBy('createdAt', 'desc')
            .get();
        
        jobsData = [];
        querySnapshot.forEach((doc) => {
            jobsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        filteredJobs = [...jobsData];
        displayJobs();
    } catch (error) {
        console.error('خطأ في تحميل الوظائف:', error);
        await loadSampleJobs();
    }
}

async function loadSampleJobs() {
    // Sample jobs data for demonstration
    jobsData = [
        {
            id: '1',
            title: 'مطور واجهات أمامية',
            company: 'شركة التقنية المتقدمة',
            category: 'technology',
            type: 'full-time',
            experience: 'mid',
            location: 'riyadh',
            salary: '8000 - 12000 ريال',
            description: 'نحن نبحث عن مطور واجهات أمامية ماهر للعمل على مشاريع متنوعة باستخدام أحدث التقنيات.',
            requirements: 'خبرة 2-4 سنوات في React/Vue.js، إتقان HTML/CSS/JavaScript، خبرة في Git',
            contactEmail: 'hr@tech-company.com',
            createdAt: new Date(),
            postedBy: 'system'
        },
        {
            id: '2',
            title: 'أخصائي تسويق رقمي',
            company: 'وكالة التسويق الإبداعي',
            category: 'marketing',
            type: 'full-time',
            experience: 'entry',
            location: 'jeddah',
            salary: '6000 - 9000 ريال',
            description: 'نحتاج لأخصائي تسويق رقمي شغوف لقيادة حملاتنا الإعلانية عبر وسائل التواصل الاجتماعي.',
            requirements: 'خبرة في إدارة الحملات الإعلانية، إتقان Google Ads و Facebook Ads',
            contactEmail: 'jobs@creative-agency.com',
            createdAt: new Date(),
            postedBy: 'system'
        },
        {
            id: '3',
            title: 'محاسب مالي',
            company: 'مجموعة الأعمال المتكاملة',
            category: 'finance',
            type: 'full-time',
            experience: 'senior',
            location: 'dammam',
            salary: '10000 - 15000 ريال',
            description: 'نبحث عن محاسب مالي ذو خبرة عالية لإدارة العمليات المالية للشركة.',
            requirements: 'درجة البكالوريوس في المحاسبة، خبرة 5+ سنوات، إتقان برامج المحاسبة',
            contactEmail: 'finance@business-group.com',
            createdAt: new Date(),
            postedBy: 'system'
        }
    ];
    
    filteredJobs = [...jobsData];
    displayJobs();
}

function displayJobs() {
    const jobsList = document.getElementById('jobs-list');
    const startIndex = 0;
    const endIndex = Math.min(currentPage * jobsPerPage, filteredJobs.length);
    const jobsToShow = filteredJobs.slice(startIndex, endIndex);
    
    if (currentPage === 1) {
        jobsList.innerHTML = '';
    }
    
    jobsToShow.forEach(job => {
        const jobCard = createJobCard(job);
        jobsList.appendChild(jobCard);
    });
    
    // Update load more button
    const loadMoreBtn = document.querySelector('.load-more');
    if (endIndex >= filteredJobs.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'block';
    }
}

function createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    
    const categoryText = getCategoryText(job.category);
    const typeText = getJobTypeText(job.type);
    const experienceText = getExperienceText(job.experience);
    const locationText = getLocationText(job.location);
    
    card.innerHTML = `
        <div class="job-header">
            <div>
                <h3 class="job-title">${job.title}</h3>
                <p class="company-name">${job.company}</p>
            </div>
            <button class="btn btn-outline" onclick="toggleFavorite('${job.id}')">
                <i class="far fa-heart"></i> حفظ
            </button>
        </div>
        
        <div class="job-meta">
            <span class="meta-item">
                <i class="fas fa-tag"></i> ${categoryText}
            </span>
            <span class="meta-item">
                <i class="fas fa-clock"></i> ${typeText}
            </span>
            <span class="meta-item">
                <i class="fas fa-briefcase"></i> ${experienceText}
            </span>
            <span class="meta-item">
                <i class="fas fa-map-marker-alt"></i> ${locationText}
            </span>
            ${job.salary ? `<span class="meta-item"><i class="fas fa-money-bill"></i> ${job.salary}</span>` : ''}
        </div>
        
        <div class="job-description">
            <p>${job.description}</p>
        </div>
        
        <div class="job-actions">
            <button class="btn btn-primary" onclick="applyToJob('${job.id}')">
                <i class="fas fa-paper-plane"></i> تقديم طلب
            </button>
            <button class="btn btn-secondary" onclick="viewJobDetails('${job.id}')">
                <i class="fas fa-eye"></i> عرض التفاصيل
            </button>
            <button class="btn btn-outline" onclick="shareJob('${job.id}')">
                <i class="fas fa-share"></i> مشاركة
            </button>
        </div>
    `;
    
    return card;
}

function searchJobs() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    const experienceFilter = document.getElementById('experience-filter').value;
    const locationFilter = document.getElementById('location-filter').value;
    
    filteredJobs = jobsData.filter(job => {
        const matchesSearch = !searchTerm || 
            job.title.toLowerCase().includes(searchTerm) ||
            job.company.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !categoryFilter || job.category === categoryFilter;
        const matchesExperience = !experienceFilter || job.experience === experienceFilter;
        const matchesLocation = !locationFilter || job.location === locationFilter;
        
        return matchesSearch && matchesCategory && matchesExperience && matchesLocation;
    });
    
    currentPage = 1;
    displayJobs();
}

function filterJobs() {
    searchJobs();
}

function loadMoreJobs() {
    currentPage++;
    displayJobs();
}

async function handleJobSubmission(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('يجب تسجيل الدخول أولاً', 'error');
        showLogin();
        return;
    }
    
    const jobData = {
        title: document.getElementById('job-title').value,
        company: document.getElementById('company-name').value,
        category: document.getElementById('job-category').value,
        type: document.getElementById('job-type').value,
        experience: document.getElementById('experience-level').value,
        location: document.getElementById('job-location').value,
        salary: document.getElementById('salary-range').value,
        description: document.getElementById('job-description').value,
        requirements: document.getElementById('requirements').value,
        contactEmail: document.getElementById('contact-email').value,
        postedBy: currentUser.uid,
        postedByName: currentUser.displayName || currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        showLoading();
        await db.collection('jobs').add(jobData);
        showToast('تم نشر الوظيفة بنجاح!', 'success');
        resetForm();
        await loadJobs();
        showPage('jobs');
    } catch (error) {
        showToast('خطأ في نشر الوظيفة', 'error');
        console.error(error);
    } finally {
        hideLoading();
    }
}

function resetForm() {
    document.getElementById('job-form').reset();
}

// Job Actions
function toggleFavorite(jobId) {
    if (!currentUser) {
        showToast('يجب تسجيل الدخول أولاً', 'error');
        return;
    }
    
    // Implement favorite functionality
    showToast('تم حفظ الوظيفة في المفضلة', 'success');
}

function applyToJob(jobId) {
    if (!currentUser) {
        showToast('يجب تسجيل الدخول أولاً', 'error');
        showLogin();
        return;
    }
    
    // Implement job application
    showToast('تم إرسال طلب التوظيف', 'success');
}

function viewJobDetails(jobId) {
    const job = jobsData.find(j => j.id === jobId);
    if (job) {
        showJobDetailsModal(job);
    }
}

function showJobDetailsModal(job) {
    // Implement job details modal
    showToast('عرض تفاصيل الوظيفة', 'info');
}

function shareJob(jobId) {
    const job = jobsData.find(j => j.id === jobId);
    if (job && navigator.share) {
        navigator.share({
            title: job.title,
            text: job.description,
            url: window.location.href
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            showToast('تم نسخ الرابط', 'success');
        });
    }
}

// Profile Functions
async function loadUserProfile(userId) {
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
            const userData = doc.data();
            updateProfileUI(userData);
        }
    } catch (error) {
        console.error('خطأ في تحميل الملف الشخصي:', error);
    }
}

function updateProfileUI(userData) {
    // Update profile header
    document.getElementById('profile-name').textContent = userData.name || 'غير محدد';
    document.getElementById('profile-email').textContent = userData.email || 'غير محدد';
    
    // Update profile form fields
    if (userData.profile) {
        document.getElementById('full-name').value = userData.profile.phone || '';
        document.getElementById('phone').value = userData.profile.phone || '';
        document.getElementById('location').value = userData.profile.location || '';
        document.getElementById('linkedin').value = userData.profile.linkedin || '';
        document.getElementById('portfolio').value = userData.profile.portfolio || '';
        document.getElementById('skills').value = userData.profile.skills || '';
        document.getElementById('experience').value = userData.profile.experience || '';
        document.getElementById('education').value = userData.profile.education || '';
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('يجب تسجيل الدخول أولاً', 'error');
        return;
    }
    
    const profileData = {
        fullName: document.getElementById('full-name').value,
        phone: document.getElementById('phone').value,
        location: document.getElementById('location').value,
        linkedin: document.getElementById('linkedin').value,
        portfolio: document.getElementById('portfolio').value
    };
    
    try {
        showLoading();
        await db.collection('users').doc(currentUser.uid).update({
            'profile.phone': profileData.phone,
            'profile.location': profileData.location,
            'profile.linkedin': profileData.linkedin,
            'profile.portfolio': profileData.portfolio,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('تم تحديث الملف الشخصي', 'success');
    } catch (error) {
        showToast('خطأ في تحديث الملف الشخصي', 'error');
    } finally {
        hideLoading();
    }
}

async function handleSkillsUpdate(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('يجب تسجيل الدخول أولاً', 'error');
        return;
    }
    
    try {
        showLoading();
        await db.collection('users').doc(currentUser.uid).update({
            'profile.skills': document.getElementById('skills').value,
            'profile.experience': document.getElementById('experience').value,
            'profile.education': document.getElementById('education').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('تم تحديث المهارات والخبرات', 'success');
    } catch (error) {
        showToast('خطأ في تحديث المهارات', 'error');
    } finally {
        hideLoading();
    }
}

// UI Functions
function updateUIForAuthState(user) {
    const loginLink = document.getElementById('login-link');
    const postJobLink = document.getElementById('post-job-link');
    const profileLink = document.getElementById('profile-link');
    
    if (user) {
        loginLink.style.display = 'none';
        postJobLink.style.display = 'block';
        profileLink.style.display = 'block';
        
        // Add logout option to profile link
        profileLink.innerHTML = `
            <i class="fas fa-user"></i> الملف الشخصي
            <span style="margin-right: 10px; cursor: pointer;" onclick="signOut()">(خروج)</span>
        `;
    } else {
        loginLink.style.display = 'block';
        postJobLink.style.display = 'none';
        profileLink.style.display = 'none';
        profileLink.innerHTML = '<i class="fas fa-user"></i> الملف الشخصي';
    }
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Load jobs if on jobs page
    if (pageName === 'jobs') {
        displayJobs();
    }
}

function showLogin() {
    loginModal.style.display = 'block';
}

function closeLogin() {
    loginModal.style.display = 'none';
    // Reset forms
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabBtns[0].classList.add('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabBtns[1].classList.add('active');
    }
}

function showLoading() {
    loadingScreen.style.display = 'flex';
}

function hideLoading() {
    loadingScreen.style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'لم يتم العثور على المستخدم',
        'auth/wrong-password': 'كلمة مرور خاطئة',
        'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
        'auth/weak-password': 'كلمة مرور ضعيفة جداً',
        'auth/invalid-email': 'بريد إلكتروني غير صحيح',
        'auth/operation-not-allowed': 'هذه العملية غير مسموحة',
        'auth/invalid-credential': 'بيانات اعتماد غير صحيحة'
    };
    return errorMessages[errorCode] || 'حدث خطأ غير متوقع';
}

function getCategoryText(category) {
    const categories = {
        'technology': 'التكنولوجيا',
        'marketing': 'التسويق',
        'sales': 'المبيعات',
        'finance': 'المالية',
        'hr': 'الموارد البشرية',
        'education': 'التعليم',
        'health': 'الصحة',
        'engineering': 'الهندسة'
    };
    return categories[category] || category;
}

function getJobTypeText(type) {
    const types = {
        'full-time': 'دوام كامل',
        'part-time': 'دوام جزئي',
        'contract': 'عقد',
        'internship': 'تدريب'
    };
    return types[type] || type;
}

function getExperienceText(experience) {
    const experiences = {
        'entry': 'مبتدئ (0-2 سنة)',
        'mid': 'متوسط (2-5 سنوات)',
        'senior': 'خبير (5+ سنوات)'
    };
    return experiences[experience] || experience;
}

function getLocationText(location) {
    const locations = {
        'riyadh': 'الرياض',
        'jeddah': 'جدة',
        'dammam': 'الدمام',
        'makkah': 'مكة المكرمة',
        'madinah': 'المدينة المنورة',
        'remote': 'عن بُعد'
    };
    return locations[location] || location;
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// PWA Installation
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install button
    showInstallPrompt();
});

function showInstallPrompt() {
    // Implement install prompt UI
    showToast('يمكن تثبيت التطبيق على جهازك', 'info');
}

// Export functions for global access
window.showPage = showPage;
window.showLogin = showLogin;
window.closeLogin = closeLogin;
window.switchAuthTab = switchAuthTab;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.searchJobs = searchJobs;
window.filterJobs = filterJobs;
window.loadMoreJobs = loadMoreJobs;
window.resetForm = resetForm;
window.toggleFavorite = toggleFavorite;
window.applyToJob = applyToJob;
window.viewJobDetails = viewJobDetails;
window.shareJob = shareJob;
