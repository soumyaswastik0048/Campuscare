/**
 * CampusCare - API Integration Layer
 * Robust REST client with friendly error handling for Spring Boot backend
 */

class ApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl || (window.CONFIG ? window.CONFIG.API_BASE_URL : 'http://localhost:8080/api/complaints');
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
            const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout
            config.signal = controller.signal;

            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // Handle empty responses (like 204 or string response from delete)
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
                throw new Error('CampusCare server request timed out. Please verify the backend is running.');
            }
            if (error.message && error.message.includes('Failed to fetch')) {
                throw new Error('CampusCare server is currently unavailable. Please verify the Spring Boot backend is running on http://localhost:8080.');
            }
            throw error;
        }
    }

    /**
     * Convert raw backend / Spring Boot validation errors into friendly messages
     */
    formatError(status, data) {
        if (status === 400 && typeof data === 'object' && data !== null) {
            // Spring Boot GlobalExceptionHandler format: { "description": "...", "type": "..." }
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

    // --- High-level CRUD operations mapped to Spring Boot endpoints ---

    /**
     * Submit a new complaint
     * POST /api/complaints
     */
    async createComplaint(payload) {
        // Enforce required status as backend @NotBlank expects it
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
        return await this.request(this.baseUrl, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    /**
     * Get all complaints (Admin view)
     * GET /api/complaints
     */
    async getAllComplaints() {
        return await this.request(this.baseUrl, {
            method: 'GET'
        });
    }

    /**
     * Get complaint by tracking ID
     * GET /api/complaints/track/{trackingId}
     */
    async getComplaintByTrackingId(trackingId) {
        const cleanId = encodeURIComponent(trackingId.trim());
        return await this.request(`${this.baseUrl}/track/${cleanId}`, {
            method: 'GET'
        });
    }

    /**
     * Get complaint by numeric ID
     * GET /api/complaints/{id}
     */
    async getComplaintById(id) {
        return await this.request(`${this.baseUrl}/${id}`, {
            method: 'GET'
        });
    }

    /**
     * Filter complaints by category
     * GET /api/complaints/category/{category}
     */
    async getComplaintsByCategory(category) {
        return await this.request(`${this.baseUrl}/category/${encodeURIComponent(category)}`, {
            method: 'GET'
        });
    }

    /**
     * Update complaint details/status
     * PUT /api/complaints/{id}
     */
    async updateComplaint(id, payload) {
        const body = {
            ...payload,
            photoData: payload.photoData || null,
            photoFileName: payload.photoFileName || null,
            photoMimeType: payload.photoMimeType || null
        };
        return await this.request(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    /**
     * Delete complaint
     * DELETE /api/complaints/{id}
     */
    async deleteComplaint(id) {
        return await this.request(`${this.baseUrl}/${id}`, {
            method: 'DELETE'
        });
    }
}

window.apiService = new ApiService();
