/**
 * CampusCare - API Integration Layer
 * Robust REST client with friendly error handling for Spring Boot backend
 * Includes transparent offline / GitHub Pages local storage synchronization
 */

const DEFAULT_PREVIOUS_COMPLAINTS = [
    {
        id: 101,
        trackingId: "CC-2026-8941",
        type: "Hostel Block A (Room 302)",
        category: "WATER",
        description: "Severe water leakage from the washroom overhead pipe causing continuous water stagnation on the floor.",
        requestedResolutionHours: 12,
        status: "IN_PROGRESS",
        createdAt: "2026-10-30T09:15:00",
        photoData: null,
        photoFileName: null,
        photoMimeType: null
    },
    {
        id: 102,
        trackingId: "CC-2026-7723",
        type: "Central Mess",
        category: "FOOD",
        description: "Drinking water dispenser near dining table 4 is not cooling and the water tastes chlorinated.",
        requestedResolutionHours: 24,
        status: "PENDING",
        createdAt: "2026-10-31T08:00:00",
        photoData: null,
        photoFileName: null,
        photoMimeType: null
    },
    {
        id: 103,
        trackingId: "CC-2026-6415",
        type: "Academic Block (CSE Lab 2)",
        category: "ELECTRICITY",
        description: "Multiple power sockets along row 4 have no electricity output, hindering practical work.",
        requestedResolutionHours: 8,
        status: "RESOLVED",
        createdAt: "2026-10-28T11:30:00",
        photoData: null,
        photoFileName: null,
        photoMimeType: null
    },
    {
        id: 104,
        trackingId: "CC-2026-5590",
        type: "Girls Hostel (Floor 3)",
        category: "CLEANLINESS",
        description: "Common corridor trash containers overflowing since yesterday, needs prompt disposal and floor mopping.",
        requestedResolutionHours: 6,
        status: "IN_PROGRESS",
        createdAt: "2026-10-30T14:00:00",
        photoData: null,
        photoFileName: null,
        photoMimeType: null
    },
    {
        id: 105,
        trackingId: "CC-2026-4819",
        type: "Hostel Block B (Room 114)",
        category: "HOSTEL_ROOM",
        description: "Main room door lock cylinder is jammed and window latch is completely loose.",
        requestedResolutionHours: 24,
        status: "PENDING",
        createdAt: "2026-10-31T10:20:00",
        photoData: null,
        photoFileName: null,
        photoMimeType: null
    },
    {
        id: 106,
        trackingId: "CC-2026-3321",
        type: "Campus Facilities (Library)",
        category: "OTHER",
        description: "Wi-Fi access point in 2nd floor library silent reading hall disconnects frequently.",
        requestedResolutionHours: 18,
        status: "RESOLVED",
        createdAt: "2026-10-27T16:45:00",
        photoData: null,
        photoFileName: null,
        photoMimeType: null
    },
    {
        id: 107,
        trackingId: "CC-2026-2187",
        type: "North Campus Mess",
        category: "FOOD",
        description: "Mess breakfast serving counter lacks proper sneeze shields and cutlery was found unwashed.",
        requestedResolutionHours: 24,
        status: "PENDING",
        createdAt: "2026-10-31T07:30:00",
        photoData: null,
        photoFileName: null,
        photoMimeType: null
    },
    {
        id: 108,
        trackingId: "CC-2026-1904",
        type: "Hostel Block C (Room 205)",
        category: "MAINTENANCE",
        description: "Ceiling fan making squeaking noise and speed regulator switch is broken.",
        requestedResolutionHours: 36,
        status: "CLOSED",
        createdAt: "2026-10-26T15:00:00",
        photoData: null,
        photoFileName: null,
        photoMimeType: null
    }
];

const LOCAL_STORAGE_COMPLAINTS_KEY = 'campuscare_complaints_data';

function getStoredComplaints() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_COMPLAINTS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Could not read stored complaints:', e);
    }
    // Seed default complaints
    setStoredComplaints(DEFAULT_PREVIOUS_COMPLAINTS);
    return [...DEFAULT_PREVIOUS_COMPLAINTS];
}

