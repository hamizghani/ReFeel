import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('docs/figures');
const brainDir = 'C:\\Users\\hamiz\\.gemini\\antigravity\\brain\\b1bf5d70-9fdb-4e26-a7cf-f01da2e31941';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const htmlTemplate = (title, figNum, caption, svgContent) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      display: inline-block;
      padding: 32px;
    }
    .figure-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 28px 32px 24px 32px;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.06);
    }
    .header {
      margin-bottom: 24px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 16px;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #047857;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 3px 10px;
      border-radius: 9999px;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .caption {
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid #f1f5f9;
      font-size: 13px;
      line-height: 1.6;
      color: #475569;
    }
    .caption strong {
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="figure-container">
    <div class="header">
      <span class="badge">ReFeel Technical Architecture</span>
      <h1>${figNum}: ${title}</h1>
    </div>
    <div class="canvas">
      ${svgContent}
    </div>
    <div class="caption">
      <strong>${figNum}:</strong> ${caption}
    </div>
  </div>
</body>
</html>`;

// SVG Definitions
const arrowDefs = `
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569"/>
  </marker>
  <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669"/>
  </marker>
  <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb"/>
  </marker>
  <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626"/>
  </marker>
</defs>`;

// Figure 3.1 SVG
const fig1Svg = `<svg width="980" height="520" viewBox="0 0 980 520" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
  ${arrowDefs}
  <!-- Client Tier -->
  <rect x="15" y="15" width="270" height="485" rx="12" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="25" y="25" width="250" height="30" rx="6" fill="#f8fafc"/>
  <text x="35" y="45" font-size="12.5" font-weight="700" fill="#0f172a">1. CLIENT TIER (Mobile Web)</text>
  <text x="35" y="70" font-size="11" fill="#64748b">Zero-install responsive web app</text>

  <rect x="30" y="85" width="240" height="65" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="42" y="110" font-size="12" font-weight="600" fill="#0f172a">Merchant Capture</text>
  <text x="42" y="130" font-size="10.5" fill="#475569">7-step guided protocol + review</text>

  <rect x="30" y="160" width="240" height="65" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="42" y="185" font-size="12" font-weight="600" fill="#0f172a">Buyer Reference Capture</text>
  <text x="42" y="205" font-size="10.5" fill="#475569">One-time private familiar garment</text>

  <rect x="30" y="235" width="240" height="85" rx="8" fill="#fef2f2" stroke="#fca5a5"/>
  <text x="42" y="258" font-size="12" font-weight="600" fill="#991b1b">Client Real-Time QA Checks</text>
  <text x="42" y="278" font-size="10.5" fill="#7f1d1d">• Focus, lighting & framing check</text>
  <text x="42" y="296" font-size="10.5" fill="#7f1d1d">• Immediate on-device repeat prompt</text>

  <rect x="30" y="330" width="240" height="155" rx="8" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="42" y="355" font-size="12" font-weight="700" fill="#1e3a8a">Buyer Comparison View</text>
  <text x="42" y="377" font-size="10.5" fill="#1e40af">• Property-by-property differences</text>
  <text x="42" y="397" font-size="10.5" fill="#1e40af">• "Unavailable" states (no guessing)</text>
  <text x="42" y="417" font-size="10.5" fill="#1e40af">• Direct links to original clips/crops</text>
  <text x="42" y="445" font-size="10" font-style="italic" fill="#3b82f6">Compatible category matching required</text>

  <!-- Storage Tier -->
  <rect x="340" y="15" width="270" height="150" rx="12" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="350" y="25" width="250" height="30" rx="6" fill="#f8fafc"/>
  <text x="360" y="45" font-size="12.5" font-weight="700" fill="#0f172a">2. OBJECT STORAGE (Cloudflare R2)</text>
  <text x="360" y="70" font-size="11" fill="#64748b">Immutable, unretouched raw evidence</text>
  <rect x="355" y="85" width="240" height="65" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="368" y="110" font-size="11.5" font-weight="600" fill="#0f172a">Original Source Clips & Photos</text>
  <text x="368" y="130" font-size="10" fill="#475569">Photos, 6s motion clips, visible wear crops</text>

  <!-- Modal GPU Compute Tier -->
  <rect x="340" y="185" width="270" height="315" rx="12" fill="#ffffff" stroke="#16a34a" stroke-width="1.5"/>
  <rect x="350" y="195" width="250" height="30" rx="6" fill="#f0fdf4"/>
  <text x="360" y="215" font-size="12.5" font-weight="700" fill="#166534">3. SERVERLESS GPU (Modal - ~5s)</text>
  <text x="360" y="240" font-size="11" fill="#15803d">Target compute runtime: 5 GPU seconds</text>

  <rect x="355" y="255" width="240" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="368" y="276" font-size="11" font-weight="600" fill="#0f172a">Garment Isolation & Tracking</text>
  <text x="368" y="292" font-size="9.5" fill="#475569">Foreground segmentation & optical flow</text>

  <rect x="355" y="315" width="240" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="368" y="336" font-size="11" font-weight="600" fill="#0f172a">Care-Label OCR Engine</text>
  <text x="368" y="352" font-size="9.5" fill="#475569">Text extraction + merchant edit/verify</text>

  <rect x="355" y="375" width="240" height="55" rx="6" fill="#f0fdf4" stroke="#86efac"/>
  <text x="368" y="396" font-size="11" font-weight="600" fill="#166534">Physical Descriptor Extraction</text>
  <text x="368" y="412" font-size="9.5" fill="#15803d">Drape, extension/recovery, sheen, opacity</text>

  <rect x="355" y="440" width="240" height="50" rx="6" fill="#fef2f2" stroke="#fca5a5"/>
  <text x="368" y="461" font-size="11" font-weight="600" fill="#991b1b">Visible Wear Detection</text>
  <text x="368" y="477" font-size="9.5" fill="#b91c1c">Defect localization linked to source crop</text>

  <!-- Database Tier -->
  <rect x="665" y="15" width="295" height="305" rx="12" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="675" y="25" width="275" height="30" rx="6" fill="#f8fafc"/>
  <text x="685" y="45" font-size="12.5" font-weight="700" fill="#0f172a">4. DATABASE TIER (Supabase)</text>
  <text x="685" y="70" font-size="11" fill="#64748b">Managed PostgreSQL + Storage Pointers</text>

  <rect x="680" y="85" width="265" height="65" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="692" y="108" font-size="11.5" font-weight="600" fill="#0f172a">Published Listing Profiles</text>
  <text x="692" y="126" font-size="10" fill="#475569">Public descriptors, reliability, version hash</text>
  <text x="692" y="140" font-size="9.5" fill="#64748b">Pinned to model version it was created with</text>

  <rect x="680" y="160" width="265" height="60" rx="8" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="692" y="183" font-size="11.5" font-weight="600" fill="#1e3a8a">Buyer Private References</text>
  <text x="692" y="202" font-size="10" fill="#1e40af">Saved privately; client-isolated storage</text>

  <rect x="680" y="230" width="265" height="75" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="692" y="252" font-size="11.5" font-weight="600" fill="#0f172a">Descriptor Provenance Schema</text>
  <text x="692" y="271" font-size="10" fill="#475569">• Reliability score [0, 1] & conditions</text>
  <text x="692" y="289" font-size="10" fill="#475569">• Pointer links directly to R2 source file</text>

  <!-- Comparison & Grounded Text Generator -->
  <rect x="665" y="340" width="295" height="160" rx="12" fill="#ffffff" stroke="#d97706" stroke-width="1.5"/>
  <rect x="675" y="350" width="275" height="30" rx="6" fill="#fffbeb"/>
  <text x="685" y="370" font-size="12" font-weight="700" fill="#b45309">5. COMPARISON & EXPLANATION</text>

  <rect x="680" y="390" width="265" height="95" rx="8" fill="#fffbeb" stroke="#fcd34d"/>
  <text x="692" y="412" font-size="11" font-weight="700" fill="#78350f">Deterministic Grounded Generator</text>
  <text x="692" y="430" font-size="10" fill="#92400e">• Shared descriptors only (D_A ∩ D_B)</text>
  <text x="692" y="447" font-size="10" fill="#92400e">• Weight = Priority × min(rA, rB)</text>
  <text x="692" y="465" font-size="10" fill="#92400e">• Text strictly generated from stored proof</text>

  <!-- Arrows -->
  <path d="M 270 275 L 340 90" fill="none" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>
  <path d="M 475 165 L 475 185" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#arrow)"/>
  <path d="M 610 395 L 665 190" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#arrow)"/>
  <path d="M 680 435 L 270 420" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="4,4" marker-end="url(#arrow-blue)"/>
  <path d="M 340 120 C 290 120, 280 340, 270 380" fill="none" stroke="#059669" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow-green)"/>
</svg>`;

// Figure 3.2 SVG
const fig2Svg = `<svg width="980" height="490" viewBox="0 0 980 490" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
  ${arrowDefs}
  <!-- Col 1: 7 Steps -->
  <rect x="15" y="15" width="235" height="460" rx="12" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="25" y="25" width="215" height="28" rx="6" fill="#f8fafc"/>
  <text x="35" y="44" font-size="12" font-weight="700" fill="#0f172a">7-STEP CAPTURE PROTOCOL</text>
  <text x="35" y="70" font-size="10.5" fill="#64748b">Identical for merchant & buyer</text>

  <g transform="translate(25, 80)">
    <rect width="215" height="45" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="12" y="26" font-size="11.5" font-weight="600" fill="#0f172a">1. Care-Label Photo</text>
    <text x="12" y="40" font-size="9.5" fill="#64748b">Composition & wash instructions</text>
  </g>
  <g transform="translate(25, 135)">
    <rect width="215" height="45" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="12" y="26" font-size="11.5" font-weight="600" fill="#0f172a">2. Surface Close-Up</text>
    <text x="12" y="40" font-size="9.5" fill="#64748b">Visible weave & surface structure</text>
  </g>
  <g transform="translate(25, 190)">
    <rect width="215" height="45" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="12" y="26" font-size="11.5" font-weight="600" fill="#0f172a">3. Hanging & Movement Clip</text>
    <text x="12" y="40" font-size="9.5" fill="#64748b">Dynamic drape & motion tracking</text>
  </g>
  <g transform="translate(25, 245)">
    <rect width="215" height="45" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="12" y="26" font-size="11.5" font-weight="600" fill="#0f172a">4. Stretch & Release Clip</text>
    <text x="12" y="40" font-size="9.5" fill="#64748b">Observed visual extension/recovery</text>
  </g>
  <g transform="translate(25, 300)">
    <rect width="215" height="45" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="12" y="26" font-size="11.5" font-weight="600" fill="#0f172a">5. Sheen Angle Change Clip</text>
    <text x="12" y="40" font-size="9.5" fill="#64748b">Specular reflection under light</text>
  </g>
  <g transform="translate(25, 355)">
    <rect width="215" height="45" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="12" y="26" font-size="11.5" font-weight="600" fill="#0f172a">6. Show-Through View</text>
    <text x="12" y="40" font-size="9.5" fill="#64748b">Fabric opacity & light transmittance</text>
  </g>
  <g transform="translate(25, 410)">
    <rect width="215" height="45" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="12" y="26" font-size="11.5" font-weight="600" fill="#0f172a">7. Visible Condition Close-Ups</text>
    <text x="12" y="40" font-size="9.5" fill="#64748b">Pilling, localized wear or flaws</text>
  </g>

  <!-- Col 2: Client QA -->
  <rect x="290" y="90" width="210" height="300" rx="12" fill="#ffffff" stroke="#dc2626" stroke-width="1.5"/>
  <rect x="300" y="100" width="190" height="28" rx="6" fill="#fef2f2"/>
  <text x="310" y="119" font-size="11.5" font-weight="700" fill="#991b1b">CLIENT-SIDE REAL-TIME QA</text>
  <text x="310" y="145" font-size="10" fill="#64748b">Evaluates during live recording</text>

  <rect x="305" y="160" width="180" height="125" rx="8" fill="#fef2f2" stroke="#fca5a5"/>
  <text x="317" y="183" font-size="11" font-weight="600" fill="#991b1b">Quality Checks:</text>
  <text x="317" y="205" font-size="10" fill="#7f1d1d">• Focus & edge sharpness</text>
  <text x="317" y="225" font-size="10" fill="#7f1d1d">• Adequate illumination</text>
  <text x="317" y="245" font-size="10" fill="#7f1d1d">• Complete framing bounds</text>
  <text x="317" y="265" font-size="10" fill="#7f1d1d">• Completeness of action</text>

  <rect x="305" y="300" width="180" height="70" rx="8" fill="#fee2e2" stroke="#f87171"/>
  <text x="317" y="324" font-size="11" font-weight="700" fill="#b91c1c">Ask Immediate Repeat</text>
  <text x="317" y="344" font-size="9.5" fill="#7f1d1d">Re-take clip before session</text>
  <text x="317" y="358" font-size="9.5" fill="#7f1d1d">advances to cloud upload</text>

  <!-- Col 3: Cloud Analysis -->
  <rect x="540" y="25" width="220" height="440" rx="12" fill="#ffffff" stroke="#16a34a" stroke-width="1.5"/>
  <rect x="550" y="35" width="200" height="28" rx="6" fill="#f0fdf4"/>
  <text x="560" y="54" font-size="11.5" font-weight="700" fill="#166534">CLOUD ANALYSIS (Modal GPU)</text>
  <text x="560" y="80" font-size="10" fill="#15803d">Heavier inference pipeline (~5s)</text>

  <rect x="555" y="95" width="190" height="65" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="567" y="118" font-size="11" font-weight="600" fill="#0f172a">Garment Isolation</text>
  <text x="567" y="136" font-size="9.5" fill="#475569">Foreground segmentation &</text>
  <text x="567" y="150" font-size="9.5" fill="#475569">dynamic motion tracking</text>

  <rect x="555" y="170" width="190" height="65" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="567" y="193" font-size="11" font-weight="600" fill="#0f172a">Care-Label OCR</text>
  <text x="567" y="211" font-size="9.5" fill="#475569">Optical character reading;</text>
  <text x="567" y="225" font-size="9.5" fill="#475569">merchant confirms or corrects</text>

  <rect x="555" y="245" width="190" height="120" rx="6" fill="#f0fdf4" stroke="#86efac"/>
  <text x="567" y="268" font-size="11" font-weight="600" fill="#166534">Descriptor Extraction</text>
  <text x="567" y="288" font-size="9.5" fill="#15803d">• Drape coefficient</text>
  <text x="567" y="306" font-size="9.5" fill="#15803d">• Observed stretch/recovery</text>
  <text x="567" y="324" font-size="9.5" fill="#15803d">• Specular sheen response</text>
  <text x="567" y="342" font-size="9.5" fill="#15803d">• Show-through opacity</text>
  <text x="567" y="358" font-size="9.5" fill="#15803d">• Visible surface structure</text>

  <rect x="555" y="375" width="190" height="65" rx="6" fill="#fef2f2" stroke="#fca5a5"/>
  <text x="567" y="398" font-size="11" font-weight="600" fill="#991b1b">Visible Wear Tagging</text>
  <text x="567" y="416" font-size="9.5" fill="#b91c1c">Defect localization; pinned</text>
  <text x="567" y="430" font-size="9.5" fill="#b91c1c">to original close-up crop</text>

  <!-- Col 4: Record Schema -->
  <rect x="795" y="45" width="170" height="400" rx="12" fill="#ffffff" stroke="#2563eb" stroke-width="1.5"/>
  <rect x="805" y="55" width="150" height="28" rx="6" fill="#eff6ff"/>
  <text x="815" y="74" font-size="11.5" font-weight="700" fill="#1e3a8a">PROFILE SCHEMA</text>
  <text x="815" y="100" font-size="10" fill="#64748b">Stored per descriptor</text>

  <rect x="805" y="115" width="150" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="815" y="137" font-size="10.5" font-weight="600" fill="#0f172a">Descriptor Value</text>
  <text x="815" y="153" font-size="9" fill="#64748b">Extracted property class</text>

  <rect x="805" y="175" width="150" height="50" rx="6" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="815" y="197" font-size="10.5" font-weight="600" fill="#1e3a8a">Reliability Score</text>
  <text x="815" y="213" font-size="9" fill="#1e40af">r ∈ [0.0, 1.0]</text>

  <rect x="805" y="235" width="150" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="815" y="257" font-size="10.5" font-weight="600" fill="#0f172a">Capture Conditions</text>
  <text x="815" y="273" font-size="9" fill="#64748b">Lighting, angle, device</text>

  <rect x="805" y="295" width="150" height="50" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="815" y="317" font-size="10.5" font-weight="600" fill="#0f172a">Source Pointer</text>
  <text x="815" y="333" font-size="9" fill="#64748b">Direct link to R2 clip/crop</text>

  <rect x="805" y="355" width="150" height="55" rx="6" fill="#faf5ff" stroke="#d8b4fe"/>
  <text x="815" y="377" font-size="10.5" font-weight="600" fill="#6b21a8">Model Version Tag</text>
  <text x="815" y="395" font-size="9" fill="#7e22ce">Immutable version pin</text>

  <!-- Connectors -->
  <path d="M 250 240 L 290 240" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#arrow)"/>
  <path d="M 395 370 L 395 440 L 140 440 L 140 455" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow-red)"/>
  <path d="M 500 240 L 540 240" fill="none" stroke="#059669" stroke-width="2" marker-end="url(#arrow-green)"/>
  <path d="M 760 250 L 795 250" fill="none" stroke="#2563eb" stroke-width="1.5" marker-end="url(#arrow-blue)"/>
