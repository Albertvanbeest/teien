document.addEventListener('DOMContentLoaded', () => {
    console.log('admin-firebase.js loaded with Firebase Auth');

    // Check for admin access using Firebase
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.id) {
        alert('Access denied. Please log in first.');
        window.location.href = 'index.html';
        return;
    }

    // Verify user exists in Firebase and has admin role
    db.collection('users').doc(currentUser.id).get()
        .then((doc) => {
            if (!doc.exists) {
                alert('User not found. Please log in again.');
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
                return;
            }

            const userData = doc.data();
            if (userData.role !== 'admin') {
                alert('Access denied. Admin only.');
                window.location.href = 'index.html';
                return;
            }

            // Update last access time
            db.collection('users').doc(currentUser.id).update({
                lastAdminAccess: new Date().toISOString()
            }).catch(error => {
                console.error('Error updating admin access time:', error);
            });

            console.log('Admin access granted for:', userData.username);
        })
        .catch(error => {
            console.error('Error verifying admin access:', error);
            alert('Error verifying access. Please try again.');
            window.location.href = 'index.html';
            return;
        });

    // Mobile menu toggle
    const burger = document.querySelector('.burger');
    const navLinks = document.querySelector('.nav-links');
    if (burger && navLinks) {
        burger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    document.querySelector('#logout-link').addEventListener('click', e => {
        e.preventDefault();
        console.log('Admin logout clicked');
        
        // Update logout time in Firebase
        if (currentUser && currentUser.id) {
            db.collection('users').doc(currentUser.id).update({
                lastLogout: new Date().toISOString()
            }).catch(error => {
                console.error('Error updating logout time:', error);
            });
        }

        // Clear session and redirect
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs and content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // PRODUCT MANAGEMENT
    const productForm = document.querySelector('#product-form');
    const productList = document.querySelector('#product-list');
    const editProductModal = document.querySelector('#edit-product-modal');
    const editProductForm = document.querySelector('#edit-product-form');
    const productImage = document.querySelector('#product-image');

    // Image preview for main product form
    productImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('Image selected:', file.name);
            };
            reader.readAsDataURL(file);
        }
    });

    function loadProducts() {
        console.log('Loading admin products from Firestore');
        
        // Clear the product list first
        productList.innerHTML = '<p>Loading products...</p>';
        
        // Get products from Firestore
        db.collection('products').get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    productList.innerHTML = '<p>No products added yet. Add your first product using the form above.</p>';
                    return;
                }
                
                // Group products by title
                const groupedProducts = {};
                snapshot.forEach(doc => {
                    const p = doc.data();
                    const key = p.title;
                    if (!groupedProducts[key]) {
                        groupedProducts[key] = [];
                    }
                    groupedProducts[key].push({ id: doc.id, ...p });
                });
                
                let productsHTML = '';
                Object.keys(groupedProducts).forEach(productTitle => {
                    const variants = groupedProducts[productTitle];
                    const mainProduct = variants[0]; // Use first variant for display
                    
                    // Sort variants by weight
                    variants.sort((a, b) => a.weight - b.weight);
                    
                    productsHTML += `
                        <div class="product-group">
                            <div class="product-group-header">
                                <img src="${mainProduct.image}" alt="${mainProduct.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
                                <div class="product-info">
                                    <h3>${mainProduct.title}</h3>
                                    <p class="product-category">${getCategoryText(mainProduct.category)}</p>
                                    <p class="variant-count">${variants.length} weight variant(s)</p>
                                </div>
                                <div class="group-actions">
                                    <button class="manage-weights-btn" onclick="openWeightManagementModal('${productTitle}')">
                                        <i class="fas fa-cog"></i> Manage Weights
                                    </button>
                                    <button class="delete-group-btn" onclick="deleteProductGroup('${productTitle}')">
                                        <i class="fas fa-trash-alt"></i> Delete Product
                                    </button>
                                </div>
                            </div>
                            <div class="product-variants">
                                ${variants.map(variant => `
                                    <div class="variant-item">
                                        <span class="variant-weight">${variant.weight}kg</span>
                                        <span class="variant-price">R${variant.price}</span>
                                        <span class="variant-stock ${variant.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                                            ${variant.quantity > 0 ? `${variant.quantity} in stock` : 'Out of stock'}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                });
                
                productList.innerHTML = productsHTML;
            })
            .catch(error => {
                console.error('Error getting products:', error);
                productList.innerHTML = '<p>Error loading products. Please try again.</p>';
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

    // Weight Management Modal Functions
    window.openWeightManagementModal = function(productTitle) {
        const modal = document.createElement('div');
        modal.className = 'weight-management-modal';
        modal.id = 'weight-management-modal';
        
        modal.innerHTML = `
            <div class="weight-management-content">
                <div class="weight-management-header">
                    <h3>Manage Weights - ${productTitle}</h3>
                    <button class="weight-management-close" onclick="closeWeightManagementModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="weight-management-body">
                    <div class="weight-management-actions">
                        <button class="weight-action-btn add-weight" onclick="addWeightVariant('${productTitle}')">
                            <i class="fas fa-plus"></i> Add New Weight
                        </button>
                    </div>
                    <div class="weight-variants-list" id="weight-variants-list">
                        <p>Loading variants...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('active');
        
        // Load variants for this product
        loadWeightVariants(productTitle);
    };

    window.closeWeightManagementModal = function() {
        const modal = document.getElementById('weight-management-modal');
        if (modal) {
            modal.remove();
        }
    };

    function loadWeightVariants(productTitle) {
        const variantsList = document.getElementById('weight-variants-list');
        
        db.collection('products').where('title', '==', productTitle).get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    variantsList.innerHTML = '<p>No variants found.</p>';
                    return;
                }
                
                let variantsHTML = '';
                const variants = [];
                
                snapshot.forEach(doc => {
                    variants.push({ id: doc.id, ...doc.data() });
                });
                
                // Sort by weight
                variants.sort((a, b) => a.weight - b.weight);
                
                variants.forEach(variant => {
                    variantsHTML += `
                        <div class="weight-variant-item">
                            <div class="variant-info">
                                <span class="variant-weight-display">${variant.weight}kg</span>
                                <span class="variant-price-display">R${variant.price}</span>
                                <span class="variant-stock-display ${variant.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                                    ${variant.quantity > 0 ? `${variant.quantity} in stock` : 'Out of stock'}
                                </span>
                            </div>
                            <div class="variant-actions">
                                <button class="variant-edit-btn" onclick="editWeightVariant('${variant.id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="variant-delete-btn" onclick="deleteWeightVariant('${variant.id}', '${productTitle}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                variantsList.innerHTML = variantsHTML;
            })
            .catch(error => {
                console.error('Error loading variants:', error);
                variantsList.innerHTML = '<p>Error loading variants.</p>';
            });
    }

    window.addWeightVariant = function(productTitle) {
        // Pre-fill the form with the product title
        document.querySelector('#product-title').value = productTitle;
        
        // Get existing variant to copy category and image
        db.collection('products').where('title', '==', productTitle).limit(1).get()
            .then((snapshot) => {
                if (!snapshot.empty) {
                    const existingProduct = snapshot.docs[0].data();
                    document.querySelector('#product-category').value = existingProduct.category;
                    
                    // Close the modal and scroll to the form
                    closeWeightManagementModal();
                    document.querySelector('#product-form').scrollIntoView({ behavior: 'smooth' });
                    document.querySelector('#product-weight').focus();
                    
                    // Highlight the form
                    const form = document.querySelector('#product-form');
                    form.classList.add('highlight');
                    setTimeout(() => form.classList.remove('highlight'), 3000);
                    
                    // Show a helpful message
                    showAdminMessage(`Adding new weight variant for "${productTitle}". The category has been pre-selected.`, 'success');
                } else {
                    showAdminMessage('Product not found.', 'error');
                }
            })
            .catch(error => {
                console.error('Error fetching product for variant:', error);
                showAdminMessage('Error loading product details. Please try again.', 'error');
            });
    };

    window.editWeightVariant = function(variantId) {
        db.collection('products').doc(variantId).get()
            .then((doc) => {
                if (!doc.exists) {
                    showAdminMessage('Product variant not found.', 'error');
                    return;
                }

                const product = doc.data();
                console.log('Opening edit modal for variant:', product.title);

                // Close weight management modal first
                closeWeightManagementModal();

                // Show edit modal
                editProductModal.classList.add('active');
                
                // Fill form with current values
                document.querySelector('#edit-product-index').value = variantId;
                document.querySelector('#edit-product-title').value = product.title;
                document.querySelector('#edit-product-weight').value = product.weight || '';
                document.querySelector('#edit-product-price').value = product.price;
                document.querySelector('#edit-product-category').value = product.category || '';
                document.querySelector('#edit-product-quantity').value = product.quantity || 0;
                document.querySelector('#edit-product-image-preview').src = product.image;
            })
            .catch(error => {
                console.error('Error fetching product:', error);
                showAdminMessage('Error loading product details. Please try again.', 'error');
            });
    };

    window.deleteWeightVariant = function(variantId, productTitle) {
        if (confirm('Are you sure you want to delete this weight variant?')) {
            console.log('Delete weight variant clicked:', variantId);
            
            // Log admin action
            logAdminAction('delete_variant', { variantId, productTitle });
            
            db.collection('products').doc(variantId).delete()
                .then(() => {
                    showAdminMessage('Weight variant deleted successfully!', 'success');
                    // Reload the weight variants in the modal
                    loadWeightVariants(productTitle);
                    // Reload the main products list
                    loadProducts();
                })
                .catch(error => {
                    console.error('Error deleting variant:', error);
                    showAdminMessage('Error deleting variant. Please try again.', 'error');
                });
        }
    };

    window.closeEditProductModal = function() {
        editProductModal.classList.remove('active');
    }

    // Add function to delete entire product group
    window.deleteProductGroup = function(productTitle) {
        if (confirm(`Are you sure you want to delete ALL variants of "${productTitle}"? This cannot be undone.`)) {
            console.log('Delete product group clicked:', productTitle);
            
            // Log admin action
            logAdminAction('delete_product_group', { productTitle });
            
            // Get all variants of this product
            db.collection('products').where('title', '==', productTitle).get()
                .then((snapshot) => {
                    if (snapshot.empty) {
                        showAdminMessage('No variants found to delete.', 'error');
                        return;
                    }
                    
                    // Delete all variants
                    const batch = db.batch();
                    snapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    
                    return batch.commit();
                })
                .then(() => {
                    showAdminMessage(`All variants of "${productTitle}" deleted successfully!`, 'success');
                    loadProducts(); // Reload products list
                })
                .catch(error => {
                    console.error('Error deleting product group:', error);
                    showAdminMessage('Error deleting product group. Please try again.', 'error');
                });
        }
    }

    // Helper function to show admin messages
    function showAdminMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.admin-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `admin-message ${type}`;
        messageDiv.textContent = message;
        
        // Insert after the admin panel heading
        const adminPanel = document.querySelector('.admin-panel h2');
        adminPanel.parentNode.insertBefore(messageDiv, adminPanel.nextSibling);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Function to log admin actions to Firebase
    function logAdminAction(action, details = {}) {
        if (!currentUser || !currentUser.id) return;

        const logEntry = {
            adminId: currentUser.id,
            adminUsername: currentUser.username,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            ipAddress: 'N/A' // Would need server-side implementation for real IP
        };

        db.collection('admin_logs').add(logEntry)
            .catch(error => {
                console.error('Error logging admin action:', error);
            });
    }

    // Handle edit product form submission
    editProductForm.addEventListener('submit', e => {
        e.preventDefault();
        
        const docId = document.querySelector('#edit-product-index').value;
        
        // Create updated product object
        const updatedProduct = {
            title: document.querySelector('#edit-product-title').value,
            weight: parseFloat(document.querySelector('#edit-product-weight').value),
            price: parseFloat(document.querySelector('#edit-product-price').value),
            category: document.querySelector('#edit-product-category').value,
            quantity: parseInt(document.querySelector('#edit-product-quantity').value),
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.id
        };
        
        // Log admin action
        logAdminAction('edit_product', { productId: docId, updatedFields: Object.keys(updatedProduct) });
        
        // Check if new image was uploaded
        const imageInput = document.querySelector('#edit-product-image');
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const reader = new FileReader();
            
            reader.onload = () => {
                updatedProduct.image = reader.result;
                
                // Update product in Firestore
                db.collection('products').doc(docId).update(updatedProduct)
                    .then(() => {
                        closeEditProductModal();
                        showAdminMessage('Product variant updated successfully!', 'success');
                        loadProducts(); // Reload products list
                    })
                    .catch(error => {
                        console.error('Error updating product:', error);
                        showAdminMessage('Error updating product. Please try again.', 'error');
                    });
            };
            
            reader.readAsDataURL(file);
        } else {
            // Don't update the image field if no new image was uploaded
            db.collection('products').doc(docId).update(updatedProduct)
                .then(() => {
                    closeEditProductModal();
                    showAdminMessage('Product variant updated successfully!', 'success');
                    loadProducts(); // Reload products list
                })
                .catch(error => {
                    console.error('Error updating product:', error);
                    showAdminMessage('Error updating product. Please try again.', 'error');
                });
        }
    });

    // Image preview for edit product form
    document.querySelector('#edit-product-image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.querySelector('#edit-product-image-preview').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    productForm.addEventListener('submit', e => {
        e.preventDefault();
        console.log('Product form submitted');
        const title = document.querySelector('#product-title').value;
        const weight = parseFloat(document.querySelector('#product-weight').value);
        const price = parseFloat(document.querySelector('#product-price').value);
        const category = document.querySelector('#product-category').value;
        const quantity = parseInt(document.querySelector('#product-quantity').value);
        const imageInput = document.querySelector('#product-image');

        if (!title || isNaN(weight) || isNaN(price) || isNaN(quantity) || !imageInput.files.length) {
            showAdminMessage('Please fill in all fields correctly and select an image.', 'error');
            return;
        }

        const file = imageInput.files[0];
        if (!file.type.startsWith('image/')) {
            showAdminMessage('Please upload an image file.', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showAdminMessage('Image size must be less than 5MB.', 'error');
            return;
        }

        // Check if variant with same title and weight exists
        db.collection('products')
            .where('title', '==', title.trim())
            .where('weight', '==', weight)
            .get()
            .then((snapshot) => {
                if (!snapshot.empty) {
                    showAdminMessage(`A variant with weight ${weight}kg already exists for "${title}".`, 'error');
                    return Promise.reject('Duplicate variant');
                }
                
                // Create new product variant
                const reader = new FileReader();
                return new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject('Error reading file');
                    reader.readAsDataURL(file);
                });
            })
            .then((imageBase64) => {
                const newProduct = { 
                    title: title.trim(), 
                    weight: weight,
                    price: price, 
                    image: imageBase64, 
                    category: category, 
                    quantity: quantity,
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser.id
                };
                
                // Log admin action
                logAdminAction('add_product', { productTitle: title, weight: weight });
                
                return db.collection('products').add(newProduct);
            })
            .then(() => {
                productForm.reset();
                showAdminMessage('Product variant added successfully!', 'success');
                loadProducts(); // Reload products list
            })
            .catch(error => {
                if (error === 'Duplicate variant') return; // Already handled
                if (error === 'Error reading file') {
                    showAdminMessage('Error reading the image file.', 'error');
                    return;
                }
                console.error('Error adding product:', error);
                showAdminMessage('Error adding product. Please try again.', 'error');
            });
    });

    // COURSE MANAGEMENT (updated with Firebase auth tracking)
    const courseForm = document.querySelector('#course-form');
    const coursesList = document.querySelector('#courses-list');
    const editCourseModal = document.querySelector('#edit-course-modal');
    const editCourseForm = document.querySelector('#edit-course-form');
    const courseImage = document.querySelector('#course-image');

    // Image preview for main course form
    courseImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log('Image selected:', file.name);
            };
            reader.readAsDataURL(file);
        }
    });

    // Updated loadCourses function for horizontal layout in admin-firebase.js

