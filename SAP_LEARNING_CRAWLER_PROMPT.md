# SAP Learning Hub Free Courses — Deep Crawling Automation Prompt

## HOW TO USE THIS FILE

### Quick Start (3 steps):
1. **Copy** the "MASTER PROMPT — Phase 1" section below  
2. **Paste** it into your AI assistant (Claude/ChatGPT/Copilot) — one module at a time  
3. **Repeat** with Phase 2 prompt for each remaining module  

### What this does:
- Crawls SAP Learning Hub at **lesson-level depth** (Journey → Course → Unit → Lesson)
- Extracts every free course across 8 SAP modules (77+ courses, 500+ lessons)
- Identifies lessons with **Enable Now exercise links** (the hands-on simulation URLs)
- Outputs data in Excel-ready format with columns: id, url, role, title, module, description, lastUpdated, sapHelpLink

### Important note about Enable Now links:
Enable Now URLs (`https://learnsap.enable-now.cloud.sap/pub/mmcp/...`) are loaded via **JavaScript redirect** when you click "Start Exercise". They are NOT in the static HTML. The AI will mark lessons as `HAS_ENABLENOW_EXERCISE` — you then manually capture those specific URLs using browser DevTools (right-click → Inspect → Network tab → click "Start Exercise" → copy redirect URL).

---

## ⭐ READY-TO-PASTE PROMPT (Single Module — start here)

Copy everything inside the triple backticks below and paste directly into your AI:

```
I need you to deep-crawl SAP Learning Hub (https://learning.sap.com) for FREE courses in the Finance (FI) module. 

WORKFLOW — follow this exact 4-level hierarchy:
1. FETCH the product page: https://learning.sap.com/products/s4hana-cloud/finance
2. Extract every link to a free Learning Journey or Course (skip Subscription/Paid/External/Videos)
3. For EACH course URL, fetch the course page and extract all Unit/Lesson URLs (they have UUIDs in the slug like /courses/asset-accounting-processes/maintaining-asset-master-data_d9620ea0-2f52-4b98-a87d-d025881ee43f)
4. For EACH lesson URL, fetch the page and check if it contains "Exercise Start Exercise" text — if yes, mark it as HAS_ENABLENOW_EXERCISE

OUTPUT as a table with these exact columns:
| id | url | role | title | module | description | lastUpdated | sapHelpLink |

Rules:
- id = FI-NNN-NN format (course number-lesson number, e.g., FI-001-01, FI-001-02, FI-002-01)
- url = leave EMPTY for now (Enable Now links require manual capture)
- role = Business User, Consultant, Developer, Administrator, or Architect
- title = LESSON-level title (most granular), not the course title
- module = "Finance (FI)"
- description = Include: lesson topic + parent course name + "HAS_ENABLENOW_EXERCISE" if applicable
- lastUpdated = year from page or "2025"
- sapHelpLink = full URL to the lesson page on learning.sap.com

Here are the known FREE Finance course URLs to crawl (fetch each one):
- https://learning.sap.com/learning-journeys/discovering-finance-in-sap-s-4hana
- https://learning.sap.com/learning-journeys/implementing-financial-accounting-in-sap-s4hana-cloud
- https://learning.sap.com/learning-journeys/implementing-management-accounting-in-sap-s-4hana-cloud
- https://learning.sap.com/learning-journeys/outlining-the-financial-accounting-overview-in-sap-s-4hana
- https://learning.sap.com/learning-journeys/outlining-the-record-to-report-process-in-sap-s-4hana
- https://learning.sap.com/learning-journeys/designing-the-record-to-report-process-in-sap-s-4hana
- https://learning.sap.com/learning-journeys/describing-the-payables-management-process-in-sap-s-4hana
- https://learning.sap.com/learning-journeys/using-the-payables-management-process-in-sap-s-4hana
- https://learning.sap.com/learning-journeys/describing-the-receivables-management-process-in-sap-s-4hana
- https://learning.sap.com/learning-journeys/designing-the-asset-accounting-process
- https://learning.sap.com/learning-journeys/exploring-accounting-financial-close
- https://learning.sap.com/learning-journeys/describing-contracts-for-real-estate-management-in-sap-s4hana
- https://learning.sap.com/learning-journeys/performing-consolidation-with-sap-s-4hana-cloud-for-group-reporting
- https://learning.sap.com/learning-journeys/implementing-sap-s-4hana-cloud-for-group-reporting
- https://learning.sap.com/learning-journeys/discovering-new-ai-capabilities-for-sap-finance
- https://learning.sap.com/courses/detailing-profitability-accounting-for-discrete-industries
- https://learning.sap.com/courses/detailing-profitability-accounting-in-make-to-order-scenarios
- https://learning.sap.com/courses/rule-based-consolidation-of-investments
- https://learning.sap.com/courses/detailing-profit-center-reorganization
- https://learning.sap.com/courses/discovering-treasury-management
- https://learning.sap.com/courses/administration-of-bank-accounts
- https://learning.sap.com/courses/outlining-sap-s-4hana-cloud-for-group-reporting
- https://learning.sap.com/courses/exploring-sap-taulia-working-capital-management-1
- https://learning.sap.com/courses/discovering-sap-solutions-for-quote-to-cash-management-public-cloud-for-business-user
- https://learning.sap.com/courses/applying-localization-as-a-self-service-for-sap-s-4hana-cloud-public-edition-1
- https://learning.sap.com/courses/asset-accounting-processes

Start now. Fetch each URL, go deep into lessons, and output the table.
```

