/**
 * CampusCare - UI Utilities & Helpers
 * XSS sanitizer, Toast manager, modal controllers, and status badges
 */

const UI = {
    /**
     * Prevent XSS attacks by sanitizing user input before rendering
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Show modern toast notification
     */
    showToast(message, type = 'info', duration = 4000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
            error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
            warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
            info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
        };

        toast.innerHTML = `
            ${icons[type] || icons.info}
            <div class="toast-content">
                <p class="toast-message">${this.escapeHtml(message).replace(/\n/g, '<br>')}</p>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Format status badge HTML
     */
    renderStatusBadge(status) {
        const cleanStatus = (status || 'PENDING').toUpperCase();
        const info = (window.CONFIG && window.CONFIG.STATUSES[cleanStatus]) || {
            label: cleanStatus,
            badgeClass: 'badge-pending'
        };

        return `<span class="badge ${info.badgeClass}">
            <span class="badge-dot"></span>
            ${info.label}
        </span>`;
    },

    /**
     * Format category display badge
     */
    renderCategoryBadge(categoryKey) {
        const category = (window.CONFIG?.CATEGORIES || []).find(c => c.key === categoryKey);
        const label = category ? category.label : categoryKey;
        return `<span class="badge badge-category">${this.escapeHtml(label)}</span>`;
    },

    /**
     * Format ISO or LocalDateTime string to readable date
     */
    formatDate(dateStr) {
        if (!dateStr) return 'Just now';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    },

    /**
     * Calculate relative time or overdue indicator
     */
    getRelativeTimeInfo(dateStr) {
        if (!dateStr) return { text: 'Recent', isOverdue: false, hoursAgo: 0 };
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const isOverdue = hours >= 48; // Overdue threshold: 48 hours

            if (hours < 1) return { text: 'Less than an hour ago', isOverdue: false, hoursAgo: 0 };
            if (hours < 24) return { text: `${hours}h ago`, isOverdue: false, hoursAgo: hours };
            const days = Math.floor(hours / 24);
            return {
                text: `${days}d ago`,
                isOverdue: isOverdue,
                hoursAgo: hours,
                escalationLevel: hours >= 96 ? 'Level 2 (Directorate)' : (hours >= 48 ? 'Level 1 (Warden)' : 'Normal')
            };
        } catch {
            return { text: 'Recent', isOverdue: false, hoursAgo: 0 };
        }
    },

    /**
     * Copy text to clipboard with feedback
     */
    async copyToClipboard(text, successMsg = 'Copied to clipboard!') {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast(successMsg, 'success');
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            this.showToast(successMsg, 'success');
        }
    }
};

window.UI = UI;
