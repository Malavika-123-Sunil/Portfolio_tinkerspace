// Theme Management
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-icon');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = document.querySelector('.theme-icon');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
    }
}

// Smooth scrolling function
function scrollToNext() {
    const profileSection = document.getElementById('profile');
    profileSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// GitHub API Integration
async function fetchGitHubProjects() {
    const username = 'Malavika-123-Sunil';
    const projectsGrid = document.getElementById('projectsGrid');
    
    try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Add headers to improve API compatibility
        const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=20`, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Portfolio-Website'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check for rate limiting
        if (response.status === 403) {
            const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
            const rateLimitReset = response.headers.get('X-RateLimit-Reset');
            
            if (rateLimitRemaining === '0') {
                const resetTime = new Date(rateLimitReset * 1000);
                throw new Error(`GitHub API rate limit exceeded. Reset time: ${resetTime.toLocaleTimeString()}`);
            }
        }
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        const repos = await response.json();
        
        // Clear loading spinner
        projectsGrid.innerHTML = '';
        
        // Filter out forked repositories and show only original projects
        const filteredRepos = repos.filter(repo => !repo.fork && !repo.private);
        
        if (filteredRepos.length === 0) {
            // If no public repos, show a message
            projectsGrid.innerHTML = `
                <div class="no-projects-message">
                    <h3>🚀 No Public Projects Yet</h3>
                    <p>I'm working on some amazing projects! Check back soon or visit my GitHub profile.</p>
                    <a href="https://github.com/Malavika-123-Sunil" target="_blank" class="github-link">
                        Visit GitHub Profile
                    </a>
                </div>
            `;
            return;
        }
        
        // Create project cards with better error handling
        const projectPromises = filteredRepos.slice(0, 12).map(async (repo) => {
            try {
            const languages = await getRepoLanguages(repo.languages_url);
                return createProjectCard(repo, languages);
            } catch (error) {
                console.warn(`Error processing repo ${repo.name}:`, error);
                // Return a card with basic info if language fetch fails
                return createProjectCard(repo, {});
            }
        });
        
        const projectCards = await Promise.allSettled(projectPromises);
        
        // Add successfully created cards to the grid
        projectCards.forEach(result => {
            if (result.status === 'fulfilled') {
                projectsGrid.appendChild(result.value);
        }
        });
        
        // Initialize filter functionality
        initializeFilters();
        
    } catch (error) {
        console.error('Error fetching GitHub projects:', error);
        
        // Show error message with retry option
        showErrorWithRetry(error);
    }
}

async function getRepoLanguages(languagesUrl) {
    if (!languagesUrl) return {};
    
    try {
        // Add timeout to language fetch as well
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(languagesUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Portfolio-Website'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            return await response.json();
        } else if (response.status === 403) {
            // Rate limited, return empty object
            console.warn('Rate limited when fetching languages');
            return {};
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('Language fetch timed out');
        } else {
        console.error('Error fetching languages:', error);
        }
    }
    return {};
}

function createProjectCard(repo, languages) {
    const card = document.createElement('div');
    card.className = 'project-card fade-in';
    
    // Get primary language and topics for filtering
    const primaryLanguage = repo.language || 'Other';
    const topics = repo.topics || [];
    const allLanguages = Object.keys(languages);
    
    // Set data attributes for filtering
    const filterTags = [
        primaryLanguage.toLowerCase(),
        ...topics,
        ...allLanguages.map(lang => lang.toLowerCase())
    ];
    
    card.setAttribute('data-languages', filterTags.join(','));
    
    // Make the entire card clickable
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
        window.open(repo.html_url, '_blank');
    });
    
    // Create language tags
    const languageTags = allLanguages.length > 0 
        ? allLanguages.slice(0, 3).map(lang => `<span class="language-tag">${lang}</span>`).join('')
        : `<span class="language-tag">${primaryLanguage}</span>`;
    
    // Format repository name for display
    const displayName = repo.name
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
    // Get repository stats
    const stars = repo.stargazers_count || 0;
    const forks = repo.forks_count || 0;
    const updatedDate = new Date(repo.updated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    card.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <div class="project-header">
                    <h3 class="project-title">${displayName}</h3>
                    <div class="project-stats">
                        ${stars > 0 ? `<span class="stat">⭐ ${stars}</span>` : ''}
                        ${forks > 0 ? `<span class="stat">🍴 ${forks}</span>` : ''}
                    </div>
                </div>
                <p class="project-description">${repo.description || 'A coding project showcasing modern development practices and clean code architecture.'}</p>
                <div class="project-languages">
                    ${languageTags}
                </div>
                <div class="project-footer">
                    <span class="update-date">Updated ${updatedDate}</span>
                    <span class="click-hint">Click to view →</span>
                </div>
            </div>
            <div class="card-back">
                <div class="project-header">
                    <h3 class="project-title">${displayName}</h3>
                    <div class="project-stats">
                        ${stars > 0 ? `<span class="stat">⭐ ${stars}</span>` : ''}
                        ${forks > 0 ? `<span class="stat">🍴 ${forks}</span>` : ''}
                    </div>
                </div>
                <p class="project-description">${repo.description || 'A coding project showcasing modern development practices and clean code architecture.'}</p>
                <div class="project-languages">
                    ${languageTags}
                </div>
                <div class="project-links">
                    <a href="${repo.html_url}" target="_blank" class="project-link repo-link" onclick="event.stopPropagation()">
                        📁 View Repository
                    </a>
                    ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" class="project-link live-link" onclick="event.stopPropagation()">🌐 Live Demo</a>` : ''}
                </div>
                <div class="project-footer">
                    <span class="update-date">Updated ${updatedDate}</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Project filtering functionality
function initializeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            
            const filter = button.getAttribute('data-filter');
            
            projectCards.forEach(card => {
                const languages = card.getAttribute('data-languages') || '';
                
                if (filter === 'all' || languages.includes(filter)) {
                    card.classList.remove('hidden');
                    card.classList.add('fade-in');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });
}

// Intersection Observer for animations
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('slide-up');
            }
        });
    }, observerOptions);
    
    // Observe elements that should animate on scroll
    const animateElements = document.querySelectorAll('.school-card, .college-card, .project-card');
    animateElements.forEach(el => observer.observe(el));
}