After Finance is done, use the **Phase 2 prompt** below to continue with each remaining module (Controlling, MM, SD, SCM, BTP, CPI, Build).

---

## MASTER PROMPT — Phase 1: Deep-Crawl Course Structure

```
You are an expert SAP Learning Hub data extraction specialist. I need you to systematically 
crawl the SAP Learning Hub website (https://learning.sap.com) and extract ALL FREE courses 
at the deepest granular level for the modules listed below.

## TARGET MODULES (only FREE courses):
1. Finance (FI) — Financial Accounting, Management Accounting, Treasury, Group Reporting
2. Controlling (CO) — Overhead Cost Accounting, Product Costing, Profitability Analysis
3. Material Management (MM) — Sourcing & Procurement, Purchasing, Inventory
4. Sales and Distribution (SD) — Order-to-Cash, Sales, Billing, Shipping
5. Supply Chain Management (SCM) — Supply Chain, Warehouse Management, Transportation
6. SAP BTP — Business Technology Platform, Cloud Foundry, ABAP Cloud, AI Core
7. CPI / Integration Suite — SAP Integration Suite, Cloud Integration, API Management, Process Orchestration
8. SAP Build — Build Apps, Build Process Automation, Build Work Zone, Build Code

## CRAWL HIERARCHY (4 levels deep):

### Level 1: Product Category Pages
Fetch each product page to find all learning journeys and courses:
- https://learning.sap.com/products/s4hana-cloud/finance
- https://learning.sap.com/products/s4hana-cloud/sales
- https://learning.sap.com/products/s4hana-cloud/sourcing-and-procurement
- https://learning.sap.com/products/s4hana-cloud/supply-chain
- https://learning.sap.com/products/s4hana-cloud/manufacturing
- https://learning.sap.com/products/s4hana-cloud/warehouse-management
- https://learning.sap.com/products/business-technology-platform
- https://learning.sap.com/products/business-technology-platform/integration-suite
- https://learning.sap.com/products/business-technology-platform/development
- https://learning.sap.com/products/sap-build
- https://learning.sap.com/products/sap-build/process-automation
- https://learning.sap.com/products/sap-build/build-apps
- https://learning.sap.com/products/sap-build-code

From each page, extract every link that starts with:
- https://learning.sap.com/learning-journeys/...
- https://learning.sap.com/courses/...
ONLY include items tagged "Free". Skip anything tagged "Subscription", "External link", or "Paid".

### Level 2: Course / Learning Journey Pages
For each course URL found in Level 1, fetch the course page.
Extract:
- Course title
- Course ID (e.g., F1151, S4690, BTP100)
- Duration
- Level (Beginner/Intermediate/Advanced)
- Role (Business User, Consultant, Developer, etc.)
- All UNIT links (these are lesson URLs with UUIDs)

Example: https://learning.sap.com/courses/asset-accounting-processes
→ Units: 
  - Unit 1: /courses/asset-accounting-processes/explaining-the-functionality-of-asset-classes_c5aa5795-...
  - Unit 2: /courses/asset-accounting-processes/posting-acquisitions-for-fixed-assets_f46e3701-...
  - etc.

### Level 3: Lesson Pages (deepest content level)
For each Unit/Lesson URL from Level 2, fetch the lesson page.
Extract:
- Lesson title
- Sub-topics (sections within the lesson)
- Whether there is an "Exercise" / "Start Exercise" button
- If yes → this lesson has an Enable Now simulation link

### Level 4: Enable Now Links
For lessons that have "Exercise Start Exercise" text, the exercise button links 
to an Enable Now URL with this pattern:
  https://learnsap.enable-now.cloud.sap/pub/mmcp/index.html?show=project!PR_xxxxx:uebung

IMPORTANT: These links are loaded via JavaScript redirect and may require 
authentication. When you find "Exercise Start Exercise" on a lesson page, 
note it as "HAS_ENABLENOW_EXERCISE" and I will manually capture those specific URLs.

## OUTPUT FORMAT (Excel columns):
For EACH lesson-level entry, output a row with:

| Column | Description |
|--------|-------------|
| id | Module prefix + sequential number (e.g., FI-001-01, CO-002-03) |
| url | Enable Now URL if available, otherwise empty |
| role | Target role: Business User, Consultant, Developer, Administrator, Architect |
| title | Lesson-level title (the most granular title) |
| module | One of: Finance (FI), Controlling (CO), Material Management (MM), Sales and Distribution (SD), Supply Chain Management (SCM), SAP BTP, CPI / Integration Suite, SAP Build |
| description | Lesson description + parent course name + what you learn |
| lastUpdated | Year from page or "2025" default |
| sapHelpLink | Direct URL to the lesson page on learning.sap.com |

## EXECUTION INSTRUCTIONS:
1. Start with ONE module at a time (begin with Finance)
2. Fetch each Level 1 URL for that module
3. From results, fetch each Level 2 course URL
4. From each course, fetch each Level 3 lesson URL
5. For each lesson, record whether it has an Enable Now exercise
6. Output the data in the table format above
7. After completing one module, move to the next

## CRITICAL RULES:
- ONLY free courses (skip anything behind paywall/subscription for content)
- Live Sessions are EXCLUDED (only self-paced courses and learning journeys)
- Videos-only pages are EXCLUDED
- Practice Systems (sandbox) are noted but not primary entries
- Each row = one LESSON (not one course). A course with 4 units × 3 lessons = 12 rows
- If a lesson has no exercise, url column stays empty
- Always include the full learning.sap.com URL in sapHelpLink

Now start with Module 1: Finance (FI). Fetch each URL and go deep.
```

