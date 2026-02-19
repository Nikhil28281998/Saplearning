"""
Generate SAP Free Courses Excel from SAP Learning Hub data.
Covers: Finance, Controlling, Material Management, Sales & Distribution,
        Supply Chain Management, BTP, CPI/Integration, SAP Build
Columns: id, url (Enable Now only), role, title, module, description, lastUpdated, sapHelpLink
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import datetime
import os

# ── Course data gathered from SAP Learning Hub (free courses only) ──────────

courses = [
    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Finance (FI)
    # ═══════════════════════════════════════════════════════════════════
    {
        "id": "FI-001",
        "url": "",
        "role": "Consultant / Business User",
        "title": "Discovering Finance in SAP S/4HANA",
        "module": "Finance (FI)",
        "description": "Get an overview of Finance in SAP S/4HANA and discover some of its core capabilities. 8 Courses, 14 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/discovering-finance-in-sap-s-4hana"
    },
    {
        "id": "FI-002",
        "url": "",
        "role": "Consultant",
        "title": "Implementing Financial Accounting in SAP S/4HANA Cloud",
        "module": "Finance (FI)",
        "description": "Learn how to implement Financial Accounting in SAP S/4HANA Cloud Public Edition and get certified. 15 Courses, 41 hr+. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/implementing-financial-accounting-in-sap-s4hana-cloud"
    },
    {
        "id": "FI-003",
        "url": "",
        "role": "Consultant",
        "title": "Implementing Management Accounting in SAP S/4HANA Cloud",
        "module": "Finance (FI)",
        "description": "Learn how to implement Management Accounting in SAP S/4HANA Cloud Public Edition and get certified. 6 Courses, 15 hr+. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/implementing-management-accounting-in-sap-s-4hana-cloud"
    },
    {
        "id": "FI-004",
        "url": "",
        "role": "Business User",
        "title": "Outlining the Financial Accounting Overview in SAP S/4HANA",
        "module": "Finance (FI)",
        "description": "As a newcomer to finance business processes on SAP S/4HANA, learn about the different parts of Financial Accounting utilizing demos and exercises. 4 Courses, 5 hr. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/outlining-the-financial-accounting-overview-in-sap-s-4hana"
    },
    {
        "id": "FI-005",
        "url": "",
        "role": "Business User / Consultant",
        "title": "Outlining the Record to Report Process in SAP S/4HANA",
        "module": "Finance (FI)",
        "description": "Introduction to the key concepts and structures of Financial Accounting master data and postings in SAP S/4HANA. 4 Courses, 11 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/outlining-the-record-to-report-process-in-sap-s-4hana"
    },
    {
        "id": "FI-006",
        "url": "",
        "role": "Consultant",
        "title": "Designing the Record to Report Process in SAP S/4HANA",
        "module": "Finance (FI)",
        "description": "Configure Accruals Management, Financial Statement Reporting and Advanced Financial Closing in SAP S/4HANA Cloud. 3 Courses, 6 hr.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/designing-the-record-to-report-process-in-sap-s-4hana"
    },
    {
        "id": "FI-007",
        "url": "",
        "role": "Business User / Consultant",
        "title": "Describing the Payables Management Process in SAP S/4HANA",
        "module": "Finance (FI)",
        "description": "Learn how to describe the fundamental processes in Payables Management on SAP S/4HANA. Relevant for public cloud, private cloud and on premise. 4 Courses, 9 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/describing-the-payables-management-process-in-sap-s-4hana"
    },
    {
        "id": "FI-008",
        "url": "",
        "role": "Consultant",
        "title": "Using the Payables Management Process in SAP S/4HANA",
        "module": "Finance (FI)",
        "description": "Get familiar with payment processing, and with configuring and executing the payment program. Helpful for every deployment option. 3 Courses, 4 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/using-the-payables-management-process-in-sap-s-4hana"
    },
    {
        "id": "FI-009",
        "url": "",
        "role": "Business User",
        "title": "Describing the Receivables Management Process in SAP S/4HANA",
        "module": "Finance (FI)",
        "description": "Overview knowledge of fundamental business processes in the Receivables Management area on SAP S/4HANA. 4 Courses, 9 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/describing-the-receivables-management-process-in-sap-s-4hana"
    },
    {
        "id": "FI-010",
        "url": "",
        "role": "Consultant",
        "title": "Designing the Asset Accounting Process in SAP S/4HANA",
        "module": "Finance (FI)",
        "description": "Configure asset accounting, run integrated business processes, and perform year-end closing activities in SAP S/4HANA. 3 Courses, 6 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/designing-the-asset-accounting-process"
    },
    {
        "id": "FI-011",
        "url": "",
        "role": "Consultant",
        "title": "Exploring Accounting & Financial Close",
        "module": "Finance (FI)",
        "description": "Explore the accounting and financial close process. 5 Courses, 2 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/exploring-accounting-financial-close"
    },
    {
        "id": "FI-012",
        "url": "",
        "role": "Business User",
        "title": "Describing Contracts for Real Estate Management in SAP S/4HANA",
        "module": "Finance (FI)",
        "description": "Comprehensive knowledge on managing Real Estate contracts in SAP S/4HANA. Relevant for public cloud, private cloud and on-premise. 5 Courses, 9 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/describing-contracts-for-real-estate-management-in-sap-s4hana"
    },
    {
        "id": "FI-013",
        "url": "",
        "role": "Consultant",
        "title": "Detailing Profitability Accounting for Discrete Industries",
        "module": "Finance (FI)",
        "description": "Execute and configure Profitability Accounting in Make-to-Stock business scenarios in SAP S/4HANA Cloud Public Edition. Course ID: F2231. 4 hr+. Includes Hands-on Practice.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/detailing-profitability-accounting-for-discrete-industries"
    },
    {
        "id": "FI-014",
        "url": "",
        "role": "Consultant",
        "title": "Detailing Profitability Accounting in Make-to-Order Scenarios",
        "module": "Finance (FI)",
        "description": "Configure Profitability Accounting in Make-to-Order business scenarios in SAP S/4HANA. Course ID: F2241. 4 hr. Includes Hands-on Practice.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/detailing-profitability-accounting-in-make-to-order-scenarios"
    },
    {
        "id": "FI-015",
        "url": "",
        "role": "Consultant",
        "title": "Rule-based Consolidation of Investments",
        "module": "Finance (FI)",
        "description": "Essential configuration steps to implement rule-based consolidations for SAP S/4HANA Cloud for group reporting. Course ID: F9631. 5 hr. Includes Hands-on Practice.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/rule-based-consolidation-of-investments"
    },
    {
        "id": "FI-016",
        "url": "",
        "role": "Consultant",
        "title": "Detailing Profit Center Reorganization",
        "module": "Finance (FI)",
        "description": "Analyze, prepare, and perform organizational changes in your SAP S/4HANA system using reorganization tools. Course ID: F1261. 3 hr.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/detailing-profit-center-reorganization"
    },
    {
        "id": "FI-017",
        "url": "",
        "role": "Business User",
        "title": "Discovering Treasury Management in SAP S/4HANA",
        "module": "Finance (FI)",
        "description": "Discover the range of capabilities and business benefits for efficient Treasury operations. Course ID: F4011. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/discovering-treasury-management"
    },
    {
        "id": "FI-018",
        "url": "",
        "role": "Business User",
        "title": "Administration of Bank Accounts",
        "module": "Finance (FI)",
        "description": "Learn how bank account administration core business processes are represented in SAP S/4HANA. Course ID: F4111. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/administration-of-bank-accounts"
    },
    {
        "id": "FI-019",
        "url": "",
        "role": "Business User",
        "title": "Outlining SAP S/4HANA Cloud for Group Reporting",
        "module": "Finance (FI)",
        "description": "Discover the financial consolidation business processes in an SAP system. Course ID: F9111. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/outlining-sap-s-4hana-cloud-for-group-reporting"
    },
    {
        "id": "FI-020",
        "url": "",
        "role": "Consultant",
        "title": "Implementing SAP S/4HANA Cloud for Group Reporting",
        "module": "Finance (FI)",
        "description": "Configure SAP S/4HANA Cloud for group reporting for financial consolidation. Also valid for SAP S/4HANA Finance for group reporting. 3 Courses, 30 hr. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/implementing-sap-s-4hana-cloud-for-group-reporting"
    },
    {
        "id": "FI-021",
        "url": "",
        "role": "Consultant",
        "title": "Performing Consolidation with SAP S/4HANA Cloud for Group Reporting",
        "module": "Finance (FI)",
        "description": "Use SAP S/4HANA Cloud for group reporting to perform consolidation and analyze the consolidated values. 2 Courses, 8 hr. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/performing-consolidation-with-sap-s-4hana-cloud-for-group-reporting"
    },
    {
        "id": "FI-022",
        "url": "",
        "role": "Consultant",
        "title": "Exploring SAP Taulia Working Capital Management",
        "module": "Finance (FI)",
        "description": "Overview of the scope and importance of SAP Taulia Working Capital Management. Course ID: SL_FIN511C. 4 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/exploring-sap-taulia-working-capital-management-1"
    },
    {
        "id": "FI-023",
        "url": "",
        "role": "Consultant",
        "title": "Discovering SAP Business AI Capabilities for SAP Finance",
        "module": "Finance (FI)",
        "description": "Delve into the intersection of finance and AI with SAP's innovative solutions. Understand the strategy behind SAP Business AI for financial management. 2 Courses, 3 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/discovering-new-ai-capabilities-for-sap-finance"
    },
    {
        "id": "FI-024",
        "url": "",
        "role": "Business User",
        "title": "Discovering SAP Solutions for Quote-to-Cash Management (Public Cloud)",
        "module": "Finance (FI)",
        "description": "Introduction to the end-to-end process of Solution and Subscription-based business in SAP Solutions for Quote-to-Cash Management. Course ID: BR473. 3 hr.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/discovering-sap-solutions-for-quote-to-cash-management-public-cloud-for-business-user"
    },
    {
        "id": "FI-025",
        "url": "",
        "role": "Consultant",
        "title": "Exploring Localization as a Self-Service for SAP S/4HANA Cloud Public Edition",
        "module": "Finance (FI)",
        "description": "Fundamental knowledge about the capabilities of Localization as a Self-Service for implementing localizations. Course ID: S4CLS. 8 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/applying-localization-as-a-self-service-for-sap-s-4hana-cloud-public-edition-1"
    },

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Controlling (CO)
    # ═══════════════════════════════════════════════════════════════════
    {
        "id": "CO-001",
        "url": "",
        "role": "Business User",
        "title": "Outlining Cost Management and Profitability Analysis",
        "module": "Controlling (CO)",
        "description": "Discover core business processes in Overhead Cost Accounting. Course ID: F2111. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/outlining-cost-management-and-profitability-analysis"
    },
    {
        "id": "CO-002",
        "url": "",
        "role": "Business User / Consultant",
        "title": "Performing Overhead Cost Controlling in SAP S/4HANA",
        "module": "Controlling (CO)",
        "description": "Introduces core business processes in Overhead Cost Accounting: cost centers, projects, and internal orders. Valid for SAP S/4HANA Cloud public/private and on premise. 4 Courses, 11 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/performing-overhead-cost-controlling-in-sap-s-4hana"
    },
    {
        "id": "CO-003",
        "url": "",
        "role": "Consultant",
        "title": "Evaluating Overhead Cost Accounting in SAP S/4HANA",
        "module": "Controlling (CO)",
        "description": "Critical concepts, terminology, and diverse configuration options of Overhead Cost Accounting in SAP S/4HANA. Relevant for public cloud, private cloud and on premise. 1 Course, 6 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/evaluating-overhead-cost-accounting-in-sap-s-4hana"
    },
    {
        "id": "CO-004",
        "url": "",
        "role": "Consultant",
        "title": "Evaluating Production Accounting in Make-to-Stock Scenarios in SAP S/4HANA",
        "module": "Controlling (CO)",
        "description": "Covers various Make-to-Stock production processes from the perspective of event-based Production Accounting by Order and by Period. Equips consultants with knowledge of cost objects such as production orders and product cost collectors. 2 Courses, 4 hr.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/evaluating-production-accounting-in-make-to-stock-scenarios-in-sap-s-4hana"
    },

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Material Management (MM) / Sourcing & Procurement
    # ═══════════════════════════════════════════════════════════════════
    {
        "id": "MM-001",
        "url": "",
        "role": "Consultant",
        "title": "Implementing SAP S/4HANA Cloud Public Edition, Sourcing and Procurement",
        "module": "Material Management (MM)",
        "description": "Implement sourcing and procurement-specific business processes in SAP S/4HANA Cloud Public Edition. 9 Courses, 35 hr+. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/implement-sap-s-4hana-cloud-public-edition-for-sourcing-and-procurement"
    },
    {
        "id": "MM-002",
        "url": "",
        "role": "Consultant",
        "title": "Implementing SAP S/4HANA Cloud Private Edition, Sourcing and Procurement",
        "module": "Material Management (MM)",
        "description": "Implement sourcing and procurement-specific business processes in SAP S/4HANA Private Cloud. 6 Courses, 82 hr+. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/implementing-sap-s-4hana-cloud-private-edition-sourcing-and-procurement"
    },
    {
        "id": "MM-003",
        "url": "",
        "role": "Consultant",
        "title": "Implementing SAP S/4HANA Cloud Public Edition",
        "module": "Material Management (MM)",
        "description": "Fundamental knowledge required to implement SAP S/4HANA Cloud Public Edition. Course ID: S4C01. 12 hr+. Includes Hands-on Practice. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/implementing-sap-s-4hana-cloud-public-edition"
    },
    {
        "id": "MM-004",
        "url": "",
        "role": "Consultant",
        "title": "Exploring End-to-End Business Processes in SAP Business Suite",
        "module": "Material Management (MM)",
        "description": "Introduction to SAP Business Suite and its integrated end-to-end business processes, focusing on SAP S/4HANA Cloud Public Edition. Course ID: IEE2E. 32 hr+. Includes Hands-on Practice. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/exploring-end-to-end-business-processes-in-sap-business-suite"
    },

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Sales and Distribution (SD)
    # ═══════════════════════════════════════════════════════════════════
    {
        "id": "SD-001",
        "url": "",
        "role": "Business User",
        "title": "SAP S/4HANA Sales Insights",
        "module": "Sales and Distribution (SD)",
        "description": "Introduction to the fundamental processes in SAP S/4HANA Sales. Course ID: S4690. 3 hr.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/sap-s-4hana-sales-insights"
    },
    {
        "id": "SD-002",
        "url": "",
        "role": "Business User / Consultant",
        "title": "Exploring SAP S/4HANA Sales Essentials",
        "module": "Sales and Distribution (SD)",
        "description": "Execute essential process steps in SAP S/4HANA Sales. Course ID: S46000. 6 hr+. Includes Hands-on Practice.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/exploring-sap-s-4hana-sales-essentials"
    },
    {
        "id": "SD-003",
        "url": "",
        "role": "Consultant",
        "title": "Implementing Sales in SAP S/4HANA Cloud Public Edition",
        "module": "Sales and Distribution (SD)",
        "description": "Preparation for SAP S/4HANA Cloud Public Edition Sales certification. 7 Courses, 49 hr+. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/implementing-sap-s4hana-cloud-public-edition-sales"
    },
    {
        "id": "SD-004",
        "url": "",
        "role": "Administrator",
        "title": "Configuring SAP Sales and Service Cloud as an Administrator",
        "module": "Sales and Distribution (SD)",
        "description": "Configure features of SAP Sales and Service Cloud: system setup, fine tuning, personalizing features and Go Live preparation. 1 Course, 3 hr. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/sap-sales-and-service-cloud-administration"
    },

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: Supply Chain Management (SCM)
    # ═══════════════════════════════════════════════════════════════════
    {
        "id": "SCM-001",
        "url": "",
        "role": "Consultant",
        "title": "Positioning SAP Supply Chain Management Solutions",
        "module": "Supply Chain Management (SCM)",
        "description": "Master SAP Supply Chain Management solutions within SAP Business Suite. Covers end-to-end SCM processes. 4 Courses, 4 hr+. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/positioning-sap-supply-chain-solutions"
    },
    {
        "id": "SCM-002",
        "url": "",
        "role": "Business User",
        "title": "Discovering SAP Supply Chain Management Solutions",
        "module": "Supply Chain Management (SCM)",
        "description": "How SAP Supply Chain Management solutions provide end-to-end solutions addressing COO key priorities. Course ID: SL_SCM100. 41 min.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/discovering-sap-supply-chain-management-solutions"
    },
    {
        "id": "SCM-003",
        "url": "",
        "role": "Consultant",
        "title": "Positioning SAP Supply Chain Management Solutions (Course)",
        "module": "Supply Chain Management (SCM)",
        "description": "Position SAP Supply Chain Management solutions within the SAP Business Suite context. Course ID: SL_SCM200. 1 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/positioning-sap-supply-chain-management-solutions"
    },
    {
        "id": "SCM-004",
        "url": "",
        "role": "Consultant",
        "title": "Introducing SAP Business AI for SAP Supply Chain Management",
        "module": "Supply Chain Management (SCM)",
        "description": "Strategic applications of SAP Business AI, technical requirements, and practical use cases in supply chain management. Course ID: SL_SCM150. 53 min.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/introducing-sap-business-ai-for-sap-supply-chain-management"
    },
    {
        "id": "SCM-005",
        "url": "",
        "role": "Business User",
        "title": "Discovering Extended Warehouse Management with SAP S/4HANA",
        "module": "Supply Chain Management (SCM)",
        "description": "Assess different solution and deployment options for warehouse management, and functions and processes of Extended Warehouse Management in SAP S/4HANA. 1 Course, 4 hr. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/discovering-extended-warehouse-management-with-sap-s-4hana"
    },
    {
        "id": "SCM-006",
        "url": "",
        "role": "Consultant",
        "title": "Configuring SAP Business Network Supply Chain Collaboration Add-On",
        "module": "Supply Chain Management (SCM)",
        "description": "Configuration and administration of SAP Business Network Supply Chain Collaboration Add-On options. 3 Courses, 4 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/configuring-sap-business-network-supply-chain-collaboration-add-on"
    },

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: SAP BTP (Business Technology Platform)
    # ═══════════════════════════════════════════════════════════════════
    {
        "id": "BTP-001",
        "url": "",
        "role": "Consultant / Developer",
        "title": "Exploring SAP Business Technology Platform",
        "module": "SAP BTP",
        "description": "Introduction to SAP BTP: strategy, application development and automation, integration, data and analytics, and AI. Course ID: BTP100. 5 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/exploring-sap-business-technology-platform"
    },
    {
        "id": "BTP-002",
        "url": "",
        "role": "Business User",
        "title": "Discovering SAP Business Technology Platform",
        "module": "SAP BTP",
        "description": "Discover SAP Business Technology Platform. Course ID: SL_BTP400. 1 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/discovering-sap-business-technology-platform-1"
    },
    {
        "id": "BTP-003",
        "url": "",
        "role": "Architect",
        "title": "Becoming an SAP BTP Solution Architect",
        "module": "SAP BTP",
        "description": "Design intelligent enterprise solutions using SAP BTP. Covers data & analytics, integration, AI, and architectural methodologies. 1 Course, 5 hr. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/becoming-an-sap-btp-solution-architect"
    },
    {
        "id": "BTP-004",
        "url": "",
        "role": "Administrator",
        "title": "Operating SAP Business Technology Platform",
        "module": "SAP BTP",
        "description": "Set up and configure SAP Business Technology Platform (BTP). Course ID: BTP200. 13 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/operating-sap-business-technology-platform"
    },
    {
        "id": "BTP-005",
        "url": "",
        "role": "Developer",
        "title": "Developing Applications for SAP BTP, Cloud Foundry runtime",
        "module": "SAP BTP",
        "description": "All important aspects to develop and run apps on SAP BTP, Cloud Foundry runtime. Course ID: CF400. 1 hr+. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/developing-applications-for-sap-btp-cloud-foundry-runtime"
    },
    {
        "id": "BTP-006",
        "url": "",
        "role": "Developer",
        "title": "Develop extensions with CAP following the SAP BTP Developer's Guide",
        "module": "SAP BTP",
        "description": "Build a CAP application following the SAP BTP Developer's Guide. Course ID: CLD200. 9 hr+. Includes Hands-on Practice. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/develop-extensions-with-cap-following-the-sap-btp-developer-s-guide"
    },
    {
        "id": "BTP-007",
        "url": "",
        "role": "Security Architect",
        "title": "Architecting Security for SAP Business Technology Platform",
        "module": "SAP BTP",
        "description": "Comprehensive understanding of security in a hybrid SAP environment: IAM, role-based access, API security, incident response, network security. Course ID: SECCL3. 2 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/architecting-security-for-sap-business-technology-platform"
    },
    {
        "id": "BTP-008",
        "url": "",
        "role": "Administrator",
        "title": "Introducing SAP Cloud Identity Services",
        "module": "SAP BTP",
        "description": "Guides you across the Identity Authentication Service and the Identity Provisioning Service. Course ID: SECCL1. 2 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/introducing-sap-cloud-identity-services"
    },
    {
        "id": "BTP-009",
        "url": "",
        "role": "Administrator",
        "title": "Operating with SAP Cloud ALM",
        "module": "SAP BTP",
        "description": "Value and capabilities of SAP Cloud ALM for Operations: monitoring, analysis, Business Service Management and Event Management. Course ID: CALM40. 8 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/operating-with-sap-cloud-alm"
    },
    {
        "id": "BTP-010",
        "url": "",
        "role": "Developer",
        "title": "Developing Advanced Extensions with SAP Cloud SDK",
        "module": "SAP BTP",
        "description": "Develop side-by-side extensions on SAP BTP for SAP S/4HANA Cloud Public Edition or SAP SuccessFactors with SAP Cloud SDK. 1 Course, 11 hr. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/develop-advanced-extensions-with-sap-cloud-sdk"
    },
    {
        "id": "BTP-011",
        "url": "",
        "role": "Developer",
        "title": "Learning the Basics of ABAP Programming on SAP BTP",
        "module": "SAP BTP",
        "description": "Basic ABAP programming knowledge for on-premise and cloud system environments. 1 Course, 6 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/learn-the-basics-of-abap-programming-on-sap-btp"
    },
    {
        "id": "BTP-012",
        "url": "",
        "role": "Administrator",
        "title": "Introducing SAP ABAP Platform Fundamentals",
        "module": "SAP BTP",
        "description": "Fundamentals of the SAP ABAP Platform including concepts and tools needed for system administration. 1 Course, 6 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/introducing-sap-abap-platform-fundamentals"
    },
    {
        "id": "BTP-013",
        "url": "",
        "role": "Administrator / Developer",
        "title": "Setting up an ABAP Environment on SAP BTP",
        "module": "SAP BTP",
        "description": "Step-by-step guidance for administrators and developers to set up ABAP Environment in a productive SAP BTP Account. 1 Course, 1 hr. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/setting-up-an-abap-environment-on-sap-btp"
    },
    {
        "id": "BTP-014",
        "url": "",
        "role": "Developer",
        "title": "Introduction to AI Core",
        "module": "SAP BTP",
        "description": "Use SAP AI Core to handle the execution and operation of artificial intelligence assets. Course ID: AICO01. 2 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/introduction-to-ai-core"
    },
    {
        "id": "BTP-015",
        "url": "",
        "role": "Business User",
        "title": "Discovering SAP Business AI",
        "module": "SAP BTP",
        "description": "How SAP Business AI delivers real-world business value by automating processes, enhancing decision-making, and enabling innovation. Course ID: SL_BAI100. 40 min.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/discovering-sap-business-ai"
    },

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: CPI / SAP Integration Suite
    # ═══════════════════════════════════════════════════════════════════
    {
        "id": "CPI-001",
        "url": "",
        "role": "Developer",
        "title": "Developing with SAP Integration Suite",
        "module": "CPI / Integration Suite",
        "description": "For integration designers and developers: create APIs, use tools, processes, and operations in SAP Integration Suite. Covers Cloud Integration (iFlows) and API Management. 5 Units, 10 hr. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/developing-with-sap-integration-suite"
    },
    {
        "id": "CPI-002",
        "url": "",
        "role": "Developer",
        "title": "Accelerate Enterprise Integrations with SAP Integration Suite",
        "module": "CPI / Integration Suite",
        "description": "End-to-end integration process, exposing processes as APIs and integrating heterogeneous systems. Covers platform to accelerate integrations and reduce costs. Course ID: MOOC_cp10. 7 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/accelerate-enterprise-integrations-with-sap-integration-suite"
    },
    {
        "id": "CPI-003",
        "url": "",
        "role": "Developer",
        "title": "SAP Process Orchestration to SAP Integration Suite Migration",
        "module": "CPI / Integration Suite",
        "description": "Guidance for integration developers to migrate from SAP Process Orchestration / SAP Process Integration to SAP Integration Suite. Course ID: PO2IS. 7 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/sap-process-orchestration-to-sap-integration-suite-migration"
    },
    {
        "id": "CPI-004",
        "url": "",
        "role": "Administrator",
        "title": "Administering SAP Integration Suite",
        "module": "CPI / Integration Suite",
        "description": "Comprehensive knowledge on administering SAP Integration Suite: essential tasks, setup process, management of capabilities. Course ID: CLD920. 7 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/administering-sap-integration-suite"
    },
    {
        "id": "CPI-005",
        "url": "",
        "role": "Developer",
        "title": "Connecting SAP BTP with On-Premise via Cloud Connector",
        "module": "CPI / Integration Suite",
        "description": "Connect SAP BTP applications and services with on-premise systems using the Cloud Connector. Course ID: ADM002. 2 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/connecting-sap-btp-with-on-premise-via-cloud-connector"
    },
    {
        "id": "CPI-006",
        "url": "",
        "role": "Business User",
        "title": "Discovering Enterprise Automation with SAP",
        "module": "CPI / Integration Suite",
        "description": "Overview of Enterprise Automation: how SAP Signavio, SAP Build, and SAP Integration Suite work together to optimize business processes. Course ID: SEA100. 1 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/discovering-enterprise-automation-with-sap"
    },
    {
        "id": "CPI-007",
        "url": "",
        "role": "Business User",
        "title": "Discovering SAP Process Orchestration",
        "module": "CPI / Integration Suite",
        "description": "Introduction to SAP Process Orchestration and the Advanced Adapter Engine Extended (AEX). Course ID: BIT100. 4 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/discovering-sap-process-orchestration"
    },
    {
        "id": "CPI-008",
        "url": "",
        "role": "Developer",
        "title": "Discovering Event-Driven Integration with SAP Integration Suite, Advanced Event Mesh",
        "module": "CPI / Integration Suite",
        "description": "Fully managed event streaming and event management service for enterprise-grade event-driven architecture. Course ID: CLD905. 4 hr.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/discovering-event-driven-integration-with-sap-integration-suite-advanved-event-mesh"
    },
    {
        "id": "CPI-009",
        "url": "",
        "role": "Developer",
        "title": "Developing SOAP Web Services on SAP ERP",
        "module": "CPI / Integration Suite",
        "description": "Build SOAP web services on SAP ERP and the web service framework. Course ID: BIT102. 8 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/devoloping-soap-web-services-on-sap-erp"
    },
    {
        "id": "CPI-010",
        "url": "",
        "role": "Consultant",
        "title": "Getting Started with SAP Integration Solution Advisory Methodology",
        "module": "CPI / Integration Suite",
        "description": "Define and execute an enterprise integration strategy using SAP Integration Solution Advisory Methodology. Course ID: CLD910. 4 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/getting-started-with-sap-integration-solution-advisory-methodology"
    },
    {
        "id": "CPI-011",
        "url": "",
        "role": "Developer",
        "title": "Accelerating Hybrid Integrations with SAP Integration Suite on RedHat OpenShift",
        "module": "CPI / Integration Suite",
        "description": "Edge Integration Cell: hybrid integration runtime, design integrations in the cloud and deploy in private environment on Red Hat OpenShift. Course ID: HIRED1. 2 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/accelerating-hybrid-integrations-with-sap-integration-suite-on-redhat-openshift"
    },
    {
        "id": "CPI-012",
        "url": "",
        "role": "Developer",
        "title": "Developing Integration Scenarios using IDoc/RFC Adapter of SAP Process Orchestration",
        "module": "CPI / Integration Suite",
        "description": "Create iFlows using IDoc/BAPI adapter. Course ID: BIT101. 3 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/developing-integration-scenarios-using-idoc-rfc-adapter-of-sap-process-orchestration"
    },
    {
        "id": "CPI-013",
        "url": "",
        "role": "Developer",
        "title": "Developing Business Processes with SAP Process Orchestration",
        "module": "CPI / Integration Suite",
        "description": "Build business processes and integration scenarios with SAP Process Orchestration. 2 Courses, 29 hr.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/developing-business-processes-with-sap-process-orchestration"
    },
    {
        "id": "CPI-014",
        "url": "",
        "role": "Consultant",
        "title": "Implement an Integration of SAP S/4HANA Cloud with SAP Commerce Cloud",
        "module": "CPI / Integration Suite",
        "description": "Implement integration of SAP Commerce Cloud with SAP ERP Cloud (SAP S/4HANA Cloud) backend. 1 Course, 3 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/implement-an-integration-of-sap-s-4hana-cloud-with-sap-commerce-cloud"
    },

    # ═══════════════════════════════════════════════════════════════════
    # MODULE: SAP Build (Low-Code / No-Code / Process Automation)
    # ═══════════════════════════════════════════════════════════════════
    {
        "id": "BUILD-001",
        "url": "",
        "role": "Developer",
        "title": "Experiencing End-To-End SAP Build",
        "module": "SAP Build",
        "description": "Create advanced applications and SAP extensions with SAP Build Apps; develop automations, processes with SAP Build Process Automation; design business sites with SAP Build Work Zone. Course ID: BTP04. 1 hr+.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/experiencing-end-to-end-sap-build"
    },
    {
        "id": "BUILD-002",
        "url": "",
        "role": "Developer",
        "title": "Developing with SAP Build – From Apps to Automation",
        "module": "SAP Build",
        "description": "Develop apps and processes with SAP Build. 7 Courses, 26 hr+. Leads to Certification.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/learning-journeys/developing-with-sap-build-from-apps-to-automation"
    },
    {
        "id": "BUILD-003",
        "url": "",
        "role": "Developer",
        "title": "Develop and automate with SAP Build",
        "module": "SAP Build",
        "description": "Introduction to low-code development with SAP Build: create apps, automate processes, design business sites with drag-and-drop on SAP BTP. Course ID: BTP110. 3 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/develop-and-automate-with-sap-build"
    },
    {
        "id": "BUILD-004",
        "url": "",
        "role": "Developer",
        "title": "Developing with SAP Build Process Automation",
        "module": "SAP Build",
        "description": "All important aspects of SAP Build Process Automation: reusing content, building automations and processes. Course ID: SPA400. 6 hr+. Leads to Achievement.",
        "lastUpdated": "2025",
        "sapHelpLink": "https://learning.sap.com/courses/developing-with-sap-build-process-automation"
    },
]


def create_excel(data, output_path):
    """Create a professionally formatted Excel workbook."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "SAP Free Courses"

    # ── Header styling ──────────────────────────────────────────────
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="0070C0", end_color="0070C0", fill_type="solid")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )

    headers = ["id", "url", "role", "title", "module", "description", "lastUpdated", "sapHelpLink"]
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
        cell.border = thin_border

    # ── Data rows ───────────────────────────────────────────────────
    data_font = Font(name="Calibri", size=10)
    data_align = Alignment(vertical="top", wrap_text=True)
    link_font = Font(name="Calibri", size=10, color="0563C1", underline="single")

    alt_fill = PatternFill(start_color="F2F7FB", end_color="F2F7FB", fill_type="solid")

    for row_idx, course in enumerate(data, 2):
        fill = alt_fill if row_idx % 2 == 0 else PatternFill()
        for col_idx, key in enumerate(headers, 1):
            value = course.get(key, "")
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.font = data_font
            cell.alignment = data_align
            cell.border = thin_border
            cell.fill = fill

            # Make sapHelpLink clickable
            if key == "sapHelpLink" and value:
                cell.hyperlink = value
                cell.font = link_font
            # Make url (Enable Now) clickable if present
            if key == "url" and value:
                cell.hyperlink = value
                cell.font = link_font

    # ── Column widths ───────────────────────────────────────────────
    col_widths = {
        "A": 10,   # id
        "B": 18,   # url (Enable Now - mostly empty)
        "C": 25,   # role
        "D": 55,   # title
        "E": 30,   # module
        "F": 80,   # description
        "G": 14,   # lastUpdated
        "H": 70,   # sapHelpLink
    }
    for col_letter, width in col_widths.items():
        ws.column_dimensions[col_letter].width = width

    # ── Freeze header row ───────────────────────────────────────────
    ws.freeze_panes = "A2"

    # ── Auto-filter ─────────────────────────────────────────────────
    ws.auto_filter.ref = f"A1:H{len(data) + 1}"

    # ── Save ────────────────────────────────────────────────────────
    wb.save(output_path)
    print(f"Excel saved to: {output_path}")
    print(f"Total courses: {len(data)}")

    # Module summary
    modules = {}
    for c in data:
        m = c["module"]
        modules[m] = modules.get(m, 0) + 1
    print("\nCourses per module:")
    for m, count in modules.items():
        print(f"  {m}: {count}")


if __name__ == "__main__":
    # Try OneDrive Desktop first, fallback to regular Desktop
    desktop = os.path.join(os.path.expanduser("~"), "OneDrive", "Desktop")
    if not os.path.exists(desktop):
        desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    os.makedirs(desktop, exist_ok=True)
    output = os.path.join(desktop, "SAP_Free_Courses_Catalog.xlsx")
    create_excel(courses, output)
