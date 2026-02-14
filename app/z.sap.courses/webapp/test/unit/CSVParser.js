/*global QUnit*/
sap.ui.define([
	"z/sap/courses/utils/CSVParser"
], function (CSVParser) {
	"use strict";

	// Helper: build a valid CSV string from header + rows
	function buildCSV(aRows) {
		var sHeader = "ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink";
		return [sHeader].concat(aRows).join("\n");
	}

	var VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
	var VALID_ROW  = VALID_UUID + ",https://learning.sap.com/course1,Developer,ABAP Basics,ABAP,Intro to ABAP,2026-01-15,https://help.sap.com/abap";

	// =====================================================================
	QUnit.module("CSVParser – Valid CSV");
	// =====================================================================

	QUnit.test("Should parse a well-formed CSV with one data row", function (assert) {
		var sCSV = buildCSV([VALID_ROW]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.success, "Parsing succeeded");
		assert.strictEqual(oResult.data.length, 1, "One record parsed");
		assert.strictEqual(oResult.errors.length, 0, "No errors");
		assert.strictEqual(oResult.data[0].role, "Developer", "Role mapped correctly");
		assert.strictEqual(oResult.data[0].sap_module, "ABAP", "Module mapped correctly");
	});

	QUnit.test("Should parse multiple valid rows", function (assert) {
		var sRow2 = "b2c3d4e5-f6a7-8901-bcde-f12345678901,https://example.com,Admin,FI Overview,FICO,Finance basics,2026-02-01,";
		var sCSV = buildCSV([VALID_ROW, sRow2]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.success, "Parsing succeeded");
		assert.strictEqual(oResult.data.length, 2, "Two records parsed");
	});

	QUnit.test("Should handle quoted fields with commas", function (assert) {
		var sRow = VALID_UUID + ',https://example.com,Developer,"Advanced ABAP, Part 1",ABAP,"Covers OO, CDS, RAP",2026-01-20,';
		var sCSV = buildCSV([sRow]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.success, "Parsing succeeded");
		assert.ok(oResult.data[0].title.indexOf("Advanced ABAP") >= 0, "Quoted title with comma preserved");
	});

	QUnit.test("Should handle Windows CRLF line endings", function (assert) {
		var sCSV = "ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink\r\n" + VALID_ROW + "\r\n";
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.success, "CRLF parsing succeeded");
		assert.strictEqual(oResult.data.length, 1, "One record parsed");
	});

	QUnit.test("Should detect duplicate IDs with a warning", function (assert) {
		var sCSV = buildCSV([VALID_ROW, VALID_ROW]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.warnings.length > 0, "Duplicate warning emitted");
	});

	// =====================================================================
	QUnit.module("CSVParser – Malformed CSV");
	// =====================================================================

	QUnit.test("Should fail on empty content", function (assert) {
		var oResult = CSVParser.parseTrainingsCSV("");
		assert.notOk(oResult.success, "Parsing failed");
		assert.ok(oResult.errors.length > 0, "Error reported");
	});

	QUnit.test("Should fail on header-only CSV (no data rows)", function (assert) {
		var sCSV = "ID,url,role,title,sap_module,description,lastUpdated,sapHelpLink";
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.notOk(oResult.success, "No data rows → failure");
	});

	QUnit.test("Should fail on wrong headers", function (assert) {
		var sCSV = "Name,Email,Phone\nJohn,john@test.com,123";
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.notOk(oResult.success, "Wrong headers rejected");
		assert.ok(oResult.errors[0].indexOf("Missing required columns") >= 0, "Lists missing columns");
	});

	QUnit.test("Should report column count mismatch", function (assert) {
		var sCSV = buildCSV(["only,three,columns"]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.errors.length > 0, "Column mismatch reported");
		assert.ok(oResult.errors[0].indexOf("Column count mismatch") >= 0, "Error message mentions mismatch");
	});

	QUnit.test("Should reject invalid UUID", function (assert) {
		var sRow = "NOT-A-UUID,https://example.com,Developer,Test Title,ABAP,Desc,2026-01-01,";
		var sCSV = buildCSV([sRow]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.errors.length > 0, "Invalid UUID rejected");
	});

	QUnit.test("Should reject missing required title", function (assert) {
		var sRow = VALID_UUID + ",https://example.com,Developer,,ABAP,Desc,2026-01-01,";
		var sCSV = buildCSV([sRow]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.errors.length > 0, "Missing title rejected");
	});

	QUnit.test("Should reject invalid role", function (assert) {
		var sRow = VALID_UUID + ",https://example.com,Hacker,Test Title,ABAP,Desc,2026-01-01,";
		var sCSV = buildCSV([sRow]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.errors.length > 0, "Invalid role rejected");
	});

	// =====================================================================
	QUnit.module("CSVParser – XSS Payloads");
	// =====================================================================

	QUnit.test("Should sanitize <script> tag in title", function (assert) {
		var sRow = VALID_UUID + ',https://example.com,Developer,<script>alert("xss")</script>,ABAP,Desc,2026-01-01,';
		var sCSV = buildCSV([sRow]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		// Title may pass validation (length >= 3) but output must be encoded
		if (oResult.data.length > 0) {
			assert.notOk(oResult.data[0].title.indexOf("<script>") >= 0, "Script tag encoded/removed");
		} else {
			assert.ok(oResult.errors.length > 0, "XSS row rejected by validation");
		}
	});

	QUnit.test("Should sanitize event handler in description", function (assert) {
		var sRow = VALID_UUID + ',https://example.com,Developer,Safe Title,ABAP,"<img onerror=""alert(1)"" src=x>",2026-01-01,';
		var sCSV = buildCSV([sRow]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		if (oResult.data.length > 0) {
			assert.notOk(oResult.data[0].description.indexOf("onerror") >= 0, "Event handler encoded");
		} else {
			assert.ok(true, "XSS row rejected");
		}
	});

	QUnit.test("Should reject javascript: protocol in URL", function (assert) {
		var sRow = VALID_UUID + ",javascript:alert(1),Developer,Test,ABAP,Desc,2026-01-01,";
		var sCSV = buildCSV([sRow]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		if (oResult.data.length > 0) {
			assert.strictEqual(oResult.data[0].url, "", "javascript: URL stripped");
		} else {
			assert.ok(oResult.errors.length > 0, "javascript: URL rejected");
		}
	});

	// =====================================================================
	QUnit.module("CSVParser – Empty File & Edge Cases");
	// =====================================================================

	QUnit.test("Should fail gracefully on whitespace-only input", function (assert) {
		var oResult = CSVParser.parseTrainingsCSV("   \n  \n  ");
		assert.notOk(oResult.success, "Whitespace-only fails");
	});

	QUnit.test("Should skip blank lines between data rows", function (assert) {
		var sCSV = buildCSV([VALID_ROW, "", VALID_ROW.replace(VALID_UUID, "c3d4e5f6-a7b8-9012-cdef-123456789012")]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.success, "Blank lines skipped");
		assert.strictEqual(oResult.data.length, 2, "Both valid rows parsed");
	});

	QUnit.test("Should handle date in YYYYMMDD format", function (assert) {
		var sRow = VALID_UUID + ",https://example.com,Developer,Test,ABAP,Desc,20260215,";
		var sCSV = buildCSV([sRow]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.success, "YYYYMMDD date accepted");
		if (oResult.data.length > 0 && oResult.data[0].lastUpdated) {
			assert.ok(oResult.data[0].lastUpdated.indexOf("2026") >= 0, "Date parsed to ISO");
		}
	});

	QUnit.test("Should handle missing optional sapHelpLink", function (assert) {
		var sRow = VALID_UUID + ",https://example.com,Developer,Test,ABAP,Desc,2026-01-01,";
		var sCSV = buildCSV([sRow]);
		var oResult = CSVParser.parseTrainingsCSV(sCSV);

		assert.ok(oResult.success, "Optional field can be empty");
	});
});