---

## MASTER PROMPT — Phase 2: Continue Next Module

```
Continue the deep crawl. You have completed [MODULE_NAME].
Now proceed to the next module: [NEXT_MODULE_NAME].

Follow the same 4-level crawl process:
Level 1 → Level 2 → Level 3 → Level 4

Use the same output table format. Continue the ID numbering 
from where the previous module ended.

Remember:
- ONLY free courses
- Each row = one lesson (granular level)
- Mark exercises as HAS_ENABLENOW_EXERCISE
- Include full sapHelpLink URLs
```

---

## MASTER PROMPT — Phase 3: Generate Excel

```
Now take ALL the data from all modules (Finance, Controlling, MM, SD, SCM, BTP, CPI, Build)
and generate a Python script that creates an Excel file on my Desktop.

Requirements:
1. Use openpyxl
2. Columns: id, url, role, title, module, description, lastUpdated, sapHelpLink
3. url column: ONLY Enable Now links (https://learnsap.enable-now.cloud.sap/...), empty if none
4. sapHelpLink: clickable hyperlink to learning.sap.com lesson page
5. Professional formatting: header styling, alternating rows, auto-filter, frozen header
6. Save to Desktop (check OneDrive\Desktop first, fallback to Desktop)
7. Separate sheet per module + one combined "All Courses" sheet
8. Include a summary sheet with module counts

Include ALL [NUMBER] lesson-level rows from the crawl.
```

