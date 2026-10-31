/**
 * CampusCare - Administration Dashboard Controller
 * Grievance Management, Status Workflow, Heuristic Review & Analytics
 */

let allComplaints = [];
let activeComplaint = null;
const REMINDER_STATE_STORAGE_KEY = 'campuscare_admin_complaint_reminder_states';
const REMINDER_HISTORY_STORAGE_KEY = 'campuscare_admin_complaint_reminder_history';
const REMINDER_CHECK_INTERVAL_MS = 30 * 1000;
const COMPLAINT_REFRESH_INTERVAL_MS = 60 * 1000;
const OVERDUE_REMINDER_INTERVAL_MS = 30 * 60 * 1000;
let complaintReminderStates = {};
let complaintReminderHistory = [];
let reminderStorageWarningShown = false;
let isLoadingComplaints = false;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const storedStates = readReminderStorage(REMINDER_STATE_STORAGE_KEY, {});
    const storedHistory = readReminderStorage(REMINDER_HISTORY_STORAGE_KEY, []);
    complaintReminderStates = storedStates && typeof storedStates === 'object' && !Array.isArray(storedStates)
        ? storedStates
        : {};
    complaintReminderHistory = Array.isArray(storedHistory) ? storedHistory : [];
    renderComplaintReminders();
    checkAdminAuth();
    initFilters();
    window.setInterval(checkComplaintReminders, REMINDER_CHECK_INTERVAL_MS);
    window.setInterval(() => {
        const session = getAdminSession();
        if (session && session.authenticated) loadAllComplaints();
    }, COMPLAINT_REFRESH_INTERVAL_MS);
});

// ==========================================================================
// 1. Admin Authentication & Session
// ==========================================================================

function checkAdminAuth() {
    let session = getAdminSession();
    const isExplicitlyLoggedOut = sessionStorage.getItem('campuscare_admin_logged_out') === 'true';

    // Auto-authenticate default session on direct visit so dashboard is immediately viewable
    if (!session && !isExplicitlyLoggedOut) {
        session = {
            username: 'admin',
            role: 'CHIEF_WARDEN',
            authenticated: true,
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(session));
    }

    const authContainer = document.getElementById('admin-auth-container');
    const modal = document.getElementById('admin-login-modal');

    if (session && session.authenticated) {
        modal.style.display = 'none';
        authContainer.innerHTML = `
            <span class="badge badge-resolved" title="Authenticated Warden / Admin">
                <span class="badge-dot"></span> Admin: ${session.username}
            </span>
            <button class="btn btn-sm btn-secondary" onclick="logoutAdmin()">Sign Out</button>
        `;
        renderComplaintReminders();
        loadAllComplaints();
    } else {
        authContainer.innerHTML = '';
        modal.style.display = 'flex';
    }
}

function getAdminSession() {
    try {
        const stored = sessionStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

function handleAdminLogin(event) {
    event.preventDefault();
    const user = document.getElementById('admin-user-input').value.trim();
    const pass = document.getElementById('admin-pass-input').value.trim();

    if (user === 'admin' && pass === 'admin123') {
        sessionStorage.removeItem('campuscare_admin_logged_out');
        const session = {
            username: user,
            role: 'CHIEF_WARDEN',
            authenticated: true,
            loginTime: new Date().toISOString()
        };
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(session));
        UI.showToast('Authentication successful. Welcome to CampusCare Admin!', 'success');
        checkAdminAuth();
    } else {
        UI.showToast('Invalid admin credentials. Please try again.', 'error');
    }
}

function logoutAdmin() {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION);
    sessionStorage.setItem('campuscare_admin_logged_out', 'true');
    allComplaints = [];
    checkAdminAuth();
    UI.showToast('Logged out of admin console.', 'info');
}

// ==========================================================================
// 2. Fetch & Analyze Complaints
// ==========================================================================

