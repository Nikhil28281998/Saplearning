/*global QUnit, sinon*/
sap.ui.define([
	"z/sap/courses/services/UserContext"
], function (UserContext) {
	"use strict";

	// =====================================================================
	QUnit.module("UserContext – Role Resolution", {
		beforeEach: function () {
			this.oUserCtx = new UserContext();
		},
		afterEach: function () {
			this.oUserCtx.destroy();
		}
	});
	// =====================================================================

	QUnit.test("Local dev should return mock admin user", function (assert) {
		// localhost detection → mock path
		return this.oUserCtx.getUserInfo().then(function (oInfo) {
			assert.strictEqual(oInfo.UserId, "DEVUSER", "Mock user ID");
			assert.ok(oInfo.IsAdmin, "Mock user is admin");
			assert.ok(oInfo.IsManager, "Mock user is manager");
			assert.ok(oInfo.IsEndUser, "Mock user is end-user");
		});
	});

	QUnit.test("getCurrentRole should return 'Admin' for mock user", function (assert) {
		return this.oUserCtx.getCurrentRole().then(function (sRole) {
			assert.strictEqual(sRole, "Admin", "Highest priority role returned");
		});
	});

	QUnit.test("isAdmin should resolve true locally", function (assert) {
		return this.oUserCtx.isAdmin().then(function (bAdmin) {
			assert.ok(bAdmin, "isAdmin true in dev");
		});
	});

	QUnit.test("isManager should resolve true locally", function (assert) {
		return this.oUserCtx.isManager().then(function (bMgr) {
			assert.ok(bMgr, "isManager true in dev");
		});
	});

	QUnit.test("isEndUser should resolve true locally", function (assert) {
		return this.oUserCtx.isEndUser().then(function (bUser) {
			assert.ok(bUser, "isEndUser true in dev");
		});
	});

	// =====================================================================
	QUnit.module("UserContext – Cache TTL", {
		beforeEach: function () {
			this.oUserCtx = new UserContext();
		},
		afterEach: function () {
			this.oUserCtx.destroy();
		}
	});
	// =====================================================================

	QUnit.test("Second call should return cached result", function (assert) {
		var oCtx = this.oUserCtx;
		return oCtx.getUserInfo().then(function (oFirst) {
			return oCtx.getUserInfo().then(function (oSecond) {
				assert.strictEqual(oFirst, oSecond, "Same object reference (cached)");
			});
		});
	});

	QUnit.test("clearCache should force fresh fetch", function (assert) {
		var oCtx = this.oUserCtx;
		return oCtx.getUserInfo().then(function (oFirst) {
			oCtx.clearCache();
			return oCtx.getUserInfo().then(function (oSecond) {
				assert.notStrictEqual(oFirst, oSecond, "Different object after cache clear");
				assert.strictEqual(oSecond.UserId, "DEVUSER", "Still returns valid user");
			});
		});
	});

	QUnit.test("Cache TTL property should be 5 minutes", function (assert) {
		assert.strictEqual(this.oUserCtx._cacheTTL, 5 * 60 * 1000, "Cache TTL is 5 min");
	});

	// =====================================================================
	QUnit.module("UserContext – Mock vs Prod Detection", {
		beforeEach: function () {
			this.oUserCtx = new UserContext();
		},
		afterEach: function () {
			this.oUserCtx.destroy();
		}
	});
	// =====================================================================

	QUnit.test("Should detect localhost as development environment", function (assert) {
		// We verify the mock path is taken (returns DEVUSER, not ANONYMOUS)
		return this.oUserCtx.getUserInfo().then(function (oInfo) {
			assert.strictEqual(oInfo.UserId, "DEVUSER", "localhost → mock path");
			assert.notStrictEqual(oInfo.UserId, "ANONYMOUS", "Not the S/4 fallback");
		});
	});

	QUnit.test("hasAuthorization should return false when no authorizations", function (assert) {
		return this.oUserCtx.hasAuthorization("Z_COURSES", { ACTIVITY: "01" }).then(function (bAuth) {
			assert.notOk(bAuth, "No authorizations in mock → false");
		});
	});
});