---

## MASTER COURSE URLs TO CRAWL (by module)

### Finance (FI) — Start URLs:
```
https://learning.sap.com/products/s4hana-cloud/finance
https://learning.sap.com/learning-journeys/discovering-finance-in-sap-s-4hana
https://learning.sap.com/learning-journeys/implementing-financial-accounting-in-sap-s4hana-cloud
https://learning.sap.com/learning-journeys/implementing-management-accounting-in-sap-s-4hana-cloud
https://learning.sap.com/learning-journeys/outlining-the-financial-accounting-overview-in-sap-s-4hana
https://learning.sap.com/learning-journeys/outlining-the-record-to-report-process-in-sap-s-4hana
https://learning.sap.com/learning-journeys/designing-the-record-to-report-process-in-sap-s-4hana
https://learning.sap.com/learning-journeys/describing-the-payables-management-process-in-sap-s-4hana
https://learning.sap.com/learning-journeys/using-the-payables-management-process-in-sap-s-4hana
https://learning.sap.com/learning-journeys/describing-the-receivables-management-process-in-sap-s-4hana
https://learning.sap.com/learning-journeys/designing-the-asset-accounting-process
https://learning.sap.com/learning-journeys/exploring-accounting-financial-close
https://learning.sap.com/learning-journeys/describing-contracts-for-real-estate-management-in-sap-s4hana
https://learning.sap.com/learning-journeys/evaluating-overhead-cost-accounting-in-sap-s-4hana
https://learning.sap.com/learning-journeys/performing-overhead-cost-controlling-in-sap-s-4hana
https://learning.sap.com/learning-journeys/performing-consolidation-with-sap-s-4hana-cloud-for-group-reporting
https://learning.sap.com/learning-journeys/implementing-sap-s-4hana-cloud-for-group-reporting
https://learning.sap.com/learning-journeys/discovering-new-ai-capabilities-for-sap-finance
https://learning.sap.com/learning-journeys/evaluating-production-accounting-in-make-to-stock-scenarios-in-sap-s-4hana
https://learning.sap.com/courses/detailing-profitability-accounting-for-discrete-industries
https://learning.sap.com/courses/detailing-profitability-accounting-in-make-to-order-scenarios
https://learning.sap.com/courses/rule-based-consolidation-of-investments
https://learning.sap.com/courses/detailing-profit-center-reorganization
https://learning.sap.com/courses/discovering-treasury-management
https://learning.sap.com/courses/administration-of-bank-accounts
https://learning.sap.com/courses/outlining-sap-s-4hana-cloud-for-group-reporting
https://learning.sap.com/courses/exploring-sap-taulia-working-capital-management-1
https://learning.sap.com/courses/outlining-cost-management-and-profitability-analysis
https://learning.sap.com/courses/discovering-sap-solutions-for-quote-to-cash-management-public-cloud-for-business-user
https://learning.sap.com/courses/applying-localization-as-a-self-service-for-sap-s-4hana-cloud-public-edition-1
https://learning.sap.com/courses/asset-accounting-processes
```

