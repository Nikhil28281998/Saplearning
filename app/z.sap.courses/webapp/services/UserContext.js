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

        constructor: function (oOptions) {
            BaseObject.call(this);
            this._userInfo = null;
            this._roleCache = null;
            this._cacheExpiry = null;
            this._cacheTTL = (oOptions && oOptions.cacheTTL) || 5 * 60 * 1000; // FIX 4.4: Configurable TTL
            this._oDataModel = (oOptions && oOptions.model) || null; // FIX 7.3: Accept OData model reference
        },

        /**
         * Fetch current user context from backend
         * 
         * For S/4HANA deployment, calls ZCOURSES_SRV/getCurrentRole Function Import
         * to determine PFCG-based role, then builds user info accordingly.
         * For local CAP development, returns mock admin user.
         * 
         * @returns {Promise<Object>} User context with role and permissions
         */
        getUserInfo: function () {
            var that = this;

            // Return cached result if still valid
            if (this._userInfo && this._cacheExpiry && Date.now() < this._cacheExpiry) {
                return Promise.resolve(this._userInfo);
            }

            // FIX 7.2: Use FLP API detection instead of hostname check.
            // sap.ushell.Container exists in Fiori Launchpad (S/4HANA production).
            // This correctly handles Docker, BTP, named hosts, etc.
            var isS4Hana = !!(window.sap && window.sap.ushell && window.sap.ushell.Container);

            if (isS4Hana) {
                // FIX 7.3: Use OData model callFunction instead of raw fetch()
                // This leverages the OData model's CSRF token pool and error handling.
                var oModel = this._oDataModel;
                if (oModel && oModel.callFunction) {
                    return new Promise(function (resolve, reject) {
                        oModel.callFunction("/getCurrentRole", {
                            method: "GET",
                            success: function (oData) {
                                Log.info("getCurrentRole raw response (via OData model): " + JSON.stringify(oData));
                                var sRole = "User";
                                if (typeof oData === 'string') {
                                    sRole = oData;
                                } else if (oData && oData.getCurrentRole) {
                                    sRole = typeof oData.getCurrentRole === 'string' ? oData.getCurrentRole : (oData.getCurrentRole.Role || sRole);
                                } else if (oData && oData.Role) {
                                    sRole = oData.Role;
                                }
                                Log.info("UserContext resolved role (via OData model): " + sRole);
                                var userInfo = {
                                    UserId: "S4USER",
                                    FullName: "",
                                    Email: "",
                                    IsAdmin: sRole === "Admin",
                                    IsManager: sRole === "Manager" || sRole === "Admin",
                                    IsEndUser: true,
                                    Authorizations: []
                                };
                                that._userInfo = userInfo;
                                that._cacheExpiry = Date.now() + that._cacheTTL;
                                resolve(userInfo);
                            },
                            error: function (oError) {
                                Log.error("getCurrentRole via OData model FAILED: " + (oError.message || JSON.stringify(oError)));
                                resolve({
                                    UserId: "ANONYMOUS", FullName: "End User", Email: "",
                                    IsAdmin: false, IsManager: false, IsEndUser: true, Authorizations: []
                                });
                            }
                        });
                    });
                }
                // Fallback to fetch if OData model not available
                // Production S/4HANA: Call ZCOURSES_SRV getCurrentRole Function Import
                return fetch("/sap/opu/odata/sap/ZCOURSES_SRV/getCurrentRole", {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "X-CSRF-Token": "Fetch"
                    },
                    credentials: "include"
                })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error("Failed to fetch role: " + response.status);
                        }
                        return response.json();
                    })
                    .then(function (data) {
                        // Log raw response for debugging
                        Log.info("getCurrentRole raw response: " + JSON.stringify(data));

                        // Handle OData V2 response formats:
                        //   Format A: { d: { getCurrentRole: { Role: "Admin" } } }
                        //   Format B: { d: { Role: "Admin" } }
                        //   Format C (CAP): { d: { getCurrentRole: "Admin" } } (plain string)
                        var sRole = "User";
                        if (data && data.d) {
                            if (typeof data.d.getCurrentRole === 'string') {
                                sRole = data.d.getCurrentRole;
                            } else if (data.d.getCurrentRole && data.d.getCurrentRole.Role) {
                                sRole = data.d.getCurrentRole.Role;
                            } else if (data.d.Role) {
                                sRole = data.d.Role;
                            }
                        }

                        Log.info("UserContext resolved role: " + sRole);

                        var userInfo = {
                            UserId: "S4USER",
                            FullName: "",
                            Email: "",
                            IsAdmin: sRole === "Admin",
                            IsManager: sRole === "Manager" || sRole === "Admin",
                            IsEndUser: true,
                            Authorizations: []
                        };

                        // Cache the result
                        that._userInfo = userInfo;
                        that._cacheExpiry = Date.now() + that._cacheTTL;

                        Log.info("UserContext role from ZCOURSES_SRV: " + sRole);
                        return userInfo;
                    })
                    .catch(function (error) {
                        Log.error("getCurrentRole FAILED: " + (error.message || error) + ". Buttons will be hidden. Check: 1) ZCOURSES_SRV registered in /IWFND/MAINT_SERVICE, 2) EXECUTE_ACTION redefined in DPC_EXT, 3) Z_COURSES auth object exists in SU21, 4) PFCG role has Z_COURSES with ACTVT 06");
                        // Return minimal default context (read-only user)
                        return {
                            UserId: "ANONYMOUS",
                            FullName: "End User",
                            Email: "",
                            IsAdmin: false,
                            IsManager: false,
                            IsEndUser: true,
                            Authorizations: []
                        };
                    });
            } else {
                // Local development: Return mock admin user for testing
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

                Log.info("UserContext (mock) for local development: " + userInfo.UserId);
                return Promise.resolve(userInfo);
            }
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
         * FIX 5.3: This method is currently non-functional because getUserInfo()
         * always returns Authorizations: []. Kept as placeholder for future
         * integration with actual backend authorization data.
         * TODO: Implement actual authorization fetching from backend
         * (e.g., a /getAuthorizations function import)
         *
         * @param {string} authObject - Authorization object to check
         * @param {Object} [fields] - Optional fields to check
         * @returns {Promise<boolean>} Always returns false until backend integration
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