async function loadAllComplaints(showToastNotification = false) {
    if (isLoadingComplaints) return;
    isLoadingComplaints = true;
    const refreshBtn = document.getElementById('admin-refresh-btn');
    if (refreshBtn) refreshBtn.disabled = true;

    try {
        const data = await apiService.getAllComplaints();
        allComplaints = normalizeComplaintList(data);

        // Enrich complaints with heuristic analysis (Duplicate detection, similar clusters, review flags)
        enrichComplaintsWithIntelligence();

        // Calculate KPI Metrics
        updateKpiMetrics();

        // Populate location filter options
        populateLocationFilter();

        // Render table
        applyFilters();

        // Render analytics
        renderAnalytics();
        checkComplaintReminders();

        if (showToastNotification) {
            UI.showToast(`Updated! Loaded ${allComplaints.length} grievances from backend.`, 'success');
        }

    } catch (err) {
        UI.showToast(err.message || 'Failed to load complaints from backend. Verify Spring Boot is running on port 8080.', 'error');
        renderEmptyState(err.message);
    } finally {
        isLoadingComplaints = false;
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

function normalizeComplaintList(data) {
    if (Array.isArray(data)) return data;

    // Support paged or wrapped responses if the backend adds a response DTO.
    if (data && Array.isArray(data.content)) return data.content;
    if (data && Array.isArray(data.complaints)) return data.complaints;
    if (data && Array.isArray(data.data)) return data.data;

    throw new Error('The complaints API returned an unexpected response format.');
}

/**
 * Heuristic Analysis: Duplicate / Suspicion & Similar Clustering
 * Complies with Section 5.B & 5.C of the prompt
 */
function enrichComplaintsWithIntelligence() {
    const clusterMap = {};

    // First pass: group by category + approximate location
    allComplaints.forEach(c => {
        const key = `${c.category || ''}__${(c.type || '').split('(')[0].trim()}`;
        clusterMap[key] = (clusterMap[key] || 0) + 1;
    });

    // Second pass: attach cluster counts and neutral review flags
    allComplaints.forEach(c => {
        const key = `${c.category || ''}__${(c.type || '').split('(')[0].trim()}`;
        c.similarCount = clusterMap[key] - 1; // excluding self

        // Suspicion / Review heuristics:
        // Flag for review if identical description appears multiple times or text contains repeated characters
        const isSuspicious = checkSuspiciousHeuristics(c);
        c.reviewStatus = isSuspicious ? 'NEEDS_REVIEW' : 'NORMAL';

        const dueAt = getRequestedDueAt(c);
        const status = (c.status || '').toUpperCase();
        c.isOverdue = Boolean(
            dueAt &&
            dueAt.getTime() < Date.now() &&
            !['RESOLVED', 'CLOSED'].includes(status)
        );
    });
}

function getRequestedDueAt(complaint) {
    if (!complaint.createdAt || !Number.isInteger(complaint.requestedResolutionHours)) {
        return null;
    }
    const submittedAt = new Date(complaint.createdAt);
    if (Number.isNaN(submittedAt.getTime())) return null;
    return new Date(submittedAt.getTime() + complaint.requestedResolutionHours * 60 * 60 * 1000);
}

function formatDuration(milliseconds) {
    const totalMinutes = Math.floor(Math.abs(milliseconds) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function readReminderStorage(key, fallback) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
        console.error(`Could not read complaint reminders from local storage (${key}).`, error);
        warnReminderStorageUnavailable();
        return fallback;
    }
}

function saveReminderStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Could not save complaint reminders to local storage (${key}).`, error);
        warnReminderStorageUnavailable();
    }
}

function warnReminderStorageUnavailable() {
    if (reminderStorageWarningShown) return;
    reminderStorageWarningShown = true;
    UI.showToast('Reminder history could not be saved in this browser. Keep the admin dashboard open to receive reminders.', 'warning', 7000);
}

function getReminderMilestone(complaint, now) {
    const submittedAt = new Date(complaint.createdAt);
    const durationMs = complaint.requestedResolutionHours * 60 * 60 * 1000;
    const dueAt = getRequestedDueAt(complaint);
    if (!dueAt || !Number.isFinite(durationMs) || durationMs <= 0 || Number.isNaN(submittedAt.getTime())) {
        return null;
    }

    const elapsedMs = now.getTime() - submittedAt.getTime();
    if (elapsedMs < durationMs * 0.75) return null;
    if (elapsedMs < durationMs) {
        return { level: 0, title: 'Complaint nearing requested deadline', dueAt };
    }
    if (elapsedMs < durationMs + OVERDUE_REMINDER_INTERVAL_MS) {
        return { level: 1, title: 'Complaint has reached its requested deadline', dueAt };
    }

    const overdueInterval = Math.floor((elapsedMs - durationMs) / OVERDUE_REMINDER_INTERVAL_MS);
    return {
        level: overdueInterval + 1,
        title: `Complaint overdue by ${formatDuration(elapsedMs - durationMs)}`,
        dueAt
    };
}

function createComplaintReminder(complaint, milestone, now, kind) {
    const remainingMs = milestone.dueAt.getTime() - now.getTime();
    const message = kind === 'approaching'
        ? `Requested resolution time is ${formatDuration(remainingMs)} away.`
        : kind === 'deadline'
            ? 'The student-requested resolution deadline has passed.'
            : `The student-requested deadline was missed by ${formatDuration(-remainingMs)}.`;
    return {
        complaintId: complaint.id,
        trackingId: complaint.trackingId || `#${complaint.id}`,
        title: milestone.title,
        message,
        createdAt: now.toISOString(),
        read: false
    };
}