### Controlling (CO) — Start URLs:
```
https://learning.sap.com/courses/outlining-cost-management-and-profitability-analysis
https://learning.sap.com/learning-journeys/performing-overhead-cost-controlling-in-sap-s-4hana
https://learning.sap.com/learning-journeys/evaluating-overhead-cost-accounting-in-sap-s-4hana
https://learning.sap.com/learning-journeys/evaluating-production-accounting-in-make-to-stock-scenarios-in-sap-s-4hana
https://learning.sap.com/courses/detailing-profitability-accounting-for-discrete-industries
https://learning.sap.com/courses/detailing-profitability-accounting-in-make-to-order-scenarios
```

### Material Management (MM) — Start URLs:
```
https://learning.sap.com/products/s4hana-cloud/sourcing-and-procurement
https://learning.sap.com/learning-journeys/implement-sap-s-4hana-cloud-public-edition-for-sourcing-and-procurement
https://learning.sap.com/learning-journeys/implementing-sap-s-4hana-cloud-private-edition-sourcing-and-procurement
https://learning.sap.com/courses/implementing-sap-s-4hana-cloud-public-edition
https://learning.sap.com/courses/exploring-end-to-end-business-processes-in-sap-business-suite
```

### Sales and Distribution (SD) — Start URLs:
```
https://learning.sap.com/products/s4hana-cloud/sales
https://learning.sap.com/courses/sap-s-4hana-sales-insights
https://learning.sap.com/courses/exploring-sap-s-4hana-sales-essentials
https://learning.sap.com/learning-journeys/implementing-sap-s4hana-cloud-public-edition-sales
https://learning.sap.com/learning-journeys/sap-sales-and-service-cloud-administration
```

### Supply Chain Management (SCM) — Start URLs:
```
https://learning.sap.com/products/s4hana-cloud/supply-chain
https://learning.sap.com/products/s4hana-cloud/warehouse-management
https://learning.sap.com/learning-journeys/positioning-sap-supply-chain-solutions
https://learning.sap.com/courses/discovering-sap-supply-chain-management-solutions
https://learning.sap.com/courses/positioning-sap-supply-chain-management-solutions
https://learning.sap.com/courses/introducing-sap-business-ai-for-sap-supply-chain-management
https://learning.sap.com/learning-journeys/discovering-extended-warehouse-management-with-sap-s-4hana
https://learning.sap.com/learning-journeys/configuring-sap-business-network-supply-chain-collaboration-add-on
```

### SAP BTP — Start URLs:
```
https://learning.sap.com/products/business-technology-platform
https://learning.sap.com/products/business-technology-platform/development
https://learning.sap.com/courses/exploring-sap-business-technology-platform
https://learning.sap.com/courses/discovering-sap-business-technology-platform-1
https://learning.sap.com/learning-journeys/becoming-an-sap-btp-solution-architect
https://learning.sap.com/courses/operating-sap-business-technology-platform
https://learning.sap.com/courses/developing-applications-for-sap-btp-cloud-foundry-runtime
https://learning.sap.com/courses/develop-extensions-with-cap-following-the-sap-btp-developer-s-guide
https://learning.sap.com/courses/architecting-security-for-sap-business-technology-platform
https://learning.sap.com/courses/introducing-sap-cloud-identity-services
https://learning.sap.com/courses/operating-with-sap-cloud-alm
https://learning.sap.com/learning-journeys/develop-advanced-extensions-with-sap-cloud-sdk
https://learning.sap.com/learning-journeys/learn-the-basics-of-abap-programming-on-sap-btp
https://learning.sap.com/learning-journeys/introducing-sap-abap-platform-fundamentals
https://learning.sap.com/learning-journeys/setting-up-an-abap-environment-on-sap-btp
https://learning.sap.com/courses/introduction-to-ai-core
https://learning.sap.com/courses/discovering-sap-business-ai
```

