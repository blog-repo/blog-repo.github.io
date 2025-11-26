class NotesManager {
    constructor() {
        this.db = firebase.database();
        this.notes = [];
        this.categories = [];
        this.currentFilter = 'all';
        this.currentSort = 'updated';
        this.searchTerm = '';
    }

    async init() {
        await this.loadCategories();
        await this.loadNotes();
        this.setupEventListeners();
        this.renderNotesGrid();
    }

    async loadCategories() {
        try {
            this.categories = await dbManager.getAll('note_categories', 'name');
            
            // If no categories exist, create default categories
            if (this.categories.length === 0) {
                await this.createDefaultCategories();
                this.categories = await dbManager.getAll('note_categories', 'name');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async createDefaultCategories() {
        const defaultCategories = [
            { name: 'General', color: '#6c757d', description: 'General notes' },
            { name: 'Important', color: '#dc3545', description: 'Important notes' },
            { name: 'Ideas', color: '#17a2b8', description: 'Creative ideas and thoughts' },
            { name: 'To-Do', color: '#28a745', description: 'Tasks and to-do items' },
            { name: 'Meeting', color: '#007bff', description: 'Meeting notes and minutes' },
            { name: 'Personal', color: '#6f42c1', description: 'Personal notes' },
            { name: 'Work', color: '#fd7e14', description: 'Work related notes' }
        ];

        for (const category of defaultCategories) {
            await dbManager.add('note_categories', category);
        }
        
        Utils.showNotification('Default note categories created', 'success');
    }

    async loadNotes() {
        try {
            this.notes = await dbManager.getAll('notes', 'updatedAt');
            // Sort by updatedAt descending by default
            this.notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    }

    renderNotesGrid() {
        const grid = document.getElementById('notesGrid');
        if (!grid) return;

        const filteredNotes = this.getFilteredNotes();

        if (filteredNotes.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="empty-state">
                        <h4>No notes found</h4>
                        <p class="text-muted">${this.searchTerm || this.currentFilter !== 'all' ? 
                            'Try changing your search or filter criteria' : 
                            'Create your first note to get started'}</p>
                        <button class="btn btn-primary mt-3" onclick="notesManager.showAddNoteModal()">
                            ➕ Create Your First Note
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        grid.innerHTML = filteredNotes.map(note => {
            const category = this.categories.find(cat => cat.id === note.categoryId);
            const isPinned = note.isPinned || false;
            const hasAttachment = note.attachment && note.attachment.url;
            
            return `
                <div class="note-card" data-note-id="${note.id}">
                    <div class="note-header">
                        <div class="note-title-container">
                            ${isPinned ? '<span class="pin-indicator" title="Pinned">📌</span>' : ''}
                            <h5 class="note-title">${this.escapeHtml(note.title)}</h5>
                        </div>
                        <div class="note-actions">
                            <button class="btn btn-sm ${isPinned ? 'btn-warning' : 'btn-outline-warning'}" 
                                onclick="notesManager.togglePin('${note.id}')" title="${isPinned ? 'Unpin' : 'Pin'}">
                                📌
                            </button>
                            <button class="btn btn-sm btn-outline-primary" 
                                onclick="notesManager.editNote('${note.id}')" title="Edit">
                                ✏️
                            </button>
                            <button class="btn btn-sm btn-outline-danger" 
                                onclick="notesManager.deleteNote('${note.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </div>
                    
                    <div class="note-content">
                        <div class="note-text">${this.formatNoteContent(note.content)}</div>
                        
                        ${note.tags && note.tags.length > 0 ? `
                            <div class="note-tags">
                                ${note.tags.map(tag => `
                                    <span class="note-tag">#${tag}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    ${hasAttachment ? `
                        <div class="note-attachment">
                            <span class="attachment-icon">📎</span>
                            <a href="${note.attachment.url}" target="_blank" class="attachment-link">
                                ${note.attachment.name || 'Attachment'}
                            </a>
                        </div>
                    ` : ''}
                    
                    <div class="note-footer">
                        <div class="note-meta">
                            <span class="note-category" style="background: ${category?.color || '#6c757d'}">
                                ${category?.name || 'Uncategorized'}
                            </span>
                            <span class="note-date">
                                ${Utils.formatDateTime(note.updatedAt)}
                            </span>
                        </div>
                        <div class="note-stats">
                            <small class="text-muted">
                                ${this.getWordCount(note.content)} words • 
                                ${this.getReadTime(note.content)} min read
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getFilteredNotes() {
        let filtered = this.notes;

        // Filter by search term
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(searchLower) ||
                note.content.toLowerCase().includes(searchLower) ||
                (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchLower)))
            );
        }

        // Filter by category
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(note => note.categoryId === this.currentFilter);
        }

        // Sort notes
        filtered = this.sortNotes(filtered);

        return filtered;
    }

    sortNotes(notes) {
        switch (this.currentSort) {
            case 'title':
                return notes.sort((a, b) => a.title.localeCompare(b.title));
            case 'created':
                return notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'updated':
                return notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            case 'pinned':
                const pinned = notes.filter(note => note.isPinned);
                const unpinned = notes.filter(note => !note.isPinned);
                return [...pinned, ...unpinned];
            default:
                return notes;
        }
    }

    formatNoteContent(content) {
        if (!content) return '<span class="text-muted">No content</span>';
        
        // Convert line breaks to <br>
        let formatted = this.escapeHtml(content).replace(/\n/g, '<br>');
        
        // Truncate very long content
        if (formatted.length > 300) {
            formatted = formatted.substring(0, 300) + '...';
        }
        
        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getWordCount(content) {
        if (!content) return 0;
        return content.trim().split(/\s+/).length;
    }

    getReadTime(content) {
        const words = this.getWordCount(content);
        const wordsPerMinute = 200;
        return Math.ceil(words / wordsPerMinute);
    }

    setupEventListeners() {
        const addNoteBtn = document.getElementById('addNoteBtn');
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => this.showAddNoteModal());
        }

        const searchNotes = document.getElementById('searchNotes');
        if (searchNotes) {
            searchNotes.addEventListener('input', Utils.debounce(() => {
                this.searchTerm = searchNotes.value;
                this.renderNotesGrid();
            }, 300));
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.showAddNoteModal();
            }
        });
    }

    showAddNoteModal(note = null) {
        const isEdit = !!note;
        const modalHtml = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h5 class="modal-title">${isEdit ? 'Edit' : 'Create'} Note</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <form id="noteForm">
                        <div class="form-row">
                            <div class="form-group" style="flex: 2;">
                                <label class="form-label">Title *</label>
                                <input type="text" class="form-control" name="title" 
                                    value="${note?.title || ''}" required 
                                    placeholder="Enter note title" id="noteTitle">
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label class="form-label">Category</label>
                                <select class="form-control" name="categoryId">
                                    <option value="">No Category</option>
                                    ${this.categories.map(cat => `
                                        <option value="${cat.id}" ${note?.categoryId === cat.id ? 'selected' : ''}
                                            style="color: ${cat.color}; font-weight: bold;">
                                            ${cat.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Content</label>
                            <textarea class="form-control" name="content" rows="12" 
                                placeholder="Write your note here... (Supports markdown-style formatting)"
                                id="noteContent">${note?.content || ''}</textarea>
                            <div class="form-text">
                                <small>
                                    <strong>Formatting tips:</strong><br>
                                    - Use **bold** for <strong>bold text</strong><br>
                                    - Use *italic* for <em>italic text</em><br>
                                    - Use - for bullet points<br>
                                    - Use 1. for numbered lists<br>
                                    - Use # for headings
                                </small>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Tags (comma separated)</label>
                                <input type="text" class="form-control" name="tags" 
                                    value="${note?.tags ? note.tags.join(', ') : ''}" 
                                    placeholder="important, todo, idea">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Priority</label>
                                <select class="form-control" name="priority">
                                    <option value="low" ${note?.priority === 'low' ? 'selected' : ''}>Low</option>
                                    <option value="medium" ${note?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                    <option value="high" ${note?.priority === 'high' ? 'selected' : ''}>High</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" name="isPinned" ${note?.isPinned ? 'checked' : ''}>
                                    Pin this note (show at top)
                                </label>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" name="isPublic" ${note?.isPublic ? 'checked' : ''}>
                                    Make this note public
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Attachment</label>
                            <div class="attachment-area">
                                ${note?.attachment ? `
                                    <div class="current-attachment">
                                        <span>📎 Current: ${note.attachment.name}</span>
                                        <button type="button" class="btn btn-sm btn-outline-danger" 
                                            onclick="notesManager.removeAttachment('${note.id}')">
                                            Remove
                                        </button>
                                    </div>
                                ` : `
                                    <input type="file" class="form-control" name="attachment" 
                                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png">
                                    <small class="form-text">Max file size: 5MB</small>
                                `}
                            </div>
                        </div>

                        <div class="d-flex justify-between align-center mt-4">
                            <div>
                                <button type="button" class="btn btn-outline-secondary" 
                                    onclick="notesManager.previewNote()">
                                    👁️ Preview
                                </button>
                                <button type="button" class="btn btn-outline-info" 
                                    onclick="notesManager.exportNote()">
                                    📤 Export
                                </button>
                            </div>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-secondary" 
                                    onclick="Utils.closeModal(this.closest('.modal'))">Cancel</button>
                                <button type="submit" class="btn btn-primary">
                                    ${isEdit ? 'Update' : 'Save'} Note
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const modal = Utils.showModal(modalHtml);
        
        const form = modal.querySelector('#noteForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveNote(form, note?.id);
            Utils.closeModal(modal);
        });

        // Auto-focus on title field
        const titleField = modal.querySelector('#noteTitle');
        if (titleField) {
            titleField.focus();
        }
    }

    async saveNote(form, noteId = null) {
        const formData = new FormData(form);
        const noteData = {
            title: formData.get('title'),
            content: formData.get('content'),
            categoryId: formData.get('categoryId') || null,
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            priority: formData.get('priority'),
            isPinned: formData.get('isPinned') === 'on',
            isPublic: formData.get('isPublic') === 'on',
            updatedAt: new Date().toISOString()
        };

        // Add createdAt for new notes
        if (!noteId) {
            noteData.createdAt = new Date().toISOString();
        }

        try {
            // Handle file attachment
            const attachmentFile = formData.get('attachment');
            if (attachmentFile && attachmentFile.size > 0) {
                if (attachmentFile.size > 5 * 1024 * 1024) {
                    Utils.showNotification('File size must be less than 5MB', 'error');
                    return;
                }
                // In a real implementation, you would upload to Firebase Storage
                // For now, we'll store file info
                noteData.attachment = {
                    name: attachmentFile.name,
                    size: attachmentFile.size,
                    type: attachmentFile.type,
                    // url: await this.uploadFile(attachmentFile) // Implement file upload
                };
            }

            if (noteId) {
                await dbManager.update('notes', noteId, noteData);
                Utils.showNotification('Note updated successfully!', 'success');
            } else {
                await dbManager.add('notes', noteData);
                Utils.showNotification('Note created successfully!', 'success');
            }
            
            await this.loadNotes();
            this.renderNotesGrid();
        } catch (error) {
            console.error('Error saving note:', error);
            Utils.showNotification('Error saving note', 'error');
        }
    }

    async editNote(noteId) {
        try {
            const note = await dbManager.get('notes', noteId);
            if (note) {
                this.showAddNoteModal(note);
            }
        } catch (error) {
            console.error('Error loading note:', error);
            Utils.showNotification('Error loading note', 'error');
        }
    }

    async deleteNote(noteId) {
        if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            return;
        }

        try {
            await dbManager.delete('notes', noteId);
            Utils.showNotification('Note deleted successfully!', 'success');
            await this.loadNotes();
            this.renderNotesGrid();
        } catch (error) {
            console.error('Error deleting note:', error);
            Utils.showNotification('Error deleting note', 'error');
        }
    }

    async togglePin(noteId) {
        try {
            const note = await dbManager.get('notes', noteId);
            if (note) {
                await dbManager.update('notes', noteId, {
                    isPinned: !note.isPinned,
                    updatedAt: new Date().toISOString()
                });
                
                Utils.showNotification(`Note ${note.isPinned ? 'unpinned' : 'pinned'}!`, 'success');
                await this.loadNotes();
                this.renderNotesGrid();
            }
        } catch (error) {
            console.error('Error toggling pin:', error);
            Utils.showNotification('Error updating note', 'error');
        }
    }

    async removeAttachment(noteId) {
        try {
            await dbManager.update('notes', noteId, {
                attachment: null,
                updatedAt: new Date().toISOString()
            });
            
            Utils.showNotification('Attachment removed successfully!', 'success');
            // Refresh the modal
            const note = await dbManager.get('notes', noteId);
            this.showAddNoteModal(note);
        } catch (error) {
            console.error('Error removing attachment:', error);
            Utils.showNotification('Error removing attachment', 'error');
        }
    }

    previewNote() {
        const form = document.getElementById('noteForm');
        if (!form) return;

        const formData = new FormData(form);
        const title = formData.get('title');
        const content = formData.get('content');
        const categoryId = formData.get('categoryId');
        const category = this.categories.find(cat => cat.id === categoryId);

        const previewHtml = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h5 class="modal-title">Note Preview</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <div class="note-preview">
                        <div class="preview-header">
                            <h2>${this.escapeHtml(title)}</h2>
                            ${category ? `
                                <span class="note-category-preview" style="background: ${category.color}">
                                    ${category.name}
                                </span>
                            ` : ''}
                        </div>
                        <div class="preview-content">
                            ${this.formatPreviewContent(content)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        Utils.showModal(previewHtml);
    }

    formatPreviewContent(content) {
        if (!content) return '<p class="text-muted">No content</p>';
        
        // Basic markdown-like formatting
        let formatted = this.escapeHtml(content);
        
        // Headers
        formatted = formatted.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        formatted = formatted.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        
        // Bold and italic
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Lists
        formatted = formatted.replace(/^- (.*$)/gim, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    exportNote() {
        const form = document.getElementById('noteForm');
        if (!form) return;

        const formData = new FormData(form);
        const title = formData.get('title');
        const content = formData.get('content');
        const categoryId = formData.get('categoryId');
        const category = this.categories.find(cat => cat.id === categoryId);

        const exportData = {
            title: title,
            content: content,
            category: category ? category.name : 'Uncategorized',
            exportedAt: new Date().toISOString(),
            wordCount: this.getWordCount(content),
            readTime: this.getReadTime(content)
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `note_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        Utils.showNotification('Note exported successfully!', 'success');
    }

    // Advanced search functionality
    advancedSearch() {
        const modalHtml = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Advanced Search</h5>
                    <button type="button" class="modal-close" onclick="Utils.closeModal(this.closest('.modal'))">×</button>
                </div>
                <div class="modal-body">
                    <form id="advancedSearchForm">
                        <div class="form-group">
                            <label class="form-label">Search Terms</label>
                            <input type="text" class="form-control" name="searchQuery" 
                                placeholder="Enter search terms...">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Category</label>
                                <select class="form-control" name="category">
                                    <option value="">All Categories</option>
                                    ${this.categories.map(cat => `
                                        <option value="${cat.id}">${cat.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Priority</label>
                                <select class="form-control" name="priority">
                                    <option value="">All Priorities</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Date From</label>
                                <input type="date" class="form-control" name="dateFrom">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Date To</label>
                                <input type="date" class="form-control" name="dateTo">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" name="pinnedOnly">
                                Show pinned notes only
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" 
                        onclick="Utils.closeModal(this.closest('.modal'))">Cancel</button>
                    <button type="button" class="btn btn-primary" 
                        onclick="notesManager.performAdvancedSearch()">Search</button>
                </div>
            </div>
        `;

        Utils.showModal(modalHtml);
    }

    performAdvancedSearch() {
        const form = document.getElementById('advancedSearchForm');
        if (!form) return;

        const formData = new FormData(form);
        // Implement advanced search logic here
        console.log('Advanced search:', Object.fromEntries(formData));
        
        Utils.showNotification('Advanced search performed!', 'success');
        Utils.closeModal(document.querySelector('.modal'));
    }

    // Quick note creation
    async createQuickNote(title, content, categoryId = null) {
        try {
            const noteData = {
                title: title,
                content: content,
                categoryId: categoryId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await dbManager.add('notes', noteData);
            Utils.showNotification('Quick note created!', 'success');
            
            await this.loadNotes();
            this.renderNotesGrid();
        } catch (error) {
            console.error('Error creating quick note:', error);
            Utils.showNotification('Error creating quick note', 'error');
        }
    }

    // Get note statistics
    getNoteStatistics() {
        const totalNotes = this.notes.length;
        const pinnedNotes = this.notes.filter(note => note.isPinned).length;
        const totalWords = this.notes.reduce((sum, note) => sum + this.getWordCount(note.content), 0);
        const categoriesCount = {};

        this.notes.forEach(note => {
            const category = this.categories.find(cat => cat.id === note.categoryId);
            const categoryName = category ? category.name : 'Uncategorized';
            categoriesCount[categoryName] = (categoriesCount[categoryName] || 0) + 1;
        });

        return {
            totalNotes,
            pinnedNotes,
            totalWords,
            categoriesCount,
            averageWords: totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0
        };
    }
}

const notesManager = new NotesManager();