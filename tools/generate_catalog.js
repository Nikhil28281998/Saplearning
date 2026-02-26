/**
 * One-time script to generate the comprehensive SAP Learning Hub course catalog.
 * Merges existing seed courses (with proper topic categorization) and curated
 * SAP Learning Hub courses into a single reference CSV.
 *
 * Usage: node tools/generate_catalog.js
 */
const fs = require('fs');
const crypto = require('crypto');

function uuid() { return crypto.randomUUID(); }

function csvEscape(val) {
  if (val == null) return '';
  val = String(val);
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function csvRow(obj) {
  return [obj.id, obj.url, obj.topic, obj.title, obj.sap_module, obj.role, obj.description,
          obj.lastUpdated, obj.sapHelpLink].map(csvEscape).join(',');
}

// Map topic → default role
function topicToRole(topic) {
  var map = {
    'Finance': 'Consultant', 'Sales': 'Consultant', 'Procurement': 'Consultant',
    'Supply Chain': 'Consultant', 'Manufacturing': 'Consultant', 'HR': 'Consultant',
    'Asset Management': 'Consultant', 'Professional Services': 'Consultant',
    'BTP': 'Developer', 'Development': 'Developer', 'Integration': 'Developer',
    'Low-Code': 'Developer', 'AI': 'Developer',
    'Security': 'Admin', 'Basis': 'Admin',
    'Analytics': 'Consultant', 'Process Mining': 'Consultant',
    'Cross-Functional': 'Consultant', 'Sustainability': 'Consultant'
  };
  return map[topic] || 'Consultant';
}

// ── 1. Read existing seed courses ──────────────────────────────────────────
const existingCsv = fs.readFileSync('db/data/Learning_Data-Trainings.csv', 'utf8');
const existingCourses = existingCsv.trim().split('\n').slice(1).map(line => {
  const p = line.split(',');
  const mod  = p[4];
  const title = p[3];

  // Map old generic topic (Developer/Admin/Consultant) → proper category
  let topic;
  if (mod === 'FI_CO')       topic = 'Finance';
  else if (mod === 'SD')     topic = 'Sales';
  else if (mod === 'MM')     topic = title.includes('Warehouse') ? 'Supply Chain' : 'Procurement';
  else if (mod === 'PP')     topic = title.includes('Quality') ? 'Supply Chain' : 'Manufacturing';
  else if (mod === 'WM' || mod === 'SCM') topic = 'Supply Chain';
  else if (mod === 'PM')     topic = 'Asset Management';
  else if (mod === 'PS')     topic = 'Professional Services';
  else if (mod === 'HR')     topic = 'HR';
  else if (mod === 'ANALYTICS') topic = 'Analytics';
  else if (mod === 'SECURITY')  topic = 'Security';
  else if (mod === 'BASIS')  topic = 'Basis';
  else if (mod === 'BTP')    topic = 'BTP';
  else if (mod === 'HANA')   topic = 'BTP';
  else if (mod === 'UI_UX')  topic = 'Development';
  else if (mod === 'ABAP') {
    topic = (title.includes('RFC') || title.includes('IDoc')) ? 'Integration' : 'Development';
  }
  else topic = 'Cross-Functional';

  // Fix: SAP PS Project Systems has sap_module = PM in existing data
  if (title.includes('Project System')) topic = 'Professional Services';

  return { id: p[0], url: p[1], topic, title, sap_module: mod,
           role: topicToRole(topic),
           description: p.slice(5, p.length - 2).join(','), // handle commas in desc
           lastUpdated: p[p.length - 2], sapHelpLink: p[p.length - 1] };
});

// ── 2. Curated SAP Learning Hub courses (76 real courses) ──────────────────
const now = '2026-02-15T00:00:00Z';
const curated = [
  // ── FINANCE ──
  { url: "https://learning.sap.com/courses/asset-accounting-processes", topic: "Finance", title: "Asset Accounting Processes", sap_module: "FI_CO", description: "Learn asset master data, acquisitions, depreciation runs, and retirement processes in S/4HANA", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/courses/consolidation-processes-in-sap-s-4hana", topic: "Finance", title: "Consolidation Processes in SAP S/4HANA", sap_module: "FI_CO", description: "Group reporting and consolidation postings in S/4HANA Cloud", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/courses/profitability-analysis-in-sap-s-4hana-cloud", topic: "Finance", title: "Profitability Analysis in SAP S/4HANA Cloud", sap_module: "FI_CO", description: "Configure and run profitability analysis using margin analysis", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/courses/bank-accounting-in-sap-s-4hana-cloud", topic: "Finance", title: "Bank Accounting in SAP S/4HANA Cloud", sap_module: "FI_CO", description: "Bank master data, electronic bank statements, and payment processing", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/courses/detailing-posting-control-allocations-and-settlement", topic: "Finance", title: "Detailing Posting Control Allocations and Settlement", sap_module: "FI_CO", description: "Overhead cost accounting: posting control, allocations, and settlement", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/courses/localization-in-sap-s-4hana-cloud", topic: "Finance", title: "Localization in SAP S/4HANA Cloud", sap_module: "FI_CO", description: "Country-specific legal requirements and localization settings", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/courses/financial-close-in-sap-s-4hana-cloud", topic: "Finance", title: "Financial Close in SAP S/4HANA Cloud", sap_module: "FI_CO", description: "Period-end closing activities, balance carryforward, and financial statements", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/courses/general-ledger-accounting-in-sap-s-4hana-cloud", topic: "Finance", title: "General Ledger Accounting in SAP S/4HANA Cloud", sap_module: "FI_CO", description: "Chart of accounts, journal entries, and G/L accounting processes", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/courses/accounts-payable-and-receivable-in-sap-s-4hana-cloud", topic: "Finance", title: "Accounts Payable and Receivable in SAP S/4HANA Cloud", sap_module: "FI_CO", description: "Vendor and customer invoice processing, payments, and dunning", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/courses/cost-center-accounting-in-sap-s-4hana", topic: "Finance", title: "Cost Center Accounting in SAP S/4HANA", sap_module: "FI_CO", description: "Cost center planning, postings, and allocations", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-s-4hana-cloud-public-edition-for-finance", topic: "Finance", title: "Discover SAP S/4HANA Cloud for Finance", sap_module: "FI_CO", description: "End-to-end learning journey covering all finance processes in S/4HANA Cloud", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },
  { url: "https://learning.sap.com/learning-journeys/discovering-finance-in-sap-s-4hana", topic: "Finance", title: "Discovering Finance in SAP S/4HANA", sap_module: "FI_CO", description: "Comprehensive introduction to Financial Accounting in S/4HANA", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fi-co" },

  // ── SALES ──
  { url: "https://learning.sap.com/courses/sales-order-management-in-sap-s-4hana-cloud", topic: "Sales", title: "Sales Order Management in SAP S/4HANA Cloud", sap_module: "SD", description: "Order-to-cash process: sales orders, deliveries, and billing", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/sd" },
  { url: "https://learning.sap.com/courses/pricing-in-sap-s-4hana-cloud", topic: "Sales", title: "Pricing in SAP S/4HANA Cloud", sap_module: "SD", description: "Pricing procedures, condition techniques, and pricing configuration", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/sd" },
  { url: "https://learning.sap.com/courses/complaint-handling-in-sap-s-4hana-cloud", topic: "Sales", title: "Complaint Handling in SAP S/4HANA Cloud", sap_module: "SD", description: "Returns, credit/debit memos, and complaint management processes", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/sd" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-s-4hana-cloud-public-edition-for-sales", topic: "Sales", title: "Discover SAP S/4HANA Cloud for Sales", sap_module: "SD", description: "Learning journey for Sales processes in S/4HANA Cloud", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/sd" },

  // ── PROCUREMENT ──
  { url: "https://learning.sap.com/courses/purchasing-in-sap-s-4hana", topic: "Procurement", title: "Purchasing in SAP S/4HANA", sap_module: "MM", description: "Purchasing processes: purchase requisitions, purchase orders, and goods receipt", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/mm" },
  { url: "https://learning.sap.com/courses/inventory-management-in-sap-s-4hana-cloud", topic: "Procurement", title: "Inventory Management in SAP S/4HANA Cloud", sap_module: "MM", description: "Goods movements, stock overview, and inventory valuation", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/mm" },
  { url: "https://learning.sap.com/courses/invoice-verification-in-sap-s-4hana-cloud", topic: "Procurement", title: "Invoice Verification in SAP S/4HANA Cloud", sap_module: "MM", description: "Logistics invoice verification and three-way matching", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/mm" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-s-4hana-cloud-public-edition-for-sourcing-and-procurement", topic: "Procurement", title: "Discover SAP S/4HANA Cloud for Sourcing and Procurement", sap_module: "MM", description: "Full procurement learning journey from sourcing to payment", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/mm" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-ariba", topic: "Procurement", title: "Discover SAP Ariba", sap_module: "MM", description: "Cloud procurement: sourcing, contracts, and supplier management", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/ariba" },

  // ── SUPPLY CHAIN ──
  { url: "https://learning.sap.com/courses/production-planning-in-sap-s-4hana-cloud", topic: "Supply Chain", title: "Production Planning in SAP S/4HANA Cloud", sap_module: "PP", description: "MRP, production orders, and manufacturing execution", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/pp" },
  { url: "https://learning.sap.com/courses/quality-management-in-sap-s-4hana-cloud", topic: "Supply Chain", title: "Quality Management in SAP S/4HANA Cloud", sap_module: "PP", description: "Quality planning, inspection lots, and certificates", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/pp" },
  { url: "https://learning.sap.com/courses/warehouse-management-in-sap-s-4hana-cloud", topic: "Supply Chain", title: "Warehouse Management in SAP S/4HANA Cloud", sap_module: "WM", description: "Extended warehouse management processes and inbound/outbound", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/wm" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-s-4hana-cloud-public-edition-for-supply-chain", topic: "Supply Chain", title: "Discover SAP S/4HANA Cloud for Supply Chain", sap_module: "SCM", description: "End-to-end supply chain learning journey", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/scm" },

  // ── MANUFACTURING ──
  { url: "https://learning.sap.com/courses/manufacturing-execution-in-sap-s-4hana-cloud", topic: "Manufacturing", title: "Manufacturing Execution in SAP S/4HANA Cloud", sap_module: "PP", description: "Shop floor control, production confirmations, and backflushing", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/pp" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-s-4hana-cloud-public-edition-for-manufacturing", topic: "Manufacturing", title: "Discover SAP S/4HANA Cloud for Manufacturing", sap_module: "PP", description: "Complete manufacturing learning journey", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/pp" },

  // ── BTP ──
  { url: "https://learning.sap.com/learning-journeys/discover-sap-business-technology-platform", topic: "BTP", title: "Discover SAP Business Technology Platform", sap_module: "BTP", description: "Comprehensive introduction to SAP BTP services, architecture, and capabilities", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/btp" },
  { url: "https://learning.sap.com/learning-journeys/developing-applications-running-on-sap-btp-using-sap-hana-cloud", topic: "BTP", title: "Developing Applications on SAP BTP Using SAP HANA Cloud", sap_module: "BTP", description: "Full-stack development with CAP, HANA Cloud, and BTP", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/btp" },
  { url: "https://learning.sap.com/courses/sap-cloud-application-programming-model", topic: "BTP", title: "SAP Cloud Application Programming Model (CAP)", sap_module: "BTP", description: "Build cloud-native apps with CDS, Node.js/Java, and SAP HANA", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/cap" },
  { url: "https://learning.sap.com/courses/administrating-sap-business-technology-platform", topic: "BTP", title: "Administrating SAP Business Technology Platform", sap_module: "BTP", description: "BTP cockpit administration, subaccounts, entitlements, and security", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/btp" },
  { url: "https://learning.sap.com/courses/security-in-sap-btp", topic: "BTP", title: "Security in SAP BTP", sap_module: "BTP", description: "Identity authentication, authorization, and trust configuration", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/btp" },
  { url: "https://learning.sap.com/courses/sap-cloud-connector", topic: "BTP", title: "SAP Cloud Connector", sap_module: "BTP", description: "Securely connect on-premise SAP systems to SAP BTP cloud services", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/cloud-connector" },
  { url: "https://learning.sap.com/courses/sap-hana-cloud-getting-started", topic: "BTP", title: "SAP HANA Cloud - Getting Started", sap_module: "HANA", description: "Provision and configure SAP HANA Cloud instances on BTP", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/hana-cloud" },
  { url: "https://learning.sap.com/courses/introduction-to-sap-fiori", topic: "BTP", title: "Introduction to SAP Fiori", sap_module: "UI_UX", description: "SAP Fiori design principles, launchpad, and app types", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fiori" },

  // ── INTEGRATION ──
  { url: "https://learning.sap.com/learning-journeys/discover-sap-integration-suite", topic: "Integration", title: "Discover SAP Integration Suite", sap_module: "BTP", description: "Cloud Integration, API Management, Event Mesh, and Integration Advisor", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/integration-suite" },
  { url: "https://learning.sap.com/courses/sap-cloud-integration", topic: "Integration", title: "SAP Cloud Integration", sap_module: "BTP", description: "Design and monitor integration flows in SAP Integration Suite", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/integration-suite" },
  { url: "https://learning.sap.com/courses/sap-api-management", topic: "Integration", title: "SAP API Management", sap_module: "BTP", description: "Create, publish, and manage APIs with API Management", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/api-management" },

  // ── ANALYTICS ──
  { url: "https://learning.sap.com/courses/sap-analytics-cloud-getting-started", topic: "Analytics", title: "SAP Analytics Cloud - Getting Started", sap_module: "ANALYTICS", description: "Business intelligence, planning, and predictive analytics with SAC", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/sac" },
  { url: "https://learning.sap.com/courses/sap-datasphere-fundamentals", topic: "Analytics", title: "SAP Datasphere Fundamentals", sap_module: "ANALYTICS", description: "Data integration, modeling, and consumption in SAP Datasphere", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/datasphere" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-analytics-cloud", topic: "Analytics", title: "Discover SAP Analytics Cloud", sap_module: "ANALYTICS", description: "Complete learning journey for SAP Analytics Cloud", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/sac" },

  // ── LOW-CODE ──
  { url: "https://learning.sap.com/learning-journeys/discover-sap-build", topic: "Low-Code", title: "Discover SAP Build", sap_module: "BTP", description: "Low-code/no-code development with SAP Build Apps, Process Automation, and Work Zone", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/build" },
  { url: "https://learning.sap.com/courses/sap-build-apps-getting-started", topic: "Low-Code", title: "SAP Build Apps - Getting Started", sap_module: "BTP", description: "Create business apps visually without coding using SAP Build Apps", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/build-apps" },
  { url: "https://learning.sap.com/courses/sap-build-process-automation", topic: "Low-Code", title: "SAP Build Process Automation", sap_module: "BTP", description: "Automate business processes with workflows, decisions, and RPA bots", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/build-process-automation" },
  { url: "https://learning.sap.com/courses/sap-build-work-zone", topic: "Low-Code", title: "SAP Build Work Zone", sap_module: "BTP", description: "Digital workplace with business sites, workspaces, and integrated apps", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/build-work-zone" },

  // ── AI ──
  { url: "https://learning.sap.com/courses/introduction-to-sap-business-ai", topic: "AI", title: "Introduction to SAP Business AI", sap_module: "AI", description: "SAP AI strategy, Joule copilot, and embedded AI capabilities", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/ai" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-ai", topic: "AI", title: "Discover SAP AI", sap_module: "AI", description: "SAP AI Core, AI Launchpad, and building AI-powered applications", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/ai" },

  // ── HR ──
  { url: "https://learning.sap.com/learning-journeys/discover-sap-successfactors", topic: "HR", title: "Discover SAP SuccessFactors", sap_module: "HR", description: "Employee Central, talent management, payroll, and analytics", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/successfactors" },
  { url: "https://learning.sap.com/courses/sap-successfactors-employee-central", topic: "HR", title: "SAP SuccessFactors Employee Central", sap_module: "HR", description: "Core HR: organizational management, employee data, and time off", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/successfactors" },
  { url: "https://learning.sap.com/courses/sap-successfactors-recruiting", topic: "HR", title: "SAP SuccessFactors Recruiting", sap_module: "HR", description: "Job requisitions, candidate management, and offer letters", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/successfactors" },

  // ── DEVELOPMENT ──
  { url: "https://learning.sap.com/learning-journeys/discover-abap-cloud-development", topic: "Development", title: "Discover ABAP Cloud Development", sap_module: "ABAP", description: "ABAP Cloud, RAP, CDS views, and clean core development", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/abap" },
  { url: "https://learning.sap.com/courses/rap-development-in-sap-s-4hana", topic: "Development", title: "RAP Development in SAP S/4HANA", sap_module: "ABAP", description: "RESTful ABAP Programming model for Fiori apps", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/rap" },
  { url: "https://learning.sap.com/courses/cds-views-in-abap", topic: "Development", title: "CDS Views in ABAP", sap_module: "ABAP", description: "Core Data Services views, annotations, and analytical queries", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/cds" },
  { url: "https://learning.sap.com/courses/sapui5-fundamentals", topic: "Development", title: "SAPUI5 Fundamentals", sap_module: "UI_UX", description: "SAPUI5 framework, controls, data binding, and MVC architecture", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/ui5" },
  { url: "https://learning.sap.com/courses/fiori-elements-in-sap-s-4hana", topic: "Development", title: "Fiori Elements in SAP S/4HANA", sap_module: "UI_UX", description: "Build SAP Fiori apps using annotations and Fiori Elements templates", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/fiori-elements" },
  { url: "https://learning.sap.com/courses/sap-s4hana-cloud-extensibility", topic: "Development", title: "SAP S/4HANA Cloud Extensibility", sap_module: "ABAP", description: "In-app and side-by-side extensions for S/4HANA Cloud", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/abap" },
  { url: "https://learning.sap.com/courses/clean-core-in-sap-s-4hana-cloud", topic: "Development", title: "Clean Core in SAP S/4HANA Cloud", sap_module: "ABAP", description: "Clean core principles, key user extensibility, and developer extensibility", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/abap" },

  // ── SECURITY ──
  { url: "https://learning.sap.com/courses/sap-authorization-concept", topic: "Security", title: "SAP Authorization Concept", sap_module: "SECURITY", description: "PFCG roles, authorization objects, and user administration", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/security" },
  { url: "https://learning.sap.com/courses/sap-grc-access-control", topic: "Security", title: "SAP GRC Access Control", sap_module: "SECURITY", description: "Segregation of duties, access risk analysis, and emergency access", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/grc" },
  { url: "https://learning.sap.com/courses/sap-identity-authentication", topic: "Security", title: "SAP Identity Authentication Service", sap_module: "SECURITY", description: "Cloud identity management, SSO, and MFA configuration", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/identity-authentication" },

  // ── BASIS ──
  { url: "https://learning.sap.com/courses/sap-s4hana-system-administration", topic: "Basis", title: "SAP S/4HANA System Administration", sap_module: "BASIS", description: "System monitoring, transport management, and background job scheduling", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/basis" },
  { url: "https://learning.sap.com/courses/sap-solution-manager-overview", topic: "Basis", title: "SAP Solution Manager Overview", sap_module: "BASIS", description: "IT service management, change management, and application lifecycle", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/solution-manager" },
  { url: "https://learning.sap.com/courses/sap-s4hana-migration", topic: "Basis", title: "SAP S/4HANA Migration and Conversion", sap_module: "BASIS", description: "System conversion strategies, migration cockpit, and data migration", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/s4hana" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-cloud-alm", topic: "Basis", title: "Discover SAP Cloud ALM", sap_module: "BASIS", description: "Application lifecycle management in the cloud: monitoring, testing, deploying", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/cloud-alm" },

  // ── PROCESS MINING ──
  { url: "https://learning.sap.com/learning-journeys/discover-sap-signavio", topic: "Process Mining", title: "Discover SAP Signavio", sap_module: "BTP", description: "Process mining, process management, and process intelligence", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/signavio" },
  { url: "https://learning.sap.com/courses/sap-signavio-process-insights", topic: "Process Mining", title: "SAP Signavio Process Insights", sap_module: "BTP", description: "Analyze and optimize business processes with process mining", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/signavio" },

  // ── CROSS-FUNCTIONAL ──
  { url: "https://learning.sap.com/courses/sap-activate-methodology", topic: "Cross-Functional", title: "SAP Activate Methodology", sap_module: "BASIS", description: "Implementation methodology: Discover, Prepare, Explore, Realize, Deploy, Run", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/activate" },
  { url: "https://learning.sap.com/courses/fit-to-standard-workshops", topic: "Cross-Functional", title: "Fit-to-Standard Workshops", sap_module: "BASIS", description: "Best practice configuration and gap analysis workshops", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/activate" },
  { url: "https://learning.sap.com/courses/master-data-governance-in-sap-s-4hana", topic: "Cross-Functional", title: "Master Data Governance in SAP S/4HANA", sap_module: "BASIS", description: "Central governance of business partner, material, and financial master data", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/mdg" },
  { url: "https://learning.sap.com/courses/sap-enable-now-for-organizations", topic: "Cross-Functional", title: "SAP Enable Now for Organizations", sap_module: "BASIS", description: "Digital adoption: in-app help, guided tours, and learning content", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/enable-now" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-s-4hana-cloud", topic: "Cross-Functional", title: "Discover SAP S/4HANA Cloud", sap_module: "BASIS", description: "Comprehensive overview of SAP S/4HANA Cloud Public Edition capabilities", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/s4hana" },

  // ── SUSTAINABILITY ──
  { url: "https://learning.sap.com/courses/sap-sustainability-control-tower", topic: "Sustainability", title: "SAP Sustainability Control Tower", sap_module: "ANALYTICS", description: "ESG reporting, carbon footprint tracking, and sustainability KPIs", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/sustainability" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-sustainability-solutions", topic: "Sustainability", title: "Discover SAP Sustainability Solutions", sap_module: "ANALYTICS", description: "Full sustainability portfolio: Green Ledger, Product Footprint, Climate Action", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/sustainability" },

  // ── ASSET MANAGEMENT ──
  { url: "https://learning.sap.com/courses/plant-maintenance-in-sap-s-4hana-cloud", topic: "Asset Management", title: "Plant Maintenance in SAP S/4HANA Cloud", sap_module: "PM", description: "Preventive and corrective maintenance, work orders, and notifications", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/pm" },
  { url: "https://learning.sap.com/learning-journeys/discover-sap-s-4hana-cloud-public-edition-for-asset-management", topic: "Asset Management", title: "Discover SAP S/4HANA Cloud for Asset Management", sap_module: "PM", description: "End-to-end asset management and maintenance learning journey", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/pm" },

  // ── PROFESSIONAL SERVICES ──
  { url: "https://learning.sap.com/courses/project-management-in-sap-s-4hana-cloud", topic: "Professional Services", title: "Project Management in SAP S/4HANA Cloud", sap_module: "PS", description: "Project planning, resource management, and time recording", lastUpdated: now, sapHelpLink: "https://help.sap.com/docs/ps" },
];

// ── 3. Merge & deduplicate by URL ──────────────────────────────────────────
const urlSet = new Set();
const all = [];

// Curated courses first (they have real SAP Learning Hub URLs)
for (const c of curated) {
  if (!urlSet.has(c.url)) {
    urlSet.add(c.url);
    c.id = uuid();
    c.role = topicToRole(c.topic);
    all.push(c);
  }
}

// Then existing seed courses (additional content)
for (const c of existingCourses) {
  if (!urlSet.has(c.url)) {
    urlSet.add(c.url);
    all.push(c);
  }
}

// ── 4. Sort by topic then title ────────────────────────────────────────────
all.sort((a, b) => a.topic.localeCompare(b.topic) || a.title.localeCompare(b.title));

// ── 5. Write CSV ───────────────────────────────────────────────────────────
const header = 'ID,url,topic,title,sap_module,role,description,lastUpdated,sapHelpLink';
const rows = all.map(csvRow);
const outPath = 'db/data/SAP_Learning_Hub_Complete_Catalog.csv';
fs.writeFileSync(outPath, header + '\n' + rows.join('\n') + '\n');

console.log(`Wrote ${all.length} courses to ${outPath}`);

// Topic breakdown
const topics = {};
for (const c of all) topics[c.topic] = (topics[c.topic] || 0) + 1;
console.log('\nTopic breakdown:');
Object.entries(topics).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`  ${t}: ${n}`));
