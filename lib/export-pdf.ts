/**
 * Paper Analysis PDF Report
 * Generates a professional A4 report for pharma/BD stakeholders.
 * Uses jsPDF + jspdf-autotable (client-side only, no server needed).
 */
import type { Paper, Analysis } from './types'

// Brand colors matching SciLens UI
const C = {
  indigo: [99, 102, 241] as [number, number, number],
  indigoLight: [224, 225, 254] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  greenLight: [220, 252, 231] as [number, number, number],
  yellow: [245, 158, 11] as [number, number, number],
  yellowLight: [254, 243, 199] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  redLight: [254, 226, 226] as [number, number, number],
  slate900: [15, 23, 42] as [number, number, number],
  slate600: [71, 85, 105] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

function trlColor(score: number): [number, number, number] {
  if (score >= 7) return C.green
  if (score >= 4) return C.yellow
  return C.red
}

function riskColor(level: string): [number, number, number] {
  if (level === 'low') return C.green
  if (level === 'medium') return C.yellow
  return C.red
}

function riskBg(level: string): [number, number, number] {
  if (level === 'low') return C.greenLight
  if (level === 'medium') return C.yellowLight
  return C.redLight
}

function slugify(s: string) {
  return s.slice(0, 60).replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_')
}

export async function exportPaperPDF(
  paper: Paper,
  analysis: Analysis,
  synthesis?: string,
) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const ML = 18   // left margin
  const MR = 192  // right edge
  const CW = MR - ML  // content width

  let y = 0

  // -------------------------------------------------------------------------
  // Header banner
  // -------------------------------------------------------------------------
  doc.setFillColor(...C.slate900)
  doc.rect(0, 0, W, 22, 'F')

  doc.setTextColor(...C.white)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('SciLens', ML, 10)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text('Scientific Intelligence Platform', ML, 15.5)

  doc.setFontSize(7)
  doc.setTextColor(...C.white)
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Generated ${now}`, MR, 10, { align: 'right' })
  doc.text('Confidential — Internal Use Only', MR, 15.5, { align: 'right' })

  y = 30

  // -------------------------------------------------------------------------
  // Paper title
  // -------------------------------------------------------------------------
  doc.setTextColor(...C.slate900)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(paper.title, CW) as string[]
  doc.text(titleLines, ML, y)
  y += titleLines.length * 6 + 3

  // Authors / journal / year / DOI
  const meta: string[] = []
  if (paper.authors.length > 0) {
    meta.push(paper.authors.slice(0, 4).join(', ') + (paper.authors.length > 4 ? ` +${paper.authors.length - 4}` : ''))
  }
  if (paper.journal) meta.push(paper.journal)
  if (paper.year) meta.push(String(paper.year))
  if (paper.doi) meta.push(`DOI: ${paper.doi}`)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.slate600)
  const metaLines = doc.splitTextToSize(meta.join('  ·  '), CW) as string[]
  doc.text(metaLines, ML, y)
  y += metaLines.length * 4.5 + 6

  // Divider
  doc.setDrawColor(...C.slate200)
  doc.setLineWidth(0.3)
  doc.line(ML, y, MR, y)
  y += 6

  // -------------------------------------------------------------------------
  // Executive KPI row
  // -------------------------------------------------------------------------
  const kpis = [
    { label: 'TRL SCORE', value: `${analysis.trlScore} / 9`, color: trlColor(analysis.trlScore) },
    { label: 'RISK LEVEL', value: analysis.riskLevel.toUpperCase(), color: riskColor(analysis.riskLevel) },
    { label: 'TAM ESTIMATE', value: `$${analysis.tamEstimate.value.toFixed(1)}B USD`, color: C.indigo },
    { label: 'DOMAIN', value: analysis.domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), color: C.slate600 },
  ]

  const kpiW = CW / 4
  kpis.forEach((kpi, i) => {
    const x = ML + i * kpiW
    doc.setFillColor(...C.slate50)
    doc.roundedRect(x, y, kpiW - 2, 16, 2, 2, 'F')

    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.slate600)
    doc.text(kpi.label, x + (kpiW - 2) / 2, y + 5, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...kpi.color)
    doc.text(kpi.value, x + (kpiW - 2) / 2, y + 12, { align: 'center' })
  })

  y += 22

  // -------------------------------------------------------------------------
  // AI Synthesis
  // -------------------------------------------------------------------------
  if (synthesis) {
    doc.setFillColor(...C.indigoLight)
    const synthLines = doc.splitTextToSize(synthesis, CW - 8) as string[]
    const synthH = synthLines.length * 4.5 + 10
    doc.roundedRect(ML, y, CW, synthH, 2, 2, 'F')

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.indigo)
    doc.text('AI SYNTHESIS', ML + 4, y + 6)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.slate900)
    doc.setFontSize(8)
    doc.text(synthLines, ML + 4, y + 12)

    y += synthH + 6
  }

  // -------------------------------------------------------------------------
  // TRL Assessment
  // -------------------------------------------------------------------------
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.slate900)
  doc.text('TRL Assessment', ML, y)
  y += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.slate600)
  doc.text(`Score: ${analysis.trlScore}/9  |  Confidence: ${analysis.trlConfidence}%`, ML, y)
  y += 4.5

  if (analysis.trlDescription) {
    const descLines = doc.splitTextToSize(analysis.trlDescription, CW) as string[]
    doc.text(descLines, ML, y)
    y += descLines.length * 4.5
  }
  y += 4

  // -------------------------------------------------------------------------
  // Evidence Quality
  // -------------------------------------------------------------------------
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.slate900)
  doc.text('Evidence Quality', ML, y)
  y += 4

  const eq = analysis.evidenceQuality
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: W - MR },
    tableWidth: CW,
    head: [['Level', 'Score', 'Sample Size', 'Statistical Rigor', 'Reproducibility']],
    body: [[
      eq.level.replace(/_/g, ' '),
      `${eq.score}/100`,
      eq.sampleSizeAdequacy,
      eq.statisticalRigor,
      eq.reproducibilitySignals,
    ]],
    headStyles: { fillColor: C.slate900, textColor: C.white, fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: C.slate900 },
    alternateRowStyles: { fillColor: C.slate50 },
    theme: 'grid',
  })
  y = (doc as any).lastAutoTable.finalY + 6

  // -------------------------------------------------------------------------
  // Key Findings
  // -------------------------------------------------------------------------
  if (analysis.keyFindings.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.slate900)
    doc.text('Key Findings', ML, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: W - MR },
      tableWidth: CW,
      head: [['Category', 'Finding', 'Description', 'Confidence']],
      body: analysis.keyFindings.map(f => [
        f.category.charAt(0).toUpperCase() + f.category.slice(1),
        f.title,
        f.description,
        `${f.confidence}%`,
      ]),
      headStyles: { fillColor: C.slate900, textColor: C.white, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: C.slate900 },
      alternateRowStyles: { fillColor: C.slate50 },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 36 }, 3: { cellWidth: 20, halign: 'center' } },
      theme: 'grid',
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // -------------------------------------------------------------------------
  // Risk Factors
  // -------------------------------------------------------------------------
  if (analysis.riskFactors.length > 0) {
    // New page if not enough space
    if (y > 230) { doc.addPage(); y = 20 }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.slate900)
    doc.text(`Risk Assessment  —  ${analysis.riskLevel.toUpperCase()} RISK  (${analysis.riskScore}/100)`, ML, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: W - MR },
      tableWidth: CW,
      head: [['Category', 'Risk Description', 'Severity']],
      body: analysis.riskFactors.map(r => [
        r.category.charAt(0).toUpperCase() + r.category.slice(1),
        r.description,
        r.severity.toUpperCase(),
      ]),
      headStyles: { fillColor: C.slate900, textColor: C.white, fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: C.slate900 },
      alternateRowStyles: { fillColor: C.slate50 },
      columnStyles: {
        0: { cellWidth: 28 },
        2: { cellWidth: 22, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === 'body') {
          const sev = String(data.cell.raw).toLowerCase()
          const color = sev === 'high' ? C.red : sev === 'medium' ? C.yellow : C.green
          data.cell.styles.textColor = color
          data.cell.styles.fontStyle = 'bold'
        }
      },
      theme: 'grid',
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  // -------------------------------------------------------------------------
  // Regulatory Pathway
  // -------------------------------------------------------------------------
  if (analysis.regulatoryPathway || analysis.regulatoryTimeline) {
    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.slate900)
    doc.text('Regulatory Pathway', ML, y)
    y += 5

    if (analysis.regulatoryPathway) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.slate600)
      doc.text('Pathway:', ML, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.slate900)
      const pathLines = doc.splitTextToSize(analysis.regulatoryPathway, CW - 20) as string[]
      doc.text(pathLines, ML + 18, y)
      y += pathLines.length * 4.5 + 2
    }

    if (analysis.regulatoryTimeline) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.slate600)
      doc.text('Timeline:', ML, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.slate900)
      const timeLines = doc.splitTextToSize(analysis.regulatoryTimeline, CW - 20) as string[]
      doc.text(timeLines, ML + 18, y)
      y += timeLines.length * 4.5
    }
    y += 4
  }

  // -------------------------------------------------------------------------
  // Extracted Methods + Claims (two columns)
  // -------------------------------------------------------------------------
  const hasMethods = (analysis as any).extractedMethods?.length > 0
  const hasClaims = (analysis as any).extractedClaims?.length > 0

  if (hasMethods || hasClaims) {
    if (y > 230) { doc.addPage(); y = 20 }

    const colW = (CW - 4) / 2
    const leftX = ML
    const rightX = ML + colW + 4

    if (hasMethods) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.slate900)
      doc.text('Extracted Methods', leftX, y)
      let my = y + 4
      ;(analysis as any).extractedMethods.forEach((m: string) => {
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.slate600)
        const ml = doc.splitTextToSize(`• ${m}`, colW) as string[]
        doc.text(ml, leftX, my)
        my += ml.length * 4
      })
    }

    if (hasClaims) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.slate900)
      doc.text('Extracted Claims', rightX, y)
      let cy = y + 4
      ;(analysis as any).extractedClaims.forEach((c: string) => {
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...C.slate600)
        const cl = doc.splitTextToSize(`• ${c}`, colW) as string[]
        doc.text(cl, rightX, cy)
        cy += cl.length * 4
      })
    }
    y += 30
  }

  // -------------------------------------------------------------------------
  // Tags
  // -------------------------------------------------------------------------
  if (analysis.tags.length > 0) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.slate600)
    doc.text('Tags:', ML, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.indigo)
    doc.text(analysis.tags.join('  ·  '), ML + 12, y)
    y += 8
  }

  // -------------------------------------------------------------------------
  // Footer on every page
  // -------------------------------------------------------------------------
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...C.slate900)
    doc.rect(0, 285, W, 12, 'F')
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.slate200)
    doc.text('SciLens Intelligence Report  |  Confidential — For Internal Use Only', ML, 292)
    doc.text(`Page ${i} of ${pageCount}`, MR, 292, { align: 'right' })
  }

  const filename = `scilens_${slugify(paper.title)}.pdf`
  doc.save(filename)
}
