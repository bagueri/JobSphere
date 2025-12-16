// Job PWA Application
class JobApp {
    constructor() {
        this.firebase = null;
        this.auth = null;
        this.database = null;
        this.currentUser = null;
        this.jobs = [];
        this.filteredJobs = [];
        this.currentPage = 0;
        this.jobsPerPage = 10;
        this.deferredPrompt = null;
        this.isOnline = navigator.onLine;
        
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoading();
            
            // Initialize Firebase
            await this.initFirebase();
            
            // Setup PWA install prompt
            this.setupPWAInstall();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check authentication state
            this.checkAuthState();
            
            // Load jobs
            await this.loadJobs();
            
            // Hide loading screen
            this.hideLoading();
            
            // Show install banner if eligible
            this.checkInstallEligibility();
            
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('خطأ في تحميل التطبيق', 'error');
            this.hideLoading();
        }
    }

    async initFirebase() {
        try {
            // Initialize Firebase app
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { getDatabase, ref, push, set, get, query, orderByChild, equalTo } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');

            this.firebase = initializeApp(window.firebaseConfig);
            this.auth = getAuth(this.firebase);
            this.database = getDatabase(this.firebase);

            // Listen for auth state changes
            onAuthStateChanged(this.auth, (user) => {
                this.handleAuthStateChange(user);
            });

        } catch (error) {
            console.error('Firebase initialization error:', error);
            throw error;
        }
    }

    setupPWAInstall() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallBanner();
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallBanner();
            this.showToast('تم تثبيت التطبيق بنجاح!', 'success');
        });
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('nav-toggle')?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Search functionality
        document.getElementById('search-btn')?.addEventListener('click', () => {
            this.performSearch();
        });

        document.getElementById('job-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        document.getElementById('location-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Filters
        document.getElementById('category-filter')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('experience-filter')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('salary-filter')?.addEventListener('change', () => {
            this.applyFilters();
        });

        // Job form
        document.getElementById('job-form')?.addEventListener('submit', (e) => {
            this.handleJobSubmission(e);
        });

        // Authentication
        document.getElementById('login-btn')?.addEventListener('click', () => {
            this.showAuthModal('login');
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.logout();
        });

        // Auth forms
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            this.handleLogin(e);
        });

        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            this.handleRegister(e);
        });

        // Auth modal switching
        document.getElementById('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthModal('register');
        });

        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthModal('login');
        });

        // Install buttons
        document.getElementById('install-btn')?.addEventListener('click', () => {
            this.installApp();
        });

        document.getElementById('dismiss-btn')?.addEventListener('click', () => {
            this.hideInstallBanner();
        });

        // Modal close
        document.querySelectorAll('.modal-close')?.forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Load more
        document.getElementById('load-more-btn')?.addEventListener('click', () => {
            this.loadMoreJobs();
        });

        // Online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showToast('تم الاتصال بالإنترنت', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showToast('لا يوجد اتصال بالإنترنت', 'warning');
        });

        // Navigation links
        document.querySelectorAll('.nav-link')?.forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    const target = link.getAttribute('href').substring(1);
                    this.navigateTo(target);
                }
            });
        });
    }

    async loadJobs() {
        try {
            if (!this.database) return;

            const jobsRef = ref(this.database, 'jobs');
            const snapshot = await get(jobsRef);
            
            if (snapshot.exists()) {
                this.jobs = Object.values(snapshot.val());
                this.filteredJobs = [...this.jobs];
                this.updateJobStats();
                this.displayJobs();
            } else {
                // Load sample jobs if no jobs exist
                await this.loadSampleJobs();
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
            this.showToast('خطأ في تحميل الوظائف', 'error');
        }
    }

    async loadSampleJobs() {
        const sampleJobs = [
            {
                id: '1',
                title: 'مطور واجهات أمامية',
                company: 'شركة التقنية المتقدمة',
                category: 'it',
                experience: 'mid',
                location: 'الرياض، السعودية',
                salary: '8000-12000',
                description: 'نبحث عن مطور واجهات أمامية متمرس للعمل على مشاريع متنوعة. يجب أن يكون لديه خبرة في React و JavaScript و CSS.',
                requirements: '• خبرة 3+ سنوات في React\n• إتقان JavaScript ES6+\n• معرفة CSS/Sass\n• خبرة في Git',
                benefits: '• راتب تنافسي\n• تأمين صحي\n• مرونة في العمل\n• بيئة عمل محفزة',
                contactEmail: 'jobs@tech-saudi.com',
                datePosted: new Date().toISOString(),
                postedBy: 'system'
            },
            {
                id: '2',
                title: 'مدير تسويق رقمي',
                company: 'وكالة الإعلان الذكي',
                category: 'marketing',
                experience: 'senior',
                location: 'جدة، السعودية',
                salary: '12000-15000',
                description: 'نبحث عن مدير تسويق رقمي متمرس لإدارة حملات التسويق الرقمي وتطوير استراتيجيات التسويق.',
                requirements: '• خبرة 5+ سنوات في التسويق الرقمي\n• معرفة Google Ads و Facebook Ads\n• مهارات تحليل البيانات\n• خبرة في SEO/SEM',
                benefits: '• راتب عالي\n• مكافآت أداء\n• تدريب مستمر\n• مزايا إضافية',
                contactEmail: 'careers@smart-ads.com',
                datePosted: new Date(Date.now() - 86400000).toISOString(),
                postedBy: 'system'
            },
            {
                id: '3',
                title: 'مصمم جرافيك',
                company: 'استوديو التصميم الإبداعي',
                category: 'design',
                experience: 'mid',
                location: 'الدمام، السعودية',
                salary: '5000-8000',
                description: 'نبحث عن مصمم جرافيك مبدع لإنشاء تصاميم جذابة ومبتكرة للمشاريع المختلفة.',
                requirements: '• خبرة 2+ سنوات في التصميم\n• إتقان Adobe Creative Suite\n• مهارات في التصميم الطباعي والرقمي\n• إبداع وابتكار',
                benefits: '• بيئة عمل إبداعية\n• مشاريع متنوعة\n• راتب تنافسي\n• مرونة في الأوقات',
                contactEmail: 'design@creative-studio.com',
                datePosted: new Date(Date.now() - 172800000).toISOString(),
                postedBy: 'system'
            }
        ];

        // Save sample jobs to database
        for (const job of sampleJobs) {
            await this.saveJob(job);
        }

        this.jobs = sampleJobs;
        this.filteredJobs = [...sampleJobs];
        this.updateJobStats();
        this.displayJobs();
    }

    async saveJob(jobData) {
        try {
            if (!this.database || !this.currentUser) {
                throw new Error('يجب تسجيل الدخول لحفظ الوظائف');
            }

            const jobsRef = ref(this.database, 'jobs');
            const newJobRef = push(jobsRef);
            
            const job = {
                ...jobData,
                id: newJobRef.key,
                postedBy: this.currentUser.uid,
                datePosted: new Date().toISOString()
            };

            await set(newJobRef, job);
            return job;
        } catch (error) {
            console.error('Error saving job:', error);
            throw error;
        }
    }

    displayJobs() {
        const container = document.getElementById('jobs-container');
        if (!container) return;

        const startIndex = this.currentPage * this.jobsPerPage;
        const endIndex = startIndex + this.jobsPerPage;
        const jobsToShow = this.filteredJobs.slice(startIndex, endIndex);

        if (this.currentPage === 0) {
            container.innerHTML = '';
        }

        jobsToShow.forEach(job => {
            const jobCard = this.createJobCard(job);
            container.appendChild(jobCard);
        });

        // Show/hide load more button
        const loadMoreContainer = document.getElementById('load-more-container');
        if (endIndex < this.filteredJobs.length) {
            loadMoreContainer?.classList.remove('hidden');
        } else {
            loadMoreContainer?.classList.add('hidden');
        }

        // Update jobs section visibility
        const searchSection = document.getElementById('search-section');
        if (this.filteredJobs.length > 0) {
            searchSection?.classList.remove('hidden');
            searchSection?.classList.add('active');
        } else {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>لا توجد نتائج</h3>
                    <p>جرب تغيير معايير البحث أو الفلترة</p>
                </div>
            `;
        }
    }

    createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div class="job-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <p class="company-name">${job.company}</p>
                </div>
                <div class="job-date">
                    <small>${this.formatDate(job.datePosted)}</small>
                </div>
            </div>
            
            <div class="job-meta">
                <div class="meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${job.location}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-briefcase"></i>
                    <span>${this.getExperienceLabel(job.experience)}</span>
                </div>
                ${job.salary ? `
                <div class="meta-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>${job.salary} ريال</span>
                </div>
                ` : ''}
            </div>
            
            <div class="job-description">
                ${this.truncateText(job.description, 200)}
            </div>
            
            <div class="job-tags">
                ${this.getCategoryTag(job.category)}
            </div>
            
            <div class="job-actions">
                <button class="btn btn-primary btn-view" data-job-id="${job.id}">
                    <i class="fas fa-eye"></i>
                    عرض التفاصيل
                </button>
                <button class="btn btn-outline btn-save" data-job-id="${job.id}">
                    <i class="fas fa-heart"></i>
                    حفظ
                </button>
            </div>
        `;

        // Add click listeners
        card.querySelector('.btn-view').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showJobDetails(job);
        });

        card.querySelector('.btn-save').addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveJob(job.id);
        });

        card.addEventListener('click', () => {
            this.showJobDetails(job);
        });

        return card;
    }

    showJobDetails(job) {
        const modal = document.getElementById('job-modal');
        const title = document.getElementById('modal-job-title');
        const company = document.getElementById('modal-company');
        const location = document.getElementById('modal-location');
        const date = document.getElementById('modal-date');
        const description = document.getElementById('modal-description');
        const requirements = document.getElementById('modal-requirements');
        const benefits = document.getElementById('modal-benefits');

        if (title) title.textContent = job.title;
        if (company) company.textContent = job.company;
        if (location) location.textContent = job.location;
        if (date) date.textContent = this.formatDate(job.datePosted);
        if (description) description.textContent = job.description;
        if (requirements) requirements.textContent = job.requirements || 'غير محدد';
        if (benefits) benefits.textContent = job.benefits || 'غير محدد';

        modal?.classList.remove('hidden');
        modal?.classList.add('show');

        // Update apply and save buttons
        const applyBtn = document.getElementById('apply-btn');
        const saveBtn = document.getElementById('save-btn');
        
        applyBtn?.addEventListener('click', () => {
            this.applyToJob(job);
        });

        saveBtn?.addEventListener('click', () => {
            this.saveJob(job.id);
        });
    }

    async handleJobSubmission(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showToast('يجب تسجيل الدخول لنشر وظيفة', 'warning');
            this.showAuthModal('login');
            return;
        }

        const formData = new FormData(e.target);
        const jobData = {
            title: document.getElementById('job-title').value,
            company: document.getElementById('company-name').value,
            category: document.getElementById('job-category').value,
            experience: document.getElementById('experience-level').value,
            location: document.getElementById('job-location').value,
            salary: document.getElementById('salary-range').value,
            description: document.getElementById('job-description').value,
            requirements: document.getElementById('requirements').value,
            benefits: document.getElementById('benefits').value,
            contactEmail: document.getElementById('contact-email').value
        };

        try {
            await this.saveJob(jobData);
            this.showToast('تم نشر الوظيفة بنجاح!', 'success');
            this.clearJobForm();
            this.navigateTo('search');
            await this.loadJobs();
        } catch (error) {
            console.error('Error submitting job:', error);
            this.showToast('خطأ في نشر الوظيفة', 'error');
        }
    }

    clearJobForm() {
        document.getElementById('job-form').reset();
    }

    performSearch() {
        const searchTerm = document.getElementById('job-search').value.toLowerCase();
        const locationTerm = document.getElementById('location-search').value.toLowerCase();

        this.filteredJobs = this.jobs.filter(job => {
            const matchesSearch = !searchTerm || 
                job.title.toLowerCase().includes(searchTerm) ||
                job.company.toLowerCase().includes(searchTerm) ||
                job.description.toLowerCase().includes(searchTerm);
            
            const matchesLocation = !locationTerm ||
                job.location.toLowerCase().includes(locationTerm);

            return matchesSearch && matchesLocation;
        });

        this.currentPage = 0;
        this.displayJobs();
        this.navigateTo('search');
    }

    applyFilters() {
        const category = document.getElementById('category-filter').value;
        const experience = document.getElementById('experience-filter').value;
        const salary = document.getElementById('salary-filter').value;

        this.filteredJobs = this.jobs.filter(job => {
            const matchesCategory = !category || job.category === category;
            const matchesExperience = !experience || job.experience === experience;
            
            let matchesSalary = true;
            if (salary) {
                const jobSalary = this.parseSalary(job.salary);
                const filterSalary = this.parseSalary(salary);
                matchesSalary = jobSalary >= filterSalary.min && jobSalary.max <= filterSalary.max;
            }

            return matchesCategory && matchesExperience && matchesSalary;
        });

        this.currentPage = 0;
        this.displayJobs();
    }

    loadMoreJobs() {
        this.currentPage++;
        this.displayJobs();
    }

    // Authentication Methods
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signInWithEmailAndPassword(this.auth, email, password);
            this.showToast('تم تسجيل الدخول بنجاح!', 'success');
            this.closeModal();
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('خطأ في تسجيل الدخول', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            this.showToast('كلمات المرور غير متطابقة', 'warning');
            return;
        }

        try {
            const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { createUser } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            
            // Save user profile to database
            const { ref, set } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            const userRef = ref(this.database, `users/${userCredential.user.uid}`);
            await set(userRef, {
                name: name,
                email: email,
                joinedAt: new Date().toISOString()
            });

            this.showToast('تم إنشاء الحساب بنجاح!', 'success');
            this.closeModal();
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('خطأ في إنشاء الحساب', 'error');
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            this.showToast('تم تسجيل الخروج', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('خطأ في تسجيل الخروج', 'error');
        }
    }

    handleAuthStateChange(user) {
        this.currentUser = user;
        
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');

        if (user) {
            // User is signed in
            loginBtn?.classList.add('hidden');
            logoutBtn?.classList.remove('hidden');
            userMenu?.classList.remove('hidden');
            
            if (userName) userName.textContent = user.displayName || user.email;
            if (userAvatar) {
                userAvatar.src = user.photoURL || 'https://via.placeholder.com/32x32?text=U';
                userAvatar.alt = user.displayName || 'User';
            }

            this.updateProfileSection();
        } else {
            // User is signed out
            loginBtn?.classList.remove('hidden');
            logoutBtn?.classList.add('hidden');
            userMenu?.classList.add('hidden');
        }
    }

    async updateProfileSection() {
        if (!this.currentUser) return;

        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profileJoined = document.getElementById('profile-joined');
        const profileAvatar = document.getElementById('profile-avatar');

        if (profileName) profileName.textContent = this.currentUser.displayName || 'غير محدد';
        if (profileEmail) profileEmail.textContent = this.currentUser.email || 'غير محدد';
        if (profileJoined) {
            const joinedDate = new Date(this.currentUser.metadata.creationTime);
            profileJoined.textContent = `انضم في: ${joinedDate.toLocaleDateString('ar-SA')}`;
        }
        if (profileAvatar) {
            profileAvatar.src = this.currentUser.photoURL || 'https://via.placeholder.com/80x80?text=U';
            profileAvatar.alt = this.currentUser.displayName || 'User';
        }

        // Update user stats
        await this.updateUserStats();
    }

    async updateUserStats() {
        if (!this.currentUser) return;

        try {
            const { ref, get } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            const userJobsRef = ref(this.database, 'jobs');
            const snapshot = await get(userJobsRef);
            
            if (snapshot.exists()) {
                const allJobs = Object.values(snapshot.val());
                const userJobs = allJobs.filter(job => job.postedBy === this.currentUser.uid);
                
                document.getElementById('posted-jobs-count').textContent = userJobs.length;
                document.getElementById('applications-count').textContent = '0'; // TODO: Implement applications tracking
                document.getElementById('favorites-count').textContent = '0'; // TODO: Implement favorites
            }
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    }

    // PWA Install Methods
    showInstallBanner() {
        const banner = document.getElementById('install-banner');
        banner?.classList.remove('hidden');
        banner?.classList.add('show');
    }

    hideInstallBanner() {
        const banner = document.getElementById('install-banner');
        banner?.classList.remove('show');
        setTimeout(() => {
            banner?.classList.add('hidden');
        }, 300);
    }

    async installApp() {
        if (!this.deferredPrompt) return;

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        this.deferredPrompt = null;
        this.hideInstallBanner();
    }

    checkInstallEligibility() {
        // Don't show install banner if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }

        // Show banner after 30 seconds if user hasn't dismissed it
        setTimeout(() => {
            const dismissed = localStorage.getItem('install-banner-dismissed');
            if (!dismissed && this.deferredPrompt) {
                this.showInstallBanner();
            }
        }, 30000);
    }

    // Navigation Methods
    navigateTo(section) {
        // Hide all sections
        document.querySelectorAll('.main section').forEach(sec => {
            sec.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.classList.remove('hidden');
        }

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${section}`) {
                link.classList.add('active');
            }
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    toggleMobileMenu() {
        const navMenu = document.getElementById('nav-menu');
        const navToggle = document.getElementById('nav-toggle');
        
        navMenu?.classList.toggle('active');
        navToggle?.classList.toggle('active');
    }

    // UI Helper Methods
    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen?.classList.remove('hidden');
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen?.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        toastContainer?.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Hide toast after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    showAuthModal(type = 'login') {
        const modal = document.getElementById('auth-modal');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const modalTitle = document.getElementById('auth-modal-title');
        const switchToLogin = document.getElementById('switch-to-login');
        const switchToRegister = document.getElementById('switch-to-register');

        modal?.classList.remove('hidden');
        modal?.classList.add('show');

        if (type === 'login') {
            loginForm?.classList.remove('hidden');
            registerForm?.classList.add('hidden');
            modalTitle.textContent = 'تسجيل الدخول';
            switchToLogin?.classList.add('hidden');
            switchToRegister?.classList.remove('hidden');
        } else {
            loginForm?.classList.add('hidden');
            registerForm?.classList.remove('hidden');
            modalTitle.textContent = 'إنشاء حساب';
            switchToLogin?.classList.remove('hidden');
            switchToRegister?.classList.add('hidden');
        }
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        });
    }

    // Utility Methods
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'أمس';
        if (diffDays < 7) return `منذ ${diffDays} أيام`;
        if (diffDays < 30) return `منذ ${Math.ceil(diffDays / 7)} أسابيع`;
        return date.toLocaleDateString('ar-SA');
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    getExperienceLabel(experience) {
        const labels = {
            junior: 'مبتدئ',
            mid: 'متوسط',
            senior: 'خبير',
            lead: 'كبير'
        };
        return labels[experience] || experience;
    }

    getCategoryTag(category) {
        const categories = {
            it: 'تقنية المعلومات',
            marketing: 'التسويق',
            sales: 'المبيعات',
            hr: 'الموارد البشرية',
            finance: 'المالية',
            engineering: 'الهندسة',
            design: 'التصميم',
            education: 'التعليم'
        };
        
        const label = categories[category] || category;
        return `<span class="tag">${label}</span>`;
    }

    parseSalary(salaryRange) {
        if (!salaryRange) return { min: 0, max: Infinity };
        
        const ranges = {
            '0-3000': { min: 0, max: 3000 },
            '3000-5000': { min: 3000, max: 5000 },
            '5000-8000': { min: 5000, max: 8000 },
            '8000-12000': { min: 8000, max: 12000 },
            '12000+': { min: 12000, max: Infinity }
        };
        
        return ranges[salaryRange] || { min: 0, max: Infinity };
    }

    updateJobStats() {
        const totalJobs = this.jobs.length;
        const uniqueCompanies = new Set(this.jobs.map(job => job.company)).size;
        const totalUsers = 1; // TODO: Get actual user count

        document.getElementById('total-jobs').textContent = totalJobs;
        document.getElementById('total-companies').textContent = uniqueCompanies;
        document.getElementById('total-users').textContent = totalUsers;
    }

    saveJob(jobId) {
        // TODO: Implement job saving functionality
        this.showToast('تم حفظ الوظيفة', 'success');
    }

    applyToJob(job) {
        // TODO: Implement job application functionality
        this.showToast('تم إرسال طلب التوظيف', 'success');
        this.closeModal();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JobApp();
});

// Handle service worker messages
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
            window.location.reload();
        }
    });
}
