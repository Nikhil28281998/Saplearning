sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/ui/export/Spreadsheet",
  "sap/m/Dialog",
  "sap/m/List",
  "sap/m/CustomListItem",
  "sap/m/Switch",
  "sap/m/Label",
  "sap/m/Button",
  "sap/m/Bar",
  "sap/m/Input",
  "sap/m/DatePicker"
], function (Controller, JSONModel, MessageToast, Spreadsheet, Dialog, List, CustomListItem, Switch, Label, Button, Bar, Input, DatePicker) {
  "use strict";

  return Controller.extend("ulhn.app.controller.Search", {
    onInit: function () {
      var oModel = new JSONModel({
        results: [],
        columnVisibility: {
          id: true,
          title: true,
          role: true,
          module: true,
          description: true,
          lastUpdated: true,
          sapHelpLink: true,
          actions: true
        },
        advanced: {
          query: "",
          tags: "",
          dateFrom: "",
          dateTo: ""
        }
      });
      this.getView().setModel(oModel);
      this._bindTable();
      this._settingsDialog = null;
      this._filtersDialog = null;
    },

    _bindTable: function(){
      var oTable = this.byId("resultsTable");
      oTable.setModel(this.getView().getModel());
    },

    onGo: function () {
      var sModule = this.byId("moduleSelect").getSelectedKey();
      var sRole = this.byId("roleSelect").getSelectedKey();
      var adv = this.getView().getModel().getProperty("/advanced");
      this._search({ module: sModule, role: sRole, query: adv.query, tags: adv.tags, dateFrom: adv.dateFrom, dateTo: adv.dateTo });
    },

    onReset: function () {
      this.byId("moduleSelect").setSelectedKey("");
      this.byId("roleSelect").setSelectedKey("");
      this.getView().getModel().setProperty("/results", []);
      this.getView().getModel().setProperty("/advanced", { query: "", tags: "", dateFrom: "", dateTo: "" });
    },

    _search: function (filters) {
      var that = this;
      var params = new URLSearchParams();
      if (filters.role) params.append("role", filters.role);
      if (filters.module) params.append("module", filters.module);
      if (filters.query) params.append("query", filters.query);
      if (filters.tags) params.append("tags", filters.tags);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      fetch("/api/search?" + params.toString())
        .then(function(r){ return r.ok ? r.json() : Promise.reject(r); })
        .then(function(data){
          var results = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
          that.getView().getModel().setProperty("/results", results);
        })
        .catch(function(){
          // Stub aligned to required headers
          var aStub = [
            { id: 1, url: "https://learning.sap.com", role: "FI", title: "Finance Overview", module: "FI", description: "Intro to FI", lastUpdated: new Date(), sapHelpLink: "https://help.sap.com" },
            { id: 2, url: "https://learning.sap.com", role: "MM", title: "MM Basics", module: "MM", description: "Intro to MM", lastUpdated: new Date(), sapHelpLink: "https://help.sap.com" }
          ];
          that.getView().getModel().setProperty("/results", aStub);
        });
    },

    onOpen: function (oEvent) {
      var ctx = oEvent.getSource().getBindingContext();
      var url = ctx.getProperty("url");
      window.open(url, "_blank");
    },

    onOpenHelp: function (oEvent) {
      var ctx = oEvent.getSource().getBindingContext();
      var url = ctx.getProperty("url");
      window.open(url, "_blank");
    },

    onFav: function () {
      MessageToast.show("Added to favorites (stub)");
    },

    onExport: function(){
      var aCols = [
        { label: "id", property: "id" },
        { label: "url", property: "url" },
        { label: "role", property: "role" },
        { label: "title", property: "title" },
        { label: "module", property: "module" },
        { label: "description", property: "description" },
        { label: "lastUpdated", property: "lastUpdated", type: "date" },
        { label: "sapHelpLink", property: "sapHelpLink" }
      ];
      var oSettings = {
        workbook: { columns: aCols },
        dataSource: this.getView().getModel().getProperty("/results"),
        fileName: "ULHN-Export.xlsx"
      };
      new Spreadsheet(oSettings).build().finally(function(o){ if (o && o.destroy) { o.destroy(); } });
    },

    onSettings: function(){
      if (!this._settingsDialog){
        var oModel = this.getView().getModel();
        var keys = ["id","title","role","module","description","lastUpdated","sapHelpLink","actions"];
        var items = keys.map(function(k){
          return new CustomListItem({
            content: [
              new Label({ text: k, width: "12rem" }),
              new Switch({ state: "{/columnVisibility/" + k + "}" })
            ]
          });
        });
        var oList = new List({ items: items });
        this._settingsDialog = new Dialog({
          title: "Column Visibility",
          contentWidth: "24rem",
          contentHeight: "auto",
          content: [ oList ],
          endButton: new Button({ text: "Close", press: function(){ this._settingsDialog.close(); }.bind(this) }),
          customHeader: new Bar({})
        });
        this._settingsDialog.setModel(oModel);
        this.getView().addDependent(this._settingsDialog);
      }
      this._settingsDialog.open();
    },

    onAdaptFilters: function(){
      if (!this._filtersDialog){
        var oModel = this.getView().getModel();
        var inpQuery = new Input({ value: "{/advanced/query}", placeholder: "Search text" });
        var inpTags = new Input({ value: "{/advanced/tags}", placeholder: "Tags (comma-separated)" });
        var dpFrom = new DatePicker({ value: "{/advanced/dateFrom}", placeholder: "From (YYYY-MM-DD)" });
        var dpTo = new DatePicker({ value: "{/advanced/dateTo}", placeholder: "To (YYYY-MM-DD)" });
        var list = new List({
          items: [
            new CustomListItem({ content: [ new Label({ text: "Query", width: "10rem" }), inpQuery ] }),
            new CustomListItem({ content: [ new Label({ text: "Tags", width: "10rem" }), inpTags ] }),
            new CustomListItem({ content: [ new Label({ text: "Date From", width: "10rem" }), dpFrom ] }),
            new CustomListItem({ content: [ new Label({ text: "Date To", width: "10rem" }), dpTo ] })
          ]
        });
        this._filtersDialog = new Dialog({
          title: "Adapt Filters",
          contentWidth: "28rem",
          contentHeight: "auto",
          content: [ list ],
          beginButton: new Button({ text: "Apply", type: "Emphasized", press: function(){ this._filtersDialog.close(); MessageToast.show("Filters applied"); }.bind(this) }),
          endButton: new Button({ text: "Close", press: function(){ this._filtersDialog.close(); }.bind(this) })
        });
        this._filtersDialog.setModel(oModel);
        this.getView().addDependent(this._filtersDialog);
      }
      this._filtersDialog.open();
    }
  });
});
