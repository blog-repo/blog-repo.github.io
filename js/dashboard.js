class DashboardManager {
    constructor() {
        this.db = firebase.database();
    }

    init() {
        this.loadDashboardData();
        this.setupEventListeners();
        this.updateDateDisplay();
    }

    async loadDashboardData() {
        await this.loadTodayStats();
        await this.loadMonthlyChart();
    }

    async loadTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        
        try {
            // Get today's sales
            const salesSnapshot = await this.db.ref('sales')
                .orderByChild('date')
                .equalTo(today)
                .once('value');
            
            let todayRevenue = 0;
            let todayProfit = 0;
            
            salesSnapshot.forEach(sale => {
                const data = sale.val();
                todayRevenue += data.totalAmount || 0;
                todayProfit += data.profit || 0;
            });

            // Get total assets and product count
            const productsSnapshot = await this.db.ref('products').once('value');
            const productCount = productsSnapshot.numChildren();
            
            let totalAssets = 0;
            productsSnapshot.forEach(product => {
                const data = product.val();
                totalAssets += (data.purchasePrice || 0) * (data.stock || 0);
            });

            // Update UI
            this.updateStats({
                revenue: todayRevenue,
                profit: todayProfit,
                assets: totalAssets,
                products: productCount
            });

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            Utils.showNotification('Error loading dashboard data', 'error');
        }
    }

    updateStats(stats) {
        const revenueElem = document.getElementById('todayRevenue');
        const profitElem = document.getElementById('todayProfit');
        const assetsElem = document.getElementById('totalAssets');
        const productsElem = document.getElementById('productCount');

        if (revenueElem) revenueElem.textContent = Utils.formatCurrency(stats.revenue);
        if (profitElem) profitElem.textContent = Utils.formatCurrency(stats.profit);
        if (assetsElem) assetsElem.textContent = Utils.formatCurrency(stats.assets);
        if (productsElem) productsElem.textContent = stats.products.toLocaleString();
    }

    loadMonthlyChart() {
        // Placeholder for chart implementation
        // In real implementation, integrate with Chart.js or similar library
        console.log('Monthly chart would be loaded here');
    }

    updateDateDisplay() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const dateTimeElem = document.getElementById('currentDateTime');
        if (dateTimeElem) {
            dateTimeElem.textContent = now.toLocaleDateString('en-BD', options);
        }
    }

    setupEventListeners() {
        const dateSelector = document.getElementById('dateSelector');
        if (dateSelector) {
            dateSelector.value = new Date().toISOString().split('T')[0];
            dateSelector.addEventListener('change', (e) => {
                this.loadDailyStats(e.target.value);
            });
        }

        const monthSelector = document.getElementById('monthSelector');
        if (monthSelector) {
            const today = new Date();
            monthSelector.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            monthSelector.addEventListener('change', (e) => {
                this.loadMonthlyStats(e.target.value);
            });
        }
    }

    async loadDailyStats(date) {
        try {
            const salesSnapshot = await this.db.ref('sales')
                .orderByChild('date')
                .equalTo(date)
                .once('value');
            
            let dailyRevenue = 0;
            let dailyProfit = 0;
            let saleCount = 0;
            
            salesSnapshot.forEach(sale => {
                const data = sale.val();
                dailyRevenue += data.totalAmount || 0;
                dailyProfit += data.profit || 0;
                saleCount++;
            });

            const dailyStatsElem = document.getElementById('dailyStats');
            if (dailyStatsElem) {
                dailyStatsElem.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Daily Revenue</div>
                            <div class="stat-value">${Utils.formatCurrency(dailyRevenue)}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Daily Profit</div>
                            <div class="stat-value">${Utils.formatCurrency(dailyProfit)}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Sales</div>
                            <div class="stat-value">${saleCount}</div>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading daily stats:', error);
        }
    }

    async loadMonthlyStats(month) {
        console.log('Loading monthly stats for:', month);
        // Implementation for monthly statistics
    }
}

// Initialize dashboard when script loads
const dashboardManager = new DashboardManager();