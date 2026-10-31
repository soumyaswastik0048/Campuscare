/**
 * CampusCare - Student Portal Controller
 * Anonymous Submission, Real-Time Tracking, and Resolution Confirmation
 */

let selectedCategory = null;
let currentTrackingComplaint = null;
let attachedEvidenceFiles = [];

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initAuthStatus();
    initCategoryGrid();
    initLocationDropdown();
    initTabNavigation();
    initUrlParams();
    updateHistoryBadge();
});

// ==========================================================================
// 1. Authentication & Verification
// ==========================================================================

function initAuthStatus() {
    const session = getStudentSession();
    const container = document.getElementById('student-auth-status');
    const sidebarName = document.getElementById('sidebar-student-name');
    const sidebarEmail = document.getElementById('sidebar-student-email');
    const initials = document.getElementById('avatar-initials');
    const submitButton = document.getElementById('submit-complaint-btn');

    if (session && session.verified) {
        container.innerHTML = `
            <span class="badge badge-resolved" title="Verified Campus Student">
                <span class="badge-dot"></span> Verified Student
            </span>
            <button class="btn btn-sm btn-secondary" onclick="logoutStudent()">Exit</button>
        `;
        sidebarName.textContent = 'Verified Student';
        sidebarEmail.textContent = 'Session: ' + session.email.replace(/(.{3})(.*)(@.*)/, '$1***$3');
        initials.textContent = session.email.substring(0, 2).toUpperCase();
        submitButton.disabled = false;
        submitButton.title = '';
        submitButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Submit Grievance
        `;
    } else {
        container.innerHTML = `
            <button class="btn btn-sm btn-outline" onclick="openAuthModal()">
                Verify College Email
            </button>
        `;
        sidebarName.textContent = 'Guest / Anonymous';
        sidebarEmail.textContent = 'Not yet verified';
        initials.textContent = 'AN';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.title = 'Verify your college email before submitting a complaint';
            submitButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Verify to Submit
            `;
        }
    }
}

function getStudentSession() {
    try {
        const stored = sessionStorage.getItem(CONFIG.STORAGE_KEYS.STUDENT_SESSION);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

function openAuthModal() {
    document.getElementById('auth-modal').style.display = 'flex';
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('otp-group').style.display = 'none';
    document.getElementById('auth-submit-btn').textContent = 'Verify Identity';
}

let pendingAuthEmail = '';
function handleAuthSubmit(event) {
    event.preventDefault();
    const emailInput = document.getElementById('auth-email-input');
    const otpInput = document.getElementById('auth-otp-input');
    const otpGroup = document.getElementById('otp-group');
    const btn = document.getElementById('auth-submit-btn');

    if (otpGroup.style.display === 'none') {
        const email = emailInput.value.trim().toLowerCase();
        if (!email.includes('@')) {
            UI.showToast('Please enter a valid student email address.', 'error');
            return;
        }
        pendingAuthEmail = email;
        otpGroup.style.display = 'block';
        btn.textContent = 'Confirm OTP';
        UI.showToast('OTP sent to student email (Demo OTP: 123456)', 'info');
        otpInput.focus();
    } else {
        const otp = otpInput.value.trim();
        if (otp === '123456' || otp.length === 6) {
            const session = {
                email: pendingAuthEmail,
                verified: true,
                verifiedAt: new Date().toISOString()
            };
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.STUDENT_SESSION, JSON.stringify(session));
            UI.showToast('Student identity verified successfully! Your anonymity is strictly preserved.', 'success');
            closeAuthModal();
            initAuthStatus();
        } else {
            UI.showToast('Invalid OTP. Please enter 123456 for the demo.', 'error');
        }
    }
}

function logoutStudent() {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.STUDENT_SESSION);
    initAuthStatus();
    UI.showToast('Student session cleared.', 'info');
}

// ==========================================================================
// 2. UI Initialization (Categories & Locations)
// ==========================================================================

