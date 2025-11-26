class PharmacyApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadNavigation();
        this.loadPage(this.currentPage);
        this.setupEventListeners();
    }

    checkAuth() {
        if (!authManager.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
    }

    loadNavigation() {
        const user = authManager.getCurrentUser();
        
        document.getElementById('app').innerHTML = `
            <nav class="navbar">
                <div class="nav-content">
                    <div class="nav-brand">
                        <h1>Arifin Pharmacy</h1>
                    </div>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span>${user.displayName || user.email}</span>
                        <button class="logout-btn" id="logoutBtn">Logout</button>
                    </div>
                </div>
            </nav>

            <aside class="sidebar">
                <ul class="sidebar-menu">
                    <li class="sidebar-item">
                        <button class="sidebar-link active" data-page="dashboard">
                            📊 Dashboard
                        </button>
                    </li>
                    <li class="sidebar-item">
                        <button class="sidebar-link" data-page="stock">
                            📦 Stock Management
                        </button>
                    </li>
                    <li class="sidebar-item">
                        <button class="sidebar-link" data-page="pos">
                            🛒 POS System
                        </button>
                    </li>
                    <li class="sidebar-item">
                        <button class="sidebar-link" data-page="crm">
                            👥 CRM
                        </button>
                    </li>
                    <li class="sidebar-item">
                        <button class="sidebar-link" data-page="expense">
                            💰 Expense Management
                        </button>
                    </li>
                    <li class="sidebar-item">
                        <button class="sidebar-link" data-page="calendar">
                            📅 Calendar
                        </button>
                    </li>
                    <li class="sidebar-item">
                        <button class="sidebar-link" data-page="notes">
                            📝 Notes
                        </button>
                    </li>
                </ul>
            </aside>

            <main class="main-content">
                <div id="content"></div>
            </main>
        `;
    }

    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sidebar-link')) {
                e.preventDefault();
                const page = e.target.closest('.sidebar-link').dataset.page;
                this.loadPage(page);
                
                // Update active state
                document.querySelectorAll('.sidebar-link').forEach(link => {
                    link.classList.remove('active');
                });
                e.target.closest('.sidebar-link').classList.add('active');
            }

            // Logout
            if (e.target.id === 'logoutBtn') {
                authManager.signOut();
            }
        });
    }

    async loadPage(page) {
        this.currentPage = page;
        
        try {
            // Load page content based on page name
            const content = this.getPageContent(page);
            document.getElementById('content').innerHTML = content;
            
            // Initialize page-specific functionality
            this.initializePage(page);
            
        } catch (error) {
            console.error('Error loading page:', error);
            document.getElementById('content').innerHTML = `
                <div class="page-header">
                    <h1 class="page-title">${page.charAt(0).toUpperCase() + page.slice(1)}</h1>
                </div>
                <div class="card">
                    <div class="card-body">
                        <p>Error loading page content. Please try again.</p>
                    </div>
                </div>
            `;
        }
    }

    getPageContent(page) {
        const pages = {
            dashboard: `
                <div class="page-header">
                    <h1 class="page-title">Dashboard</h1>
                    <div>
                        <span id="currentDateTime" class="text-muted"></span>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Today's Revenue</div>
                        <div class="stat-value" id="todayRevenue">৳ 0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Today's Profit</div>
                        <div class="stat-value" id="todayProfit">৳ 0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Total Assets</div>
                        <div class="stat-value" id="totalAssets">৳ 0</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Product Count</div>
                        <div class="stat-value" id="productCount">0</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        Monthly Profit vs Revenue
                        <div>
                            <input type="month" id="monthSelector" class="form-control" style="width: 200px;">
                        </div>
                    </div>
                    <div class="card-body">
                        <div id="monthlyChart" style="height: 300px; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 5px;">
                            <div style="text-align: center; color: #666;">
                                Monthly Chart<br>
                                <small>(Chart visualization will be implemented)</small>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        Daily Statistics
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label class="form-label">Select Date</label>
                            <input type="date" id="dateSelector" class="form-control">
                        </div>
                        <div id="dailyStats">
                            <div style="text-align: center; padding: 20px; color: #666;">
                                Select a date to view daily statistics
                            </div>
                        </div>
                    </div>
                </div>
            `,

            stock: `
                <div class="page-header">
                    <h1 class="page-title">Stock Management</h1>
                    <button class="btn btn-primary" id="addProductBtn">
                        ➕ Add Product
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        Product List
                        <div class="d-flex gap-1">
                            <input type="text" id="searchProduct" class="form-control" placeholder="Search products..." style="width: 250px;">
                            <select id="manufacturerFilter" class="form-control" style="width: 200px;">
                                <option value="">All Manufacturers</option>
                            </select>
                        </div>
                    </div>
                    <div class="card-body">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Manufacturer</th>
                                    <th>Stock</th>
                                    <th>Purchase Price</th>
                                    <th>MRP</th>
                                    <th>Expiry Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="productsTable">
                                <tr>
                                    <td colspan="7" class="text-center">Loading products...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        Low Stock Alert
                    </div>
                    <div class="card-body">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Manufacturer</th>
                                    <th>Current Stock</th>
                                    <th>Minimum Stock</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="lowStockTable">
                                <tr>
                                    <td colspan="5" class="text-center">No low stock items</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        Expiry Management
                        <div class="d-flex gap-1">
                            <select id="expiryFilter" class="form-control">
                                <option value="30">Next 30 Days</option>
                                <option value="60">Next 60 Days</option>
                                <option value="90">Next 90 Days</option>
                                <option value="custom">Custom Date Range</option>
                            </select>
                            <input type="date" id="customExpiryFrom" class="form-control" style="display: none;" placeholder="From">
                            <input type="date" id="customExpiryTo" class="form-control" style="display: none;" placeholder="To">
                        </div>
                    </div>
                    <div class="card-body">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Manufacturer</th>
                                    <th>Batch No</th>
                                    <th>Expiry Date</th>
                                    <th>Remaining Days</th>
                                    <th>Stock</th>
                                </tr>
                            </thead>
                            <tbody id="expiryTable">
                                <tr>
                                    <td colspan="6" class="text-center">No expiring products</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `,

            pos: `
                <div class="page-header">
                    <h1 class="page-title">POS System</h1>
                    <div class="d-flex gap-1">
                        <button class="btn btn-warning" id="clearCartBtn">Clear Cart</button>
                        <button class="btn btn-success" id="checkoutBtn">Checkout</button>
                    </div>
                </div>

                <div class="pos-container">
                    <div class="card">
                        <div class="card-header">
                            Products
                            <input type="text" id="posSearch" class="form-control" placeholder="Search products..." style="width: 300px;">
                        </div>
                        <div class="card-body">
                            <div class="products-grid" id="productsGrid">
                                <!-- Products will be loaded here -->
                            </div>
                        </div>
                    </div>

                    <div class="cart-container">
                        <div class="card-header">
                            Shopping Cart
                            <select id="customerSelect" class="form-control" style="width: 200px;">
                                <option value="">Anonymous Customer</option>
                            </select>
                        </div>
                        
                        <div class="cart-items" id="cartItems">
                            <div style="text-align: center; padding: 40px; color: #666;">
                                Cart is empty<br>
                                <small>Add products from the left</small>
                            </div>
                        </div>

                        <div class="cart-summary">
                            <div class="form-group">
                                <label class="form-label">Subtotal</label>
                                <div class="form-control" id="subtotal">৳ 0.00</div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Received Amount</label>
                                <input type="number" id="receivedAmount" class="form-control" placeholder="Enter received amount">
                            </div>

                            <div class="form-group">
                                <label class="form-label">Change</label>
                                <div class="form-control" id="changeAmount">৳ 0.00</div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Payment Method</label>
                                <select id="paymentMethod" class="form-control">
                                    <option value="cash">Cash</option>
                                    <option value="credit">Credit</option>
                                    <option value="card">Card</option>
                                </select>
                            </div>

                            <button class="btn btn-success btn-lg" id="processPaymentBtn" style="width: 100%;">
                                Process Payment
                            </button>
                        </div>
                    </div>
                </div>
            `,

            crm: `
                <div class="page-header">
                    <h1 class="page-title">Customer Relationship Management</h1>
                    <button class="btn btn-primary" id="addCustomerBtn">
                        ➕ Add Customer
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        Customer List
                        <input type="text" id="searchCustomer" class="form-control" placeholder="Search by mobile or name..." style="width: 300px;">
                    </div>
                    <div class="card-body">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Mobile</th>
                                    <th>Email</th>
                                    <th>Total Purchase</th>
                                    <th>Due Amount</th>
                                    <th>Last Visit</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="customersTable">
                                <tr>
                                    <td colspan="7" class="text-center">Loading customers...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        Customer Analytics
                    </div>
                    <div class="card-body">
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">Total Customers</div>
                                <div class="stat-value" id="totalCustomers">0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Active Customers</div>
                                <div class="stat-value" id="activeCustomers">0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Total Due</div>
                                <div class="stat-value" id="totalDue">৳ 0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Avg. Purchase</div>
                                <div class="stat-value" id="avgPurchase">৳ 0</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        Bulk SMS
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label class="form-label">Message</label>
                            <textarea id="smsMessage" class="form-control" rows="4" placeholder="Type your message here..."></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Select Customers</label>
                            <select id="smsCustomerGroup" class="form-control">
                                <option value="all">All Customers</option>
                                <option value="due">Customers with Due</option>
                                <option value="recent">Recent Customers (Last 30 days)</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" id="sendSmsBtn">Send Bulk SMS</button>
                    </div>
                </div>
            `,

            expense: `
                <div class="page-header">
                    <h1 class="page-title">Expense Management</h1>
                    <button class="btn btn-primary" id="addExpenseBtn">
                        ➕ Add Expense
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        Expense Records
                        <div class="d-flex gap-1">
                            <select id="expenseCategoryFilter" class="form-control">
                                <option value="">All Categories</option>
                            </select>
                            <input type="month" id="expenseMonthFilter" class="form-control">
                            <button class="btn btn-sm btn-primary" id="manageCategoriesBtn">Manage Categories</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="expensesTable">
                                <tr>
                                    <td colspan="5" class="text-center">Loading expenses...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        Expense Summary
                    </div>
                    <div class="card-body">
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">This Month</div>
                                <div class="stat-value" id="monthlyExpense">৳ 0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Today</div>
                                <div class="stat-value" id="dailyExpense">৳ 0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Last Month</div>
                                <div class="stat-value" id="lastMonthExpense">৳ 0</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">Avg. Daily</div>
                                <div class="stat-value" id="avgDailyExpense">৳ 0</div>
                            </div>
                        </div>
                    </div>
                </div>
            `,

            calendar: `
                <div class="page-header">
                    <h1 class="page-title">Calendar</h1>
                    <div class="d-flex gap-1">
                        <button class="btn btn-primary" id="prevMonthBtn">Previous</button>
                        <button class="btn btn-primary" id="nextMonthBtn">Next</button>
                        <button class="btn btn-secondary" id="currentMonthBtn">Current Month</button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 id="calendarMonthYear" style="margin: 0;"></h3>
                    </div>
                    <div class="card-body">
                        <div id="calendar" style="min-height: 500px;">
                            <!-- Calendar will be generated here -->
                        </div>
                    </div>
                </div>
            `,

            notes: `
                <div class="page-header">
                    <h1 class="page-title">Notes</h1>
                    <button class="btn btn-primary" id="addNoteBtn">
                        ➕ Add Note
                    </button>
                </div>

                <div class="card">
                    <div class="card-header">
                        My Notes
                        <input type="text" id="searchNotes" class="form-control" placeholder="Search notes..." style="width: 300px;">
                    </div>
                    <div class="card-body">
                        <div class="notes-grid" id="notesGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                            <!-- Notes will be loaded here -->
                        </div>
                    </div>
                </div>
            `
        };

        return pages[page] || `<div class="card"><div class="card-body">Page not found</div></div>`;
    }

    initializePage(page) {
        switch (page) {
            case 'dashboard':
                if (typeof dashboardManager === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'js/dashboard.js';
                    document.body.appendChild(script);
                } else {
                    dashboardManager.init();
                }
                break;
            case 'stock':
                if (typeof stockManager === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'js/stock.js';
                    document.body.appendChild(script);
                } else {
                    stockManager.init();
                }
                break;
            case 'pos':
                if (typeof posManager === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'js/pos.js';
                    document.body.appendChild(script);
                } else {
                    posManager.init();
                }
                break;
            case 'crm':
                if (typeof crmManager === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'js/crm.js';
                    document.body.appendChild(script);
                } else {
                    crmManager.init();
                }
                break;
            case 'expense':
                if (typeof expenseManager === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'js/expense.js';
                    document.body.appendChild(script);
                } else {
                    expenseManager.init();
                }
                break;
            case 'calendar':
                if (typeof calendarManager === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'js/calendar.js';
                    document.body.appendChild(script);
                } else {
                    calendarManager.init();
                }
                break;
            case 'notes':
                if (typeof notesManager === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'js/notes.js';
                    document.body.appendChild(script);
                } else {
                    notesManager.init();
                }
                break;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PharmacyApp();
});