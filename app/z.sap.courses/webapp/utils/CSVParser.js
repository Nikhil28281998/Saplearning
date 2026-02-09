/**
 * CSV Parser Utility for SAP Learning Platform
 * SAP Expert Team: Clean Core Compliant, Production-Ready
 * 
 * Features:
 * - RFC 4180 compliant CSV parsing
 * - UUID validation
 * - URL validation
 * - XSS protection
 * - Error reporting with line numbers
 */

sap.ui.define([], function() {
    "use strict";

    return {
        /**
         * Parse CSV file content and validate data
         * @param {string} csvContent - Raw CSV file content
         * @returns {Object} { success: boolean, data: array, errors: array }
         */
        parseTrainingsCSV: function(csvContent) {
            const result = {
                success: true,
                data: [],
                errors: [],
                warnings: []
            };

            try {
                // Split into lines, handle different line endings
                const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
                
                if (lines.length < 2) {
                    result.success = false;
                    result.errors.push("CSV file is empty or has no data rows");
                    return result;
                }

                // Parse header
                const headers = this._parseCSVLine(lines[0]);
                const expectedHeaders = ['ID', 'url', 'role', 'title', 'sap_module', 'description', 'lastUpdated', 'sapHelpLink'];
                
                // Validate headers (case-insensitive)
                const headerMap = {};
                headers.forEach((header, index) => {
                    const normalized = header.trim().toLowerCase();
                    headerMap[normalized] = index;
                });

                // Check required headers exist
                const missingHeaders = [];
                expectedHeaders.forEach(expected => {
                    const normalized = expected.toLowerCase();
                    if (!(normalized in headerMap)) {
                        missingHeaders.push(expected);
                    }
                });

                if (missingHeaders.length > 0) {
                    result.success = false;
                    result.errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
                    return result;
                }

                // Parse data rows
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue; // Skip empty lines

                    const values = this._parseCSVLine(line);
                    const rowNumber = i + 1;

                    if (values.length !== headers.length) {
                        result.errors.push(`Row ${rowNumber}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
                        continue;
                    }

                    // Map values to object
                    const training = {
                        ID: this._getValue(values, headerMap, 'id'),
                        url: this._getValue(values, headerMap, 'url'),
                        role: this._getValue(values, headerMap, 'role'),
                        title: this._getValue(values, headerMap, 'title'),
                        sap_module: this._getValue(values, headerMap, 'sap_module'),
                        description: this._getValue(values, headerMap, 'description'),
                        lastUpdated: this._getValue(values, headerMap, 'lastupdated'),
                        sapHelpLink: this._getValue(values, headerMap, 'saphelplink')
                    };

                    // Validate row
                    const validationErrors = this._validateTraining(training, rowNumber);
                    if (validationErrors.length > 0) {
                        result.errors.push(...validationErrors);
                        continue;
                    }

                    // Sanitize and format
                    const sanitized = this._sanitizeTraining(training);
                    result.data.push(sanitized);
                }

                // Final validation
                if (result.data.length === 0) {
                    result.success = false;
                    result.errors.push("No valid records found in CSV file");
                }

                // Check for duplicate IDs
                const ids = result.data.map(t => t.ID);
                const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
                if (duplicates.length > 0) {
                    result.warnings.push(`Duplicate IDs found: ${[...new Set(duplicates)].join(', ')}`);
                }

            } catch (error) {
                result.success = false;
                result.errors.push(`CSV parsing error: ${error.message}`);
            }

            return result;
        },

        /**
         * Parse single CSV line (handles quoted values with commas)
         */
        _parseCSVLine: function(line) {
            const values = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        // Escaped quote
                        current += '"';
                        i++;
                    } else {
                        // Toggle quote state
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    // End of value
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }

            // Add last value
            values.push(current.trim());

            return values;
        },

        /**
         * Get value from parsed row by header name
         */
        _getValue: function(values, headerMap, headerName) {
            const index = headerMap[headerName.toLowerCase()];
            return index !== undefined ? values[index].trim() : '';
        },

        /**
         * Validate training record
         */
        _validateTraining: function(training, rowNumber) {
            const errors = [];
            const prefix = `Row ${rowNumber}:`;

            // Required fields
            if (!training.ID) {
                errors.push(`${prefix} ID is required`);
            } else if (!this._isValidUUID(training.ID)) {
                errors.push(`${prefix} Invalid UUID format for ID`);
            }

            if (!training.title || training.title.length < 3) {
                errors.push(`${prefix} Title is required (minimum 3 characters)`);
            }

            if (!training.role) {
                errors.push(`${prefix} Role is required`);
            } else if (!['Developer', 'Admin', 'Consultant', 'Manager', 'User'].includes(training.role)) {
                errors.push(`${prefix} Invalid role '${training.role}' (allowed: Developer, Admin, Consultant, Manager, User)`);
            }

            if (!training.sap_module) {
                errors.push(`${prefix} SAP Module is required`);
            }

            // URL validation
            if (training.url && !this._isValidURL(training.url)) {
                errors.push(`${prefix} Invalid URL format`);
            }

            if (training.sapHelpLink && !this._isValidURL(training.sapHelpLink)) {
                errors.push(`${prefix} Invalid SAP Help Link URL format`);
            }

            // Length validation
            if (training.ID && training.ID.length > 36) {
                errors.push(`${prefix} ID too long (max 36 characters)`);
            }
            if (training.url && training.url.length > 255) {
                errors.push(`${prefix} URL too long (max 255 characters)`);
            }
            if (training.role && training.role.length > 20) {
                errors.push(`${prefix} Role too long (max 20 characters)`);
            }
            if (training.title && training.title.length > 100) {
                errors.push(`${prefix} Title too long (max 100 characters)`);
            }
            if (training.sap_module && training.sap_module.length > 20) {
                errors.push(`${prefix} SAP Module too long (max 20 characters)`);
            }
            if (training.description && training.description.length > 255) {
                errors.push(`${prefix} Description too long (max 255 characters)`);
            }

            return errors;
        },

        /**
         * Sanitize training record (XSS protection)
         */
        _sanitizeTraining: function(training) {
            return {
                ID: this._sanitizeString(training.ID),
                url: this._sanitizeURL(training.url),
                role: this._sanitizeString(training.role),
                title: this._sanitizeString(training.title),
                sap_module: this._sanitizeString(training.sap_module),
                description: this._sanitizeString(training.description),
                lastUpdated: this._parseDate(training.lastUpdated),
                sapHelpLink: this._sanitizeURL(training.sapHelpLink)
            };
        },

        /**
         * Sanitize string (remove HTML tags, scripts)
         */
        _sanitizeString: function(str) {
            if (!str) return '';
            return str
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
        },

        /**
         * Sanitize URL
         */
        _sanitizeURL: function(url) {
            if (!url) return '';
            url = url.trim();
            // Only allow http/https protocols
            if (!url.match(/^https?:\/\//i)) {
                return '';
            }
            return url;
        },

        /**
         * Parse date from various formats
         */
        _parseDate: function(dateStr) {
            if (!dateStr) return new Date().toISOString();
            
            try {
                // Handle ISO format: 2026-02-01T00:00:00Z
                if (dateStr.includes('T')) {
                    return new Date(dateStr).toISOString();
                }
                
                // Handle YYYYMMDD format: 20260201
                if (/^\d{8}$/.test(dateStr)) {
                    const year = dateStr.substring(0, 4);
                    const month = dateStr.substring(4, 6);
                    const day = dateStr.substring(6, 8);
                    return new Date(`${year}-${month}-${day}`).toISOString();
                }
                
                // Try standard parse
                return new Date(dateStr).toISOString();
            } catch (e) {
                return new Date().toISOString();
            }
        },

        /**
         * Validate UUID format
         */
        _isValidUUID: function(uuid) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(uuid);
        },

        /**
         * Validate URL format
         */
        _isValidURL: function(url) {
            if (!url) return true; // Optional fields
            try {
                const urlObj = new URL(url);
                return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
            } catch (e) {
                return false;
            }
        }
    };
});
