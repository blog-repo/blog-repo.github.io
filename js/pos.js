class POSManager {
    constructor() {
        this.db = firebase.database();
        this.cart = [];
        this.products = [];
        this.customers = [];
    }

    async init() {
        await this.loadProducts();
        await this.loadCustomers();
        this.setupEventListeners();
        this.updateCartDisplay();
    }

    async loadProducts() {
        try {
            this.products = await dbManager.getAll('products', 'name');
            this.renderProductsGrid();
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    async loadCustomers() {
        try {
            this.customers = await dbManager.getAll('customers', 'name');
            this.updateCustomerSelect();
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    renderProductsGrid() {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        if (this.products.length === 0) {
            grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No products available</div>';
            return;
        }

        grid.innerHTML = this.products.map(product => `
            <div class="product-card" onclick="posManager.addToCart('${product.id}')">
                <h4>${product.name}</h4>
                <p style="color: #666; font-size: 12px; margin: 5px 0;">${product.manufacturer}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <span style="font-weight: bold; color: #2c5aa0;">${Utils.formatCurrency(product.mrp)}</span>
                    <span style="color: #28a745; font-size: 12px;">Stock: ${product.stock}</span>
                </div>
            </div>
        `).join('');
    }

    updateCustomerSelect() {
        const select = document.getElementById('customerSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Anonymous Customer</option>' +
            this.customers.map(c => `<option value="${c.id}">${c.name} (${c.mobile})</option>`).join('');
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        if (product.stock <= 0) {
            Utils.showNotification('Product out of stock!', 'warning');
            return;
        }

        const existingItem = this.cart.find(item => item.productId === productId);
        
        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                Utils.showNotification('Not enough stock available!', 'warning');
                return;
            }
            existingItem.quantity++;
        } else {
            this.cart.push({
                productId: productId,
                name: product.name,
                mrp: product.mrp,
                purchasePrice: product.purchasePrice,
                quantity: 1,
                discount: 0
            });
        }

        this.updateCartDisplay();
        Utils.showNotification(`${product.name} added to cart`, 'success');
    }

    updateCartDisplay() {
        this.updateCartItems();
        this.updateCartSummary();
    }

    updateCartItems() {
        const container = document.getElementById('cartItems');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    Cart is empty<br>
                    <small>Add products from the left</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.cart.map((item, index) => `
            <div class="cart-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${item.name}</div>
                    <div style="font-size: 12px; color: #666;">
                        ${Utils.formatCurrency(item.mrp)} × ${item.quantity}
                    </div>
                    <div style="font-size: 12px;">
                        Discount: ৳<input type="number" value="${item.discount}" min="0" max="${item.mrp * item.quantity}" 
                            style="width: 60px; padding: 2px; border: 1px solid #ddd; border-radius: 3px;"
                            onchange="posManager.updateDiscount(${index}, this.value)">
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold;">${Utils.formatCurrency((item.mrp * item.quantity) - item.discount)}</div>
                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                        <button class="btn btn-sm btn-warning" onclick="posManager.updateQuantity(${index}, ${item.quantity - 1})">-</button>
                        <span style="padding: 2px 10px;">${item.quantity}</span>
                        <button class="btn btn-sm btn-success" onclick="posManager.updateQuantity(${index}, ${item.quantity + 1})">+</button>
                        <button class="btn btn-sm btn-danger" onclick="posManager.removeFromCart(${index})">×</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateCartSummary() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.mrp * item.quantity), 0);
        const totalDiscount = this.cart.reduce((sum, item) => sum + item.discount, 0);
        const total = subtotal - totalDiscount;

        const subtotalElem = document.getElementById('subtotal');
        const receivedAmountElem = document.getElementById('receivedAmount');
        const changeAmountElem = document.getElementById('changeAmount');

        if (subtotalElem) subtotalElem.textContent = Utils.formatCurrency(total);
        
        if (receivedAmountElem) {
            receivedAmountElem.value = total;
            receivedAmountElem.addEventListener('input', () => this.calculateChange());
        }
        
        this.calculateChange();
    }

    calculateChange() {
        const receivedAmountElem = document.getElementById('receivedAmount');
        const changeAmountElem = document.getElementById('changeAmount');
        
        if (!receivedAmountElem || !changeAmountElem) return;

        const received = parseFloat(receivedAmountElem.value) || 0;
        const subtotal = this.cart.reduce((sum, item) => sum + (item.mrp * item.quantity - item.discount), 0);
        const change = received - subtotal;

        changeAmountElem.textContent = Utils.formatCurrency(change > 0 ? change : 0);
        changeAmountElem.style.color = change >= 0 ? '#28a745' : '#dc3545';
    }

    updateQuantity(index, newQuantity) {
        const product = this.products.find(p => p.id === this.cart[index].productId);
        
        if (!product || newQuantity < 1) {
            this.removeFromCart(index);
            return;
        }

        if (newQuantity > product.stock) {
            Utils.showNotification('Not enough stock available!', 'warning');
            return;
        }

        this.cart[index].quantity = newQuantity;
        this.updateCartDisplay();
    }

    updateDiscount(index, discount) {
        const maxDiscount = this.cart[index].mrp * this.cart[index].quantity;
        this.cart[index].discount = Math.min(Math.max(0, parseFloat(discount) || 0), maxDiscount);
        this.updateCartDisplay();
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCartDisplay();
        Utils.showNotification('Item removed from cart', 'info');
    }

    setupEventListeners() {
        const clearCartBtn = document.getElementById('clearCartBtn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => this.clearCart());
        }

        const processPaymentBtn = document.getElementById('processPaymentBtn');
        if (processPaymentBtn) {
            processPaymentBtn.addEventListener('click', () => this.processPayment());
        }

        const posSearch = document.getElementById('posSearch');
        if (posSearch) {
            posSearch.addEventListener('input', Utils.debounce(() => {
                this.filterProducts(posSearch.value);
            }, 300));
        }
    }

    clearCart() {
        if (this.cart.length === 0) return;
        
        if (confirm('Are you sure you want to clear the cart?')) {
            this.cart = [];
            this.updateCartDisplay();
            Utils.showNotification('Cart cleared', 'info');
        }
    }

    async processPayment() {
        if (this.cart.length === 0) {
            Utils.showNotification('Cart is empty!', 'warning');
            return;
        }

        const customerSelect = document.getElementById('customerSelect');
        const paymentMethod = document.getElementById('paymentMethod');
        const receivedAmount = document.getElementById('receivedAmount');

        if (!customerSelect || !paymentMethod || !receivedAmount) return;

        const saleData = {
            customerId: customerSelect.value || null,
            customerName: customerSelect.value ? 
                this.customers.find(c => c.id === customerSelect.value)?.name : 'Anonymous',
            items: this.cart,
            subtotal: this.cart.reduce((sum, item) => sum + (item.mrp * item.quantity), 0),
            totalDiscount: this.cart.reduce((sum, item) => sum + item.discount, 0),
            totalAmount: this.cart.reduce((sum, item) => sum + (item.mrp * item.quantity - item.discount), 0),
            receivedAmount: parseFloat(receivedAmount.value) || 0,
            paymentMethod: paymentMethod.value,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            profit: this.calculateProfit()
        };

        try {
            // Save sale
            await dbManager.add('sales', saleData);

            // Update product stocks
            for (const item of this.cart) {
                const product = await dbManager.get('products', item.productId);
                if (product) {
                    await dbManager.update('products', item.productId, {
                        stock: product.stock - item.quantity
                    });
                }
            }

            // Handle credit sales
            if (paymentMethod.value === 'credit' && customerSelect.value) {
                const dueAmount = saleData.totalAmount - saleData.receivedAmount;
                if (dueAmount > 0) {
                    await dbManager.add('credit_sales', {
                        ...saleData,
                        dueAmount: dueAmount,
                        paidAmount: saleData.receivedAmount,
                        status: 'pending'
                    });
                }
            }

            Utils.showNotification('Sale completed successfully!', 'success');
            
            // Print receipt
            this.printReceipt(saleData);
            
            // Clear cart
            this.clearCart();
            
            // Reload products to update stock
            await this.loadProducts();

        } catch (error) {
            console.error('Error processing payment:', error);
            Utils.showNotification('Error processing payment', 'error');
        }
    }

    calculateProfit() {
        return this.cart.reduce((profit, item) => {
            const cost = item.purchasePrice * item.quantity;
            const revenue = (item.mrp * item.quantity) - item.discount;
            return profit + (revenue - cost);
        }, 0);
    }

    printReceipt(saleData) {
        // Basic receipt printing functionality
        // In real implementation, integrate with thermal printer
        const receiptWindow = window.open('', '_blank');
        receiptWindow.document.write(`
            <html>
                <head>
                    <title>Receipt - Arifin Pharmacy</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .item { display: flex; justify-content: space-between; margin: 5px 0; }
                        .total { border-top: 1px solid #000; margin-top: 10px; padding-top: 10px; }
                        .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>Arifin Pharmacy</h2>
                        <p>Paotanahat, Pirgacha, Rangpur</p>
                        <p>Mobile: 01788280321</p>
                        <p>Date: ${new Date().toLocaleString('en-BD')}</p>
                    </div>
                    
                    <div class="items">
                        ${saleData.items.map(item => `
                            <div class="item">
                                <span>${item.name} (${item.quantity} × ${Utils.formatCurrency(item.mrp)})</span>
                                <span>${Utils.formatCurrency(item.mrp * item.quantity)}</span>
                            </div>
                            ${item.discount > 0 ? `<div class="item" style="color: #dc3545;"><span>Discount</span><span>-${Utils.formatCurrency(item.discount)}</span></div>` : ''}
                        `).join('')}
                    </div>
                    
                    <div class="total">
                        <div class="item"><strong>Total:</strong> <strong>${Utils.formatCurrency(saleData.totalAmount)}</strong></div>
                        <div class="item">Received: ${Utils.formatCurrency(saleData.receivedAmount)}</div>
                        <div class="item">Change: ${Utils.formatCurrency(saleData.receivedAmount - saleData.totalAmount)}</div>
                    </div>
                    
                    <div class="footer">
                        <p>Thank you for your business!</p>
                        <p>Please come again</p>
                    </div>
                </body>
            </html>
        `);
        
        receiptWindow.print();
    }

    filterProducts(searchTerm) {
        const filteredProducts = this.products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderFilteredProducts(filteredProducts);
    }

    renderFilteredProducts(products) {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No products found</div>';
            return;
        }

        grid.innerHTML = products.map(product => `
            <div class="product-card" onclick="posManager.addToCart('${product.id}')">
                <h4>${product.name}</h4>
                <p style="color: #666; font-size: 12px; margin: 5px 0;">${product.manufacturer}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <span style="font-weight: bold; color: #2c5aa0;">${Utils.formatCurrency(product.mrp)}</span>
                    <span style="color: #28a745; font-size: 12px;">Stock: ${product.stock}</span>
                </div>
            </div>
        `).join('');
    }
}

const posManager = new POSManager();