### CPI / Integration Suite — Start URLs:
```
https://learning.sap.com/products/business-technology-platform/integration-suite
https://learning.sap.com/learning-journeys/developing-with-sap-integration-suite
https://learning.sap.com/courses/accelerate-enterprise-integrations-with-sap-integration-suite
https://learning.sap.com/courses/sap-process-orchestration-to-sap-integration-suite-migration
https://learning.sap.com/courses/administering-sap-integration-suite
https://learning.sap.com/courses/connecting-sap-btp-with-on-premise-via-cloud-connector
https://learning.sap.com/courses/discovering-enterprise-automation-with-sap
https://learning.sap.com/courses/discovering-sap-process-orchestration
https://learning.sap.com/courses/discovering-event-driven-integration-with-sap-integration-suite-advanved-event-mesh
https://learning.sap.com/courses/devoloping-soap-web-services-on-sap-erp
https://learning.sap.com/courses/getting-started-with-sap-integration-solution-advisory-methodology
https://learning.sap.com/courses/accelerating-hybrid-integrations-with-sap-integration-suite-on-redhat-openshift
https://learning.sap.com/courses/developing-integration-scenarios-using-idoc-rfc-adapter-of-sap-process-orchestration
https://learning.sap.com/learning-journeys/developing-business-processes-with-sap-process-orchestration
https://learning.sap.com/learning-journeys/implement-an-integration-of-sap-s-4hana-cloud-with-sap-commerce-cloud
```

### SAP Build — Start URLs:
```
https://learning.sap.com/products/sap-build
https://learning.sap.com/products/sap-build/process-automation
https://learning.sap.com/products/sap-build/build-apps
https://learning.sap.com/products/sap-build-code
https://learning.sap.com/courses/experiencing-end-to-end-sap-build
https://learning.sap.com/learning-journeys/developing-with-sap-build-from-apps-to-automation
https://learning.sap.com/courses/develop-and-automate-with-sap-build
https://learning.sap.com/courses/developing-with-sap-build-process-automation
```

---

## ENABLE NOW LINK EXTRACTION TIPS

The Enable Now exercise links follow these patterns:
```
https://learnsap.enable-now.cloud.sap/pub/mmcp/index.html?show=project!PR_XXXXXXXXXXXXXXXX:uebung
https://learnsap.enable-now.cloud.sap/pub/mmcp/index.html?show=project!PR_XXXXXXXXXXXXXXXX:uebung#N
```

To find them on lesson pages, look for:
- Text: "Exercise Start Exercise" or "Exercise" button
- Text: "Start Exercise" near the bottom of lesson content sections
- The actual Enable Now URL is loaded via JavaScript when clicking "Start Exercise"
- You may need to be logged in to SAP Learning to access the redirect

### Manual fallback for Enable Now links:
1. Open the lesson page in a browser
2. Right-click "Start Exercise" → Inspect Element
3. Look for `data-exercise-url` or `href` attribute
4. Or open browser Network tab, click "Start Exercise", capture the redirect URL

---

## PHASE EXECUTION CHECKLIST

- [ ] Phase 1: Finance (FI) — Deep crawl all 26 course URLs → lesson-level rows
- [ ] Phase 2: Controlling (CO) — Deep crawl all 6 course URLs
- [ ] Phase 3: Material Management (MM) — Deep crawl all 5 course URLs
- [ ] Phase 4: Sales and Distribution (SD) — Deep crawl all 5 course URLs
- [ ] Phase 5: Supply Chain Management (SCM) — Deep crawl all 8 course URLs
- [ ] Phase 6: SAP BTP — Deep crawl all 17 course URLs
- [ ] Phase 7: CPI / Integration Suite — Deep crawl all 15 course URLs
- [ ] Phase 8: SAP Build — Deep crawl all 8 course URLs
- [ ] Phase 9: Generate Excel with all data (use Phase 3 prompt)
- [ ] Phase 10: Manual Enable Now URL capture (for lessons marked HAS_ENABLENOW_EXERCISE)

---

## COPY-PASTE MODULE PROMPTS (one per conversation turn)