</svg>`;

// Figure 3.3 SVG
const fig3Svg = `<svg width="980" height="490" viewBox="0 0 980 490" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
  ${arrowDefs}
  <!-- Left: Four Information Tiers -->
  <rect x="15" y="15" width="315" height="460" rx="12" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="25" y="25" width="295" height="28" rx="6" fill="#f8fafc"/>
  <text x="35" y="44" font-size="12" font-weight="700" fill="#0f172a">FOUR INFORMATION TIERS</text>
  <text x="35" y="70" font-size="10.5" fill="#64748b">Strict epistemological boundaries</text>

  <rect x="25" y="85" width="295" height="80" rx="8" fill="#f0fdf4" stroke="#86efac"/>
  <text x="37" y="110" font-size="11.5" font-weight="700" fill="#166534">1. Direct Observations</text>
  <text x="37" y="130" font-size="10" fill="#15803d">• Unretouched original video clips & photos</text>
  <text x="37" y="148" font-size="10" fill="#15803d">• Visible condition close-up crops (never retouched)</text>

  <rect x="25" y="175" width="295" height="80" rx="8" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="37" y="200" font-size="11.5" font-weight="700" fill="#1e3a8a">2. Declarations</text>
  <text x="37" y="220" font-size="10" fill="#1e40af">• Confirmed care-label text (fiber composition)</text>
  <text x="37" y="238" font-size="10" fill="#1e40af">• Merchant-declared garment category & size</text>

  <rect x="25" y="265" width="295" height="90" rx="8" fill="#faf5ff" stroke="#d8b4fe"/>
  <text x="37" y="290" font-size="11.5" font-weight="700" fill="#6b21a8">3. Model Estimates</text>
  <text x="37" y="310" font-size="10" fill="#7e22ce">• Relative drape, sheen response & opacity</text>
  <text x="37" y="328" font-size="10" fill="#7e22ce">• Observed stretch (visible pull, NOT elasticity)</text>
  <text x="37" y="344" font-size="9.5" fill="#7e22ce">• Pinned to protocol & model version</text>

  <rect x="25" y="365" width="295" height="95" rx="8" fill="#fef2f2" stroke="#fca5a5"/>
  <text x="37" y="390" font-size="11.5" font-weight="700" fill="#991b1b">4. Explicit Unknowns (Never Estimated)</text>
  <text x="37" y="410" font-size="10" fill="#7f1d1d">• Skin tactile softness & hand-feel warmth</text>
  <text x="37" y="428" font-size="10" fill="#7f1d1d">• True mechanical fabric elasticity (MPa)</text>
  <text x="37" y="446" font-size="10" fill="#7f1d1d">• Fabric breathability, internal odor, cleanliness</text>

  <!-- Middle: Pairwise Comparison Engine -->
  <rect x="350" y="15" width="280" height="460" rx="12" fill="#ffffff" stroke="#d97706" stroke-width="1.5"/>
  <rect x="360" y="25" width="260" height="28" rx="6" fill="#fffbeb"/>
  <text x="370" y="44" font-size="12" font-weight="700" fill="#b45309">PAIRWISE COMPARISON LOGIC</text>
  <text x="370" y="70" font-size="10.5" fill="#64748b">Only shared, verified evidence compared</text>

  <rect x="360" y="85" width="260" height="70" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="372" y="110" font-size="11" font-weight="600" fill="#0f172a">Category Compatibility Check</text>
  <text x="372" y="130" font-size="9.5" fill="#475569">Garments must share category; cut & size</text>
  <text x="372" y="146" font-size="9.5" fill="#475569">affect hang independently of fabric</text>

  <rect x="360" y="165" width="260" height="85" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="372" y="190" font-size="11" font-weight="600" fill="#0f172a">Shared Descriptor Intersection</text>
  <text x="372" y="210" font-size="9.5" fill="#475569">Uses only D_shared = D_A ∩ D_B</text>
  <text x="372" y="228" font-size="9.5" font-weight="600" fill="#dc2626">Non-imputation: missing evidence marked</text>
  <text x="372" y="242" font-size="9.5" font-weight="600" fill="#dc2626">as "Unavailable" (no guessing / filling)</text>

  <rect x="360" y="260" width="260" height="95" rx="8" fill="#f0fdf4" stroke="#86efac"/>
  <text x="372" y="285" font-size="11" font-weight="700" fill="#166534">Pessimistic Weighting</text>
  <text x="372" y="306" font-size="10.5" font-weight="600" fill="#15803d">Wi = BuyerPriority_i × min(rA,i , rB,i)</text>
  <text x="372" y="326" font-size="9.5" fill="#14532d">Weaker reliability governs certainty;</text>
  <text x="372" y="342" font-size="9.5" fill="#14532d">buyer sets priority weights</text>

  <rect x="360" y="365" width="260" height="95" rx="8" fill="#fffbeb" stroke="#fcd34d"/>
  <text x="372" y="390" font-size="11" font-weight="700" fill="#78350f">Shared Evidence Threshold</text>
  <text x="372" y="412" font-size="9.5" fill="#92400e">If shared evidence falls below threshold:</text>
  <text x="372" y="430" font-size="9.5" font-weight="600" fill="#b45309">Asks for recapture rather than guessing</text>
  <text x="372" y="446" font-size="9.5" font-weight="600" fill="#b45309">or asserting an overall verdict</text>

  <!-- Right: Buyer Experience -->
  <rect x="650" y="15" width="315" height="460" rx="12" fill="#ffffff" stroke="#2563eb" stroke-width="1.5"/>
  <rect x="660" y="25" width="295" height="28" rx="6" fill="#eff6ff"/>
  <text x="670" y="44" font-size="12" font-weight="700" fill="#1e3a8a">BUYER INSPECTION VIEW</text>
  <text x="670" y="70" font-size="10.5" fill="#64748b">Transparent relative comparisons</text>

  <rect x="660" y="90" width="295" height="175" rx="8" fill="#faf5ff" stroke="#d8b4fe"/>
  <text x="675" y="118" font-size="12" font-weight="700" fill="#6b21a8">Property-by-Property Differences</text>
  <text x="675" y="145" font-size="11" fill="#0f172a">• "Similar drape behavior"</text>
  <text x="675" y="170" font-size="11" fill="#0f172a">• "Less observed stretch under gentle pull"</text>
  <text x="675" y="195" font-size="11" fill="#0f172a">• "Shinier surface in recorded light"</text>
  <text x="675" y="222" font-size="10" font-style="italic" fill="#64748b">No synthetic overall score or comfort assertions;</text>
  <text x="675" y="238" font-size="10" font-style="italic" fill="#64748b">preserves separate observable facts</text>

  <rect x="660" y="280" width="295" height="150" rx="8" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="675" y="308" font-size="12" font-weight="700" fill="#1e3a8a">Click-to-Verify Evidence Proof</text>
  <text x="675" y="335" font-size="10.5" fill="#1e40af">• Tap statement to open original clip/crop</text>
  <text x="675" y="358" font-size="10.5" fill="#1e40af">• View side-by-side synchronized motion</text>
  <text x="675" y="380" font-size="10.5" fill="#1e40af">• Inspect unretouched visible wear photo</text>
  <text x="675" y="405" font-size="9.5" font-style="italic" fill="#3b82f6">Every claim links back to immutable R2 file</text>

  <!-- Connectors -->
  <path d="M 330 300 L 360 210" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#arrow)"/>
  <path d="M 620 305 L 660 170" fill="none" stroke="#2563eb" stroke-width="1.8" marker-end="url(#arrow-blue)"/>
  <path d="M 330 125 C 500 100, 520 290, 660 330" fill="none" stroke="#059669" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow-green)"/>
