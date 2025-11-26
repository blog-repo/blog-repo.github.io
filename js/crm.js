class CRMManager {
    constructor() {
        this.db = firebase.database();
        this.customers = [];
        this.sales = [];
        this.credits = [];
    }

    async init() {
        await this.loadCustomers();
        await this.loadSales();
        await this.loadCreditSales();
        this.setupEventListeners();
        this.updateCustomerAnalytics();
    }

    async loadCustomers() {
        try {
            this.customers = await dbManager.getAll('customers', 'name');
            this.renderCustomersTable();
            this.updateCustomerSelect();
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    async loadSales() {
        try {
            this.sales = await dbManager.getAll('sales', 'date');
        } catch (error) {
            console.error('Error loading sales:', error);
        }
    }

    async loadCreditSales() {
        try {
            this.credits = await dbManager.getAll('credit_sales', 'date');
        } catch (error) {
            console.error('Error loading credit sales:', error);
        }
    }

    renderCustomersTable() {
        const tbody = document.getElementById('customersTable');
        if (!tbody) return;

        if (this.customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No customers found</td></tr>';
            return;
        }

        tbody.innerHTML = this.customers.map(customer => {
            const customerSales = this.sales.filter(sale => sale.customerId === customer.id);
            const customerCredits = this.credits.filter(credit => credit.customerId === customer.id);
            
            const totalPurchase = customerSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalDue = customerCredits
                .filter(credit => credit.status === 'pending')
                .reduce((sum, credit) => sum + credit.dueAmount, 0);
            
            const lastSale = customerSales.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            const lastVisit = lastSale ? lastSale.date : '-';

            return `
                <tr>
                    <td>
                        <div><strong>${customer.name}</strong></div>
                        <small class="text-muted">${customer.address || 'No address'}</small>
                    </td>
                    <td>
                        <div>${customer.mobile}</div>
                        ${customer.email ? `<small class="text-muted">${customer.email}</small>` : ''}
                    </td>
                    <td>${customer.email || '-'}</td>
                    <td>${Utils.formatCurrency(totalPurchase)}</td>
                    <td>
                        <span class="${totalDue > 0 ? 'text-danger' : 'text-success'}">
                            ${Utils.formatCurrency(totalDue)}
                        </span>
                    </td>
                    <td>${lastVisit !== '-' ? Utils.formatDate(lastVisit) : 'Never'}</td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-primary" onclick="crmManager.viewCustomerDetails('${customer.id}')">
                                View
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="crmManager.editCustomer('${customer.id}')">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="crmManager.deleteCustomer('${customer.id}')">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateCustomerSelect() {
        const select = document.getElementById('customerSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Select Customer</option>' +
            this.customers.map(customer => 
                `<option value="${customer.id}">${customer.name} (${customer.mobile})</option>`
            ).join('');
    }

    updateCustomerAnalytics() {
        const totalCustomers = this.customers.length;
        
        // Active customers (purchased in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeCustomers = this.customers.filter(customer => {
            const customerSales = this.sales.filter(sale => 
                sale.customerId === customer.id && 
                new Date(sale.date) >= thirtyDaysAgo
            );
            return customerSales.length > 0;
        }).length;

        // Total due amount
        const totalDue = this.credits
            .filter(credit => credit.status === 'pending')
            .reduce((sum, credit) => sum + credit.dueAmount, 0);

        // Average purchase per customer
        const totalPurchase = this.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const avgPurchase = totalCustomers > 0 ? totalPurchase / totalCustomers : 0;

        // Update UI
        this.updateAnalyticsElement('totalCustomers', totalCustomers);
        this.updateAnalyticsElement('activeCustomers', activeCustomers);
        this.updateAnalyticsElement('totalDue', totalDue);
        this.updateAnalyticsElement('avgPurchase', avgPurchase);
    }

    updateAnalyticsElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            if (elementId.includes('Due') || elementId.includes('Purchase')) {
                element.textContent = Utils.formatCurrency(value);
            } else {
                element.textContent = value.toLocaleString();
            }
        }
    }

    setupEventListeners() {
        const addCustomerBtn = document.getElementById('addCustomerBtn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => this.showAddCustomerModal());
        }

        const searchCustomer = document.getElementById('searchCustomer');
        if (searchCustomer) {
            searchCustomer.addEventListener('input', Utils.debounce(() => {
                this.filterCustomers();
            }, 300));
        }

        const sendSmsBtn = document.getElementById('sendSmsBtn');
        if (sendSmsBtn) {
            sendSmsBtn.addEventListener('click', () => this.sendBulkSMS());
        }
    }

    filterCustomers() {
        const searchTerm = document.getElementById('searchCustomer').value.toLowerCase();
        
        const filteredCustomers = this.customers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.mobile.includes(searchTerm) ||
            (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
            (customer.address && customer.address.toLowerCase().includes(searchTerm))
        );

        this.renderFilteredCustomers(filteredCustomers);
    }

    renderFilteredCustomers(customers) {
        const tbody = document.getElementById('customersTable');
        if (!tbody) return;

        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No customers match your search</td></tr>';
            return;
        }

        tbody.innerHTML = customers.map(customer => {
            const customerSales = this.sales.filter(sale => sale.customerId === customer.id);
            const customerCredits = this.credits.filter(credit => credit.customerId === customer.id);
            
            const totalPurchase = customerSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalDue = customerCredits
                .filter(credit => credit.status === 'pending')
                .reduce((sum, credit) => sum + credit.dueAmount, 0);
            
            const lastSale = customerSales.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            const lastVisit = lastSale ? lastSale.date : '-';

            return `
                <tr>
                    <td>
                        <div><strong>${customer.name}</strong></div>
                        <small class="text-muted">${customer.address || 'No address'}</small>
                    </td>
                    <td>
                        <div>${customer.mobile}</div>
                        ${customer.email ? `<small class="text-muted">${customer.email}</small>` : ''}
                    </td>
                    <td>${customer.email || '-'}</td>
                    <td>${Utils.formatCurrency(totalPurchase)}</td>
                    <td>
                        <span class="${totalDue > 0 ? 'text-danger' : 'text-success'}">
                            ${Utils.formatCurrency(totalDue)}
                        </span>
                    </td>
                    <td>${lastVisit !== '-' ? Utils.formatDate(lastVisit) : 'Never'}</td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-primary" onclick="crmManager.viewCustomerDetails('${customer.id}')">
                                View
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="crmManager.editCustomer('${customer.id}')">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="crmManager.deleteCustomer('${customer.id}')">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showAddCustomerModal(customer = null) {
        const isEdit = !!customer;
        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${isEdit ? 'Edit' : 'Add'} Customer</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <form id="customerForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Full Name *</label>
                                <input type="text" class="form-control" name="name" 
                                    value="${customer?.name || ''}" required 
                                    placeholder="Enter customer full name">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Mobile Number *</label>
                                <input type="tel" class="form-control" name="mobile" 
                                    value="${customer?.mobile || ''}" required 
                                    placeholder="01XXXXXXXXX" pattern="[0-9]{11}">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Email Address</label>
                                <input type="email" class="form-control" name="email" 
                                    value="${customer?.email || ''}" 
                                    placeholder="customer@example.com">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Date of Birth</label>
                                <input type="date" class="form-control" name="dateOfBirth" 
                                    value="${customer?.dateOfBirth || ''}">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Address</label>
                            <textarea class="form-control" name="address" rows="3"
                                placeholder="Enter full address">${customer?.address || ''}</textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Gender</label>
                                <select class="form-control" name="gender">
                                    <option value="">Select Gender</option>
                                    <option value="male" ${customer?.gender === 'male' ? 'selected' : ''}>Male</option>
                                    <option value="female" ${customer?.gender === 'female' ? 'selected' : ''}>Female</option>
                                    <option value="other" ${customer?.gender === 'other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Blood Group</label>
                                <select class="form-control" name="bloodGroup">
                                    <option value="">Select Blood Group</option>
                                    <option value="A+" ${customer?.bloodGroup === 'A+' ? 'selected' : ''}>A+</option>
                                    <option value="A-" ${customer?.bloodGroup === 'A-' ? 'selected' : ''}>A-</option>
                                    <option value="B+" ${customer?.bloodGroup === 'B+' ? 'selected' : ''}>B+</option>
                                    <option value="B-" ${customer?.bloodGroup === 'B-' ? 'selected' : ''}>B-</option>
                                    <option value="AB+" ${customer?.bloodGroup === 'AB+' ? 'selected' : ''}>AB+</option>
                                    <option value="AB-" ${customer?.bloodGroup === 'AB-' ? 'selected' : ''}>AB-</option>
                                    <option value="O+" ${customer?.bloodGroup === 'O+' ? 'selected' : ''}>O+</option>
                                    <option value="O-" ${customer?.bloodGroup === 'O-' ? 'selected' : ''}>O-</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Medical History / Notes</label>
                            <textarea class="form-control" name="medicalHistory" rows="3"
                                placeholder="Any medical conditions or important notes...">${customer?.medicalHistory || ''}</textarea>
                        </div>

                        <div class="d-flex justify-between mt-2">
                            <button type="button" class="btn btn-secondary" 
                                onclick="Utils.closeModal(this.closest('.modal'))">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                ${isEdit ? 'Update' : 'Save'} Customer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const modal = Utils.showModal(modalHtml);
        
        const form = modal.querySelector('#customerForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveCustomer(form, customer?.id);
            Utils.closeModal(modal);
        });
    }

    async saveCustomer(form, customerId = null) {
        const formData = new FormData(form);
        const customerData = {
            name: formData.get('name'),
            mobile: formData.get('mobile'),
            email: formData.get('email'),
            dateOfBirth: formData.get('dateOfBirth'),
            address: formData.get('address'),
            gender: formData.get('gender'),
            bloodGroup: formData.get('bloodGroup'),
            medicalHistory: formData.get('medicalHistory')
        };

        // Check if mobile number already exists (for new customers)
        if (!customerId) {
            const existingCustomer = this.customers.find(c => c.mobile === customerData.mobile);
            if (existingCustomer) {
                Utils.showNotification('Customer with this mobile number already exists!', 'error');
                return;
            }
        }

        try {
            if (customerId) {
                await dbManager.update('customers', customerId, customerData);
                Utils.showNotification('Customer updated successfully!', 'success');
            } else {
                await dbManager.add('customers', customerData);
                Utils.showNotification('Customer added successfully!', 'success');
            }
            
            await this.loadCustomers();
            this.updateCustomerAnalytics();
        } catch (error) {
            console.error('Error saving customer:', error);
            Utils.showNotification('Error saving customer', 'error');
        }
    }

    async editCustomer(customerId) {
        try {
            const customer = await dbManager.get('customers', customerId);
            if (customer) {
                this.showAddCustomerModal(customer);
            }
        } catch (error) {
            console.error('Error loading customer:', error);
            Utils.showNotification('Error loading customer', 'error');
        }
    }

    async deleteCustomer(customerId) {
        if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
            return;
        }

        // Check if customer has any sales or credit records
        const customerSales = this.sales.filter(sale => sale.customerId === customerId);
        const customerCredits = this.credits.filter(credit => credit.customerId === customerId);

        if (customerSales.length > 0 || customerCredits.length > 0) {
            Utils.showNotification('Cannot delete customer with existing sales or credit records!', 'error');
            return;
        }

        try {
            await dbManager.delete('customers', customerId);
            Utils.showNotification('Customer deleted successfully!', 'success');
            await this.loadCustomers();
            this.updateCustomerAnalytics();
        } catch (error) {
            console.error('Error deleting customer:', error);
            Utils.showNotification('Error deleting customer', 'error');
        }
    }

    async viewCustomerDetails(customerId) {
        try {
            const customer = await dbManager.get('customers', customerId);
            const customerSales = this.sales.filter(sale => sale.customerId === customerId);
            const customerCredits = this.credits.filter(credit => credit.customerId === customerId);
            const pendingCredits = customerCredits.filter(credit => credit.status === 'pending');

            const totalPurchase = customerSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalProfit = customerSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
            const totalDue = pendingCredits.reduce((sum, credit) => sum + credit.dueAmount, 0);

            const modalHtml = `
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h5 class="modal-title">Customer Details - ${customer.name}</h5>
                        <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h6>Personal Information</h6>
                                    </div>
                                    <div class="card-body">
                                        <table class="table table-borderless">
                                            <tr>
                                                <td><strong>Mobile:</strong></td>
                                                <td>${customer.mobile}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Email:</strong></td>
                                                <td>${customer.email || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Address:</strong></td>
                                                <td>${customer.address || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Gender:</strong></td>
                                                <td>${customer.gender ? customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1) : '-'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Blood Group:</strong></td>
                                                <td>${customer.bloodGroup || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Date of Birth:</strong></td>
                                                <td>${customer.dateOfBirth ? Utils.formatDate(customer.dateOfBirth) : '-'}</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header">
                                        <h6>Business Summary</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="stats-grid">
                                            <div class="stat-card">
                                                <div class="stat-label">Total Purchase</div>
                                                <div class="stat-value">${Utils.formatCurrency(totalPurchase)}</div>
                                            </div>
                                            <div class="stat-card">
                                                <div class="stat-label">Total Profit</div>
                                                <div class="stat-value">${Utils.formatCurrency(totalProfit)}</div>
                                            </div>
                                            <div class="stat-card">
                                                <div class="stat-label">Due Amount</div>
                                                <div class="stat-value ${totalDue > 0 ? 'text-danger' : 'text-success'}">
                                                    ${Utils.formatCurrency(totalDue)}
                                                </div>
                                            </div>
                                            <div class="stat-card">
                                                <div class="stat-label">Total Visits</div>
                                                <div class="stat-value">${customerSales.length}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card mt-3">
                            <div class="card-header">
                                <h6>Medical History & Notes</h6>
                            </div>
                            <div class="card-body">
                                <p>${customer.medicalHistory || 'No medical history or notes available.'}</p>
                            </div>
                        </div>

                        <div class="card mt-3">
                            <div class="card-header d-flex justify-between align-center">
                                <h6>Recent Transactions</h6>
                                <span class="badge bg-primary">${customerSales.length} transactions</span>
                            </div>
                            <div class="card-body">
                                ${customerSales.length > 0 ? `
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Profit</th>
                                                    <th>Payment</th>
                                                    <th>Items</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${customerSales.slice(0, 10).map(sale => `
                                                    <tr>
                                                        <td>${Utils.formatDate(sale.date)}</td>
                                                        <td>${Utils.formatCurrency(sale.totalAmount)}</td>
                                                        <td class="${sale.profit >= 0 ? 'text-success' : 'text-danger'}">
                                                            ${Utils.formatCurrency(sale.profit)}
                                                        </td>
                                                        <td>
                                                            <span class="badge ${sale.paymentMethod === 'credit' ? 'bg-warning' : 'bg-success'}">
                                                                ${sale.paymentMethod}
                                                            </span>
                                                        </td>
                                                        <td>${sale.items.length} items</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                ` : '<p class="text-center text-muted">No transactions found</p>'}
                            </div>
                        </div>

                        ${pendingCredits.length > 0 ? `
                            <div class="card mt-3">
                                <div class="card-header">
                                    <h6 class="text-danger">Pending Credit Payments</h6>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Total Amount</th>
                                                    <th>Paid</th>
                                                    <th>Due</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${pendingCredits.map(credit => `
                                                    <tr>
                                                        <td>${Utils.formatDate(credit.date)}</td>
                                                        <td>${Utils.formatCurrency(credit.totalAmount)}</td>
                                                        <td>${Utils.formatCurrency(credit.paidAmount)}</td>
                                                        <td class="text-danger">${Utils.formatCurrency(credit.dueAmount)}</td>
                                                        <td>
                                                            <button class="btn btn-sm btn-success" 
                                                                onclick="crmManager.markCreditPaid('${credit.id}')">
                                                                Mark Paid
                                                            </button>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            Utils.showModal(modalHtml);
        } catch (error) {
            console.error('Error loading customer details:', error);
            Utils.showNotification('Error loading customer details', 'error');
        }
    }

    async markCreditPaid(creditId) {
        try {
            const credit = await dbManager.get('credit_sales', creditId);
            if (credit) {
                await dbManager.update('credit_sales', creditId, {
                    status: 'paid',
                    paidAmount: credit.totalAmount,
                    dueAmount: 0,
                    paymentDate: new Date().toISOString()
                });
                
                Utils.showNotification('Credit marked as paid successfully!', 'success');
                
                // Reload data
                await this.loadCreditSales();
                this.updateCustomerAnalytics();
                
                // Close modal and refresh
                Utils.closeModal(document.querySelector('.modal'));
            }
        } catch (error) {
            console.error('Error marking credit as paid:', error);
            Utils.showNotification('Error updating credit status', 'error');
        }
    }

    async sendBulkSMS() {
        const message = document.getElementById('smsMessage').value;
        const customerGroup = document.getElementById('smsCustomerGroup').value;

        if (!message.trim()) {
            Utils.showNotification('Please enter a message', 'warning');
            return;
        }

        let targetCustomers = [];

        switch (customerGroup) {
            case 'all':
                targetCustomers = this.customers;
                break;
            case 'due':
                targetCustomers = this.customers.filter(customer => {
                    const customerCredits = this.credits.filter(credit => 
                        credit.customerId === customer.id && credit.status === 'pending'
                    );
                    return customerCredits.length > 0;
                });
                break;
            case 'recent':
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                targetCustomers = this.customers.filter(customer => {
                    const recentSales = this.sales.filter(sale => 
                        sale.customerId === customer.id && new Date(sale.date) >= thirtyDaysAgo
                    );
                    return recentSales.length > 0;
                });
                break;
        }

        if (targetCustomers.length === 0) {
            Utils.showNotification('No customers found for selected group', 'warning');
            return;
        }

        // Simulate SMS sending (in real implementation, integrate with SMS gateway API)
        const mobileNumbers = targetCustomers.map(customer => customer.mobile).join(', ');
        
        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Bulk SMS Preview</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info">
                        <strong>Note:</strong> This is a preview. In production, this would integrate with an SMS gateway API.
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Message:</label>
                        <div class="form-control" style="min-height: 100px; background: #f8f9fa;">${message}</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Recipients (${targetCustomers.length} customers):</label>
                        <div class="form-control" style="min-height: 80px; background: #f8f9fa;">
                            ${targetCustomers.map(c => `${c.name} - ${c.mobile}`).join('<br>')}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Total SMS Cost (Approx.):</label>
                        <div class="form-control">৳ ${(targetCustomers.length * 0.5).toFixed(2)}</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="Utils.closeModal(this.closest('.modal'))">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="crmManager.confirmSendSMS(${targetCustomers.length})">
                        Send SMS to ${targetCustomers.length} Customers
                    </button>
                </div>
            </div>
        `;

        Utils.showModal(modalHtml);
    }

    confirmSendSMS(customerCount) {
        // In real implementation, make API call to SMS gateway
        Utils.showNotification(`SMS sent successfully to ${customerCount} customers!`, 'success');
        Utils.closeModal(document.querySelector('.modal'));
        
        // Log SMS activity
        this.logSMSActivity(customerCount);
    }

    async logSMSActivity(customerCount) {
        try {
            await dbManager.add('sms_logs', {
                message: document.getElementById('smsMessage').value,
                customerCount: customerCount,
                sentAt: new Date().toISOString(),
                sentBy: authManager.getCurrentUser().uid
            });
        } catch (error) {
            console.error('Error logging SMS activity:', error);
        }
    }

    // Method to get customer purchase history
    getCustomerPurchaseHistory(customerId) {
        return this.sales
            .filter(sale => sale.customerId === customerId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Method to get customer lifetime value
    getCustomerLifetimeValue(customerId) {
        const customerSales = this.sales.filter(sale => sale.customerId === customerId);
        const totalPurchase = customerSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalProfit = customerSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
        
        return {
            totalPurchase,
            totalProfit,
            visitCount: customerSales.length,
            averagePurchase: customerSales.length > 0 ? totalPurchase / customerSales.length : 0
        };
    }

    // Export customers to CSV
    exportCustomersToCSV() {
        if (this.customers.length === 0) {
            Utils.showNotification('No customers to export', 'warning');
            return;
        }

        const headers = ['Name', 'Mobile', 'Email', 'Address', 'Gender', 'Blood Group', 'Date of Birth', 'Total Purchase', 'Due Amount'];
        const csvData = this.customers.map(customer => {
            const customerSales = this.sales.filter(sale => sale.customerId === customer.id);
            const customerCredits = this.credits.filter(credit => credit.customerId === customer.id);
            
            const totalPurchase = customerSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalDue = customerCredits
                .filter(credit => credit.status === 'pending')
                .reduce((sum, credit) => sum + credit.dueAmount, 0);

            return [
                customer.name,
                customer.mobile,
                customer.email || '',
                customer.address || '',
                customer.gender || '',
                customer.bloodGroup || '',
                customer.dateOfBirth || '',
                totalPurchase,
                totalDue
            ];
        });

        const csvContent = [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        Utils.showNotification('Customers exported successfully!', 'success');
    }
}

const crmManager = new CRMManager();