### For Controlling (CO) — paste this after Finance is done:
```
Continue the deep crawl. Now do module: Controlling (CO).
Follow the same 4-level process (Product→Course→Lesson→Exercise check).
Use ID format CO-NNN-NN. Output in the same table format.

Crawl these URLs:
- https://learning.sap.com/courses/outlining-cost-management-and-profitability-analysis
- https://learning.sap.com/learning-journeys/performing-overhead-cost-controlling-in-sap-s-4hana
- https://learning.sap.com/learning-journeys/evaluating-overhead-cost-accounting-in-sap-s-4hana
- https://learning.sap.com/learning-journeys/evaluating-production-accounting-in-make-to-stock-scenarios-in-sap-s-4hana
- https://learning.sap.com/courses/detailing-profitability-accounting-for-discrete-industries
- https://learning.sap.com/courses/detailing-profitability-accounting-in-make-to-order-scenarios
- https://learning.sap.com/courses/detailing-posting-control-allocations-and-settlement
```

### For Material Management (MM):
```
Continue the deep crawl. Now do module: Material Management (MM).
Follow the same 4-level process. Use ID format MM-NNN-NN.

Crawl these URLs:
- https://learning.sap.com/learning-journeys/implement-sap-s-4hana-cloud-public-edition-for-sourcing-and-procurement
- https://learning.sap.com/learning-journeys/implementing-sap-s-4hana-cloud-private-edition-sourcing-and-procurement
- https://learning.sap.com/courses/implementing-sap-s-4hana-cloud-public-edition
- https://learning.sap.com/courses/exploring-end-to-end-business-processes-in-sap-business-suite
Also fetch the product page for any additional free courses: https://learning.sap.com/products/s4hana-cloud/sourcing-and-procurement
```

### For Sales and Distribution (SD):
```
Continue the deep crawl. Now do module: Sales and Distribution (SD).
Follow the same 4-level process. Use ID format SD-NNN-NN.

Crawl these URLs:
- https://learning.sap.com/courses/sap-s-4hana-sales-insights
- https://learning.sap.com/courses/exploring-sap-s-4hana-sales-essentials
- https://learning.sap.com/learning-journeys/implementing-sap-s4hana-cloud-public-edition-sales
- https://learning.sap.com/learning-journeys/sap-sales-and-service-cloud-administration
Also fetch: https://learning.sap.com/products/s4hana-cloud/sales
```

### For Supply Chain Management (SCM):
```
Continue the deep crawl. Now do module: Supply Chain Management (SCM).
Follow the same 4-level process. Use ID format SCM-NNN-NN.

Crawl these URLs:
- https://learning.sap.com/learning-journeys/positioning-sap-supply-chain-solutions
- https://learning.sap.com/courses/discovering-sap-supply-chain-management-solutions
- https://learning.sap.com/courses/positioning-sap-supply-chain-management-solutions
- https://learning.sap.com/courses/introducing-sap-business-ai-for-sap-supply-chain-management
- https://learning.sap.com/learning-journeys/discovering-extended-warehouse-management-with-sap-s-4hana
- https://learning.sap.com/learning-journeys/configuring-sap-business-network-supply-chain-collaboration-add-on
Also fetch: https://learning.sap.com/products/s4hana-cloud/supply-chain and https://learning.sap.com/products/s4hana-cloud/warehouse-management
```

### For SAP BTP:
```
Continue the deep crawl. Now do module: SAP BTP.
Follow the same 4-level process. Use ID format BTP-NNN-NN.

Crawl these URLs:
- https://learning.sap.com/courses/exploring-sap-business-technology-platform
- https://learning.sap.com/courses/discovering-sap-business-technology-platform-1
- https://learning.sap.com/learning-journeys/becoming-an-sap-btp-solution-architect
- https://learning.sap.com/courses/operating-sap-business-technology-platform
- https://learning.sap.com/courses/developing-applications-for-sap-btp-cloud-foundry-runtime
- https://learning.sap.com/courses/develop-extensions-with-cap-following-the-sap-btp-developer-s-guide
- https://learning.sap.com/courses/architecting-security-for-sap-business-technology-platform
- https://learning.sap.com/courses/introducing-sap-cloud-identity-services
- https://learning.sap.com/courses/operating-with-sap-cloud-alm
- https://learning.sap.com/learning-journeys/develop-advanced-extensions-with-sap-cloud-sdk
- https://learning.sap.com/learning-journeys/learn-the-basics-of-abap-programming-on-sap-btp
- https://learning.sap.com/learning-journeys/introducing-sap-abap-platform-fundamentals
- https://learning.sap.com/learning-journeys/setting-up-an-abap-environment-on-sap-btp
- https://learning.sap.com/courses/introduction-to-ai-core
- https://learning.sap.com/courses/discovering-sap-business-ai
Also fetch: https://learning.sap.com/products/business-technology-platform and https://learning.sap.com/products/business-technology-platform/development
```

