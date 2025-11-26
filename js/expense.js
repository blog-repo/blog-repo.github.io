class ExpenseManager {
    constructor() {
        this.db = firebase.database();
        this.expenses = [];
        this.categories = [];
        this.currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    }

    async init() {
        await this.loadCategories();
        await this.loadExpenses();
        this.setupEventListeners();
        this.updateExpenseSummary();
    }

    async loadCategories() {
        try {
            this.categories = await dbManager.getAll('expense_categories', 'name');
            
            // If no categories exist, create default categories
            if (this.categories.length === 0) {
                await this.createDefaultCategories();
                this.categories = await dbManager.getAll('expense_categories', 'name');
            }
            
            this.updateCategoryFilter();
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async createDefaultCategories() {
        const defaultCategories = [
            { name: 'Rent', description: 'Shop rent and utilities' },
            { name: 'Salary', description: 'Staff salaries and wages' },
            { name: 'Utilities', description: 'Electricity, water, internet' },
            { name: 'Transportation', description: 'Delivery and transportation costs' },
            { name: 'Maintenance', description: 'Equipment and shop maintenance' },
            { name: 'Marketing', description: 'Advertising and promotions' },
            { name: 'Office Supplies', description: 'Stationery and office items' },
            { name: 'Other', description: 'Miscellaneous expenses' }
        ];

        for (const category of defaultCategories) {
            await dbManager.add('expense_categories', category);
        }
        
        Utils.showNotification('Default expense categories created', 'success');
    }

    async loadExpenses() {
        try {
            this.expenses = await dbManager.getAll('expenses', 'date');
            this.renderExpensesTable();
        } catch (error) {
            console.error('Error loading expenses:', error);
        }
    }

    renderExpensesTable() {
        const tbody = document.getElementById('expensesTable');
        if (!tbody) return;

        // Filter expenses based on current filters
        const filteredExpenses = this.getFilteredExpenses();

        if (filteredExpenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No expenses found</td></tr>';
            return;
        }

        tbody.innerHTML = filteredExpenses.map(expense => {
            const category = this.categories.find(cat => cat.id === expense.categoryId);
            return `
                <tr>
                    <td>${Utils.formatDate(expense.date)}</td>
                    <td>${category ? category.name : 'Uncategorized'}</td>
                    <td>${expense.description || '-'}</td>
                    <td>${Utils.formatCurrency(expense.amount)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="expenseManager.editExpense('${expense.id}')">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="expenseManager.deleteExpense('${expense.id}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getFilteredExpenses() {
        const categoryFilter = document.getElementById('expenseCategoryFilter');
        const monthFilter = document.getElementById('expenseMonthFilter');
        
        let filtered = this.expenses;

        // Filter by category
        if (categoryFilter && categoryFilter.value) {
            filtered = filtered.filter(expense => expense.categoryId === categoryFilter.value);
        }

        // Filter by month
        if (monthFilter && monthFilter.value) {
            filtered = filtered.filter(expense => {
                const expenseMonth = expense.date.slice(0, 7); // YYYY-MM
                return expenseMonth === monthFilter.value;
            });
        }

        return filtered;
    }

    updateCategoryFilter() {
        const filter = document.getElementById('expenseCategoryFilter');
        if (!filter) return;

        filter.innerHTML = '<option value="">All Categories</option>' +
            this.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }

    updateExpenseSummary() {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().toISOString().slice(0, 7);
        const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
            .toISOString().slice(0, 7);

        // Today's expenses
        const dailyExpense = this.expenses
            .filter(expense => expense.date === today)
            .reduce((sum, expense) => sum + expense.amount, 0);

        // Current month expenses
        const monthlyExpense = this.expenses
            .filter(expense => expense.date.slice(0, 7) === currentMonth)
            .reduce((sum, expense) => sum + expense.amount, 0);

        // Last month expenses
        const lastMonthExpense = this.expenses
            .filter(expense => expense.date.slice(0, 7) === lastMonth)
            .reduce((sum, expense) => sum + expense.amount, 0);

        // Average daily expense (current month)
        const currentMonthExpenses = this.expenses.filter(expense => 
            expense.date.slice(0, 7) === currentMonth
        );
        const avgDailyExpense = currentMonthExpenses.length > 0 ? 
            monthlyExpense / new Date().getDate() : 0;

        // Update UI
        this.updateSummaryElement('dailyExpense', dailyExpense);
        this.updateSummaryElement('monthlyExpense', monthlyExpense);
        this.updateSummaryElement('lastMonthExpense', lastMonthExpense);
        this.updateSummaryElement('avgDailyExpense', avgDailyExpense);
    }

    updateSummaryElement(elementId, amount) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = Utils.formatCurrency(amount);
        }
    }

    setupEventListeners() {
        const addExpenseBtn = document.getElementById('addExpenseBtn');
        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', () => this.showAddExpenseModal());
        }

        const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
        if (manageCategoriesBtn) {
            manageCategoriesBtn.addEventListener('click', () => this.showCategoryManager());
        }

        const categoryFilter = document.getElementById('expenseCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.renderExpensesTable();
                this.updateExpenseSummary();
            });
        }

        const monthFilter = document.getElementById('expenseMonthFilter');
        if (monthFilter) {
            const today = new Date();
            monthFilter.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            monthFilter.addEventListener('change', () => {
                this.renderExpensesTable();
                this.updateExpenseSummary();
            });
        }
    }

    showAddExpenseModal(expense = null) {
        const isEdit = !!expense;
        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${isEdit ? 'Edit' : 'Add'} Expense</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <form id="expenseForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Date *</label>
                                <input type="date" class="form-control" name="date" 
                                    value="${expense?.date || new Date().toISOString().split('T')[0]}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Category *</label>
                                <select class="form-control" name="categoryId" required>
                                    <option value="">Select Category</option>
                                    ${this.categories.map(cat => `
                                        <option value="${cat.id}" ${expense?.categoryId === cat.id ? 'selected' : ''}>
                                            ${cat.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Amount (৳) *</label>
                                <input type="number" class="form-control" name="amount" 
                                    step="0.01" min="0" value="${expense?.amount || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Payment Method</label>
                                <select class="form-control" name="paymentMethod">
                                    <option value="cash" ${expense?.paymentMethod === 'cash' ? 'selected' : ''}>Cash</option>
                                    <option value="bank" ${expense?.paymentMethod === 'bank' ? 'selected' : ''}>Bank Transfer</option>
                                    <option value="card" ${expense?.paymentMethod === 'card' ? 'selected' : ''}>Card</option>
                                    <option value="mobile" ${expense?.paymentMethod === 'mobile' ? 'selected' : ''}>Mobile Banking</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" name="description" rows="3" 
                                placeholder="Enter expense description...">${expense?.description || ''}</textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Receipt / Reference No.</label>
                            <input type="text" class="form-control" name="referenceNo" 
                                value="${expense?.referenceNo || ''}" placeholder="Optional receipt or reference number">
                        </div>

                        <div class="d-flex justify-between mt-2">
                            <button type="button" class="btn btn-secondary" 
                                onclick="Utils.closeModal(this.closest('.modal'))">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                ${isEdit ? 'Update' : 'Save'} Expense
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const modal = Utils.showModal(modalHtml);
        
        const form = modal.querySelector('#expenseForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveExpense(form, expense?.id);
            Utils.closeModal(modal);
        });
    }

    async saveExpense(form, expenseId = null) {
        const formData = new FormData(form);
        const expenseData = {
            date: formData.get('date'),
            categoryId: formData.get('categoryId'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description'),
            paymentMethod: formData.get('paymentMethod'),
            referenceNo: formData.get('referenceNo')
        };

        try {
            if (expenseId) {
                await dbManager.update('expenses', expenseId, expenseData);
                Utils.showNotification('Expense updated successfully!', 'success');
            } else {
                await dbManager.add('expenses', expenseData);
                Utils.showNotification('Expense added successfully!', 'success');
            }
            
            await this.loadExpenses();
            this.updateExpenseSummary();
        } catch (error) {
            console.error('Error saving expense:', error);
            Utils.showNotification('Error saving expense', 'error');
        }
    }

    async editExpense(expenseId) {
        try {
            const expense = await dbManager.get('expenses', expenseId);
            if (expense) {
                this.showAddExpenseModal(expense);
            }
        } catch (error) {
            console.error('Error loading expense:', error);
            Utils.showNotification('Error loading expense', 'error');
        }
    }

    async deleteExpense(expenseId) {
        if (!confirm('Are you sure you want to delete this expense?')) {
            return;
        }

        try {
            await dbManager.delete('expenses', expenseId);
            Utils.showNotification('Expense deleted successfully!', 'success');
            await this.loadExpenses();
            this.updateExpenseSummary();
        } catch (error) {
            console.error('Error deleting expense:', error);
            Utils.showNotification('Error deleting expense', 'error');
        }
    }

    showCategoryManager() {
        const modalHtml = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h5 class="modal-title">Manage Expense Categories</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <div class="d-flex justify-between align-center mb-3">
                        <h6>Current Categories</h6>
                        <button class="btn btn-sm btn-primary" onclick="expenseManager.showAddCategoryModal()">
                            ➕ Add Category
                        </button>
                    </div>
                    
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Category Name</th>
                                    <th>Description</th>
                                    <th>Total Expenses</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="categoriesTableBody">
                                ${this.categories.map(category => {
                                    const categoryExpenses = this.expenses.filter(exp => exp.categoryId === category.id);
                                    const totalAmount = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                                    
                                    return `
                                        <tr>
                                            <td>${category.name}</td>
                                            <td>${category.description || '-'}</td>
                                            <td>${Utils.formatCurrency(totalAmount)}</td>
                                            <td>
                                                <button class="btn btn-sm btn-primary" 
                                                    onclick="expenseManager.showEditCategoryModal('${category.id}')">
                                                    Edit
                                                </button>
                                                ${categoryExpenses.length === 0 ? `
                                                    <button class="btn btn-sm btn-danger" 
                                                        onclick="expenseManager.deleteCategory('${category.id}')">
                                                        Delete
                                                    </button>
                                                ` : `
                                                    <button class="btn btn-sm btn-danger" disabled title="Cannot delete category with expenses">
                                                        Delete
                                                    </button>
                                                `}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        Utils.showModal(modalHtml);
    }

    showAddCategoryModal(category = null) {
        const isEdit = !!category;
        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${isEdit ? 'Edit' : 'Add'} Category</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <form id="categoryForm">
                        <div class="form-group">
                            <label class="form-label">Category Name *</label>
                            <input type="text" class="form-control" name="name" 
                                value="${category?.name || ''}" required 
                                placeholder="Enter category name">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" name="description" rows="3"
                                placeholder="Enter category description (optional)">${category?.description || ''}</textarea>
                        </div>

                        <div class="d-flex justify-between mt-2">
                            <button type="button" class="btn btn-secondary" 
                                onclick="Utils.closeModal(this.closest('.modal'))">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                ${isEdit ? 'Update' : 'Save'} Category
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const modal = Utils.showModal(modalHtml);
        
        const form = modal.querySelector('#categoryForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveCategory(form, category?.id);
            Utils.closeModal(modal);
        });
    }

    showEditCategoryModal(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (category) {
            this.showAddCategoryModal(category);
        }
    }

    async saveCategory(form, categoryId = null) {
        const formData = new FormData(form);
        const categoryData = {
            name: formData.get('name'),
            description: formData.get('description')
        };

        try {
            if (categoryId) {
                await dbManager.update('expense_categories', categoryId, categoryData);
                Utils.showNotification('Category updated successfully!', 'success');
            } else {
                await dbManager.add('expense_categories', categoryData);
                Utils.showNotification('Category added successfully!', 'success');
            }
            
            await this.loadCategories();
            this.showCategoryManager(); // Refresh the category manager
        } catch (error) {
            console.error('Error saving category:', error);
            Utils.showNotification('Error saving category', 'error');
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm('Are you sure you want to delete this category?')) {
            return;
        }

        try {
            await dbManager.delete('expense_categories', categoryId);
            Utils.showNotification('Category deleted successfully!', 'success');
            await this.loadCategories();
            this.showCategoryManager(); // Refresh the category manager
        } catch (error) {
            console.error('Error deleting category:', error);
            Utils.showNotification('Error deleting category', 'error');
        }
    }

    // Method to get expense statistics for dashboard
    async getExpenseStats(timeframe = 'month') {
        const today = new Date();
        let startDate, endDate;

        switch (timeframe) {
            case 'today':
                startDate = today.toISOString().split('T')[0];
                endDate = startDate;
                break;
            case 'week':
                startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
                endDate = new Date().toISOString().split('T')[0];
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                break;
            default:
                return 0;
        }

        const expensesInPeriod = this.expenses.filter(expense => {
            return expense.date >= startDate && expense.date <= endDate;
        });

        return expensesInPeriod.reduce((sum, expense) => sum + expense.amount, 0);
    }

    // Method to get category-wise expense breakdown
    getCategoryBreakdown(month = null) {
        const targetMonth = month || new Date().toISOString().slice(0, 7);
        
        const breakdown = this.categories.map(category => {
            const categoryExpenses = this.expenses.filter(expense => 
                expense.categoryId === category.id && 
                expense.date.slice(0, 7) === targetMonth
            );
            
            const totalAmount = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            
            return {
                category: category.name,
                amount: totalAmount,
                count: categoryExpenses.length
            };
        }).filter(item => item.amount > 0);

        return breakdown.sort((a, b) => b.amount - a.amount);
    }

    // Export expenses to CSV
    exportToCSV() {
        const filteredExpenses = this.getFilteredExpenses();
        
        if (filteredExpenses.length === 0) {
            Utils.showNotification('No expenses to export', 'warning');
            return;
        }

        const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Reference No.'];
        const csvData = filteredExpenses.map(expense => {
            const category = this.categories.find(cat => cat.id === expense.categoryId);
            return [
                expense.date,
                category ? category.name : 'Uncategorized',
                expense.description || '',
                expense.amount,
                expense.paymentMethod || 'cash',
                expense.referenceNo || ''
            ];
        });

        const csvContent = [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        Utils.showNotification('Expenses exported successfully!', 'success');
    }
}

const expenseManager = new ExpenseManager();