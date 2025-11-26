class CalendarManager {
    constructor() {
        this.db = firebase.database();
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.events = [];
        this.sales = [];
        this.expenses = [];
        this.reminders = [];
    }

    async init() {
        await this.loadEvents();
        await this.loadSales();
        await this.loadExpenses();
        await this.loadReminders();
        this.renderCalendar();
        this.setupEventListeners();
        this.updateCalendarHeader();
    }

    async loadEvents() {
        try {
            this.events = await dbManager.getAll('calendar_events', 'date');
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    async loadSales() {
        try {
            this.sales = await dbManager.getAll('sales', 'date');
        } catch (error) {
            console.error('Error loading sales:', error);
        }
    }

    async loadExpenses() {
        try {
            this.expenses = await dbManager.getAll('expenses', 'date');
        } catch (error) {
            console.error('Error loading expenses:', error);
        }
    }

    async loadReminders() {
        try {
            this.reminders = await dbManager.getAll('reminders', 'date');
        } catch (error) {
            console.error('Error loading reminders:', error);
        }
    }

    renderCalendar() {
        const calendar = document.getElementById('calendar');
        if (!calendar) return;

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const startingDay = firstDay.getDay();
        const monthLength = lastDay.getDate();

        // Get today's date for highlighting
        const today = new Date();
        const todayString = today.toDateString();

        let html = `
            <div class="calendar-header">
                <div class="calendar-weekdays">
                    <div class="weekday">Sun</div>
                    <div class="weekday">Mon</div>
                    <div class="weekday">Tue</div>
                    <div class="weekday">Wed</div>
                    <div class="weekday">Thu</div>
                    <div class="weekday">Fri</div>
                    <div class="weekday">Sat</div>
                </div>
                <div class="calendar-days">
        `;

        // Empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            html += `<div class="calendar-day empty"></div>`;
        }

        // Days of the month
        for (let day = 1; day <= monthLength; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const dateString = date.toDateString();
            const isoDate = date.toISOString().split('T')[0];
            
            const isToday = dateString === todayString;
            const dayEvents = this.getDayEvents(isoDate);
            const daySales = this.getDaySales(isoDate);
            const dayExpenses = this.getDayExpenses(isoDate);
            const dayReminders = this.getDayReminders(isoDate);

            const totalSales = daySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalExpenses = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            const profit = totalSales - totalExpenses;

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" 
                     onclick="calendarManager.showDayDetails('${isoDate}')"
                     data-date="${isoDate}">
                    <div class="day-number">${day}</div>
                    <div class="day-events">
            `;

            // Show events
            if (dayEvents.length > 0) {
                html += `<div class="event-indicator event" title="${dayEvents.length} events">📅 ${dayEvents.length}</div>`;
            }

            // Show sales
            if (daySales.length > 0) {
                html += `<div class="event-indicator sale" title="Sales: ${Utils.formatCurrency(totalSales)}">💰 ${daySales.length}</div>`;
            }

            // Show expenses
            if (dayExpenses.length > 0) {
                html += `<div class="event-indicator expense" title="Expenses: ${Utils.formatCurrency(totalExpenses)}">💸 ${dayExpenses.length}</div>`;
            }

            // Show reminders
            if (dayReminders.length > 0) {
                html += `<div class="event-indicator reminder" title="${dayReminders.length} reminders">⏰ ${dayReminders.length}</div>`;
            }

            // Show profit/loss
            if (totalSales > 0 || totalExpenses > 0) {
                const profitClass = profit >= 0 ? 'profit' : 'loss';
                html += `<div class="profit-loss ${profitClass}" title="Profit: ${Utils.formatCurrency(profit)}">
                    ${profit >= 0 ? '▲' : '▼'} ${Utils.formatCurrency(Math.abs(profit))}
                </div>`;
            }

            html += `</div></div>`;
        }

        html += `</div></div>`;
        calendar.innerHTML = html;
    }

    getDayEvents(date) {
        return this.events.filter(event => event.date === date);
    }

    getDaySales(date) {
        return this.sales.filter(sale => sale.date === date);
    }

    getDayExpenses(date) {
        return this.expenses.filter(expense => expense.date === date);
    }

    getDayReminders(date) {
        return this.reminders.filter(reminder => reminder.date === date);
    }

    updateCalendarHeader() {
        const monthYearElement = document.getElementById('calendarMonthYear');
        if (monthYearElement) {
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            monthYearElement.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        }
    }

    setupEventListeners() {
        const prevMonthBtn = document.getElementById('prevMonthBtn');
        const nextMonthBtn = document.getElementById('nextMonthBtn');
        const currentMonthBtn = document.getElementById('currentMonthBtn');

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => this.previousMonth());
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => this.nextMonth());
        }

        if (currentMonthBtn) {
            currentMonthBtn.addEventListener('click', () => this.goToCurrentMonth());
        }

        // Add event listener for adding new events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-event-btn')) {
                const date = e.target.closest('.calendar-day').dataset.date;
                this.showAddEventModal(date);
            }
        });
    }

    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.renderCalendar();
        this.updateCalendarHeader();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.renderCalendar();
        this.updateCalendarHeader();
    }

    goToCurrentMonth() {
        const now = new Date();
        this.currentMonth = now.getMonth();
        this.currentYear = now.getFullYear();
        this.renderCalendar();
        this.updateCalendarHeader();
    }

    showDayDetails(date) {
        const dayEvents = this.getDayEvents(date);
        const daySales = this.getDaySales(date);
        const dayExpenses = this.getDayExpenses(date);
        const dayReminders = this.getDayReminders(date);

        const totalSales = daySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalExpenses = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalProfit = totalSales - totalExpenses;

        const formattedDate = new Date(date).toLocaleDateString('en-BD', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const modalHtml = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h5 class="modal-title">${formattedDate}</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="stat-card text-center">
                                <div class="stat-label">Total Sales</div>
                                <div class="stat-value text-success">${Utils.formatCurrency(totalSales)}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card text-center">
                                <div class="stat-label">Total Expenses</div>
                                <div class="stat-value text-danger">${Utils.formatCurrency(totalExpenses)}</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card text-center">
                                <div class="stat-label">Net Profit</div>
                                <div class="stat-value ${totalProfit >= 0 ? 'text-success' : 'text-danger'}">
                                    ${Utils.formatCurrency(totalProfit)}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card text-center">
                                <div class="stat-label">Transactions</div>
                                <div class="stat-value">${daySales.length + dayExpenses.length}</div>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex justify-between align-center mb-3">
                        <h6>Daily Summary</h6>
                        <button class="btn btn-sm btn-primary" onclick="calendarManager.showAddEventModal('${date}')">
                            ➕ Add Event
                        </button>
                    </div>

                    <div class="row">
                        ${dayEvents.length > 0 ? `
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header d-flex justify-between align-center">
                                        <h6>Events (${dayEvents.length})</h6>
                                        <span class="badge bg-info">📅</span>
                                    </div>
                                    <div class="card-body">
                                        ${dayEvents.map(event => `
                                            <div class="event-item mb-2 p-2 border rounded">
                                                <div class="d-flex justify-between align-center">
                                                    <strong>${event.title}</strong>
                                                    <div class="d-flex gap-1">
                                                        <button class="btn btn-sm btn-warning" 
                                                            onclick="calendarManager.editEvent('${event.id}')">Edit</button>
                                                        <button class="btn btn-sm btn-danger" 
                                                            onclick="calendarManager.deleteEvent('${event.id}')">Delete</button>
                                                    </div>
                                                </div>
                                                <div class="text-muted small">${event.description || 'No description'}</div>
                                                ${event.time ? `<div class="text-muted small">⏰ ${event.time}</div>` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        ${daySales.length > 0 ? `
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header d-flex justify-between align-center">
                                        <h6>Sales (${daySales.length})</h6>
                                        <span class="badge bg-success">💰</span>
                                    </div>
                                    <div class="card-body">
                                        ${daySales.map(sale => `
                                            <div class="sale-item mb-2 p-2 border rounded">
                                                <div class="d-flex justify-between align-center">
                                                    <strong>${sale.customerName || 'Anonymous'}</strong>
                                                    <span class="text-success">${Utils.formatCurrency(sale.totalAmount)}</span>
                                                </div>
                                                <div class="text-muted small">
                                                    ${sale.items.length} items • 
                                                    <span class="badge ${sale.paymentMethod === 'credit' ? 'bg-warning' : 'bg-success'}">
                                                        ${sale.paymentMethod}
                                                    </span>
                                                </div>
                                                <div class="text-muted small">
                                                    Profit: <span class="${sale.profit >= 0 ? 'text-success' : 'text-danger'}">
                                                        ${Utils.formatCurrency(sale.profit)}
                                                    </span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        ${dayExpenses.length > 0 ? `
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header d-flex justify-between align-center">
                                        <h6>Expenses (${dayExpenses.length})</h6>
                                        <span class="badge bg-danger">💸</span>
                                    </div>
                                    <div class="card-body">
                                        ${dayExpenses.map(expense => {
                                            const categories = expenseManager.categories || [];
                                            const category = categories.find(cat => cat.id === expense.categoryId);
                                            return `
                                                <div class="expense-item mb-2 p-2 border rounded">
                                                    <div class="d-flex justify-between align-center">
                                                        <strong>${category ? category.name : 'Uncategorized'}</strong>
                                                        <span class="text-danger">${Utils.formatCurrency(expense.amount)}</span>
                                                    </div>
                                                    <div class="text-muted small">${expense.description || 'No description'}</div>
                                                    <div class="text-muted small">
                                                        ${expense.paymentMethod || 'cash'} • ${expense.referenceNo || 'No reference'}
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        ${dayReminders.length > 0 ? `
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header d-flex justify-between align-center">
                                        <h6>Reminders (${dayReminders.length})</h6>
                                        <span class="badge bg-warning">⏰</span>
                                    </div>
                                    <div class="card-body">
                                        ${dayReminders.map(reminder => `
                                            <div class="reminder-item mb-2 p-2 border rounded">
                                                <div class="d-flex justify-between align-center">
                                                    <strong>${reminder.title}</strong>
                                                    <span class="badge ${reminder.priority === 'high' ? 'bg-danger' : reminder.priority === 'medium' ? 'bg-warning' : 'bg-info'}">
                                                        ${reminder.priority}
                                                    </span>
                                                </div>
                                                <div class="text-muted small">${reminder.description || 'No description'}</div>
                                                ${reminder.time ? `<div class="text-muted small">⏰ ${reminder.time}</div>` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        ${dayEvents.length === 0 && daySales.length === 0 && dayExpenses.length === 0 && dayReminders.length === 0 ? `
                            <div class="col-12">
                                <div class="text-center text-muted py-4">
                                    <h6>No activities for this day</h6>
                                    <p>Add events, sales, expenses, or reminders to see them here.</p>
                                    <button class="btn btn-primary" onclick="calendarManager.showAddEventModal('${date}')">
                                        ➕ Add Your First Event
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        Utils.showModal(modalHtml);
    }

    showAddEventModal(date, event = null) {
        const isEdit = !!event;
        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${isEdit ? 'Edit' : 'Add'} Event</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <form id="eventForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Event Title *</label>
                                <input type="text" class="form-control" name="title" 
                                    value="${event?.title || ''}" required 
                                    placeholder="Enter event title">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Date *</label>
                                <input type="date" class="form-control" name="date" 
                                    value="${event?.date || date}" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Time</label>
                                <input type="time" class="form-control" name="time" 
                                    value="${event?.time || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Event Type</label>
                                <select class="form-control" name="eventType">
                                    <option value="meeting" ${event?.eventType === 'meeting' ? 'selected' : ''}>Meeting</option>
                                    <option value="appointment" ${event?.eventType === 'appointment' ? 'selected' : ''}>Appointment</option>
                                    <option value="reminder" ${event?.eventType === 'reminder' ? 'selected' : ''}>Reminder</option>
                                    <option value="task" ${event?.eventType === 'task' ? 'selected' : ''}>Task</option>
                                    <option value="holiday" ${event?.eventType === 'holiday' ? 'selected' : ''}>Holiday</option>
                                    <option value="other" ${event?.eventType === 'other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" name="description" rows="3"
                                placeholder="Enter event description...">${event?.description || ''}</textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Priority</label>
                            <select class="form-control" name="priority">
                                <option value="low" ${event?.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${event?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${event?.priority === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" name="isAllDay" ${event?.isAllDay ? 'checked' : ''}>
                                All Day Event
                            </label>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" name="sendReminder" ${event?.sendReminder ? 'checked' : ''}>
                                Send Reminder
                            </label>
                        </div>

                        <div class="d-flex justify-between mt-2">
                            <button type="button" class="btn btn-secondary" 
                                onclick="Utils.closeModal(this.closest('.modal'))">Cancel</button>
                            <button type="submit" class="btn btn-primary">
                                ${isEdit ? 'Update' : 'Save'} Event
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const modal = Utils.showModal(modalHtml);
        
        const form = modal.querySelector('#eventForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveEvent(form, event?.id);
            Utils.closeModal(modal);
        });
    }

    async saveEvent(form, eventId = null) {
        const formData = new FormData(form);
        const eventData = {
            title: formData.get('title'),
            date: formData.get('date'),
            time: formData.get('time'),
            eventType: formData.get('eventType'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            isAllDay: formData.get('isAllDay') === 'on',
            sendReminder: formData.get('sendReminder') === 'on'
        };

        try {
            if (eventId) {
                await dbManager.update('calendar_events', eventId, eventData);
                Utils.showNotification('Event updated successfully!', 'success');
            } else {
                await dbManager.add('calendar_events', eventData);
                Utils.showNotification('Event added successfully!', 'success');
            }
            
            await this.loadEvents();
            this.renderCalendar();
        } catch (error) {
            console.error('Error saving event:', error);
            Utils.showNotification('Error saving event', 'error');
        }
    }

    async editEvent(eventId) {
        try {
            const event = await dbManager.get('calendar_events', eventId);
            if (event) {
                this.showAddEventModal(event.date, event);
            }
        } catch (error) {
            console.error('Error loading event:', error);
            Utils.showNotification('Error loading event', 'error');
        }
    }

    async deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event?')) {
            return;
        }

        try {
            await dbManager.delete('calendar_events', eventId);
            Utils.showNotification('Event deleted successfully!', 'success');
            await this.loadEvents();
            this.renderCalendar();
            Utils.closeModal(document.querySelector('.modal'));
        } catch (error) {
            console.error('Error deleting event:', error);
            Utils.showNotification('Error deleting event', 'error');
        }
    }

    // Method to get monthly summary
    getMonthlySummary() {
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        
        const monthSales = this.sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= firstDay && saleDate <= lastDay;
        });

        const monthExpenses = this.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= firstDay && expenseDate <= lastDay;
        });

        const totalSales = monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalExpenses = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalProfit = totalSales - totalExpenses;
        const totalEvents = this.events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= firstDay && eventDate <= lastDay;
        }).length;

        return {
            totalSales,
            totalExpenses,
            totalProfit,
            totalEvents,
            salesCount: monthSales.length,
            expensesCount: monthExpenses.length
        };
    }

    // Method to show monthly summary
    showMonthlySummary() {
        const summary = this.getMonthlySummary();
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = monthNames[this.currentMonth];

        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${monthName} ${this.currentYear} - Monthly Summary</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total Sales</div>
                            <div class="stat-value text-success">${Utils.formatCurrency(summary.totalSales)}</div>
                            <div class="stat-subtext">${summary.salesCount} transactions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Expenses</div>
                            <div class="stat-value text-danger">${Utils.formatCurrency(summary.totalExpenses)}</div>
                            <div class="stat-subtext">${summary.expensesCount} transactions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Net Profit</div>
                            <div class="stat-value ${summary.totalProfit >= 0 ? 'text-success' : 'text-danger'}">
                                ${Utils.formatCurrency(summary.totalProfit)}
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Events</div>
                            <div class="stat-value">${summary.totalEvents}</div>
                        </div>
                    </div>

                    <div class="mt-4">
                        <h6>Top Selling Days</h6>
                        ${this.getTopSellingDays().map(day => `
                            <div class="d-flex justify-between align-center p-2 border-bottom">
                                <span>${Utils.formatDate(day.date)}</span>
                                <span class="text-success">${Utils.formatCurrency(day.amount)}</span>
                                <span class="badge bg-success">${day.count} sales</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        Utils.showModal(modalHtml);
    }

    getTopSellingDays() {
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        
        const dailySales = {};
        
        this.sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            if (saleDate >= firstDay && saleDate <= lastDay) {
                if (!dailySales[sale.date]) {
                    dailySales[sale.date] = { amount: 0, count: 0 };
                }
                dailySales[sale.date].amount += sale.totalAmount;
                dailySales[sale.date].count += 1;
            }
        });

        return Object.entries(dailySales)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }

    // Method to add quick reminder
    async addQuickReminder(date, title, description = '') {
        try {
            await dbManager.add('reminders', {
                title: title,
                date: date,
                description: description,
                priority: 'medium',
                createdAt: new Date().toISOString()
            });
            
            Utils.showNotification('Reminder added successfully!', 'success');
            await this.loadReminders();
            this.renderCalendar();
        } catch (error) {
            console.error('Error adding reminder:', error);
            Utils.showNotification('Error adding reminder', 'error');
        }
    }
}

const calendarManager = new CalendarManager();