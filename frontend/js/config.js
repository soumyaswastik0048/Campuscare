/**
 * CampusCare - Global Configuration & Constants
 * Matches the Spring Boot Backend API Contract
 */

const CONFIG = {
    // Spring Boot Backend Base URL
    API_BASE_URL: 'http://localhost:8080/api/complaints',

    // Enums strictly matching ComplaintCategory.java in the backend
    CATEGORIES: [
        { key: 'FOOD', label: 'Food & Mess', icon: 'utensils', requiresEvidence: false, hint: 'Taste, hygiene, portion size, meal schedule' },
        { key: 'HOSTEL_ROOM', label: 'Hostel Room', icon: 'bed', requiresEvidence: true, hint: 'Furniture, lock, windows, fan, almirah' },
        { key: 'CLEANLINESS', label: 'Cleanliness & Hygiene', icon: 'sparkles', requiresEvidence: true, hint: 'Corridors, washrooms, dustbins, common halls' },
        { key: 'WATER', label: 'Water Supply', icon: 'droplet', requiresEvidence: true, hint: 'Drinking water, tap leakage, geyser, tank shortage' },
        { key: 'ELECTRICITY', label: 'Electricity & Power', icon: 'zap', requiresEvidence: true, hint: 'Power cuts, switches, faulty wiring, tube lights' },
        { key: 'MAINTENANCE', label: 'General Maintenance', icon: 'wrench', requiresEvidence: true, hint: 'Carpentry, masonry, doors, elevator, plumbing' },
        { key: 'OTHER', label: 'Other Concerns', icon: 'help-circle', requiresEvidence: false, hint: 'Staff behavior, Wi-Fi connectivity, noise, general issues' }
    ],

    // Types for complaint categorization
    COMPLAINT_TYPES: [
        'Hostel Block A',
        'Hostel Block B',
        'Hostel Block C',
        'Girls Hostel',
        'Central Mess',
        'North Campus Mess',
        'Academic Block',
        'Campus Facilities'
    ],

    // Lifecycle status values
    STATUSES: {
        PENDING: { label: 'Pending Review', color: '#f59e0b', bg: '#fef3c7', badgeClass: 'badge-pending' },
        IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: '#dbeafe', badgeClass: 'badge-progress' },
        RESOLVED: { label: 'Resolved', color: '#10b981', bg: '#d1fae5', badgeClass: 'badge-resolved' },
        CLOSED: { label: 'Confirmed & Closed', color: '#6b7280', bg: '#f3f4f6', badgeClass: 'badge-closed' },
        REOPENED: { label: 'Reopened', color: '#ef4444', bg: '#fee2e2', badgeClass: 'badge-reopened' }
    },

    // Session storage keys for privacy-compliant state
    STORAGE_KEYS: {
        STUDENT_SESSION: 'campuscare_student_session',
        ADMIN_SESSION: 'campuscare_admin_session',
        RECENT_TRACKING_IDS: 'campuscare_recent_tracking_ids'
    }
};

window.CONFIG = CONFIG;