### For CPI / Integration Suite:
```
Continue the deep crawl. Now do module: CPI / Integration Suite.
Follow the same 4-level process. Use ID format CPI-NNN-NN.

Crawl these URLs:
- https://learning.sap.com/learning-journeys/developing-with-sap-integration-suite
- https://learning.sap.com/courses/accelerate-enterprise-integrations-with-sap-integration-suite
- https://learning.sap.com/courses/sap-process-orchestration-to-sap-integration-suite-migration
- https://learning.sap.com/courses/administering-sap-integration-suite
- https://learning.sap.com/courses/connecting-sap-btp-with-on-premise-via-cloud-connector
- https://learning.sap.com/courses/discovering-enterprise-automation-with-sap
- https://learning.sap.com/courses/discovering-sap-process-orchestration
- https://learning.sap.com/courses/discovering-event-driven-integration-with-sap-integration-suite-advanved-event-mesh
- https://learning.sap.com/courses/devoloping-soap-web-services-on-sap-erp
- https://learning.sap.com/courses/getting-started-with-sap-integration-solution-advisory-methodology
- https://learning.sap.com/courses/accelerating-hybrid-integrations-with-sap-integration-suite-on-redhat-openshift
- https://learning.sap.com/courses/developing-integration-scenarios-using-idoc-rfc-adapter-of-sap-process-orchestration
- https://learning.sap.com/learning-journeys/developing-business-processes-with-sap-process-orchestration
- https://learning.sap.com/learning-journeys/implement-an-integration-of-sap-s-4hana-cloud-with-sap-commerce-cloud
Also fetch: https://learning.sap.com/products/business-technology-platform/integration-suite
```

### For SAP Build:
```
Continue the deep crawl. Now do module: SAP Build.
Follow the same 4-level process. Use ID format BUILD-NNN-NN.

Crawl these URLs:
- https://learning.sap.com/courses/experiencing-end-to-end-sap-build
- https://learning.sap.com/learning-journeys/developing-with-sap-build-from-apps-to-automation
- https://learning.sap.com/courses/develop-and-automate-with-sap-build
- https://learning.sap.com/courses/developing-with-sap-build-process-automation
Also fetch: https://learning.sap.com/products/sap-build and https://learning.sap.com/products/sap-build/process-automation and https://learning.sap.com/products/sap-build/build-apps and https://learning.sap.com/products/sap-build-code
```

### Final: Generate Excel (paste after all modules are done):
```
Now take ALL the lesson-level data from all 8 modules and generate a Python script 
using openpyxl that creates an Excel file.

Requirements:
1. Columns: id, url, role, title, module, description, lastUpdated, sapHelpLink
2. url column: ONLY Enable Now links (https://learnsap.enable-now.cloud.sap/...), 
   leave empty if none. For lessons marked HAS_ENABLENOW_EXERCISE, put "HAS_EXERCISE" as placeholder.
3. sapHelpLink: clickable hyperlink to learning.sap.com lesson page
4. Professional formatting: blue headers (#0070C0), alternating row colors, auto-filter, frozen header
5. Save path: check OneDrive\Desktop first, fallback to Desktop
6. Separate worksheet per module + one combined "All Courses" sheet
7. Include a Summary sheet with module counts and total

Output the complete Python script with ALL data rows embedded.
```
