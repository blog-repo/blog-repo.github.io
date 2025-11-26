class StockManager {
    constructor() {
        this.db = firebase.database();
        this.products = [];
        this.manufacturers = [];
    }

    async init() {
        await this.loadManufacturers();
        await this.loadProducts();
        this.setupEventListeners();
    }

    async loadManufacturers() {
        try {
            this.manufacturers = await dbManager.getAll('manufacturers', 'name');
            this.updateManufacturerFilter();
        } catch (error) {
            console.error('Error loading manufacturers:', error);
        }
    }

    async loadProducts() {
        try {
            this.products = await dbManager.getAll('products', 'name');
            this.renderProductsTable();
            this.checkLowStock();
            this.checkExpiry();
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderProductsTable() {
        const tbody = document.getElementById('productsTable');
        if (!tbody) return;

        if (this.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No products found</td></tr>';
            return;
        }

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.manufacturer}</td>
                <td>
                    <span class="${product.stock <= product.minStock ? 'text-danger' : 'text-success'}">
                        ${product.stock}
                    </span>
                </td>
                <td>${Utils.formatCurrency(product.purchasePrice)}</td>
                <td>${Utils.formatCurrency(product.mrp)}</td>
                <td>${Utils.formatDate(product.expiryDate)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="stockManager.editProduct('${product.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="stockManager.deleteProduct('${product.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    updateManufacturerFilter() {
        const filter = document.getElementById('manufacturerFilter');
        if (!filter) return;

        filter.innerHTML = '<option value="">All Manufacturers</option>' +
            this.manufacturers.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    }

    checkLowStock() {
        const lowStockProducts = this.products.filter(p => p.stock <= p.minStock);
        const tbody = document.getElementById('lowStockTable');
        
        if (!tbody) return;

        if (lowStockProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No low stock items</td></tr>';
            return;
        }

        tbody.innerHTML = lowStockProducts.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.manufacturer}</td>
                <td class="text-danger">${product.stock}</td>
                <td>${product.minStock}</td>
                <td><span class="text-danger">Low Stock</span></td>
            </tr>
        `).join('');
    }

    checkExpiry() {
        const today = new Date();
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const expiringProducts = this.products.filter(p => {
            if (!p.expiryDate) return false;
            const expiryDate = new Date(p.expiryDate);
            return expiryDate <= thirtyDaysFromNow;
        });

        const tbody = document.getElementById('expiryTable');
        if (!tbody) return;

        if (expiringProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No expiring products</td></tr>';
            return;
        }

        tbody.innerHTML = expiringProducts.map(product => {
            const expiryDate = new Date(product.expiryDate);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (24 * 60 * 60 * 1000));
            
            return `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.manufacturer}</td>
                    <td>${product.batchNo || 'N/A'}</td>
                    <td>${Utils.formatDate(product.expiryDate)}</td>
                    <td class="${daysUntilExpiry <= 7 ? 'text-danger' : 'text-warning'}">
                        ${daysUntilExpiry} days
                    </td>
                    <td>${product.stock}</td>
                </tr>
            `;
        }).join('');
    }

    setupEventListeners() {
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.showAddProductModal());
        }

        const searchProduct = document.getElementById('searchProduct');
        if (searchProduct) {
            searchProduct.addEventListener('input', Utils.debounce(() => {
                this.filterProducts();
            }, 300));
        }

        const manufacturerFilter = document.getElementById('manufacturerFilter');
        if (manufacturerFilter) {
            manufacturerFilter.addEventListener('change', () => {
                this.filterProducts();
            });
        }
    }

    filterProducts() {
        const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
        const manufacturer = document.getElementById('manufacturerFilter').value;

        const filteredProducts = this.products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                                product.manufacturer.toLowerCase().includes(searchTerm);
            const matchesManufacturer = !manufacturer || product.manufacturer === manufacturer;
            
            return matchesSearch && matchesManufacturer;
        });

        this.renderFilteredProducts(filteredProducts);
    }

    renderFilteredProducts(products) {
        const tbody = document.getElementById('productsTable');
        if (!tbody) return;

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No products match your search</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.manufacturer}</td>
                <td>${product.stock}</td>
                <td>${Utils.formatCurrency(product.purchasePrice)}</td>
                <td>${Utils.formatCurrency(product.mrp)}</td>
                <td>${Utils.formatDate(product.expiryDate)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="stockManager.editProduct('${product.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="stockManager.deleteProduct('${product.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    showAddProductModal(product = null) {
        const isEdit = !!product;
        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${isEdit ? 'Edit' : 'Add'} Product</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <form id="productForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Product Name *</label>
                                <input type="text" class="form-control" name="name" value="${product?.name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Manufacturer *</label>
                                <select class="form-control" name="manufacturer" required>
                                    <option value="">Select Manufacturer</option>
                                    ${this.manufacturers.map(m => `
                                        <option value="${m.name}" ${product?.manufacturer === m.name ? 'selected' : ''}>${m.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Purchase Price (৳) *</label>
                                <input type="number" class="form-control" name="purchasePrice" step="0.01" value="${product?.purchasePrice || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">MRP (৳) *</label>
                                <input type="number" class="form-control" name="mrp" step="0.01" value="${product?.mrp || ''}" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Current Stock *</label>
                                <input type="number" class="form-control" name="stock" value="${product?.stock || '0'}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Minimum Stock</label>
                                <input type="number" class="form-control" name="minStock" value="${product?.minStock || '5'}">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Batch Number</label>
                                <input type="text" class="form-control" name="batchNo" value="${product?.batchNo || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Expiry Date</label>
                                <input type="date" class="form-control" name="expiryDate" value="${product?.expiryDate || ''}">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" name="description" rows="3">${product?.description || ''}</textarea>
                        </div>

                        <div class="d-flex justify-between mt-2">
                            <button type="button" class="btn btn-secondary" onclick="Utils.closeModal(this.closest('.modal'))">Cancel</button>
                            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Save'} Product</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const modal = Utils.showModal(modalHtml);
        
        const form = modal.querySelector('#productForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProduct(form, product?.id);
            Utils.closeModal(modal);
        });
    }

    async saveProduct(form, productId = null) {
        const formData = new FormData(form);
        const productData = {
            name: formData.get('name'),
            manufacturer: formData.get('manufacturer'),
            purchasePrice: parseFloat(formData.get('purchasePrice')),
            mrp: parseFloat(formData.get('mrp')),
            stock: parseInt(formData.get('stock')),
            minStock: parseInt(formData.get('minStock')) || 5,
            batchNo: formData.get('batchNo'),
            expiryDate: formData.get('expiryDate'),
            description: formData.get('description')
        };

        try {
            if (productId) {
                await dbManager.update('products', productId, productData);
                Utils.showNotification('Product updated successfully!', 'success');
            } else {
                await dbManager.add('products', productData);
                Utils.showNotification('Product added successfully!', 'success');
            }
            
            await this.loadProducts();
        } catch (error) {
            console.error('Error saving product:', error);
            Utils.showNotification('Error saving product', 'error');
        }
    }

    async editProduct(productId) {
        try {
            const product = await dbManager.get('products', productId);
            if (product) {
                this.showAddProductModal(product);
            }
        } catch (error) {
            console.error('Error loading product:', error);
            Utils.showNotification('Error loading product', 'error');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            await dbManager.delete('products', productId);
            Utils.showNotification('Product deleted successfully!', 'success');
            await this.loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            Utils.showNotification('Error deleting product', 'error');
        }
    }
}

const stockManager = new StockManager();