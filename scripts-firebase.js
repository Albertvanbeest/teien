document.addEventListener('DOMContentLoaded', () => {
    console.log('scripts-firebase.js loaded');

    // Initialize AOS
    try {
        if (typeof AOS !== 'undefined') {
            AOS.init({ duration: 1000, once: true });
            console.log('AOS initialized');
        }
    } catch (error) {
        console.error('AOS initialization failed:', error);
    }

    // Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }
    });

    // Mobile Menu Toggle
    const burger = document.querySelector('.burger');
    const navLinks = document.querySelector('.nav-links');
    if (burger && navLinks) {
        burger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            console.log('Burger clicked, nav-links toggled');
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!burger.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
    }

    // Authentication System
    const authModal = document.querySelector('#auth-modal');
    const authForm = document.querySelector('#auth-form');
    const authTitle = document.querySelector('#auth-title');
    const authSubmit = document.querySelector('#auth-submit');
    const toggleLink = document.querySelector('#toggle-link');
    const authClose = document.querySelector('#auth-close');
    const loginLink = document.querySelector('#login-link');
    const usernameInput = document.querySelector('#username');
    const emailInput = document.querySelector('#email');
    const passwordInput = document.querySelector('#password');
    let isLoginMode = true;

    // Function to show auth messages
    function showAuthMessage(message, type) {
        // Remove existing message
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.textContent = message;
        
        // Insert message at the top of the form
        const form = document.querySelector('#auth-form');
        form.insertBefore(messageDiv, form.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    if (loginLink && authModal) {
        loginLink.addEventListener('click', e => {
            e.preventDefault();
            console.log('Login link clicked');
            authModal.classList.add('active');
            isLoginMode = true;
            authTitle.textContent = 'Login';
            authSubmit.textContent = 'Login';
            usernameInput.style.display = 'none';
            document.querySelector('#auth-toggle').innerHTML = 'Don\'t have an account? <a href="#" id="toggle-link">Register</a>';
            authForm.reset();
            
            // Re-attach toggle event after changing innerHTML
            attachToggleEvent();
        });
    }

    function attachToggleEvent() {
        const newToggleLink = document.querySelector('#toggle-link');
        if (newToggleLink) {
            newToggleLink.addEventListener('click', e => {
                e.preventDefault();
                console.log('Toggle link clicked');
                isLoginMode = !isLoginMode;
                authTitle.textContent = isLoginMode ? 'Login' : 'Register';
                authSubmit.textContent = isLoginMode ? 'Login' : 'Register';
                usernameInput.style.display = isLoginMode ? 'none' : 'block';
                document.querySelector('#auth-toggle').innerHTML = isLoginMode ? 
                    'Don\'t have an account? <a href="#" id="toggle-link">Register</a>' :
                    'Already have an account? <a href="#" id="toggle-link">Login</a>';
                authForm.reset();
                
                // Remove any existing messages
                const existingMessage = document.querySelector('.auth-message');
                if (existingMessage) {
                    existingMessage.remove();
                }
                
                // Re-attach event after changing innerHTML
                attachToggleEvent();
            });
        }
    }

    // Initial toggle event attachment
    attachToggleEvent();

    if (authClose) {
        authClose.addEventListener('click', () => {
            console.log('Close modal clicked');
            authModal.classList.remove('active');
            authForm.reset();
            // Remove any messages when closing
            const existingMessage = document.querySelector('.auth-message');
            if (existingMessage) {
                existingMessage.remove();
            }
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', e => {
            e.preventDefault();
            console.log('Auth form submitted');
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const username = usernameInput ? usernameInput.value.trim() : '';

            // Basic validation
            if (!email || !password) {
                showAuthMessage('Please fill in all required fields.', 'error');
                return;
            }

            if (!email.includes('@')) {
                showAuthMessage('Please enter a valid email address.', 'error');
                return;
            }

            if (password.length < 6) {
                showAuthMessage('Password must be at least 6 characters long.', 'error');
                return;
            }

            if (!isLoginMode && !username) {
                showAuthMessage('Please enter a username.', 'error');
                return;
            }

            // Disable submit button during processing
            authSubmit.disabled = true;
            authSubmit.textContent = isLoginMode ? 'Logging in...' : 'Registering...';

            if (isLoginMode) {
                login(email, password);
            } else {
                register(email, password, username);
            }
        });
    }

    function login(email, password) {
        console.log('Attempting login with Firebase:', email);
        
        // Query Firebase for user with matching email
        db.collection('users').where('email', '==', email).get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    showAuthMessage('Invalid email or password', 'error');
                    resetAuthButton();
                    return;
                }

                let userFound = false;
                querySnapshot.forEach((doc) => {
                    const userData = doc.data();
                    
                    // Check password (in production, use proper password hashing)
                    if (userData.password === password) {
                        userFound = true;
                        
                        // Create user session
                        const userSession = {
                            id: doc.id,
                            email: userData.email,
                            username: userData.username,
                            role: userData.role || 'user'
                        };
                        
                        localStorage.setItem('currentUser', JSON.stringify(userSession));
                        
                        // Update last login time
                        db.collection('users').doc(doc.id).update({
                            lastLogin: new Date().toISOString()
                        }).catch(error => {
                            console.error('Error updating last login:', error);
                        });
                        
                        updateAuthUI(userSession);
                        authModal.classList.remove('active');
                        showAuthMessage('Login successful!', 'success');
                        
                        // Redirect to admin if admin user
                        if (userSession.role === 'admin') {
                            setTimeout(() => {
                                window.location.href = 'admin.html';
                            }, 1000);
                        }
                        
                        resetAuthButton();
                    }
                });

                if (!userFound) {
                    showAuthMessage('Invalid email or password', 'error');
                    resetAuthButton();
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                showAuthMessage('Login failed. Please try again.', 'error');
                resetAuthButton();
            });
    }

    function register(email, password, username) {
        console.log('Attempting register with Firebase:', email, username);
        
        // Check if user already exists
        db.collection('users').where('email', '==', email).get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    showAuthMessage('Email already registered', 'error');
                    resetAuthButton();
                    return;
                }
                
                // Create new user
                const role = email === 'admin@teientamashii.com' ? 'admin' : 'user';
                const newUser = {
                    email: email,
                    password: password, // In production, hash this password
                    username: username,
                    role: role,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                
                return db.collection('users').add(newUser);
            })
            .then((docRef) => {
                if (docRef) {
                    console.log('User created with ID:', docRef.id);
                    
                    const userSession = {
                        id: docRef.id,
                        email: email,
                        username: username,
                        role: newUser.role
                    };
                    
                    localStorage.setItem('currentUser', JSON.stringify(userSession));
                    updateAuthUI(userSession);
                    authModal.classList.remove('active');
                    showAuthMessage('Registration successful!', 'success');
                    
                    if (userSession.role === 'admin') {
                        setTimeout(() => {
                            window.location.href = 'admin.html';
                        }, 1000);
                    }
                    
                    resetAuthButton();
                }
            })
            .catch(error => {
                console.error('Registration error:', error);
                showAuthMessage('Registration failed. Please try again.', 'error');
                resetAuthButton();
            });
    }

    function resetAuthButton() {
        authSubmit.disabled = false;
        authSubmit.textContent = isLoginMode ? 'Login' : 'Register';
    }

    function updateAuthUI(user) {
        console.log('Updating auth UI for user:', user.username);
        const authLink = document.querySelector('#auth-link');
        const adminLink = document.querySelector('#admin-link');
        
        if (!authLink) {
            console.error('Auth link not found');
            return;
        }
        
        if (user) {
            authLink.innerHTML = `<a href="#" id="logout-link">Logout (${user.username})</a>`;
            
            // Show admin link if user is admin
            if (user.role === 'admin' && adminLink) {
                adminLink.style.display = 'block';
                console.log('Admin link shown');
            }
            
            const logoutLink = document.querySelector('#logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', e => {
                    e.preventDefault();
                    console.log('Logout clicked');
                    
                    // Update logout time in Firebase
                    if (user.id) {
                        db.collection('users').doc(user.id).update({
                            lastLogout: new Date().toISOString()
                        }).catch(error => {
                            console.error('Error updating logout time:', error);
                        });
                    }
                    
                    localStorage.removeItem('currentUser');
                    authLink.innerHTML = `<a href="#login" id="login-link">Login</a>`;
                    if (adminLink) {
                        adminLink.style.display = 'none';
                    }
                    
                    // Re-attach login event
                    const newLoginLink = document.querySelector('#login-link');
                    if (newLoginLink) {
                        newLoginLink.addEventListener('click', e => {
                            e.preventDefault();
                            authModal.classList.add('active');
                            isLoginMode = true;
                            authTitle.textContent = 'Login';
                            authSubmit.textContent = 'Login';
                            usernameInput.style.display = 'none';
                            document.querySelector('#auth-toggle').innerHTML = 'Don\'t have an account? <a href="#" id="toggle-link">Register</a>';
                            authForm.reset();
                            attachToggleEvent();
                        });
                    }
                    
                    location.reload();
                });
            }
        }
    }

    // Cart Functionality (existing code...)
    const cartIcon = document.querySelector('#cart-icon');
    const cart = document.querySelector('.cart');
    const cartClose = document.querySelector('#cart-close');
    const cartContent = document.querySelector('.cart-content');
    const totalPriceElement = document.querySelector('.total-price');
    const cartItemCountBadge = document.querySelector('.cart-item-count');
    let cartItemCount = 0;

    if (cartIcon && cart && cartClose) {
        cartIcon.addEventListener('click', () => {
            console.log('Cart icon clicked');
            cart.classList.add('active');
        });

        cartClose.addEventListener('click', () => {
            console.log('Cart close clicked');
            cart.classList.remove('active');
        });
    }

    function isShopPage() {
        return window.location.pathname.includes('shop.html');
    }

    function loadProducts(filterCategory = 'all') {
        console.log('Loading products with filter:', filterCategory);
        const productContent = document.querySelector('#product-content');
        if (!productContent) {
            console.error('Product content element not found');
            return;
        }

        // Show loading indicator
        productContent.innerHTML = '<p>Loading products...</p>';

        // Get all products from Firestore
        db.collection('products').get().then((snapshot) => {
            if (snapshot.empty) {
                productContent.innerHTML = '<p>No products available. Admin can add products from the admin panel.</p>';
                return;
            }
            
            // Group products by title
            const groupedProducts = {};
            snapshot.forEach(doc => {
                const p = doc.data();
                
                // Apply filtering logic
                let shouldInclude = false;
                
                if (filterCategory === 'all') {
                    shouldInclude = true;
                } else if (p.category) {
                    const categories = p.category.split(',').map(cat => cat.trim().toLowerCase());
                    shouldInclude = categories.includes(filterCategory.toLowerCase());
                }
                
                if (shouldInclude && p.quantity > 0) { // Only show products in stock
                    const key = p.title;
                    if (!groupedProducts[key]) {
                        groupedProducts[key] = [];
                    }
                    groupedProducts[key].push({ id: doc.id, ...p });
                }
            });
            
            let productsHTML = '';
            let productCount = 0;
            
            Object.keys(groupedProducts).forEach(productTitle => {
                const variants = groupedProducts[productTitle];
                const mainProduct = variants[0]; // Use first variant for display
                productCount++;
                
                // Calculate price range
                const prices = variants.map(v => v.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceDisplay = minPrice === maxPrice ? `R${minPrice}` : `R${minPrice} - R${maxPrice}`;
                
                productsHTML += `
                    <div class="product-box" data-product-title="${productTitle}">
                        <div class="img-box">
                            <img src="${mainProduct.image}" alt="${mainProduct.title}">
                        </div>
                        <h2 class="product-title">${mainProduct.title}</h2>
                        <div class="rating">
                            ${Array(5).fill('<i class="fa fa-star"></i>').join('')}
                        </div>
                        <p>${getCategoryText(mainProduct.category)}</p>
                        <p class="variant-count">${variants.length} weight option(s)</p>
                        <div class="price-and-cart">
                            <span class="price">${priceDisplay}</span>
                            <button class="select-weight-btn" onclick="openWeightModal('${productTitle}')">
                                <i class="fas fa-weight-hanging"></i> Select Weight
                            </button>
                        </div>
                    </div>
                `;
            });
            
            // Display results
            if (productCount === 0) {
                const categoryDisplayName = filterCategory === 'all' ? 'this selection' : filterCategory.charAt(0).toUpperCase() + filterCategory.slice(1);
                productContent.innerHTML = `<p>No products available for ${categoryDisplayName}.</p>`;
            } else {
                productContent.innerHTML = productsHTML;
            }
            
            console.log(`Loaded ${productCount} product types for category: ${filterCategory}`);
            
        }).catch(error => {
            console.error('Error getting products:', error);
            productContent.innerHTML = '<p>Error loading products. Please try again later.</p>';
        });
    }

    function getCategoryText(category) {
        if (!category) return 'General bonsai';
        const categories = category.split(',');
        const levels = ['beginner', 'intermediate', 'advanced'];
        const locations = ['indoor', 'outdoor'];
        
        const level = categories.find(c => levels.includes(c));
        const location = categories.find(c => locations.includes(c));
        
        let text = '';
        if (level) text += level.charAt(0).toUpperCase() + level.slice(1) + ' level';
        if (level && location) text += ', ';
        if (location) text += location.charAt(0).toUpperCase() + location.slice(1);
        
        return text || 'General bonsai';
    }

    function handleAddToCart(event) {
        console.log('Add to cart clicked');
        const button = event.target;
        const productBox = button.closest('.product-box');
        const productId = button.getAttribute('data-id');
        
        if (!productBox || !productId) {
            console.error('Product box or ID not found');
            return;
        }
        
        // Get product from Firestore
        db.collection('products').doc(productId).get()
            .then((doc) => {
                if (!doc.exists) {
                    alert('Product not found.');
                    return;
                }
                
                const product = doc.data();
                addToCart(productBox, product);
            })
            .catch(error => {
                console.error('Error getting product:', error);
                alert('Error adding to cart. Please try again.');
            });
    }

    function addToCart(productBox, product) {
        const productImgSrc = productBox.querySelector('img').src;
        const productTitle = product.title;
        const productPrice = product.price;

        if (!productImgSrc || !productTitle || isNaN(productPrice)) {
            console.error('Invalid product data:', { productImgSrc, productTitle, productPrice });
            alert('Error adding product to cart. Please try again.');
            return;
        }

        if (cartContent && cartContent.querySelector(`.cart-product-title[data-title="${productTitle}"]`)) {
            alert('This item is already in your cart.');
            return;
        }

        const cartBox = document.createElement('div');
        cartBox.classList.add('cart-box');
        cartBox.innerHTML = `
            <img src="${productImgSrc}" alt="${productTitle}" class="cart-img">
            <div class="cart-detail">
                <h2 class="cart-product-title" data-title="${productTitle}">${productTitle}</h2>
                <span class="cart-price">R${productPrice}</span>
                <div class="cart-quantity">
                    <button class="decrement">-</button>
                    <span class="number">1</span>
                    <button class="increment">+</button>
                </div>
            </div>
            <i class="fas fa-trash-can cart-remove"></i>
        `;
        
        if (cartContent) {
            cartContent.appendChild(cartBox);
            updateCartCount(1);
            updateTotalPrice();

            cartBox.querySelector('.cart-remove').addEventListener('click', () => {
                cartBox.remove();
                updateCartCount(-1);
                updateTotalPrice();
            });

            const quantityElement = cartBox.querySelector('.number');
            const decrementButton = cartBox.querySelector('.decrement');
            cartBox.querySelector('.cart-quantity').addEventListener('click', event => {
                let quantity = parseInt(quantityElement.textContent);
                if (event.target.classList.contains('decrement') && quantity > 1) {
                    quantity--;
                    decrementButton.disabled = quantity === 1;
                } else if (event.target.classList.contains('increment')) {
                    quantity++;
                    decrementButton.disabled = false;
                }
                quantityElement.textContent = quantity;
                updateTotalPrice();
            });
        }
    }

    function updateTotalPrice() {
        let total = 0;
        if (cartContent) {
            cartContent.querySelectorAll('.cart-box').forEach(cartBox => {
                const price = parseFloat(cartBox.querySelector('.cart-price').textContent.replace('R', ''));
                const quantity = parseInt(cartBox.querySelector('.number').textContent);
                total += price * quantity;
            });
        }
        if (totalPriceElement) {
            totalPriceElement.textContent = `R${total.toFixed(2)}`;
        }
    }

    function updateCartCount(change) {
        cartItemCount += change;
        if (cartItemCountBadge) {
            cartItemCountBadge.style.visibility = cartItemCount > 0 ? 'visible' : 'hidden';
            cartItemCountBadge.textContent = cartItemCount > 0 ? cartItemCount : '';
        }
    }

    // Rest of your existing functions...
    // (loadFeaturedProducts, loadFeaturedCourses, etc.)

    // Shop page filters
    if (isShopPage()) {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        // Add click event listeners to filter buttons
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Get the filter value and load products
                const filterValue = button.dataset.filter;
                console.log('Filter button clicked:', filterValue);
                loadProducts(filterValue);
            });
        });
        
        // Load all products initially
        loadProducts('all');
    }

    // Load featured products on home page
    function loadFeaturedProducts() {
        const featuredContent = document.querySelector('#featured-content');
        if (!featuredContent) return;

        // Show loading indicator
        featuredContent.innerHTML = '<p>Loading featured products...</p>';

        // Get first 3 products from Firestore
        db.collection('products').limit(3).get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    featuredContent.innerHTML = '<p>No featured products available. Admin can add products from the admin panel.</p>';
                    return;
                }
                
                let featuredHTML = '';
                snapshot.forEach(doc => {
                    const p = doc.data();
                    featuredHTML += `
                        <div class="product-box ${p.inStock === false ? 'out-of-stock' : ''}">
                            <div class="img-box">
                                <img src="${p.image}" alt="${p.title}">
                            </div>
                            <h2 class="product-title">${p.title}</h2>
                            <div class="rating">
                                ${Array(5).fill('<i class="fa fa-star"></i>').join('')}
                            </div>
                            <p>${getCategoryText(p.category)}</p>
                            <p class="stock-status ${p.quantity <= 0 ? 'out-of-stock' : 'in-stock'}">
                                ${p.quantity <= 0 ? 'Out of Stock' : 'In Stock'}
                            </p>
                            <div class="price-and-cart">
                                <span class="price">R${p.price}</span>
                                ${p.quantity > 0 
                                    ? `<i class="fas fa-shopping-bag add-cart" data-title="${p.title}" data-id="${doc.id}"></i>`
                                    : `<span class="out-of-stock-label">Unavailable</span>`
                                }
                            </div>
                        </div>
                    `;
                });
                
                featuredContent.innerHTML = featuredHTML;
                
                // Add event listeners to the add-cart buttons
                document.querySelectorAll('.add-cart').forEach(button => {
                    button.removeEventListener('click', handleAddToCart);
                    button.addEventListener('click', handleAddToCart);
                });
            })
            .catch(error => {
                console.error('Error loading featured products:', error);
                featuredContent.innerHTML = '<p>Error loading featured products. Please try again later.</p>';
            });
    }

    // Load featured courses on home page
    function loadFeaturedCourses() {
        const featuredCoursesContent = document.querySelector('#featured-courses-content');
        if (!featuredCoursesContent) return;

        // Show loading indicator
        featuredCoursesContent.innerHTML = '<p>Loading featured courses...</p>';

        // Get first 3 courses from Firestore
        db.collection('courses').limit(3).get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    featuredCoursesContent.innerHTML = '<p>No featured courses available. Admin can add courses from the admin panel.</p>';
                    return;
                }
                
                let featuredHTML = '';
                snapshot.forEach(doc => {
                    const course = doc.data();
                    const shortDescription = course.description.length > 120 
                        ? course.description.substring(0, 120) + '...' 
                        : course.description;
                    
                    featuredHTML += `
                        <div class="product-box course-box">
                            <div class="img-box">
                                <img src="${course.image}" alt="${course.title}">
                            </div>
                            <h2 class="product-title">${course.title}</h2>
                            <div class="course-info">
                                <span class="course-level">${course.level.charAt(0).toUpperCase() + course.level.slice(1)} Level</span>
                                <span class="course-duration">${course.duration}h</span>
                            </div>
                            <p class="course-description">${shortDescription}</p>
                            <div class="price-and-cart">
                                <span class="price">R${course.price}</span>
                                <a href="courses.html" class="cta-btn course-btn">Learn More</a>
                            </div>
                        </div>
                    `;
                });
                
                featuredCoursesContent.innerHTML = featuredHTML;
            })
            .catch(error => {
                console.error('Error loading featured courses:', error);
                featuredCoursesContent.innerHTML = '<p>Error loading featured courses. Please try again later.</p>';
            });
    }

    // Function to load care tips on the care-tips.html page (now static)
    function loadCareTipsPage() {
        console.log('Loading static care tips page');
        const tipsContent = document.querySelector('#tips-content');
        if (!tipsContent) return;

        // Static care tips content
        const staticTipsHTML = `
            <div class="tips-category">
                <h2 class="category-title">Watering</h2>
                <div class="tips-grid">
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-watering.webp" alt="Proper Watering Technique">
                        </div>
                        <div class="tip-content">
                            <h3>Proper Watering Technique</h3>
                            <p>Water your bonsai when the soil feels slightly dry to the touch. Always water thoroughly until water drains from the drainage holes. For most bonsai, it's better to underwater than overwater. In hot weather, you may need to water daily, while in winter, reduce watering frequency.</p>
                        </div>
                    </div>
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-watering.webp" alt="Watering Schedule">
                        </div>
                        <div class="tip-content">
                            <h3>Watering Schedule</h3>
                            <p>Check your bonsai's soil moisture daily by inserting your finger about an inch into the soil. If it feels dry, it's time to water. Different species and seasons require different watering frequencies, so adapt your schedule accordingly.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tips-category">
                <h2 class="category-title">Pruning</h2>
                <div class="tips-grid">
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-Pruning.webp" alt="Pruning for Shape">
                        </div>
                        <div class="tip-content">
                            <h3>Pruning for Shape</h3>
                            <p>Regular pruning is essential for maintaining the shape of your bonsai. Use sharp, clean bonsai shears to make precise cuts. Remove any dead branches, crossed branches, or growth that disrupts the desired shape. For deciduous trees, heavy pruning is best done in late winter or early spring.</p>
                        </div>
                    </div>
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-Pruning.webp" alt="Maintenance Pruning">
                        </div>
                        <div class="tip-content">
                            <h3>Maintenance Pruning</h3>
                            <p>Pinch or cut new growth regularly to maintain your bonsai's shape. Remove any shoots growing straight up or down, and thin out areas that become too dense. This encourages back-budding and keeps your tree healthy and well-proportioned.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tips-category">
                <h2 class="category-title">Soil</h2>
                <div class="tips-grid">
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-Soil.avif" alt="Choosing the Right Soil">
                        </div>
                        <div class="tip-content">
                            <h3>Choosing the Right Soil</h3>
                            <p>Bonsai soil needs to drain well while still retaining some moisture. A good mix typically contains akadama (clay), pumice, and lava rock. Different species may require slightly different soil compositions. Never use regular potting soil as it retains too much water and can lead to root rot.</p>
                        </div>
                    </div>
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-Soil.avif" alt="Repotting">
                        </div>
                        <div class="tip-content">
                            <h3>Repotting</h3>
                            <p>Repot your bonsai every 1-3 years depending on the species and age. Young trees need repotting more frequently than mature ones. Look for roots circling the pot or growing out of drainage holes as signs it's time to repot. Spring is typically the best time for repotting.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tips-category">
                <h2 class="category-title">General Care</h2>
                <div class="tips-grid">
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-wall.jpg" alt="Light Requirements">
                        </div>
                        <div class="tip-content">
                            <h3>Light Requirements</h3>
                            <p>Most bonsai trees need plenty of bright, indirect light. Outdoor species should be kept outside year-round in most climates, while indoor species can thrive near a bright window. Rotate your bonsai regularly to ensure even light exposure on all sides.</p>
                        </div>
                    </div>
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-wall.jpg" alt="Fertilizing">
                        </div>
                        <div class="tip-content">
                            <h3>Fertilizing</h3>
                            <p>Feed your bonsai regularly during the growing season with a balanced, diluted fertilizer. Use organic fertilizers like fish emulsion or specialized bonsai fertilizers. Reduce or stop feeding during winter when growth slows. Over-fertilizing can lead to excessive growth and weak branches.</p>
                        </div>
                    </div>
                    <div class="tip-card">
                        <div class="tip-img">
                            <img src="Fotos/Bonsai-wall.jpg" alt="Wiring">
                        </div>
                        <div class="tip-content">
                            <h3>Wiring Techniques</h3>
                            <p>Use aluminum or copper wire to shape branches and trunk. Wrap the wire at a 45-degree angle, not too tight to allow for growth. Remove wire before it cuts into the bark, typically after 3-6 months. Wire during the dormant season for best results.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        tipsContent.innerHTML = staticTipsHTML;
    }

    // Function to load courses on the courses.html page
    function loadCoursesPage() {
        console.log('Loading courses page');
        const coursesContent = document.querySelector('#courses-content');
        if (!coursesContent) return;

        // Show loading indicator
        coursesContent.innerHTML = '<p>Loading courses...</p>';

        // Get courses from Firestore
        db.collection('courses').get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    coursesContent.innerHTML = '<p>No courses available yet. Admin can add courses from the admin panel.</p>';
                    return;
                }
                
                // Group courses by category with validation
                const coursesByCategory = {};
                snapshot.forEach(doc => {
                    const course = doc.data();
                    
                    // Basic validation to ensure no empty content displays
                    if (!course.title || !course.description || !course.image) {
                        console.warn('Skipping invalid course:', doc.id);
                        return;
                    }
                    
                    // Clean and validate image URL
                    if (!course.image.startsWith('data:image') && 
                        !course.image.startsWith('http') && 
                        !course.image.startsWith('Fotos/')) {
                        console.warn('Skipping course with invalid image:', doc.id);
                        return;
                    }

                    const category = course.category || 'general';
                    if (!coursesByCategory[category]) {
                        coursesByCategory[category] = [];
                    }
                    coursesByCategory[category].push(course);
                });

                // If no valid courses were found
                if (Object.keys(coursesByCategory).length === 0) {
                    coursesContent.innerHTML = '<p>No courses available yet. Admin can add courses from the admin panel.</p>';
                    return;
                }

                let coursesHTML = '';
                
                // Generate HTML for each category
                Object.keys(coursesByCategory).sort().forEach(category => {
                    const categoryName = category.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                    
                    coursesHTML += `
                        <div class="tips-category">
                            <h2 class="category-title">${categoryName}</h2>
                            <div class="tips-grid">
                    `;
                    
                    // Add courses for this category
                    coursesByCategory[category].forEach(course => {
                        // Truncate long descriptions to prevent layout issues
                        const shortDescription = course.description.length > 300 
                            ? course.description.substring(0, 300) + '...' 
                            : course.description;
                            
                        coursesHTML += `
                            <div class="tip-card">
                                <div class="tip-img">
                                    <img src="${course.image}" alt="${course.title}" onerror="this.src='Fotos/Bonsai-wall.jpg'">
                                </div>
                                <div class="tip-content">
                                    <h3>${course.title}</h3>
                                    <p>${shortDescription}</p>
                                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                                        <strong>Price: R${course.price}</strong><br>
                                        <strong>Duration: ${course.duration} hours</strong><br>
                                        <span style="color: var(--primary-color); font-weight: 600;">${course.level.charAt(0).toUpperCase() + course.level.slice(1)} Level</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    
                    coursesHTML += `
                            </div>
                        </div>
                    `;
                });
                
                coursesContent.innerHTML = coursesHTML;
            })
            .catch(error => {
                console.error('Error getting courses:', error);
                coursesContent.innerHTML = '<p>Error loading courses. Please try again later.</p>';
            });
    }

    // Initialize page based on URL
    if (window.location.pathname.includes('care-tips.html')) {
        loadCareTipsPage();
    } else if (window.location.pathname.includes('courses.html')) {
        loadCoursesPage();
    } else if (isShopPage()) {
        loadProducts();
    } else {
        loadFeaturedProducts();
        loadFeaturedCourses();
    }

    // Check for logged-in user on page load
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        updateAuthUI(currentUser);
    }

    // Weight Selection Modal Functions
    window.openWeightModal = function(productTitle) {
        console.log('Opening weight modal for:', productTitle);
        
        const modal = document.getElementById('weight-modal');
        const modalTitle = document.getElementById('weight-modal-title');
        const weightOptions = document.getElementById('weight-options');
        
        modalTitle.textContent = productTitle;
        weightOptions.innerHTML = '<p>Loading weight options...</p>';
        
        // Get all variants for this product
        db.collection('products').where('title', '==', productTitle).get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    weightOptions.innerHTML = '<p>No variants available.</p>';
                    return;
                }
                
                let optionsHTML = '';
                const variants = [];
                
                snapshot.forEach(doc => {
                    const variant = { id: doc.id, ...doc.data() };
                    if (variant.quantity > 0) { // Only show in-stock variants
                        variants.push(variant);
                    }
                });
                
                // Sort by weight
                variants.sort((a, b) => a.weight - b.weight);
                
                variants.forEach(variant => {
                    optionsHTML += `
                        <div class="weight-option" onclick="selectWeight('${variant.id}', '${variant.title}', ${variant.weight}, ${variant.price})">
                            <div class="weight-option-info">
                                <div class="weight-display">${variant.weight}kg</div>
                                <div class="weight-price">R${variant.price}</div>
                                <div class="weight-stock">${variant.quantity} available</div>
                            </div>
                            <div class="weight-add-to-cart">
                                <i class="fas fa-shopping-bag"></i>
                                Add to Cart
                            </div>
                        </div>
                    `;
                });
                
                if (variants.length === 0) {
                    optionsHTML = '<p>All variants are currently out of stock.</p>';
                }
                
                weightOptions.innerHTML = optionsHTML;
                modal.classList.add('active');
            })
            .catch(error => {
                console.error('Error loading variants:', error);
                weightOptions.innerHTML = '<p>Error loading weight options.</p>';
            });
    };

    window.closeWeightModal = function() {
        const modal = document.getElementById('weight-modal');
        modal.classList.remove('active');
    };

    window.selectWeight = function(variantId, title, weight, price) {
        console.log('Selected variant:', { variantId, title, weight, price });
        
        // Get the full variant data
        db.collection('products').doc(variantId).get()
            .then((doc) => {
                if (!doc.exists) {
                    alert('Product variant not found.');
                    return;
                }
                
                const variant = doc.data();
                
                // Create a mock product box for the addToCart function
                const mockProductBox = {
                    querySelector: function(selector) {
                        if (selector === 'img') {
                            return { src: variant.image };
                        }
                        return null;
                    }
                };
                
                // Add to cart with weight info
                addWeightedToCart(mockProductBox, variant, variantId);
                
                // Close modal
                closeWeightModal();
            })
            .catch(error => {
                console.error('Error getting variant:', error);
                alert('Error adding to cart. Please try again.');
            });
    };

    function addWeightedToCart(productBox, variant, variantId) {
        const productImgSrc = variant.image;
        const productTitle = `${variant.title} (${variant.weight}kg)`;
        const productPrice = variant.price;

        if (!productImgSrc || !productTitle || isNaN(productPrice)) {
            console.error('Invalid product data:', { productImgSrc, productTitle, productPrice });
            alert('Error adding product to cart. Please try again.');
            return;
        }

        if (cartContent && cartContent.querySelector(`.cart-product-title[data-variant-id="${variantId}"]`)) {
            alert('This weight variant is already in your cart.');
            return;
        }

        const cartBox = document.createElement('div');
        cartBox.classList.add('cart-box');
        cartBox.innerHTML = `
            <img src="${productImgSrc}" alt="${productTitle}" class="cart-img">
            <div class="cart-detail">
                <h2 class="cart-product-title" data-variant-id="${variantId}">${productTitle}</h2>
                <span class="cart-price">R${productPrice}</span>
                <div class="cart-quantity">
                    <button class="decrement">-</button>
                    <span class="number">1</span>
                    <button class="increment">+</button>
                </div>
            </div>
            <i class="fas fa-trash-can cart-remove"></i>
        `;
        
        if (cartContent) {
            cartContent.appendChild(cartBox);
            updateCartCount(1);
            updateTotalPrice();

            cartBox.querySelector('.cart-remove').addEventListener('click', () => {
                cartBox.remove();
                updateCartCount(-1);
                updateTotalPrice();
            });

            const quantityElement = cartBox.querySelector('.number');
            const decrementButton = cartBox.querySelector('.decrement');
            cartBox.querySelector('.cart-quantity').addEventListener('click', event => {
                let quantity = parseInt(quantityElement.textContent);
                if (event.target.classList.contains('decrement') && quantity > 1) {
                    quantity--;
                    decrementButton.disabled = quantity === 1;
                } else if (event.target.classList.contains('increment')) {
                    // Check stock limit here if needed
                    quantity++;
                    decrementButton.disabled = false;
                }
                quantityElement.textContent = quantity;
                updateTotalPrice();
            });
        }
    }

    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('weight-modal');
        if (e.target === modal) {
            closeWeightModal();
        }
    });

    // PayFast Payment Integration
    function processPayFastPayment() {
        // PayFast Configuration (SANDBOX - for testing)
        const PAYFAST_CONFIG = {
            merchant_id: "10000100",        // PayFast sandbox merchant ID
            merchant_key: "46f0cd694581a", // PayFast sandbox merchant key
            endpoint: "https://sandbox.payfast.co.za/eng/process", // Sandbox URL
            passphrase: "passphrase"        // Sandbox passphrase
        };

        // Get the current domain for absolute URLs
        const baseUrl = window.location.origin;
        
        // Calculate cart total and prepare items
        let total = 0;
        let itemNames = [];
        let orderDetails = [];
        
        cartContent.querySelectorAll('.cart-box').forEach(cartBox => {
            const title = cartBox.querySelector('.cart-product-title').textContent;
            const price = parseFloat(cartBox.querySelector('.cart-price').textContent.replace('R', ''));
            const quantity = parseInt(cartBox.querySelector('.number').textContent);
            const itemTotal = price * quantity;
            
            itemNames.push(`${title} x${quantity}`);
            orderDetails.push({
                name: title,
                price: price,
                quantity: quantity,
                total: itemTotal
            });
            
            total += itemTotal;
        });

        // Generate unique payment ID
        const paymentId = `TEIEN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Prepare PayFast payment data with ABSOLUTE URLs
        const paymentData = {
            // Merchant details
            merchant_id: PAYFAST_CONFIG.merchant_id,
            merchant_key: PAYFAST_CONFIG.merchant_key,
            
            // Payment details
            amount: total.toFixed(2),
            item_name: "Teien Tamashii Bonsai Order",
            item_description: itemNames.join(', '),
            
            // Custom fields
            custom_str1: paymentId,
            custom_str2: orderDetails.length.toString(),
            custom_str3: "bonsai_order",
            
            // ABSOLUTE URLs (CRITICAL: PayFast requires full URLs)
            return_url: `${baseUrl}/success.html?order=${paymentId}`,
            cancel_url: `${baseUrl}/shop.html?cancelled=true`,
            notify_url: `${baseUrl}/payfast-notify.php`, // Your webhook endpoint
            
            // Customer details (in a real app, you'd collect these)
            name_first: currentUser ? currentUser.username.split(' ')[0] : "Customer",
            name_last: currentUser ? (currentUser.username.split(' ')[1] || "Name") : "Name",
            email_address: currentUser ? currentUser.email : "customer@example.com",
            
            // Additional settings
            email_confirmation: "1",
            confirmation_address: "orders@teientamashii.com",
            m_payment_id: paymentId
        };

        // Generate signature for security
        const signature = generatePayFastSignature(paymentData, PAYFAST_CONFIG.passphrase);
        paymentData.signature = signature;

        // Store order details for success page
        localStorage.setItem('pendingOrder', JSON.stringify({
            id: paymentId,
            items: orderDetails,
            total: total,
            timestamp: new Date().toISOString()
        }));

        // Log the payment data for debugging
        console.log('PayFast Payment Data:', paymentData);

        // Create and submit PayFast form
        createPayFastForm(paymentData, PAYFAST_CONFIG.endpoint);
    }

    // Generate PayFast signature (MD5 hash)
    function generatePayFastSignature(data, passphrase) {
        // Create parameter string (sorted alphabetically)
        const sortedKeys = Object.keys(data).sort();
        const paramString = sortedKeys
            .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
            .join('&');
        
        // Add passphrase
        const stringToSign = `${paramString}&passphrase=${encodeURIComponent(passphrase)}`;
        
        // Generate MD5 hash using the included library
        return md5(stringToSign);
    }

    // Create and submit PayFast payment form
    function createPayFastForm(paymentData, endpoint) {
        // Show loading state
        const buyButton = document.querySelector('.btn-buy');
        const originalText = buyButton.textContent;
        buyButton.textContent = 'Redirecting to PayFast...';
        buyButton.disabled = true;

        // Create form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = endpoint;
        form.style.display = 'none';

        // Add form fields
        Object.keys(paymentData).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = paymentData[key];
            form.appendChild(input);
        });

        // Add form to page and submit
        document.body.appendChild(form);
        
        // Submit after short delay to show loading state
        setTimeout(() => {
            form.submit();
        }, 1000);

        // Reset button if form submission fails
        setTimeout(() => {
            buyButton.textContent = originalText;
            buyButton.disabled = false;
            document.body.removeChild(form);
        }, 5000);
    }

    // Handle payment return (success page would call this)
    function handlePaymentReturn() {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order');
        
        if (orderId && window.location.pathname.includes('success.html')) {
            // Clear cart on successful payment
            if (cartContent) {
                cartContent.innerHTML = '';
                cartItemCount = 0;
                updateCartCount(0);
                updateTotalPrice();
            }
            
            // Clear pending order
            localStorage.removeItem('pendingOrder');
        }
    }

    // Initialize buy button
    const buyButton = document.querySelector('.btn-buy');
    if (buyButton) {
        buyButton.addEventListener('click', () => {
            if (!cartContent || !cartContent.querySelectorAll('.cart-box').length) {
                alert('Your cart is empty. Please select items to add to your cart.');
                return;
            }

            // Show payment confirmation
            if (confirm('Proceed to secure PayFast payment?')) {
                processPayFastPayment();
            }
        });
    }

    // Call on page load
    handlePaymentReturn();
});