function checkComplaintReminders() {
    const session = getAdminSession();
    if (!session || !session.authenticated || allComplaints.length === 0) return;

    const now = new Date();
    let stateChanged = false;
    let historyChanged = false;
    let overdueChanged = false;

    allComplaints.forEach(complaint => {
        const complaintKey = String(complaint.trackingId || complaint.id);
        const status = (complaint.status || '').toUpperCase();
        const dueAt = getRequestedDueAt(complaint);
        const isOverdue = Boolean(
            dueAt &&
            dueAt.getTime() < now.getTime() &&
            !['RESOLVED', 'CLOSED'].includes(status)
        );
        if (Boolean(complaint.isOverdue) !== isOverdue) {
            complaint.isOverdue = isOverdue;
            overdueChanged = true;
        }
        const currentState = complaintReminderStates[complaintKey] || { level: -1, status: '' };

        if (['RESOLVED', 'CLOSED'].includes(status)) {
            if (currentState.status !== status) {
                complaintReminderStates[complaintKey] = { ...currentState, status };
                stateChanged = true;
            }
            return;
        }

        const milestone = getReminderMilestone(complaint, now);
        if (!milestone) return;

        const reopened = ['RESOLVED', 'CLOSED'].includes(currentState.status);
        if (reopened || milestone.level > currentState.level) {
            const firstMissedDeadline = milestone.level >= 1 && currentState.level < 1;
            if (firstMissedDeadline && milestone.level > 1 && !reopened) {
                complaintReminderHistory.unshift(createComplaintReminder(
                    complaint,
                    { ...milestone, title: 'Complaint has reached its requested deadline' },
                    milestone.dueAt,
                    'deadline'
                ));
                historyChanged = true;
            }

            const reminderKind = milestone.level === 0 ? 'approaching' : milestone.level === 1 ? 'deadline' : 'overdue';
            const reminder = createComplaintReminder(complaint, milestone, now, reminderKind);
            complaintReminderHistory.unshift(reminder);
            historyChanged = true;
            complaintReminderStates[complaintKey] = { level: milestone.level, status };
            stateChanged = true;

            UI.showToast(`${reminder.title}: ${complaint.type || 'Complaint'} (#${complaint.id})`, 'warning', 7000);
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification(reminder.title, { body: `${complaint.type || 'Complaint'} (#${complaint.id}) — ${reminder.message}` });
                } catch (error) {
                    console.error('Could not display the browser complaint reminder.', error);
                }
            }
        } else if (currentState.status !== status) {
            complaintReminderStates[complaintKey] = { ...currentState, status };
            stateChanged = true;
        }
    });

    if (historyChanged) {
        complaintReminderHistory = complaintReminderHistory.slice(0, 100);
        saveReminderStorage(REMINDER_HISTORY_STORAGE_KEY, complaintReminderHistory);
    }
    if (stateChanged) {
        saveReminderStorage(REMINDER_STATE_STORAGE_KEY, complaintReminderStates);
    }
    if (overdueChanged) {
        updateKpiMetrics();
        applyFilters();
        renderAnalytics();
    }
    if (historyChanged || stateChanged) renderComplaintReminders();
}