// Replace the loadCourses function in your admin-firebase.js file with this updated version:

function loadCourses() {
    console.log('Loading admin courses from Firestore');
    
    // Clear the courses list first
    coursesList.innerHTML = '<p>Loading courses...</p>';
    
    // Get courses from Firestore
    db.collection('courses').get()
        .then((snapshot) => {
            if (snapshot.empty) {
                coursesList.innerHTML = '<p>No courses added yet. Add your first course using the form above.</p>';
                return;
            }
            
            let coursesHTML = '';
            snapshot.forEach(doc => {
                const course = doc.data();
                
                coursesHTML += `
                    <div class="tip-box">
                        <!-- Course Header Section -->
                        <div class="course-header">
                            <img src="${course.image}" alt="${course.title}">
                            <div class="course-info">
                                <h3>${course.title}</h3>
                                <div class="course-tags">
                                    <span class="tip-category">${getCourseCategoryText(course.category)}</span>
                                    <span class="course-level">${course.level.charAt(0).toUpperCase() + course.level.slice(1)} Level</span>
                                </div>
                                <div class="course-details">
                                    <span class="course-price">R${course.price}</span>
                                    <span class="course-duration">${course.duration}h duration</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Course Description Section -->
                        <div class="tip-description">
                            <strong>Course Description:</strong><br>
                            ${course.description}
                        </div>
                        
                        <!-- Course Actions Section -->
                        <div class="course-actions">
                            <button class="edit-tip" onclick="openEditCourseModal('${doc.id}')">
                                <i class="fas fa-edit"></i> Edit Course
                            </button>
                            <button class="delete-tip" onclick="deleteCourse('${doc.id}')">
                                <i class="fas fa-trash"></i> Delete Course
                            </button>
                        </div>
                    </div>
                `;
            });
            
            coursesList.innerHTML = coursesHTML;
        })
        .catch(error => {
            console.error('Error getting courses:', error);
            coursesList.innerHTML = '<p>Error loading courses. Please try again.</p>';
        });
}