// Smooth scrolling for navigation
function initializeSmoothScrolling() {
    // Add smooth scrolling to any anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Parallax effect for floating elements
function initializeParallax() {
    const stars = document.querySelectorAll('.star');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        stars.forEach((star, index) => {
            const speed = (index + 1) * 0.1;
            star.style.transform = `translateY(${rate * speed}px) rotate(${scrolled * 0.1}deg)`;
        });
    });
}

// Add ripple effect to buttons
function addRippleEffect() {
    const buttons = document.querySelectorAll('.explore-btn, .filter-btn, .project-link');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Add CSS for ripple effect
const rippleCSS = `
.ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
}

@keyframes ripple-animation {
    to {
        transform: scale(4);
        opacity: 0;
    }
}
`;

// Add the ripple CSS to the document
function addRippleCSS() {
    const style = document.createElement('style');
    style.textContent = rippleCSS;
    document.head.appendChild(style);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    fetchGitHubProjects();
    initializeAnimations();
    initializeSmoothScrolling();
    initializeParallax();
    addRippleCSS();
    addRippleEffect();
    
    // Add loading animation to profile image
    const profileImage = document.querySelector('.profile-image');
    if (profileImage) {
        profileImage.addEventListener('load', () => {
            profileImage.classList.add('loaded');
        });
    }
});

// Add some interactive features
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroSection = document.querySelector('.hero-section');
    
    // Parallax effect for hero section
    if (heroSection) {
        heroSection.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
    
    // Update scroll indicator opacity
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        const opacity = Math.max(0, 1 - scrolled / 300);
        scrollIndicator.style.opacity = opacity;
    }
});

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close any open modals or reset filters
        const activeFilter = document.querySelector('.filter-btn.active');
        if (activeFilter && activeFilter.getAttribute('data-filter') !== 'all') {
            document.querySelector('.filter-btn[data-filter="all"]').click();
        }
    }
});

// Performance optimization: Debounce scroll events
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

// Apply debouncing to scroll events
const debouncedScrollHandler = debounce(() => {
    // Any expensive scroll operations can go here
}, 16); // ~60fps

window.addEventListener('scroll', debouncedScrollHandler);

// Show error message with retry functionality
function showErrorWithRetry(error) {
    const projectsGrid = document.getElementById('projectsGrid');
    
    // Show a more informative error message
    let errorMessage = 'Unable to load projects from GitHub.';
    let errorDetails = 'Please check back later or visit my GitHub profile directly.';
    
    if (error.message.includes('rate limit')) {
        errorMessage = 'GitHub API rate limit reached.';
        errorDetails = 'Please try again in a few minutes or visit my GitHub profile directly.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Network connection issue.';
        errorDetails = 'Please check your internet connection and try again.';
    } else if (error.message.includes('CORS')) {
        errorMessage = 'Cross-origin request blocked.';
        errorDetails = 'This might be due to browser security settings.';
    } else if (error.name === 'AbortError') {
        errorMessage = 'Request timed out.';
        errorDetails = 'The request took too long. Please try again.';
    }
    
    projectsGrid.innerHTML = `
        <div class="error-message">
            <h3>${errorMessage}</h3>
            <p>${errorDetails}</p>
            <a href="https://github.com/Malavika-123-Sunil" target="_blank" class="github-link">
                Visit GitHub Profile
            </a>
            <button onclick="fetchGitHubProjects()" class="retry-btn">
                🔄 Try Again
            </button>
        </div>
    `;
}