</svg>`;

// Figure 3.0 SVG
const fig0Svg = `<svg width="1020" height="420" viewBox="0 0 1020 420" xmlns="http://www.w3.org/2000/svg" style="font-family: inherit;">
  ${arrowDefs}
  <!-- Stage 1 -->
  <rect x="15" y="15" width="230" height="385" rx="12" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="25" y="25" width="210" height="28" rx="6" fill="#f8fafc"/>
  <text x="35" y="44" font-size="11.5" font-weight="700" fill="#0f172a">1. GUIDED CAPTURE (Web)</text>
  <text x="35" y="66" font-size="9.5" fill="#64748b">No app install required</text>

  <rect x="25" y="80" width="210" height="75" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="35" y="103" font-size="11" font-weight="600" fill="#0f172a">Merchant & Buyer Flows</text>
  <text x="35" y="121" font-size="9.5" fill="#475569">• Merchant gets public listing</text>
  <text x="35" y="138" font-size="9.5" fill="#475569">• Buyer saves private reference</text>

  <rect x="25" y="165" width="210" height="110" rx="6" fill="#fef2f2" stroke="#fca5a5"/>
  <text x="35" y="188" font-size="11" font-weight="600" fill="#991b1b">Real-Time Client QA</text>
  <text x="35" y="208" font-size="9.5" fill="#7f1d1d">• Blur, light, framing checks</text>
  <text x="35" y="226" font-size="9.5" fill="#7f1d1d">• Immediate repeat prompts</text>
  <text x="35" y="244" font-size="9.5" fill="#7f1d1d">• Pre-upload verification</text>
  <text x="35" y="262" font-size="8.5" font-style="italic" fill="#b91c1c">Zero defective media to cloud</text>

  <rect x="25" y="285" width="210" height="95" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="35" y="308" font-size="10.5" font-weight="600" fill="#0f172a">7 Standardized Steps</text>
  <text x="35" y="326" font-size="9" fill="#475569">Care label, surface, motion,</text>
  <text x="35" y="342" font-size="9" fill="#475569">stretch/release, sheen, show-through,</text>
  <text x="35" y="358" font-size="9" fill="#475569">and visible condition close-ups</text>

  <!-- Stage 2 -->
  <rect x="265" y="15" width="230" height="385" rx="12" fill="#ffffff" stroke="#16a34a" stroke-width="1.5"/>
  <rect x="275" y="25" width="210" height="28" rx="6" fill="#f0fdf4"/>
  <text x="285" y="44" font-size="11.5" font-weight="700" fill="#166534">2. CLOUD GPU (Modal)</text>
  <text x="285" y="66" font-size="9.5" fill="#15803d">~5 GPU sec budget + R2 storage</text>

  <rect x="275" y="80" width="210" height="60" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="285" y="103" font-size="10.5" font-weight="600" fill="#0f172a">Cloudflare R2 Storage</text>
  <text x="285" y="121" font-size="9.5" fill="#475569">Original unretouched media &</text>
  <text x="285" y="133" font-size="9.5" fill="#475569">bounding box crop pointers</text>

  <rect x="275" y="150" width="210" height="230" rx="6" fill="#f0fdf4" stroke="#86efac"/>
  <text x="285" y="173" font-size="11" font-weight="700" fill="#166534">Feature Extraction Pipeline</text>
  <text x="285" y="195" font-size="9.5" fill="#15803d">• Foreground segmentation</text>
  <text x="285" y="213" font-size="9.5" fill="#15803d">• Optical tracking & motion</text>
  <text x="285" y="231" font-size="9.5" fill="#15803d">• Drape descriptor extraction</text>
  <text x="285" y="249" font-size="9.5" fill="#15803d">• Observed stretch & recovery</text>
  <text x="285" y="267" font-size="9.5" fill="#15803d">• Sheen response & show-through</text>
  <text x="285" y="285" font-size="9.5" fill="#15803d">• Label OCR (merchant verified)</text>
  <text x="285" y="303" font-size="9.5" fill="#15803d">• Visible wear detection/crop</text>
  <text x="285" y="335" font-size="9" font-style="italic" fill="#166534">Each descriptor tagged with</text>
  <text x="285" y="350" font-size="9" font-style="italic" fill="#166534">reliability r, conditions & version</text>

  <!-- Stage 3 -->
  <rect x="515" y="15" width="235" height="385" rx="12" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="525" y="25" width="215" height="28" rx="6" fill="#f8fafc"/>
  <text x="535" y="44" font-size="11.5" font-weight="700" fill="#0f172a">3. DATABASE & BOUNDS</text>
  <text x="535" y="66" font-size="9.5" fill="#64748b">Supabase PostgreSQL</text>

  <rect x="525" y="80" width="215" height="75" rx="6" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="535" y="103" font-size="10.5" font-weight="600" fill="#0f172a">Structured Vaults</text>
  <text x="535" y="122" font-size="9" fill="#475569">• Merchant Public Listing Profile</text>
  <text x="535" y="139" font-size="9" fill="#475569">• Buyer Private Reference Vault</text>

  <rect x="525" y="165" width="215" height="215" rx="6" fill="#faf5ff" stroke="#d8b4fe"/>
  <text x="535" y="188" font-size="11" font-weight="700" fill="#6b21a8">Four Information Tiers</text>
  <text x="535" y="212" font-size="9.5" font-weight="600" fill="#3b0764">1. Direct Observations (R2)</text>
  <text x="535" y="228" font-size="8.8" fill="#581c87">Unretouched clips & wear photos</text>
  <text x="535" y="250" font-size="9.5" font-weight="600" fill="#3b0764">2. Declarations</text>
  <text x="535" y="266" font-size="8.8" fill="#581c87">Confirmed care label & seller claims</text>
  <text x="535" y="288" font-size="9.5" font-weight="600" fill="#3b0764">3. Model Estimates</text>
  <text x="535" y="304" font-size="8.8" fill="#581c87">Qualitative descriptors tagged with r</text>
  <text x="535" y="326" font-size="9.5" font-weight="600" fill="#991b1b">4. Explicit Unknowns</text>
  <text x="535" y="342" font-size="8.8" fill="#7f1d1d">Softness, warmth, elasticity (never guessed)</text>

  <!-- Stage 4 -->
  <rect x="770" y="15" width="235" height="385" rx="12" fill="#ffffff" stroke="#2563eb" stroke-width="1.5"/>
  <rect x="780" y="25" width="215" height="28" rx="6" fill="#eff6ff"/>
  <text x="790" y="44" font-size="11.5" font-weight="700" fill="#1e3a8a">4. COMPARISON & VIEW</text>
  <text x="790" y="66" font-size="9.5" fill="#64748b">Property-by-property inspection</text>

  <rect x="780" y="80" width="215" height="135" rx="6" fill="#f0fdf4" stroke="#86efac"/>
  <text x="790" y="103" font-size="10.5" font-weight="700" fill="#166534">Pessimistic Weighting</text>
  <text x="790" y="125" font-size="9" fill="#15803d">• Shared descriptors only (A ∩ B)</text>
  <text x="790" y="142" font-size="9" fill="#15803d">• Weight = Priority × min(rA, rB)</text>
  <text x="790" y="160" font-size="9" fill="#15803d">• Missing = "Unavailable" (No filling)</text>
  <text x="790" y="178" font-size="9" fill="#15803d">• Recapture if evidence inadequate</text>
  <text x="790" y="196" font-size="8.5" font-style="italic" fill="#166534">Compatible category required</text>

  <rect x="780" y="225" width="215" height="155" rx="6" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="790" y="248" font-size="10.5" font-weight="700" fill="#1e3a8a">Buyer Inspection UI</text>
  <text x="790" y="270" font-size="9" fill="#1e40af">• Differences clearly phrased</text>
  <text x="790" y="287" font-size="9" fill="#1e40af">• Tap statement to open original clip</text>
  <text x="790" y="304" font-size="9" fill="#1e40af">• Unretouched evidence drill-down</text>
  <text x="790" y="321" font-size="9" fill="#1e40af">• Pinned historical versions</text>
  <text x="790" y="348" font-size="8.5" font-style="italic" fill="#2563eb">Planned 2029: B2B API & Widget</text>

  <!-- Connectors -->
  <path d="M 245 200 L 265 200" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#arrow)"/>
  <path d="M 495 200 L 515 200" fill="none" stroke="#475569" stroke-width="1.5" marker-end="url(#arrow)"/>
  <path d="M 750 200 L 770 200" fill="none" stroke="#2563eb" stroke-width="1.8" marker-end="url(#arrow-blue)"/>
