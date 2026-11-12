# DigiBanking Bulk Digital Banking Onboarding

A staff-facing digital banking onboarding portal built with **semantic HTML5, modern CSS, and TypeScript** without React or any other external UI framework.

The interface communicates exclusively with the supplied Bulk Onboarding API executable over HTTP and Server-Sent Events (SSE). The browser never accesses the SQLite database directly.

---

## 🌟 Highlights & Capabilities

- **Resumable Chunked Ingestion:** Slices spreadsheets into 1 MB binary chunks, calculates whole-file and per-chunk SHA-256 digests via the Web Crypto API, and supports seamless recovery after network failures with deterministic idempotency keys.
- **Network Interruption Simulation:** Built-in interactive simulator allowing staff to drop the network connection mid-upload, verify chunk persistence on the server, and resume the upload without re-sending existing chunks.
- **Real-Time Validation via SSE:** Connects to Server-Sent Events stream (`/uploads/{id}/events`) with automatic backoff reconnection and `Last-Event-ID` tracking.
- **Two-Step Review & Explicit Commit:** Enforces regulatory banking controls—validation **never** automatically onboards members. Staff must review row-by-row reasons and check explicit confirmation before committing eligible rows.
- **Invalid & Duplicate Handling:** Preserves invalid, duplicate, and conflicting rows in the batch for auditing and one-click XLSX download (`/invalid.xlsx`).
- **OData-Style Filtering, Sorting & Search:** Supports `$filter`, `$orderby`, `$top`, `$skip`, `$count`, and full-text search across batches, records, and onboarded members.
- **Configurable API Endpoint:** Port is auto-detected from `config.xml` (or custom configured via the in-app Settings modal with live health monitoring and latency ping).
- **Walkthrough Demo File Included:** Ready-to-use workbook (`riverside-branch-october-enrolment.xlsx`) containing realistic eligible core members, duplicate entries, and mismatched records.

---

## 🚀 Quick Start

### 1. Start the Backend API
In a terminal or File Explorer:

**Windows (x64):**
```cmd
cd windows-x64
run.bat
```

**Linux (x64):**
```bash
chmod +x linux-x64/run.sh
./linux-x64/run.sh
```

The API starts on the port defined in `config.xml` (default: `http://localhost:3000`).

---

### 2. Start the Frontend Interface

Install dependencies (Vite & TypeScript):
```cmd
npm install
```

Start the local development server:
```cmd
npm run dev
```

Open your browser at:
```
http://localhost:5173
```

To create an optimized production build:
```cmd
npm run build
npm run preview
```

---

## 📋 Walkthrough Guide (Step-by-Step)

Follow this step-by-step walkthrough matching the scenario in `assignment.md`:

### Step 1: Open New Batch & Download Template
1. In the top navigation bar, click the **+ New Batch** button.
2. In the modal dialog:
   - Notice the pre-filled batch name: **“Riverside Branch — October Enrolment”**.
   - Review or edit the description: *“October digital banking enrollments from Riverside branch members.”*
   - Click **⬇️ Blank Template** to download the clean XLSX template directly from the API (`/onboarding/template`).

### Step 2: Prepare or Load the Demonstration Workbook
- Click **⚡ Load Riverside Demo File** inside the New Batch modal to load the pre-generated test workbook (`riverside-branch-october-enrolment.xlsx`).
- Alternatively, select your own completed `.xlsx` file using the drag-and-drop zone.
- The UI calculates and displays the file size and SHA-256 digest in real time.

### Step 3: Simulate Network Interruption & Resume Upload
1. Click **Start Upload**.
2. While chunks are uploading, click the amber button: **⚡ Simulate Network Interruption**.
3. The upload immediately pauses with a clear notice:
   > ⚠️ **Network Connection Interrupted:** Upload paused. The server has securely retained uploaded chunks.
4. Click **▶️ Resume Upload**.
5. The client checks the server's state (`GET /uploads/{id}`) and resumes transmitting remaining chunks without re-uploading already accepted chunks.

### Step 4: Monitor Validation Progress
1. Once all chunks are verified by the server, the assembled file SHA-256 is verified and validation begins (`POST /uploads/{id}/complete`).
2. The UI navigates to the **Batch Details** page (`#/batch/{id}`).
3. Watch the live row-by-row progress bar and expand the **Server-Sent Events (SSE) Stream** log at the bottom to watch events arriving in real time (`processing_started`, `row_processed`, `validation_completed`).

### Step 5: Review Results Before Taking Action
1. Note the status cards:
   - **Total Rows:** 7
   - **Valid Eligible:** 3 (Amina Njeri, Brian Otieno, Wanjiku Kamau)
   - **Invalid Rows:** 3 (Unknown member MBR-999999, conflicting identifiers, format errors)
   - **Duplicates:** 1 (Repeat entry of MBR-100001)
   - **Onboarded Rows:** 0 (Confirmed: no members are onboarded before staff approval!)
