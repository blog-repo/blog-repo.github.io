// Utility functions
class Utils {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('bn-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2
        }).format(amount || 0);
    }

    static formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('bn-BD');
    }

    static formatDateTime(date) {
        if (!date) return '-';
        return new Date(date).toLocaleString('bn-BD');
    }

    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    static debounce(func, wait) {
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

    static showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: ${type === 'warning' ? '#000' : 'white'};
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    static showModal(html) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = html;
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }

    static closeModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }
}

// Database helper
class DatabaseManager {
    constructor() {
        this.db = firebase.database();
    }

    async add(collection, data) {
        const id = Utils.generateId();
        const itemData = {
            ...data,
            id: id,
            createdAt: new Date().toISOString(),
            createdBy: authManager.getCurrentUser().uid
        };
        
        await this.db.ref(`${collection}/${id}`).set(itemData);
        return id;
    }

    async update(collection, id, data) {
        await this.db.ref(`${collection}/${id}`).update({
            ...data,
            updatedAt: new Date().toISOString()
        });
    }

    async delete(collection, id) {
        await this.db.ref(`${collection}/${id}`).remove();
    }

    async get(collection, id) {
        const snapshot = await this.db.ref(`${collection}/${id}`).once('value');
        return snapshot.val();
    }

    async getAll(collection, orderBy = null) {
        let ref = this.db.ref(collection);
        if (orderBy) {
            ref = ref.orderByChild(orderBy);
        }
        const snapshot = await ref.once('value');
        const results = [];
        snapshot.forEach(child => {
            results.push(child.val());
        });
        return results;
    }

    async query(collection, field, value) {
        const snapshot = await this.db.ref(collection)
            .orderByChild(field)
            .equalTo(value)
            .once('value');
        
        const results = [];
        snapshot.forEach(child => {
            results.push(child.val());
        });
        return results;
    }
}

// Global instances
const dbManager = new DatabaseManager();