function setStoredComplaints(list) {
    try {
        localStorage.setItem(LOCAL_STORAGE_COMPLAINTS_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('Could not persist complaints locally:', e);
    }
}

class ApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || (window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:8080/api/complaints');
    }

    /**
     * Determines whether direct HTTP requests to local Spring Boot backend are supported
     * (e.g. Mixed Content blocking occurs when HTTPS GitHub Pages connects to HTTP localhost)
     */
    canUseRemoteBackend() {
        if (typeof window !== 'undefined') {
            if (window.location.protocol === 'https:' && this.baseUrl.startsWith('http://')) {
                return false;
            }
        }
        return true;
    }

    /**
     * Generic fetch wrapper with timeout and error handling
     */
    async request(url, options = {}) {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout
            config.signal = controller.signal;

            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // Handle empty responses
            const contentType = response.headers.get('content-type') || '';
            let data = null;
            const body = await response.text();
            const looksLikeJson = body.trim().startsWith('{') || body.trim().startsWith('[');
            if (contentType.includes('application/json') || looksLikeJson) {
                if (!body.trim()) {
                    data = null;
                } else {
                    try {
                        data = JSON.parse(body);
                    } catch {
                        data = body;
                    }
                }
            } else {
                data = body;
            }

            if (!response.ok) {
                throw this.formatError(response.status, data);
            }

            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('CampusCare server request timed out.');
            }
            if (error.message && error.message.includes('Failed to fetch')) {
                throw new Error('CampusCare backend server is currently unreachable.');
            }
            throw error;
        }
    }

    /**
     * Convert raw backend / Spring Boot validation errors into friendly messages
     */
    formatError(status, data) {
        if (status === 400 && typeof data === 'object' && data !== null) {
            const errorMessages = Object.entries(data)
                .map(([field, msg]) => `• ${msg}`)
                .join('\n');
            const err = new Error(errorMessages || 'Validation failed for submitted data.');
            err.fieldErrors = data;
            return err;
        }

        if (status === 404) {
            return new Error('The requested complaint or tracking record was not found.');
        }

        if (status === 500) {
            return new Error('CampusCare backend encountered an internal error. Please try again.');
        }

        const fallback = typeof data === 'string' ? data : (data?.message || 'Unexpected server error occurred.');
        return new Error(fallback);
    }

    // --- High-level CRUD operations mapped to Spring Boot endpoints with Local Storage Fallback ---

    /**
     * Submit a new complaint
     * POST /api/complaints
     */
    async createComplaint(payload) {
        const newRecord = {
            id: Date.now(),
            trackingId: 'CC-2026-' + Math.floor(1000 + Math.random() * 9000),
            type: payload.type,
            category: payload.category,
            description: payload.description,
            requestedResolutionHours: Number(payload.requestedResolutionHours) || 24,
            status: payload.status || 'PENDING',
            createdAt: new Date().toISOString(),
            photoData: payload.photoData || null,
            photoFileName: payload.photoFileName || null,
            photoMimeType: payload.photoMimeType || null
        };

        if (this.canUseRemoteBackend()) {
            try {
                const body = {
                    type: payload.type,
                    category: payload.category,
                    description: payload.description,
                    requestedResolutionHours: payload.requestedResolutionHours,
                    status: payload.status || 'PENDING',
                    photoData: payload.photoData || null,
                    photoFileName: payload.photoFileName || null,
                    photoMimeType: payload.photoMimeType || null
                };
                const remote = await this.request(this.baseUrl, {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
                if (remote && remote.id) {
                    const localList = getStoredComplaints();
                    localList.unshift(remote);
                    setStoredComplaints(localList);
                    return remote;
                }
            } catch (err) {
                console.warn('Backend unavailable, saving complaint locally:', err.message);
            }
        }

        // Save locally in all cases (GitHub Pages or fallback)
        const localList = getStoredComplaints();
        localList.unshift(newRecord);
        setStoredComplaints(localList);
        return newRecord;
    }

    /**
     * Get all complaints (Admin view)
     * GET /api/complaints
     */
    async getAllComplaints() {
        if (!this.canUseRemoteBackend()) {
            return getStoredComplaints();
        }

        try {
            const data = await this.request(this.baseUrl, { method: 'GET' });
            let list = [];
            if (Array.isArray(data)) list = data;
            else if (data && Array.isArray(data.content)) list = data.content;
            else if (data && Array.isArray(data.complaints)) list = data.complaints;
            else if (data && Array.isArray(data.data)) list = data.data;

            if (list.length > 0) {
                setStoredComplaints(list);
                return list;
            }
            return getStoredComplaints();
        } catch (err) {
            console.warn('Backend unavailable, loading cached/default complaints:', err.message);
            return getStoredComplaints();
        }
    }

    /**
     * Get complaint by tracking ID
     * GET /api/complaints/track/{trackingId}
     */
    async getComplaintByTrackingId(trackingId) {
        const cleanId = (trackingId || '').trim();
        if (this.canUseRemoteBackend()) {
            try {
                const data = await this.request(`${this.baseUrl}/track/${encodeURIComponent(cleanId)}`, {
                    method: 'GET'
                });
                if (data) return data;
            } catch (err) {
                console.warn('Remote tracking search failed, checking local database:', err.message);
            }
        }

        const localList = getStoredComplaints();
        const found = localList.find(c =>
            (c.trackingId && c.trackingId.toLowerCase() === cleanId.toLowerCase()) ||
            String(c.id) === cleanId
        );

        if (found) return found;
        throw new Error('Complaint record not found for tracking reference: ' + cleanId);
    }

    /**
     * Get complaint by numeric ID
     * GET /api/complaints/{id}
     */
    async getComplaintById(id) {
        if (this.canUseRemoteBackend()) {
            try {
                const data = await this.request(`${this.baseUrl}/${id}`, { method: 'GET' });
                if (data) return data;
            } catch (err) {
                console.warn('Remote id search failed, checking local database:', err.message);
            }
        }

        const localList = getStoredComplaints();
        const found = localList.find(c => c.id === id || String(c.id) === String(id));
        if (found) return found;
        throw new Error('Complaint not found with ID ' + id);
    }

    /**
     * Filter complaints by category
     * GET /api/complaints/category/{category}
     */
    async getComplaintsByCategory(category) {
        if (this.canUseRemoteBackend()) {
            try {
                const data = await this.request(`${this.baseUrl}/category/${encodeURIComponent(category)}`, {
                    method: 'GET'
                });
                if (Array.isArray(data) && data.length > 0) return data;
            } catch (err) {
                console.warn('Remote category search failed:', err.message);
            }
        }

        const localList = getStoredComplaints();
        return localList.filter(c => (c.category || '').toUpperCase() === (category || '').toUpperCase());
    }

    /**
     * Update complaint details/status
     * PUT /api/complaints/{id}
     */
    async updateComplaint(id, payload) {
        if (this.canUseRemoteBackend()) {
            try {
                const body = {
                    ...payload,
                    photoData: payload.photoData || null,
                    photoFileName: payload.photoFileName || null,
                    photoMimeType: payload.photoMimeType || null
                };
                await this.request(`${this.baseUrl}/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body)
                });
            } catch (err) {
                console.warn('Remote update failed, updating local database:', err.message);
            }
        }

        const localList = getStoredComplaints();
        const index = localList.findIndex(c => c.id === id || String(c.id) === String(id));
        if (index !== -1) {
            localList[index] = { ...localList[index], ...payload };
            setStoredComplaints(localList);
            return localList[index];
        }
        return payload;
    }

    /**
     * Delete complaint
     * DELETE /api/complaints/{id}
     */
    async deleteComplaint(id) {
        if (this.canUseRemoteBackend()) {
            try {
                await this.request(`${this.baseUrl}/${id}`, { method: 'DELETE' });
            } catch (err) {
                console.warn('Remote delete failed, deleting locally:', err.message);
            }
        }

        let localList = getStoredComplaints();
        localList = localList.filter(c => c.id !== id && String(c.id) !== String(id));
        setStoredComplaints(localList);
        return "Complaint deleted successfully";
    }
}

window.apiService = new ApiService();