</svg>`;

const figures = [
  {
    id: 'Figure_3_1_System_Architecture',
    figNum: 'Figure 3.1',
    title: 'ReFeel System Architecture and Cloud Dataflow',
    caption: 'Cloud service topology and data flow across the Mobile Web client, Cloudflare R2 object storage, Modal serverless GPU (~5s runtime budget), and Supabase PostgreSQL.',
    svg: fig1Svg
  },
  {
    id: 'Figure_3_2_Capture_Pipeline',
    figNum: 'Figure 3.2',
    title: 'Guided Capture Protocol and Dual-Tier Processing Pipeline',
    caption: 'The 7-step guided capture sequence, client-side real-time QA loop, serverless feature extraction pipeline, and standardized descriptor provenance schema.',
    svg: fig2Svg
  },
  {
    id: 'Figure_3_3_Evidence_Boundaries',
    figNum: 'Figure 3.3',
    title: 'Pairwise Comparison Logic and Four Information Boundaries',
    caption: 'Strict epistemological separation of observations, declarations, estimates, and unknowns, combined with zero-imputation intersection and min-reliability weighting.',
    svg: fig3Svg
  },
  {
    id: 'Figure_3_0_Master_Consolidated',
    figNum: 'Figure 3.0',
    title: 'ReFeel End-to-End System, Capture Pipeline and Comparison Lifecycle',
    caption: 'Consolidated end-to-end technical overview illustrating guided capture, serverless analysis, structured profiles, and the buyer comparison experience.',
    svg: fig0Svg
  }
];

async function run() {
  console.log('Launching Chrome to generate PNG files...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2 // 2x DPI for publication clarity
  });

  for (const fig of figures) {
    const html = htmlTemplate(fig.title, fig.figNum, fig.caption, fig.svg);
    const tempHtmlPath = path.join(outDir, `${fig.id}.html`);
    fs.writeFileSync(tempHtmlPath, html, 'utf8');

    await page.goto('file:///' + tempHtmlPath.replace(/\\\\/g, '/'), { waitUntil: 'networkidle' });
    
    const container = await page.$('.figure-container');
    const pngPath = path.join(outDir, `${fig.id}.png`);
    await container.screenshot({ path: pngPath });

    // Also copy to brain artifact dir
    if (fs.existsSync(brainDir)) {
      fs.copyFileSync(pngPath, path.join(brainDir, `${fig.id}.png`));
    }

    console.log(`Generated: ${pngPath}`);
  }

  await browser.close();
  console.log('All PNG figures generated successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