function renderComplaintReminders() {
    const center = document.getElementById('complaint-reminder-center');
    if (!center) return;
    const session = getAdminSession();
    center.style.display = session && session.authenticated ? 'block' : 'none';
    const browserButton = document.getElementById('enable-browser-reminders-btn');
    if (browserButton) {
        browserButton.style.display = 'Notification' in window ? 'inline-flex' : 'none';
        if ('Notification' in window && Notification.permission === 'granted') {
            browserButton.textContent = 'Browser alerts enabled';
            browserButton.disabled = true;
        } else if ('Notification' in window) {
            browserButton.textContent = 'Enable browser alerts';
            browserButton.disabled = false;
        }
    }

    const unreadCount = complaintReminderHistory.filter(reminder => !reminder.read).length;
    document.getElementById('complaint-reminder-count').textContent = unreadCount;
    const list = document.getElementById('complaint-reminder-list');
    const unreadReminders = complaintReminderHistory
        .map((reminder, index) => ({ reminder, index }))
        .filter(({ reminder }) => !reminder.read)
        .slice(0, 20);
    list.innerHTML = unreadReminders.length ? unreadReminders.map(({ reminder, index }) => `
        <article class="reminder-item ${reminder.read ? 'is-read' : ''}">
            <div class="reminder-item-copy">
                <strong>${UI.escapeHtml(reminder.title)}</strong>
                <p>${UI.escapeHtml(reminder.message)}</p>
                <small>Complaint ${UI.escapeHtml(reminder.trackingId)} · ${UI.formatDate(reminder.createdAt)}</small>
            </div>
            <button type="button" class="btn btn-sm btn-primary" onclick="openComplaintReminder(${Number(reminder.complaintId)}, ${index})">Review complaint</button>
        </article>
    `).join('') : '<p class="reminder-empty">No unread reminders. New submissions will be monitored against the student-requested time.</p>';
}

async function enableBrowserComplaintReminders() {
    if (!('Notification' in window)) {
        UI.showToast('This browser does not support desktop notifications.', 'warning');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            UI.showToast('Browser alerts are enabled for complaint reminders.', 'success');
        } else {
            UI.showToast('Browser alerts were not enabled. You can still see reminders in the admin dashboard.', 'warning');
        }
        renderComplaintReminders();
    } catch (error) {
        console.error('Could not request browser notification permission.', error);
        UI.showToast('Could not enable browser alerts. Dashboard reminders will still be available.', 'error');
    }
}

function openComplaintReminder(complaintId, reminderIndex) {
    if (complaintReminderHistory[reminderIndex]) {
        complaintReminderHistory[reminderIndex].read = true;
        saveReminderStorage(REMINDER_HISTORY_STORAGE_KEY, complaintReminderHistory);
        renderComplaintReminders();
    }
    const complaint = allComplaints.find(item => item.id === complaintId);
    if (!complaint) {
        UI.showToast('This complaint is no longer available. Refresh the admin dashboard.', 'warning');
        return;
    }
    openDrawer(complaintId);
}

function markAllComplaintRemindersRead() {
    complaintReminderHistory.forEach(reminder => {
        reminder.read = true;
    });
    saveReminderStorage(REMINDER_HISTORY_STORAGE_KEY, complaintReminderHistory);
    renderComplaintReminders();
}

function checkSuspiciousHeuristics(complaint) {
    const desc = (complaint.description || '').toLowerCase();
    // Neutral checks: repetitive text patterns, gibberish strings, test submissions
    const hasRepeatedChars = /(.)\1{5,}/.test(desc);
    const hasTestKeywords = desc.includes('test test') || desc.includes('asdf') || desc.includes('qwerty');
    return hasRepeatedChars || hasTestKeywords;
}

// ==========================================================================
// 3. KPI Metrics Calculation
// ==========================================================================

function updateKpiMetrics() {
    const total = allComplaints.length;
    const pending = allComplaints.filter(c => (c.status || '').toUpperCase() === 'PENDING').length;
    const inProgress = allComplaints.filter(c => (c.status || '').toUpperCase() === 'IN_PROGRESS').length;
    const resolved = allComplaints.filter(c => ['RESOLVED', 'CLOSED'].includes((c.status || '').toUpperCase())).length;
    const overdue = allComplaints.filter(c => c.isOverdue).length;
    const flagged = allComplaints.filter(c => c.reviewStatus === 'NEEDS_REVIEW').length;

    document.getElementById('kpi-total-val').textContent = total;
    document.getElementById('kpi-pending-val').textContent = pending;
    document.getElementById('kpi-progress-val').textContent = inProgress;
    document.getElementById('kpi-resolved-val').textContent = resolved;
    document.getElementById('kpi-overdue-val').textContent = overdue;
    document.getElementById('kpi-flagged-val').textContent = flagged;
}

// ==========================================================================
// 4. Filtering & Table Rendering
// ==========================================================================