2. Review the rows in the **Workbook Records** table:
   - Use the filter tabs: **All (7)**, **Valid (3)**, **Invalid (3)**, **Duplicate (1)**.
   - Click **Inspect** on any row to view complete profile details and the exact failure reason reported by core banking.

### Step 6: Confirm Review & Commit Valid Rows
1. Locate the **Staff Review Required** attention banner.
2. Check the authorization checkbox:
   > ☑ *“I confirm that I have reviewed the validation results and authorize onboarding of all valid rows.”*
3. Click the green button: **🚀 Commit Valid Rows (3 Members)**.
4. The server processes the eligible rows and activates them in digital banking.

### Step 7: Verify Confirmation & Export Invalid Rows
1. The status updates to **Committed with Errors** (since invalid/duplicate rows were safely left uncommitted).
2. The onboarded count reflects **3 members**.
3. Click **⚠️ Download Invalid Rows (.xlsx)** to download `invalid.xlsx` containing only the rows that need staff investigation or branch follow-up.
4. Click **📥 Export CSV** or **📥 Export XLSX** to download audit copies.

### Step 8: Return to Batches List
1. Click **Batches** in the top navigation or use **← Back to All Batches**.
2. Find the “Riverside Branch — October Enrolment” batch.
3. Test the search bar and status filters.

### Step 9: Inspect Onboarded Members Directory
1. Click **👥 Onboarded Members** in the top navigation (`#/members`).
2. Search for any member from the batch (e.g., *“Amina”* or *“MBR-100001”*).
3. Click **View** on their row to open the complete member profile modal, showing their core member ID, national ID, phone, account number, branch, and link to their source onboarding batch.

---

## 🏗️ Architecture & Project Structure

```
digibanking2/
├── config.xml                         # API configuration (port setting)
├── spec-openapi.yaml                  # OpenAPI 3.1.0 API contract
├── assignment.md                      # Case requirements and expectations
├── data/
│   └── onboarding.sqlite              # Synthetic core banking database
├── windows-x64/                       # Windows API binary & launch script
├── linux-x64/                         # Linux API binary & launch script
│
├── index.html                         # Semantic HTML5 entry document
├── package.json                       # Project scripts and dependencies
├── tsconfig.json                      # Strict TypeScript compiler options
├── vite.config.ts                     # Bundler and dev server configuration
│
├── public/                            # Static assets served at root
│   ├── config.xml                     # Auto-detected port reference
│   └── riverside-branch-october-enrolment.xlsx  # Walkthrough sample file
│
├── src/
│   ├── main.ts                        # Application bootstrapper
│   ├── router.ts                      # Hash-based SPA client router
│   ├── types/
│   │   └── index.ts                   # Domain TypeScript interfaces & types
│   ├── config/
│   │   └── api-config.ts              # API base URL, storage & health check
│   ├── services/
│   │   ├── api-client.ts              # HTTP client (XML & binary requests)
│   │   ├── xml-parser.ts              # DOMParser-based XML response parser
│   │   ├── xml-builder.ts             # XML request serializer
│   │   ├── chunked-uploader.ts        # Resumable 1MB chunked uploader
│   │   └── sse-client.ts              # Server-Sent Events client with auto-reconnect
│   ├── components/
│   │   ├── header.ts                  # Top navigation & live API status indicator
│   │   ├── modal.ts                   # Accessible modal dialog wrapper
│   │   └── toast.ts                   # ARIA-live operational notifications
│   ├── views/
│   │   ├── batches-view.ts            # Paginated list of batches & metrics
│   │   ├── new-batch-modal.ts         # Batch creation, upload & pause/resume
│   │   ├── batch-detail-view.ts       # Record inspector, SSE stream, review & commit
│   │   ├── members-view.ts            # Onboarded members directory & profile view
│   │   └── settings-modal.ts          # API connection & port configuration modal
│   └── styles/
│       └── main.css                   # Responsive design tokens & styles
│
└── scripts/
    ├── generate-demo-data.js          # Generator for Riverside demo workbook
    └── verify-client.js               # Implementation verification checks
```

---

## 🔒 Security & Banking Design Principles

- **No Framework Overhead:** Built with pure TypeScript for transparent, auditable code.
- **Zero Local PII Storage:** Member records are strictly rendered dynamically from API responses; sensitive identifiers are never persisted to `localStorage` or `sessionStorage`.
- **Accessible & Semantic:** Keyboard navigation, `aria-live` status regions for background events, high-contrast WCAG typography, and accessible form controls.
- **Strict Error Handling:** XML error structures are parsed and converted to user-friendly messages with actionable guidance.

#   D i g i B a n k i n g  
 