function initCategoryGrid() {
    const container = document.getElementById('category-grid-container');
    container.innerHTML = '';

    const categoryIcons = {
        FOOD: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>`,
        HOSTEL_ROOM: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/></svg>`,
        CLEANLINESS: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L9.5 8.5 3 9.5l5 4.5-1.5 6.5 5.5-3.5 5.5 3.5-1.5-6.5 5-4.5-6.5-1z"/></svg>`,
        WATER: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
        ELECTRICITY: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
        MAINTENANCE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
        OTHER: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></svg>`
    };

    CONFIG.CATEGORIES.forEach(cat => {
        const tile = document.createElement('div');
        tile.className = 'category-tile';
        tile.dataset.categoryKey = cat.key;
        tile.innerHTML = `
            ${categoryIcons[cat.key] || categoryIcons.OTHER}
            <span>${cat.label}</span>
        `;
        tile.onclick = () => selectCategory(cat);
        container.appendChild(tile);
    });
}

function selectCategory(cat) {
    selectedCategory = cat;
    document.getElementById('selected-category').value = cat.key;

    // Highlight selected tile
    document.querySelectorAll('.category-tile').forEach(t => {
        t.classList.toggle('selected', t.dataset.categoryKey === cat.key);
    });

    // Update hints & evidence requirements based on category type
    const hint = document.getElementById('category-guidance-hint');
    const evidenceLabel = document.getElementById('evidence-requirement-label');
    hint.textContent = cat.hint;

    if (cat.requiresEvidence) {
        evidenceLabel.textContent = '(Recommended for physical damage)';
        evidenceLabel.style.color = 'var(--text-muted)';
    } else {
        evidenceLabel.textContent = '(Optional for service/food concerns)';
        evidenceLabel.style.color = 'var(--text-muted)';
    }
}

function initLocationDropdown() {
    const select = document.getElementById('complaint-type');
    select.innerHTML = '<option value="">Select Hostel Block or Location...</option>';
    CONFIG.COMPLAINT_TYPES.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        select.appendChild(opt);
    });
}

// ==========================================================================
// 3. Navigation Tabs
// ==========================================================================

function initTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;
            switchTab(targetId);
        });
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-tab-item').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === tabId);
    });

    if (tabId === 'tab-history') {
        renderHistoryTable();
    }
}

function initUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const trackId = params.get('id');

    if (view === 'track') {
        switchTab('tab-track');
        if (trackId) {
            document.getElementById('track-search-input').value = trackId;
            executeTrackingSearch(trackId);
        }
    }
}

// ==========================================================================
// 4. Complaint Submission (Connected to POST /api/complaints)
// ==========================================================================

function updateCharCount() {
    const desc = document.getElementById('complaint-desc').value;
    const counter = document.getElementById('current-chars');
    counter.textContent = desc.length;
    counter.style.color = desc.length >= 10 ? 'var(--status-resolved)' : 'var(--status-pending)';
}

function handleEvidenceSelect(event) {
    const files = Array.from(event.target.files);
    const previewContainer = document.getElementById('evidence-previews');
    attachedEvidenceFiles = [];
    previewContainer.innerHTML = '';

    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            attachedEvidenceFiles.push({
                name: file.name,
                mimeType: file.type,
                dataUrl
            });

            const item = document.createElement('div');
            item.className = 'evidence-preview-item';
            item.innerHTML = `
                <img src="${dataUrl}" alt="Preview">
                <button type="button" class="evidence-remove-btn" onclick="this.parentElement.remove(); attachedEvidenceFiles = [];">&times;</button>
            `;
            previewContainer.appendChild(item);
        };
        reader.readAsDataURL(file);
    });
}

function requireStudentVerification() {
    const session = getStudentSession();

    if (!session || !session.verified) {
        UI.showToast('Please verify your college email before submitting a complaint.', 'warning');
        openAuthModal();
        return false;
    }

    return true;
}

async function handleComplaintSubmit(event) {
    event.preventDefault();
    if (!requireStudentVerification()) {
        return;
    }

    const categoryInput = document.getElementById('selected-category').value;
    const typeSelect = document.getElementById('complaint-type').value;
    const roomDetail = document.getElementById('location-detail').value.trim();
    const descText = document.getElementById('complaint-desc').value.trim();
    const requestedResolutionHours = Number(document.getElementById('requested-resolution-hours').value);
    const submitBtn = document.getElementById('submit-complaint-btn');

    if (!categoryInput) {
        UI.showToast('Please select a problem category from the grid above.', 'warning');
        return;
    }

    if (!typeSelect) {
        UI.showToast('Please select your hostel block or facility location.', 'warning');
        return;
    }

    if (descText.length < 10) {
        UI.showToast('Description must contain at least 10 characters according to backend validation.', 'warning');
        return;
    }

    if (!Number.isInteger(requestedResolutionHours) || requestedResolutionHours < 1) {
        UI.showToast('Please enter a requested resolution time of at least 1 hour.', 'warning');
        return;
    }

    // Combine location type with room details cleanly
    const fullType = roomDetail ? `${typeSelect} (${roomDetail})` : typeSelect;

    const photo = attachedEvidenceFiles[0] || null;
    const payload = {
        type: fullType,
        category: categoryInput,
        description: descText,
        requestedResolutionHours,
        status: 'PENDING', // Backend @NotBlank requires status
        photoData: photo ? photo.dataUrl : null,
        photoFileName: photo ? photo.name : null,
        photoMimeType: photo ? photo.mimeType : null
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
            <line x1="12" y1="2" x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
            <line x1="2" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="12" x2="22" y2="12"/>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
        Submitting...
    `;

    try {
        const createdComplaint = await apiService.createComplaint(payload);

        UI.showToast('Complaint submitted successfully! Your tracking reference has been generated.', 'success', 5000);

        // Store tracking ID locally in browser
        saveRecentTrackingId(createdComplaint.trackingId);
        updateHistoryBadge();

        // Clear form
        resetFormState();

        // Automatically redirect to tracking tab
        setTimeout(() => {
            switchTab('tab-track');
            document.getElementById('track-search-input').value = createdComplaint.trackingId;
            executeTrackingSearch(createdComplaint.trackingId);
        }, 600);

    } catch (err) {
        UI.showToast(err.message || 'Failed to submit complaint. Verify backend is running.', 'error', 6000);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Submit Grievance
        `;
    }
}

function resetFormState() {
    document.getElementById('complaint-form').reset();
    document.querySelectorAll('.category-tile').forEach(t => t.classList.remove('selected'));
    document.getElementById('selected-category').value = '';
    document.getElementById('evidence-previews').innerHTML = '';
    attachedEvidenceFiles = [];
    updateCharCount();
}

// ==========================================================================
// 5. Tracking Logic (Connected to GET /api/complaints/track/{trackingId})
// ==========================================================================

async function executeTrackingSearch(overrideId) {
    const input = document.getElementById('track-search-input');
    const btn = document.getElementById('track-search-btn');
    const detailsCard = document.getElementById('tracking-details-card');
    const emptyState = document.getElementById('tracking-empty-state');

    const trackingId = overrideId || input.value.trim();

    if (!trackingId) {
        UI.showToast('Please enter a valid tracking UUID.', 'warning');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Searching...';

    try {
        const complaint = await apiService.getComplaintByTrackingId(trackingId);
        currentTrackingComplaint = complaint;

        // Render Complaint Details
        document.getElementById('track-badge-category').textContent = complaint.category || 'GENERAL';
        document.getElementById('track-type-title').textContent = complaint.type || 'Hostel/Mess';
        document.getElementById('track-full-id').textContent = complaint.trackingId || trackingId;
        document.getElementById('track-narrative').textContent = complaint.description || '';
        document.getElementById('track-status-pill').innerHTML = UI.renderStatusBadge(complaint.status);

        // Update Stepper Progress
        updateTrackingStepper(complaint.status);

        // Check if student resolution confirmation is required
        const resBox = document.getElementById('student-resolution-box');
        if (complaint.status === 'RESOLVED') {
            resBox.style.display = 'block';
        } else {
            resBox.style.display = 'none';
        }

        emptyState.style.display = 'none';
        detailsCard.style.display = 'block';

        // Save tracking ID locally
        saveRecentTrackingId(complaint.trackingId);
        updateHistoryBadge();

    } catch (err) {
        UI.showToast(err.message || 'No complaint found matching tracking reference.', 'error');
        detailsCard.style.display = 'none';
        emptyState.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Search Status';
    }
}

function updateTrackingStepper(status) {
    const steps = ['step-1', 'step-2', 'step-3', 'step-4', 'step-5'];
    steps.forEach(s => {
        const el = document.getElementById(s);
        el.classList.remove('completed', 'active');
    });

    const cleanStatus = (status || 'PENDING').toUpperCase();

    if (cleanStatus === 'PENDING') {
        document.getElementById('step-1').classList.add('completed');
        document.getElementById('step-2').classList.add('active');
    } else if (cleanStatus === 'IN_PROGRESS') {
        document.getElementById('step-1').classList.add('completed');
        document.getElementById('step-2').classList.add('completed');
        document.getElementById('step-3').classList.add('active');
    } else if (cleanStatus === 'RESOLVED') {
        document.getElementById('step-1').classList.add('completed');
        document.getElementById('step-2').classList.add('completed');
        document.getElementById('step-3').classList.add('completed');
        document.getElementById('step-4').classList.add('active');
    } else if (cleanStatus === 'CLOSED') {
        steps.forEach(s => document.getElementById(s).classList.add('completed'));
    } else if (cleanStatus === 'REOPENED') {
        document.getElementById('step-1').classList.add('completed');
        document.getElementById('step-2').classList.add('active');
    }
}

// Student Resolution Confirmation Handler
async function confirmResolution(isSolved) {
    if (!currentTrackingComplaint || !currentTrackingComplaint.id) return;

    const newStatus = isSolved ? 'CLOSED' : 'REOPENED';
    const confirmMessage = isSolved
        ? 'Confirm closure of this complaint? This marks the issue officially solved.'
        : 'Reopen this complaint and notify administration that the issue was not resolved?';

    if (!confirm(confirmMessage)) return;

    try {
        const updated = await apiService.updateComplaint(currentTrackingComplaint.id, {
            type: currentTrackingComplaint.type,
            category: currentTrackingComplaint.category,
            description: currentTrackingComplaint.description,
            status: newStatus
        });

        currentTrackingComplaint = updated;
        UI.showToast(isSolved ? 'Issue confirmed and closed. Thank you!' : 'Complaint reopened and escalated.', 'info');
        executeTrackingSearch(updated.trackingId);
    } catch (err) {
        UI.showToast(err.message || 'Failed to update resolution status.', 'error');
    }
}

// ==========================================================================
// 6. Local Anonymous History Storage
// ==========================================================================

function getRecentTrackingIds() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.RECENT_TRACKING_IDS);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveRecentTrackingId(id) {
    if (!id) return;
    const existing = getRecentTrackingIds();
    if (!existing.includes(id)) {
        existing.unshift(id);
        localStorage.setItem(CONFIG.STORAGE_KEYS.RECENT_TRACKING_IDS, JSON.stringify(existing.slice(0, 20)));
    }
}

function updateHistoryBadge() {
    const count = getRecentTrackingIds().length;
    const badge = document.getElementById('my-complaints-count');
    if (badge) badge.textContent = count;
}

async function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    const trackingIds = getRecentTrackingIds();

    if (trackingIds.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No complaints submitted from this device yet.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                Loading your complaint history from server...
            </td>
        </tr>
    `;

    const rows = [];
    for (const tid of trackingIds) {
        try {
            const comp = await apiService.getComplaintByTrackingId(tid);
            rows.push(comp);
        } catch {
            // If deleted or not found, still list ID with unknown
            rows.push({ trackingId: tid, category: 'Unknown', type: 'Archived', status: 'UNKNOWN' });
        }
    }

    tbody.innerHTML = rows.map(item => `
        <tr>
            <td>
                <code style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">
                    ${item.trackingId.substring(0, 13)}...
                </code>
            </td>
            <td>${UI.renderCategoryBadge(item.category)}</td>
            <td><strong>${UI.escapeHtml(item.type)}</strong></td>
            <td>${UI.renderStatusBadge(item.status)}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewHistoryItem('${item.trackingId}')">
                    Track &rarr;
                </button>
            </td>
        </tr>
    `).join('');
}

function viewHistoryItem(tid) {
    switchTab('tab-track');
    document.getElementById('track-search-input').value = tid;
    executeTrackingSearch(tid);
}