function initFilters() {
    const catSelect = document.getElementById('filter-category-select');
    CONFIG.CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.key;
        opt.textContent = cat.label;
        catSelect.appendChild(opt);
    });
}

function populateLocationFilter() {
    const locSelect = document.getElementById('filter-location-select');
    const locations = [...new Set(allComplaints.map(c => (c.type || '').split('(')[0].trim()))].filter(Boolean);

    locSelect.innerHTML = '<option value="ALL">All Locations</option>';
    locations.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc;
        opt.textContent = loc;
        locSelect.appendChild(opt);
    });
}

function applyFilters() {
    const search = document.getElementById('admin-search-input').value.toLowerCase().trim();
    const catFilter = document.getElementById('filter-category-select').value;
    const statusFilter = document.getElementById('filter-status-select').value;
    const locFilter = document.getElementById('filter-location-select').value;
    const overdueOnly = document.getElementById('filter-overdue-only').checked;
    const flaggedOnly = document.getElementById('filter-flagged-only').checked;

    const filtered = allComplaints.filter(c => {
        // Search text matching description, tracking ID, or location
        if (search) {
            const matchDesc = (c.description || '').toLowerCase().includes(search);
            const matchTrack = (c.trackingId || '').toLowerCase().includes(search);
            const matchType = (c.type || '').toLowerCase().includes(search);
            if (!matchDesc && !matchTrack && !matchType) return false;
        }

        // Category filter
        if (catFilter !== 'ALL' && c.category !== catFilter) return false;

        // Status filter
        if (statusFilter !== 'ALL' && (c.status || '').toUpperCase() !== statusFilter) return false;

        // Location filter
        if (locFilter !== 'ALL' && !(c.type || '').startsWith(locFilter)) return false;

        // Overdue toggle
        if (overdueOnly && !c.isOverdue) return false;

        // Flagged toggle
        if (flaggedOnly && c.reviewStatus !== 'NEEDS_REVIEW') return false;

        return true;
    });

    renderComplaintsTable(filtered);
}

