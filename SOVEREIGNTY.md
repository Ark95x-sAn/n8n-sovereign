# ARK95X Sovereign n8n Stack - SOVEREIGNTY.md

> **PAX Runtime v2.0 | 13-Agent Crew | Quantum Orchestration | CREATE_VAULT | NeoX Flame CI-CD**

---

## Architecture Overview

```
ARK95X SOVEREIGN STACK
========================
 n8n UI          :5678  ← Workflow Automation
 AutomationAPI   :5679  ← Sovereignty Gateway
 Prometheus      :9090  ← Metrics Collection
 Grafana         :3000  ← Dashboard & Visualization
 PostgreSQL      :5432  ← Persistent Storage

PAX RUNTIME LAYER
  └─ 13-Agent Sovereign Crew
  └─ Confidence Threshold: 0.85
  └─ Quantum Correlation Engine
  └─ CREATE_VAULT Storage
  └─ ROI Scoring & Reporting
```

---

## Quick Deploy

### Prerequisites
- Docker + Docker Compose
- GitHub CLI (`gh`)
- Node.js 20+
- PowerShell 7+ (Windows) or Bash

### 1. Clone Your Fork

```powershell
# Windows PowerShell / NeoX Flame CI-CD
gh repo clone Ark95x-sAn/n8n-sovereign
cd n8n-sovereign
```

### 2. Launch Full Sovereignty Stack

```bash
docker-compose -f docker-compose.sovereignty.yml up -d
```

### 3. Verify All Services

```bash
docker-compose -f docker-compose.sovereignty.yml ps
```

Expected output:
```
n8n_sovereign      Up   0.0.0.0:5678->5678/tcp
automation_api     Up   0.0.0.0:5679->5679/tcp
postgres_sovereign Up   0.0.0.0:5432->5432/tcp
prometheus         Up   0.0.0.0:9090->9090/tcp
grafana            Up   0.0.0.0:3000->3000/tcp
```

---

## Access Interfaces

| Service | URL | Credentials |
|---------|-----|-------------|
| n8n Workflow UI | http://localhost:5678 | Set on first run |
| Sovereignty API | http://localhost:5679 | No auth (internal) |
| Prometheus | http://localhost:9090 | No auth |
| Grafana | http://localhost:3000 | admin / sovereignty |

---

## Test Sovereignty API

```bash
# Check PAX Runtime state (13 agents + uptime)
curl http://localhost:5679/api/sovereignty/state

# Scan for value opportunities
curl http://localhost:5679/api/sovereignty/scan/opportunities

# Generate full value report
curl http://localhost:5679/api/sovereignty/scan/report > value_report.md
cat value_report.md
```

### Expected State Response
```json
{
  "runtime": "PAXRuntime",
  "version": "2.0.0",
  "agents": 13,
  "sovereignty": {
    "active": true,
    "uptime": 42,
    "processedItems": 0,
    "totalROI": 0,
    "vaultStatus": "ACTIVE (0 items stored)"
  },
  "network": {
    "n8nConnected": true,
    "apiOnline": true,
    "prometheusActive": true,
    "grafanaActive": true
  }
}
```

---

## Create First Extraction Workflow

1. Open n8n at http://localhost:5678
2. Click **New Workflow**
3. Add **Sovereign Extraction** node (search: "sovereign")
4. Configure:
   - **Extraction Mode**: Value Scan
   - **Confidence Threshold**: `0.85`
   - **Enable PAX Routing**: `true`
   - **Sovereignty API URL**: `http://localhost:5679`
5. Connect to Webhook or File Input node
6. Click **Execute Workflow**
7. Review `_sovereignty` output block for ROI and confidence scores

---

## Sovereignty File Map

```
n8n-sovereign/
├── sovereignty/                          # Root sovereignty configs
│   ├── PAXRuntime.ts                     # [ROOT] Quick reference copy
│   ├── ValueScanner.ts                   # [ROOT] Quick reference copy
│   └── AutomationAPI.ts                  # [ROOT] Quick reference copy
├── packages/
│   ├── core/sovereignty/
│   │   └── PAXRuntime.ts                 # Sovereignty Kernel (13-agent)
│   ├── cli/src/sovereignty/
│   │   ├── ValueScanner.ts               # ROI opportunity scanner
│   │   └── AutomationAPI.ts              # Express API :5679
│   └── nodes-base/nodes/SovereignExtraction/
│       └── SovereignExtraction.node.ts   # Custom n8n node
└── docker-compose.sovereignty.yml        # Full stack deployment
```

---

## ARK95X 13-Agent Crew

| ID | Agent | Role |
|----|-------|------|
| ark-01 | Commander | Meta-orchestrator |
| ark-02 | Scout | Data ingestion |
| ark-03 | Analyst | Value analysis |
| ark-04 | Extractor | Extraction engine |
| ark-05 | Validator | Confidence scoring |
| ark-06 | Vaultkeeper | CREATE_VAULT management |
| ark-07 | Router | PAX routing |
| ark-08 | Quantum | Quantum correlation |
| ark-09 | Reporter | ROI reporting |
| ark-10 | Sentinel | Security monitor |
| ark-11 | Deployer | NeoX Flame CI-CD |
| ark-12 | Optimizer | Performance tuning |
| ark-13 | Nexus | Supreme orchestrator |

---

## PowerShell Bootstrap (Windows / NeoX Flame)

```powershell
# CREATE_VAULT deployment sequence
$REPO = "Ark95x-sAn/n8n-sovereign"
$STACK = "docker-compose.sovereignty.yml"

# Clone
gh repo clone $REPO
Set-Location n8n-sovereign

# Deploy
docker-compose -f $STACK up -d

# Wait for stack
Start-Sleep -Seconds 10

# Test
Invoke-RestMethod http://localhost:5679/api/sovereignty/state | ConvertTo-Json -Depth 5
Invoke-RestMethod http://localhost:5679/api/sovereignty/scan/opportunities | ConvertTo-Json -Depth 5

# Generate value report
Invoke-RestMethod http://localhost:5679/api/sovereignty/scan/report | Out-File value_report.md
Get-Content value_report.md

Write-Host "[ARK95X] Sovereignty Stack ONLINE" -ForegroundColor Green
```

---

## Upstream Sync (NeoX Flame CI-CD)

```bash
# Keep fork updated with n8n upstream
git remote add upstream https://github.com/n8n-io/n8n.git
git fetch upstream
git merge upstream/master --no-edit
git push origin master

# Rebuild after sync
docker-compose -f docker-compose.sovereignty.yml build
docker-compose -f docker-compose.sovereignty.yml up -d
```

---

*ARK95X Sovereign Stack | PAX Runtime v2.0 | CREATE_VAULT Active | NeoX Flame CI-CD*
