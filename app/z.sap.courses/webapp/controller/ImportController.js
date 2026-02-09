sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "../utils/CSVParser"
], function (Controller, Fragment, JSONModel, MessageBox, MessageToast, CSVParser) {
    "use strict";

    return Controller.extend("z.sap.courses.controller.ImportController", {

        /**
         * Open CSV Import Dialog
         */
        openImportDialog: function (oView) {
            this._oView = oView;

            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "z.sap.courses.fragments.ImportDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    
                    // Initialize import model
                    const oImportModel = new JSONModel({
                        data: [],
                        errors: [],
                        warnings: [],
                        fileLoaded: false
                    });
                    oDialog.setModel(oImportModel, "import");
                    
                    return oDialog;
                });
            }

            this._pDialog.then(function (oDialog) {
                this._resetDialog();
                oDialog.open();
            }.bind(this));
        },

        /**
         * Reset dialog to initial state
         */
        _resetDialog: function () {
            const oDialog = this._getDialog();
            const oImportModel = oDialog.getModel("import");

            // Reset model
            oImportModel.setData({
                data: [],
                errors: [],
                warnings: [],
                fileLoaded: false
            });

            // Reset UI elements
            this._getElement("fileUploader").clear();
            this._getElement("importButton").setEnabled(false);
            this._getElement("previewPanel").setVisible(false);
            this._getElement("validationPanel").setVisible(false);
            this._getElement("progressBox").setVisible(false);
            this._getElement("successMessage").setVisible(false);
            this._getElement("errorMessage").setVisible(false);
            this._getElement("recordCount").setNumber("0");
            this._getElement("importProgress").setPercentValue(0);
        },

        /**
         * Handle file selection
         */
        onFileChange: function (oEvent) {
            const oFileUploader = oEvent.getSource();
            const file = oEvent.getParameter("files")[0];

            if (!file) {
                return;
            }

            // Validate file type
            if (!file.name.toLowerCase().endsWith('.csv')) {
                MessageBox.error("Please select a CSV file");
                oFileUploader.clear();
                return;
            }

            // Read file
            const reader = new FileReader();
            reader.onload = function (e) {
                this._parseCSVContent(e.target.result);
            }.bind(this);
            
            reader.onerror = function () {
                MessageBox.error("Failed to read file. Please try again.");
                oFileUploader.clear();
            };

            reader.readAsText(file);
        },

        /**
         * Parse CSV content
         */
        _parseCSVContent: function (csvContent) {
            const oDialog = this._getDialog();
            const oImportModel = oDialog.getModel("import");

            // Show progress
            MessageToast.show("Parsing CSV file...");

            try {
                // Parse CSV using utility
                const result = CSVParser.parseTrainingsCSV(csvContent);

                // Update model
                oImportModel.setProperty("/data", result.data);
                oImportModel.setProperty("/errors", result.errors.map(msg => ({ message: msg })));
                oImportModel.setProperty("/warnings", result.warnings.map(msg => ({ message: msg })));
                oImportModel.setProperty("/fileLoaded", result.success);

                // Update UI
                this._getElement("recordCount").setNumber(result.data.length);
                this._getElement("importButton").setEnabled(result.success && result.data.length > 0);
                this._getElement("previewPanel").setVisible(result.data.length > 0);
                this._getElement("previewPanel").setExpanded(result.data.length > 0);
                this._getElement("validationPanel").setVisible(
                    result.errors.length > 0 || result.warnings.length > 0
                );

                // Show validation summary
                if (result.success) {
                    MessageToast.show(`Successfully parsed ${result.data.length} records`);
                    if (result.warnings.length > 0) {
                        MessageBox.warning(
                            `File parsed with ${result.warnings.length} warning(s). Please review before importing.`,
                            {
                                title: "Validation Warnings"
                            }
                        );
                    }
                } else {
                    MessageBox.error(
                        `CSV parsing failed with ${result.errors.length} error(s). Please fix the file and try again.`,
                        {
                            title: "Validation Failed"
                        }
                    );
                }

            } catch (error) {
                MessageBox.error("Unexpected error parsing CSV: " + error.message);
                console.error("CSV parsing error:", error);
            }
        },

        /**
         * Import trainings to backend
         */
        onImport: function () {
            const oDialog = this._getDialog();
            const oImportModel = oDialog.getModel("import");
            const aTrainings = oImportModel.getProperty("/data");

            if (!aTrainings || aTrainings.length === 0) {
                MessageBox.error("No data to import");
                return;
            }

            // Confirm import
            MessageBox.confirm(
                `Import ${aTrainings.length} training record(s) to the system?`,
                {
                    title: "Confirm Import",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._executeImport(aTrainings);
                        }
                    }.bind(this)
                }
            );
        },

        /**
         * Execute batch import
         */
        _executeImport: function (aTrainings) {
            const oDialog = this._getDialog();
            const oModel = this._oView.getModel();

            // Show progress
            this._getElement("progressBox").setVisible(true);
            this._getElement("importButton").setEnabled(false);
            this._getElement("successMessage").setVisible(false);
            this._getElement("errorMessage").setVisible(false);

            // Batch import configuration
            const iBatchSize = 10; // Import 10 records at a time
            const aBatches = this._createBatches(aTrainings, iBatchSize);
            let iSuccessCount = 0;
            let iErrorCount = 0;
            let aErrors = [];

            // Process batches sequentially
            this._processBatches(aBatches, 0, oModel, 
                function (batchIndex, batchSuccess, batchErrors) {
                    // Batch completed callback
                    iSuccessCount += batchSuccess;
                    iErrorCount += batchErrors.length;
                    aErrors = aErrors.concat(batchErrors);

                    // Update progress
                    const iProgress = Math.round(((batchIndex + 1) / aBatches.length) * 100);
                    this._getElement("importProgress").setPercentValue(iProgress);
                    this._getElement("progressText").setText(
                        `Processed ${iSuccessCount + iErrorCount} of ${aTrainings.length} records...`
                    );
                }.bind(this),
                function () {
                    // All batches completed
                    this._onImportComplete(iSuccessCount, iErrorCount, aErrors, aTrainings.length);
                }.bind(this)
            );
        },

        /**
         * Create batches from array
         */
        _createBatches: function (aItems, iBatchSize) {
            const aBatches = [];
            for (let i = 0; i < aItems.length; i += iBatchSize) {
                aBatches.push(aItems.slice(i, i + iBatchSize));
            }
            return aBatches;
        },

        /**
         * Process batches recursively
         */
        _processBatches: function (aBatches, iIndex, oModel, fnProgress, fnComplete) {
            if (iIndex >= aBatches.length) {
                fnComplete();
                return;
            }

            const aBatch = aBatches[iIndex];
            let iBatchSuccess = 0;
            let aBatchErrors = [];
            let iCompleted = 0;

            // Create entries in parallel within batch
            aBatch.forEach(function (oTraining, index) {
                const oEntry = this._formatTrainingForOData(oTraining);

                oModel.create("/Trainings", oEntry, {
                    success: function () {
                        iBatchSuccess++;
                        iCompleted++;
                        if (iCompleted === aBatch.length) {
                            fnProgress(iIndex, iBatchSuccess, aBatchErrors);
                            setTimeout(function () {
                                this._processBatches(aBatches, iIndex + 1, oModel, fnProgress, fnComplete);
                            }.bind(this), 100);
                        }
                    }.bind(this),
                    error: function (oError) {
                        const sError = this._parseODataError(oError);
                        aBatchErrors.push({
                            record: index + 1,
                            title: oTraining.title,
                            error: sError
                        });
                        iCompleted++;
                        if (iCompleted === aBatch.length) {
                            fnProgress(iIndex, iBatchSuccess, aBatchErrors);
                            setTimeout(function () {
                                this._processBatches(aBatches, iIndex + 1, oModel, fnProgress, fnComplete);
                            }.bind(this), 100);
                        }
                    }.bind(this)
                });
            }.bind(this));
        },

        /**
         * Format training for OData V2
         */
        _formatTrainingForOData: function (oTraining) {
            return {
                ID: oTraining.ID,
                url: oTraining.url || "",
                role: oTraining.role,
                title: oTraining.title,
                sap_module: oTraining.sap_module,
                description: oTraining.description || "",
                lastUpdated: this._formatDateForOData(oTraining.lastUpdated),
                sapHelpLink: oTraining.sapHelpLink || ""
            };
        },

        /**
         * Format date for OData V2
         */
        _formatDateForOData: function (sDate) {
            if (!sDate) return new Date();
            return new Date(sDate);
        },

        /**
         * Parse OData error
         */
        _parseODataError: function (oError) {
            try {
                if (oError.responseText) {
                    const oResponse = JSON.parse(oError.responseText);
                    if (oResponse.error && oResponse.error.message) {
                        return oResponse.error.message.value || oResponse.error.message;
                    }
                }
                return oError.message || "Unknown error";
            } catch (e) {
                return oError.statusText || "Import failed";
            }
        },

        /**
         * Handle import completion
         */
        _onImportComplete: function (iSuccess, iError, aErrors, iTotal) {
            // Hide progress
            this._getElement("progressBox").setVisible(false);

            // Refresh table
            const oModel = this._oView.getModel();
            oModel.refresh();

            if (iError === 0) {
                // Complete success
                this._getElement("successMessage").setVisible(true);
                this._getElement("successMessage").setText(
                    `Successfully imported all ${iSuccess} training records!`
                );
                
                MessageBox.success(
                    `Import completed successfully!\n\n${iSuccess} records imported.`,
                    {
                        title: "Import Successful",
                        onClose: function () {
                            this._closeDialog();
                        }.bind(this)
                    }
                );
            } else if (iSuccess > 0) {
                // Partial success
                const sErrorDetails = aErrors.slice(0, 5).map(e => 
                    `• ${e.title}: ${e.error}`
                ).join("\n");
                
                MessageBox.warning(
                    `Import completed with errors:\n• ${iSuccess} records imported successfully\n• ${iError} records failed\n\nFirst errors:\n${sErrorDetails}`,
                    {
                        title: "Partial Import",
                        details: aErrors.map(e => `${e.title}: ${e.error}`).join("\n")
                    }
                );
                
                this._getElement("errorMessage").setVisible(true);
                this._getElement("errorMessage").setText(
                    `${iSuccess} imported, ${iError} failed. See details above.`
                );
            } else {
                // Complete failure
                const sErrorDetails = aErrors.slice(0, 5).map(e => 
                    `• ${e.title}: ${e.error}`
                ).join("\n");
                
                MessageBox.error(
                    `Import failed for all records.\n\nFirst errors:\n${sErrorDetails}`,
                    {
                        title: "Import Failed",
                        details: aErrors.map(e => `${e.title}: ${e.error}`).join("\n")
                    }
                );
                
                this._getElement("errorMessage").setVisible(true);
                this._getElement("errorMessage").setText(
                    `Import failed. Check OData service configuration.`
                );
                this._getElement("importButton").setEnabled(true);
            }
        },

        /**
         * Close dialog
         */
        onCloseImportDialog: function () {
            this._closeDialog();
        },

        _closeDialog: function () {
            this._getDialog().close();
        },

        /**
         * Get dialog instance
         */
        _getDialog: function () {
            return Fragment.byId(this._oView.getId(), "csvImportDialog");
        },

        /**
         * Get dialog element by ID
         */
        _getElement: function (sId) {
            return Fragment.byId(this._oView.getId(), sId);
        }

    });
});