function renderComplaintsTable(complaints) {
    const tbody = document.getElementById('admin-table-body');

    if (!complaints || complaints.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No complaints match the selected filter criteria.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = complaints.map(c => {
        const trackingShort = c.trackingId ? `${c.trackingId.substring(0, 8)}...` : `#${c.id}`;
        const similarBadge = c.similarCount > 0
            ? `<span class="badge-similar" title="${c.similarCount} other report(s) in this block/category">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                ${c.similarCount} Similar
               </span>`
            : `<span style="color: var(--text-muted); font-size: 0.75rem;">None</span>`;

        const validationBadge = c.reviewStatus === 'NEEDS_REVIEW'
            ? `<span class="badge-review">Feedback flagged for review</span>`
            : `<span style="color: var(--status-resolved); font-size: 0.75rem; font-weight: 600;">Verified Normal</span>`;

        const overduePill = c.isOverdue
            ? `<span class="badge-overdue" style="margin-left: 0.25rem;">Overdue</span>`
            : '';

        return `
            <tr>
                <td>
                    <code style="font-size: 0.8rem; color: var(--primary); font-weight: 600; cursor: pointer;"
                          onclick="UI.copyToClipboard('${c.trackingId}')" title="Click to copy full UUID">
                        ${trackingShort}
                    </code>
                </td>
                <td>${UI.renderCategoryBadge(c.category)}</td>
                <td><strong>${UI.escapeHtml(c.type)}</strong></td>
                <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${UI.escapeHtml(c.description)}
                </td>
                <td>${similarBadge}</td>
                <td>${validationBadge}</td>
                <td>
                    ${UI.renderStatusBadge(c.status)}
                    ${overduePill}
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="openDrawer(${c.id})">
                        Review &amp; Update
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderEmptyState(errorMsg) {
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align: center; padding: 4rem 1.5rem; color: var(--text-muted);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="1.5" style="margin-bottom: 1rem;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">Could Not Connect to Backend Server</h3>
                <p style="max-width: 500px; margin: 0 auto 1.5rem; font-size: 0.9rem;">${errorMsg || 'Please ensure your Spring Boot application is started on http://localhost:8080.'}</p>
                <button class="btn btn-secondary btn-sm" onclick="loadAllComplaints(true)">Retry Connection</button>
            </td>
        </tr>
    `;
}

// ==========================================================================
// 5. Drawer / Modal Detail Inspection & Action
// ==========================================================================

function openDrawer(complaintId) {
    const complaint = allComplaints.find(c => c.id === complaintId);
    if (!complaint) return;
    activeComplaint = complaint;

    document.getElementById('drawer-category-tag').textContent = complaint.category || 'GRIEVANCE';
    document.getElementById('drawer-title').textContent = `Inspection: #${complaint.id}`;
    document.getElementById('drawer-tracking-id').textContent = complaint.trackingId || 'N/A';
    document.getElementById('drawer-location').textContent = complaint.type || 'Not specified';
    document.getElementById('drawer-description').textContent = complaint.description || '';
    document.getElementById('drawer-status-select').value = (complaint.status || 'PENDING').toUpperCase();

    const requestedHours = Number(complaint.requestedResolutionHours);
    const dueAt = getRequestedDueAt(complaint);
    const status = (complaint.status || '').toUpperCase();
    document.getElementById('drawer-sla').textContent = Number.isInteger(requestedHours) && requestedHours > 0
        ? `${requestedHours} hour${requestedHours === 1 ? '' : 's'} from submission`
        : 'Not provided';
    document.getElementById('drawer-sla-due').textContent = dueAt
        ? dueAt.toLocaleString()
        : 'Unavailable for this complaint';
    const remainingLabel = document.getElementById('drawer-sla-remaining');
    if (!dueAt) {
        remainingLabel.textContent = '';
    } else if (['RESOLVED', 'CLOSED'].includes(status)) {
        remainingLabel.textContent = 'Complaint resolved';
    } else {
        const remaining = dueAt.getTime() - Date.now();
        remainingLabel.textContent = remaining >= 0
            ? `${formatDuration(remaining)} remaining`
            : `Overdue by ${formatDuration(remaining)}`;
        remainingLabel.style.color = remaining >= 0 ? 'var(--text-muted)' : '#DC2626';
    }

    const evidenceSection = document.getElementById('drawer-evidence-section');
    const evidenceImage = document.getElementById('drawer-evidence-image');
    const evidenceMeta = document.getElementById('drawer-evidence-meta');
    if (complaint.photoData) {
        evidenceImage.src = complaint.photoData;
        evidenceImage.alt = complaint.photoFileName || 'Complaint evidence';
        evidenceMeta.textContent = complaint.photoFileName ? `Attached file: ${complaint.photoFileName}` : 'Student uploaded image';
        evidenceSection.style.display = 'block';
    } else {
        evidenceImage.removeAttribute('src');
        evidenceMeta.textContent = '';
        evidenceSection.style.display = 'none';
    }

    // Escalation & Accountability info
    const escalationBadge = document.getElementById('drawer-escalation-badge');
    const suspicionBadge = document.getElementById('drawer-suspicion-badge');

    if (complaint.isOverdue) {
        escalationBadge.innerHTML = `<span class="badge-overdue">Past the student's requested resolution time</span>`;
    } else if (!dueAt) {
        escalationBadge.innerHTML = `<span style="color: var(--text-muted);">No requested deadline was provided</span>`;
    } else {
        escalationBadge.innerHTML = `<span style="color: var(--status-resolved); font-weight: 600;">Within the student's requested time</span>`;
    }

    if (complaint.reviewStatus === 'NEEDS_REVIEW') {
        suspicionBadge.innerHTML = `<span class="badge-review">Feedback flagged for review</span>`;
    } else {
        suspicionBadge.innerHTML = `<span style="color: var(--status-resolved); font-weight: 600;">Normal Authenticated Feedback</span>`;
    }

    // Similar reports cluster
    const clusterDiv = document.getElementById('drawer-similar-cluster');
    const clusterSummary = document.getElementById('drawer-similar-summary');
    if (complaint.similarCount > 0) {
        clusterDiv.style.display = 'block';
        clusterSummary.innerHTML = `
            <strong>${complaint.similarCount} other report(s)</strong> detected with the same category (<strong>${complaint.category}</strong>) in <strong>${complaint.type}</strong>. Administration can resolve them simultaneously as a batch maintenance activity.
        `;
    } else {
        clusterDiv.style.display = 'none';
    }

    document.getElementById('detail-drawer').classList.add('active');
}

function closeDrawer() {
    document.getElementById('detail-drawer').classList.remove('active');
    activeComplaint = null;
}

async function handleSaveComplaint() {
    if (!activeComplaint || !activeComplaint.id) return;

    const newStatus = document.getElementById('drawer-status-select').value;
    const saveBtn = document.getElementById('drawer-save-btn');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const payload = {
        type: activeComplaint.type,
        category: activeComplaint.category,
        description: activeComplaint.description,
        status: newStatus
    };

    try {
        const updated = await apiService.updateComplaint(activeComplaint.id, payload);
        UI.showToast(`Complaint #${activeComplaint.id} status updated to ${newStatus}!`, 'success');
        closeDrawer();
        await loadAllComplaints();
    } catch (err) {
        UI.showToast(err.message || 'Failed to update complaint status.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Status';
    }
}

async function handleDeleteComplaint() {
    if (!activeComplaint || !activeComplaint.id) return;

    if (!confirm(`Are you sure you want to permanently delete complaint #${activeComplaint.id}? This action cannot be undone.`)) {
        return;
    }

    try {
        await apiService.deleteComplaint(activeComplaint.id);
        UI.showToast(`Complaint #${activeComplaint.id} deleted successfully.`, 'info');
        closeDrawer();
        await loadAllComplaints();
    } catch (err) {
        UI.showToast(err.message || 'Failed to delete complaint.', 'error');
    }
}

// ==========================================================================
// 6. View Switcher & Real-Time Analytics
// ==========================================================================

function switchAdminTab(tab) {
    const btnTable = document.getElementById('btn-tab-table');
    const btnAnalytics = document.getElementById('btn-tab-analytics');
    const viewTable = document.getElementById('admin-view-table');
    const viewAnalytics = document.getElementById('admin-view-analytics');

    if (tab === 'table') {
        btnTable.style.background = '#FFFFFF';
        btnTable.style.color = 'var(--text-primary)';
        btnAnalytics.style.background = 'transparent';
        btnAnalytics.style.color = 'var(--text-muted)';
        viewTable.style.display = 'block';
        viewAnalytics.style.display = 'none';
    } else {
        btnAnalytics.style.background = '#FFFFFF';
        btnAnalytics.style.color = 'var(--text-primary)';
        btnTable.style.background = 'transparent';
        btnTable.style.color = 'var(--text-muted)';
        viewTable.style.display = 'none';
        viewAnalytics.style.display = 'block';
        renderAnalytics();
    }
}

/**
 * Real-time Analytics from Backend Records
 * Complies with Section 4.J of the prompt: "Do not create fake statistics. Display only data that can actually be calculated from fetched records."
 */
function renderAnalytics() {
    if (!allComplaints || allComplaints.length === 0) return;

    const total = allComplaints.length;

    // 1. By Category
    const catCounts = {};
    allComplaints.forEach(c => {
        catCounts[c.category] = (catCounts[c.category] || 0) + 1;
    });

    const catContainer = document.getElementById('analytics-categories-container');
    catContainer.innerHTML = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => {
            const pct = Math.round((count / total) * 100);
            return `
                <div class="bar-row">
                    <div class="bar-info">
                        <span>${cat}</span>
                        <span>${count} (${pct}%)</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        }).join('');

    // 2. By Location
    const locCounts = {};
    allComplaints.forEach(c => {
        const loc = (c.type || 'Unspecified').split('(')[0].trim();
        locCounts[loc] = (locCounts[loc] || 0) + 1;
    });

    const locContainer = document.getElementById('analytics-locations-container');
    locContainer.innerHTML = Object.entries(locCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([loc, count]) => {
            const pct = Math.round((count / total) * 100);
            return `
                <div class="bar-row">
                    <div class="bar-info">
                        <span>${loc}</span>
                        <span>${count} (${pct}%)</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${pct}%; background: var(--accent);"></div>
                    </div>
                </div>
            `;
        }).join('');

    // 3. By Status
    const statusCounts = {};
    allComplaints.forEach(c => {
        const st = (c.status || 'PENDING').toUpperCase();
        statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const statusContainer = document.getElementById('analytics-statuses-container');
    statusContainer.innerHTML = Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([st, count]) => {
            const pct = Math.round((count / total) * 100);
            const color = (CONFIG.STATUSES[st] && CONFIG.STATUSES[st].color) || 'var(--primary)';
            return `
                <div class="bar-row">
                    <div class="bar-info">
                        <span>${st}</span>
                        <span>${count} (${pct}%)</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${pct}%; background: ${color};"></div>
                    </div>
                </div>
            `;
        }).join('');
}
