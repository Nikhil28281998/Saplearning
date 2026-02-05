/**
 * UserContext Service - S/4HANA Authorization Adapter
 * 
 * This service provides a clean interface between the UI and the S/4HANA
 * backend for user context and role-based features. It replaces email-based
 * authorization checks with S/4-native PFCG role enforcement.
 * 
 * Security principle:
 * - UI may request UserContext for UX improvements (hide/show buttons)
 * - ABAP backend is authoritative for all data access and modifications
 * - Backend must enforce PFCG roles via AUTHORITY-CHECK / DCL
 * 
 * @module z.sap.courses/services/UserContext
 */

sap.ui.define([
    "sap/ui/base/Object",
    "sap/base/Log"
], function (BaseObject, Log) {
    "use strict";

    var UserContext = BaseObject.extend("z.sap.courses.services.UserContext", {
        metadata: {
            publicMethods: [
                "getUserInfo",
                "isAdmin",
                "isManager",
                "isEndUser",
                "getCurrentRole",
                "hasAuthorization"
            ]
        },

        constructor: function () {
            BaseObject.call(this);
            this._userInfo = null;
            this._roleCache = null;
            this._cacheExpiry = null;
            this._cacheTTL = 5 * 60 * 1000; // 5 minutes cache
        },

        /**
         * Fetch current user context from backend
         * 
         * For local CAP development, returns mock admin user.
         * For S/4HANA deployment, call /sap/opu/odata/sap/Z_COURSES_USERCTX_SRV/UserContextSet('ME')
         * 
         * @returns {Promise<Object>} User context with role and permissions
         * @example
         * userContext.getUserInfo().then(function(user) {
         *   console.log("Current user:", user.UserId);
         *   console.log("Is Admin:", user.IsAdmin);
         * });
         */
        getUserInfo: function () {
            var that = this;

            // Return cached result if still valid
            if (this._userInfo && this._cacheExpiry && Date.now() < this._cacheExpiry) {
                return Promise.resolve(this._userInfo);
            }

            // For local development with CAP, return mock admin user
            // TODO: When deploying to S/4HANA, implement actual OData call to Z_COURSES_USERCTX_SRV
            var userInfo = {
                UserId: "DEVUSER",
                FullName: "Developer User",
                Email: "dev@example.com",
                IsAdmin: true,
                IsManager: true,
                IsEndUser: true,
                Authorizations: []
            };

            // Cache the result
            that._userInfo = userInfo;
            that._cacheExpiry = Date.now() + that._cacheTTL;

            Log.info("UserContext (mock) for: " + userInfo.UserId);
            return Promise.resolve(userInfo);
        },

        /**
         * Check if current user has admin role
         * 
         * NOTE: This is for UI purposes only (hiding/showing buttons).
         * Actual authorization is enforced by the ABAP backend.
         * 
         * @returns {Promise<boolean>} True if user has admin role
         */
        isAdmin: function () {
            return this.getUserInfo().then(function (userInfo) {
                return userInfo.IsAdmin === true;
            });
        },

        /**
         * Check if current user has manager role
         * 
         * @returns {Promise<boolean>} True if user has manager role
         */
        isManager: function () {
            return this.getUserInfo().then(function (userInfo) {
                return userInfo.IsManager === true;
            });
        },

        /**
         * Check if current user has end-user role
         * 
         * @returns {Promise<boolean>} True if user has end-user role
         */
        isEndUser: function () {
            return this.getUserInfo().then(function (userInfo) {
                return userInfo.IsEndUser === true;
            });
        },

        /**
         * Get the highest role of the current user
         * 
         * Returns role in priority order: Admin > Manager > EndUser > Unknown
         * 
         * @returns {Promise<string>} Role name
         */
        getCurrentRole: function () {
            return this.getUserInfo().then(function (userInfo) {
                if (userInfo.IsAdmin) {
                    return "Admin";
                } else if (userInfo.IsManager) {
                    return "Manager";
                } else if (userInfo.IsEndUser) {
                    return "User";
                }
                return "Unknown";
            });
        },

        /**
         * Check if user has specific authorization
         * 
         * Calls backend to verify user has specific authorization object
         * (e.g., ZSLC_EDIT_COURSE, ZSLC_DELETE_USER)
         * 
         * @param {string} authObject - Authorization object to check
         * @param {Object} [fields] - Optional fields to check (e.g., {ACTIVITY: "02"})
         * @returns {Promise<boolean>} True if user is authorized
         */
        hasAuthorization: function (authObject, fields) {
            return this.getUserInfo().then(function (userInfo) {
                if (!userInfo.Authorizations) {
                    return false;
                }

                // Check if authorization exists in user's list
                var hasAuth = userInfo.Authorizations.some(function (auth) {
                    return auth.ObjectName === authObject;
                });

                if (!hasAuth) {
                    return false;
                }

                // If specific fields are required, verify them too
                if (fields) {
                    var authDetail = userInfo.Authorizations.find(function (auth) {
                        return auth.ObjectName === authObject;
                    });

                    if (authDetail && authDetail.Fields) {
                        for (var field in fields) {
                            if (authDetail.Fields[field] !== fields[field]) {
                                return false;
                            }
                        }
                    }
                }

                return true;
            });
        },

        /**
         * Clear cached user context
         * Useful when user changes in S/4 (e.g., after assignment change)
         */
        clearCache: function () {
            this._userInfo = null;
            this._cacheExpiry = null;
            Log.info("UserContext cache cleared");
        }
    });

    return UserContext;
});