// Also update the getCourseCategoryText function if it doesn't exist:
function getCourseCategoryText(category) {
    if (!category) return 'General Course';
    
    // Convert kebab-case to Title Case
    return category.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

    function getCourseCategoryText(category) {
        if (!category) return 'General Course';
        
        // Convert kebab-case to Title Case
        return category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Make functions global for onclick handlers
    window.openEditCourseModal = function(docId) {
        db.collection('courses').doc(docId).get()
            .then((doc) => {
                if (!doc.exists) {
                    showAdminMessage('Course not found.', 'error');
                    return;
                }

                const course = doc.data();
                console.log('Opening edit modal for course:', course.title);

                // Show modal
                editCourseModal.classList.add('active');
                
                // Fill form with current values
                document.querySelector('#edit-course-index').value = docId;
                document.querySelector('#edit-course-title').value = course.title;
                document.querySelector('#edit-course-description').value = course.description;
                document.querySelector('#edit-course-price').value = course.price;
                document.querySelector('#edit-course-duration').value = course.duration;
                document.querySelector('#edit-course-level').value = course.level || '';
                document.querySelector('#edit-course-category').value = course.category || '';
                document.querySelector('#edit-course-image-preview').src = course.image;
            })
            .catch(error => {
                console.error('Error fetching course:', error);
                showAdminMessage('Error loading course details. Please try again.', 'error');
            });
    }

    window.closeEditCourseModal = function() {
        editCourseModal.classList.remove('active');
    }

    window.deleteCourse = function(docId) {
        if (confirm('Are you sure you want to delete this course?')) {
            console.log('Delete course clicked:', docId);
            
            // Log admin action
            logAdminAction('delete_course', { courseId: docId });
            
            db.collection('courses').doc(docId).delete()
                .then(() => {
                    showAdminMessage('Course deleted successfully!', 'success');
                    loadCourses(); // Reload courses list
                })
                .catch(error => {
                    console.error('Error deleting course:', error);
                    showAdminMessage('Error deleting course. Please try again.', 'error');
                });
        }
    }

    // Close course modal button
    const closeCourseModalBtn = document.querySelector('#edit-course-modal .cancel-btn');
    if (closeCourseModalBtn) {
        closeCourseModalBtn.addEventListener('click', closeEditCourseModal);
    }

    // Handle edit course form submission
    editCourseForm.addEventListener('submit', e => {
        e.preventDefault();
        
        const docId = document.querySelector('#edit-course-index').value;
        
        // Create updated course object
        const updatedCourse = {
            title: document.querySelector('#edit-course-title').value,
            description: document.querySelector('#edit-course-description').value,
            price: parseFloat(document.querySelector('#edit-course-price').value),
            duration: parseFloat(document.querySelector('#edit-course-duration').value),
            level: document.querySelector('#edit-course-level').value,
            category: document.querySelector('#edit-course-category').value,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.id
        };
        
        // Log admin action
        logAdminAction('edit_course', { courseId: docId, updatedFields: Object.keys(updatedCourse) });
        
        // Check if new image was uploaded
        const imageInput = document.querySelector('#edit-course-image');
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const reader = new FileReader();
            
            reader.onload = () => {
                updatedCourse.image = reader.result;
                
                // Update course in Firestore
                db.collection('courses').doc(docId).update(updatedCourse)
                    .then(() => {
                        closeEditCourseModal();
                        showAdminMessage('Course updated successfully!', 'success');
                        loadCourses(); // Reload courses list
                    })
                    .catch(error => {
                        console.error('Error updating course:', error);
                        showAdminMessage('Error updating course. Please try again.', 'error');
                    });
            };
            
            reader.readAsDataURL(file);
        } else {
            // Don't update the image field if no new image was uploaded
            db.collection('courses').doc(docId).update(updatedCourse)
                .then(() => {
                    closeEditCourseModal();
                    showAdminMessage('Course updated successfully!', 'success');
                    loadCourses(); // Reload courses list
                })
                .catch(error => {
                    console.error('Error updating course:', error);
                    showAdminMessage('Error updating course. Please try again.', 'error');
                });
        }
    });

    // Image preview for edit course form
    document.querySelector('#edit-course-image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.querySelector('#edit-course-image-preview').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    courseForm.addEventListener('submit', e => {
        e.preventDefault();
        console.log('Course form submitted');
        const title = document.querySelector('#course-title').value;
        const description = document.querySelector('#course-description').value;
        const price = parseFloat(document.querySelector('#course-price').value);
        const duration = parseFloat(document.querySelector('#course-duration').value);
        const level = document.querySelector('#course-level').value;
        const category = document.querySelector('#course-category').value;
        const imageInput = document.querySelector('#course-image');

        // Enhanced validation
        if (!title || !description || !category || !level || isNaN(price) || isNaN(duration) || !imageInput.files.length) {
            showAdminMessage('Please fill in all fields correctly and select an image.', 'error');
            return;
        }

        if (title.length < 3) {
            showAdminMessage('Title must be at least 3 characters long.', 'error');
            return;
        }

        if (description.length < 20) {
            showAdminMessage('Description should be more detailed (at least 20 characters).', 'error');
            return;
        }

        const file = imageInput.files[0];
        if (!file.type.startsWith('image/')) {
            showAdminMessage('Please upload an image file.', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showAdminMessage('Image size must be less than 5MB.', 'error');
            return;
        }

        // Check if course with same title exists
        db.collection('courses').where('title', '==', title).get()
            .then((snapshot) => {
                if (!snapshot.empty) {
                    showAdminMessage('Course with this title already exists.', 'error');
                    return Promise.reject('Duplicate title');
                }
                
                // Continue with adding the course
                const reader = new FileReader();
                return new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject('Error reading file');
                    reader.readAsDataURL(file);
                });
            })
            .then((imageBase64) => {
                // Create new course in Firestore with proper formatting
                const newCourse = { 
                    title: title.trim(), 
                    description: description.trim(), 
                    image: imageBase64, 
                    price: price,
                    duration: duration,
                    level: level.trim(),
                    category: category.trim(),
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser.id
                };
                
                // Log admin action
                logAdminAction('add_course', { courseTitle: title, category: category });
                
                return db.collection('courses').add(newCourse);
            })
            .then(() => {
                courseForm.reset();
                showAdminMessage('Course added successfully!', 'success');
                loadCourses(); // Reload courses list
            })
            .catch(error => {
                if (error === 'Duplicate title') return; // Already handled
                if (error === 'Error reading file') {
                    showAdminMessage('Error reading the image file.', 'error');
                    return;
                }
                console.error('Error adding course:', error);
                showAdminMessage('Error adding course. Please try again.', 'error');
            });
    });

    // Load data when the page loads
    loadProducts();
    loadCourses();
});