import type {
  Paper,
  Analysis,
  GraphNode,
  GraphLink,
  GraphCluster,
  DashboardStats,
  ActivityItem,
  ResearchProject,
} from './types'

const defaultEvidence = (level: Analysis['evidenceQuality']['level'], score: number): Analysis['evidenceQuality'] => ({
  level,
  score,
  sampleSizeAdequacy: score > 60 ? 'adequate' : score > 30 ? 'underpowered' : 'unknown',
  statisticalRigor: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
  reproducibilitySignals: score > 75 ? 'strong' : score > 50 ? 'moderate' : 'weak',
})

// Mock Papers with full analysis data
export const mockPapers: Paper[] = [
  {
    id: 'paper-001',
    title: 'CRISPR-Cas9 Gene Editing for Therapeutic Applications in Rare Diseases',
    authors: ['Dr. Sarah Chen', 'Dr. Michael Rivera', 'Dr. Emma Watson'],
    abstract: 'This study presents novel applications of CRISPR-Cas9 technology for treating rare genetic disorders, demonstrating successful gene correction in patient-derived cells with minimal off-target effects.',
    journal: 'Nature Biotechnology',
    year: 2024,
    doi: '10.1038/nbt.2024.001',
    uploadedAt: new Date('2024-01-15'),
    status: 'analyzed',
    analysis: {
      trlScore: 6,
      trlConfidence: 85,
      trlDescription: 'Technology demonstrated in relevant environment - preclinical validation complete',
      marketEvidence: {
        fieldMaturity: 'growing',
        marketValidationScore: 58,
        activeTrialsInSpace: 8,
        completedTrialsInSpace: 3,
        approvedDrugsInClass: 1,
        evidenceBasis: '1 FDA-approved drug in class; 8 active trials; 3 completed trials',
        citationSignal: '127 citations (high activity)',
      },
      riskLevel: 'medium',
      riskScore: 45,
      riskFactors: [
        { category: 'regulatory', description: 'FDA approval pathway uncertain for novel gene therapies', severity: 'high' },
        { category: 'technical', description: 'Long-term safety data still being collected', severity: 'medium' },
        { category: 'market', description: 'High development costs may limit accessibility', severity: 'medium' },
      ],
      keyFindings: [
        { title: 'High Correction Efficiency', description: '94% gene correction rate achieved in patient cells', confidence: 92, category: 'innovation' },
        { title: 'Minimal Off-Target Effects', description: 'Less than 0.1% off-target mutations detected', confidence: 88, category: 'innovation' },
        { title: 'Scalable Manufacturing', description: 'Process can be adapted for commercial-scale production', confidence: 75, category: 'application' },
        { title: 'Limited Patient Population', description: 'Initial focus on ultra-rare diseases limits market size', confidence: 90, category: 'limitation' },
      ],
      evidenceQuality: defaultEvidence('in_vitro', 65),
      domain: 'biotech',
      regulatoryPathway: 'FDA CBER → BLA (gene therapy)',
      regulatoryTimeline: '5-7 years from current stage',
      methodology: 'experimental',
      methodologyScore: 89,
      citations: 127,
      impactScore: 85,
      noveltyScore: 78,
      similarPapers: ['paper-003', 'paper-005'],
      tags: ['CRISPR', 'Gene Therapy', 'Rare Disease', 'Biotechnology'],
      analyzedAt: new Date('2024-01-16'),
    },
  },
  {
    id: 'paper-002',
    title: 'Quantum Computing Applications in Drug Discovery: A Machine Learning Approach',
    authors: ['Dr. James Liu', 'Dr. Anna Kowalski'],
    abstract: 'We demonstrate the use of hybrid quantum-classical algorithms for molecular simulation, achieving significant speedup in drug candidate screening for oncology applications.',
    journal: 'Science',
    year: 2024,
    doi: '10.1126/science.2024.002',
    uploadedAt: new Date('2024-02-20'),
    status: 'analyzed',
    analysis: {
      trlScore: 4,
      trlConfidence: 72,
      trlDescription: 'Technology validated in laboratory - proof of concept demonstrated',
      marketEvidence: {
        fieldMaturity: 'emerging',
        marketValidationScore: 32,
        activeTrialsInSpace: 4,
        completedTrialsInSpace: 1,
        approvedDrugsInClass: 0,
        evidenceBasis: '4 active trials; 1 completed trial — early-stage space',
        citationSignal: '64 citations (high activity)',
      },
      riskLevel: 'high',
      riskScore: 68,
      riskFactors: [
        { category: 'technical', description: 'Quantum hardware still in early development', severity: 'high' },
        { category: 'competitive', description: 'Multiple well-funded competitors in space', severity: 'high' },
        { category: 'market', description: 'Requires specialized expertise to implement', severity: 'medium' },
      ],
      keyFindings: [
        { title: '100x Speedup', description: 'Molecular simulations completed 100x faster than classical methods', confidence: 85, category: 'innovation' },
        { title: 'Novel Drug Candidates', description: '12 new candidates identified for further testing', confidence: 78, category: 'application' },
        { title: 'Hardware Dependency', description: 'Results dependent on specific quantum hardware architecture', confidence: 95, category: 'limitation' },
      ],
      evidenceQuality: defaultEvidence('in_silico', 45),
      domain: 'academic_basic',
      regulatoryPathway: 'Not applicable — computational tool',
      regulatoryTimeline: 'N/A',
      methodology: 'computational',
      methodologyScore: 82,
      citations: 89,
      impactScore: 72,
      noveltyScore: 91,
      similarPapers: ['paper-004'],
      tags: ['Quantum Computing', 'Drug Discovery', 'Machine Learning', 'Oncology'],
      analyzedAt: new Date('2024-02-21'),
    },
  },
  {
    id: 'paper-003',
    title: 'mRNA Vaccine Platform for Rapid Response to Emerging Pathogens',
    authors: ['Dr. Lisa Zhang', 'Dr. Robert Kim', 'Dr. Maria Garcia', 'Dr. David Park'],
    abstract: 'Development of a modular mRNA vaccine platform enabling 60-day vaccine development cycles for novel pathogens, validated against multiple viral targets.',
    journal: 'Cell',
    year: 2024,
    doi: '10.1016/j.cell.2024.003',
    uploadedAt: new Date('2024-03-10'),
    status: 'analyzed',
    analysis: {
      trlScore: 7,
      trlConfidence: 91,
      trlDescription: 'System prototype demonstrated in operational environment',
      marketEvidence: {
        fieldMaturity: 'established',
        marketValidationScore: 80,
        activeTrialsInSpace: 15,
        completedTrialsInSpace: 8,
        approvedDrugsInClass: 2,
        evidenceBasis: '2 FDA-approved drugs in class; 15 active trials; 8 completed trials',
        citationSignal: '312 citations (very high activity)',
      },
      riskLevel: 'low',
      riskScore: 28,
      riskFactors: [
        { category: 'regulatory', description: 'Expedited pathways available for pandemic response', severity: 'low' },
        { category: 'market', description: 'Government contracts provide stable revenue', severity: 'low' },
        { category: 'technical', description: 'Cold chain requirements remain challenging', severity: 'medium' },
      ],
      keyFindings: [
        { title: 'Rapid Development', description: '60-day development cycle from sequence to clinical candidate', confidence: 94, category: 'innovation' },
        { title: 'Broad Applicability', description: 'Platform validated against 5 different viral families', confidence: 89, category: 'application' },
        { title: 'Strong Immune Response', description: '95% seroconversion rate in preclinical studies', confidence: 91, category: 'innovation' },
        { title: 'Manufacturing Scale', description: 'Billion-dose annual capacity achievable', confidence: 82, category: 'opportunity' },
      ],
      evidenceQuality: defaultEvidence('in_vivo', 82),
      domain: 'biotech',
      regulatoryPathway: 'FDA CBER → BLA / EMA Centralized',
      regulatoryTimeline: '2-3 years to approval',
      methodology: 'experimental',
      methodologyScore: 94,
      citations: 312,
      impactScore: 95,
      noveltyScore: 72,
      similarPapers: ['paper-001', 'paper-006'],
      tags: ['mRNA', 'Vaccines', 'Pandemic', 'Infectious Disease'],
      analyzedAt: new Date('2024-03-11'),
    },
  },
  {
    id: 'paper-004',
    title: 'Neural Interface for Paralysis Treatment: First Human Trial Results',
    authors: ['Dr. Mark Thompson', 'Dr. Jennifer Lee'],
    abstract: 'Results from the first human trial of a novel brain-computer interface enabling paralyzed patients to control robotic limbs with unprecedented precision.',
    journal: 'NEJM',
    year: 2024,
    doi: '10.1056/nejm.2024.004',
    uploadedAt: new Date('2024-04-05'),
    status: 'analyzed',
    analysis: {
      trlScore: 5,
      trlConfidence: 78,
      trlDescription: 'Technology validated in relevant environment - first human trials',
      marketEvidence: {
        fieldMaturity: 'growing',
        marketValidationScore: 45,
        activeTrialsInSpace: 6,
        completedTrialsInSpace: 2,
        approvedDrugsInClass: 0,
        evidenceBasis: '6 active trials; 2 completed trials — Class III device space',
        citationSignal: '156 citations (high activity)',
      },
      riskLevel: 'medium',
      riskScore: 52,
      riskFactors: [
        { category: 'regulatory', description: 'Class III medical device requires extensive approval process', severity: 'high' },
        { category: 'technical', description: 'Long-term biocompatibility still under study', severity: 'medium' },
        { category: 'market', description: 'High device cost limits initial market', severity: 'medium' },
      ],
      keyFindings: [
        { title: 'Precise Motor Control', description: 'Patients achieved 89% accuracy in fine motor tasks', confidence: 86, category: 'innovation' },
        { title: 'Minimal Surgical Risk', description: 'No major complications in 12 patients', confidence: 92, category: 'application' },
        { title: 'Training Requirements', description: 'Average 6 weeks of training needed for proficiency', confidence: 88, category: 'limitation' },
      ],
      evidenceQuality: defaultEvidence('cohort', 72),
      domain: 'medical_device',
      regulatoryPathway: 'FDA PMA (Class III) / CE Mark MDR',
      regulatoryTimeline: '3-5 years to market',
      methodology: 'experimental',
      methodologyScore: 91,
      citations: 156,
      impactScore: 88,
      noveltyScore: 85,
      similarPapers: ['paper-002'],
      tags: ['Neural Interface', 'BCI', 'Paralysis', 'Medical Device'],
      analyzedAt: new Date('2024-04-06'),
    },
  },
  {
    id: 'paper-005',
    title: 'Sustainable Biofuel Production from Engineered Algae',
    authors: ['Dr. Carlos Mendez', 'Dr. Sophie Brown', 'Dr. Wei Zhang'],
    abstract: 'Demonstration of genetically engineered algae strains capable of producing biofuel at commercially viable rates with minimal environmental impact.',
    journal: 'Nature Energy',
    year: 2024,
    doi: '10.1038/nenergy.2024.005',
    uploadedAt: new Date('2024-05-12'),
    status: 'analyzed',
    analysis: {
      trlScore: 5,
      trlConfidence: 80,
      trlDescription: 'Technology validated in relevant environment - pilot scale demonstration',
      marketEvidence: {
        fieldMaturity: 'emerging',
        marketValidationScore: 38,
        activeTrialsInSpace: 2,
        completedTrialsInSpace: 1,
        approvedDrugsInClass: 0,
        evidenceBasis: '2 active trials; 1 completed trial — pilot-scale space',
        citationSignal: '78 citations (high activity)',
      },
      riskLevel: 'medium',
      riskScore: 48,
      riskFactors: [
        { category: 'market', description: 'Oil price volatility affects competitiveness', severity: 'high' },
        { category: 'regulatory', description: 'GMO regulations vary by jurisdiction', severity: 'medium' },
        { category: 'technical', description: 'Scale-up challenges not fully addressed', severity: 'medium' },
      ],
      keyFindings: [
        { title: 'High Yield', description: '10x higher lipid production than natural strains', confidence: 87, category: 'innovation' },
        { title: 'Carbon Negative', description: 'Net negative carbon footprint in production', confidence: 82, category: 'innovation' },
        { title: 'Cost Parity', description: 'Approaching cost parity with petroleum at scale', confidence: 71, category: 'opportunity' },
      ],
      evidenceQuality: defaultEvidence('in_vitro', 55),
      domain: 'chemicals',
      regulatoryPathway: 'EPA TSCA / REACH registration',
      regulatoryTimeline: '2-4 years for commercial scale',
      methodology: 'experimental',
      methodologyScore: 85,
      citations: 78,
      impactScore: 76,
      noveltyScore: 82,
      similarPapers: ['paper-001'],
      tags: ['Biofuel', 'Algae', 'Sustainability', 'Clean Energy'],
      analyzedAt: new Date('2024-05-13'),
    },
  },
  {
    id: 'paper-006',
    title: 'AI-Powered Diagnostic System for Early Cancer Detection',
    authors: ['Dr. Rachel Green', 'Dr. Thomas Anderson', 'Dr. Yuki Tanaka'],
    abstract: 'Development and validation of a multi-modal AI system for early detection of multiple cancer types using standard blood tests and imaging.',
    journal: 'The Lancet',
    year: 2024,
    doi: '10.1016/lancet.2024.006',
    uploadedAt: new Date('2024-06-18'),
    status: 'analyzed',
    analysis: {
      trlScore: 6,
      trlConfidence: 88,
      trlDescription: 'Technology demonstrated in relevant environment - large-scale validation',
      marketEvidence: {
        fieldMaturity: 'growing',
        marketValidationScore: 62,
        activeTrialsInSpace: 10,
        completedTrialsInSpace: 4,
        approvedDrugsInClass: 1,
        evidenceBasis: '1 FDA-approved test in class; 10 active trials; 4 completed trials',
        citationSignal: '204 citations (very high activity)',
      },
      riskLevel: 'low',
      riskScore: 32,
      riskFactors: [
        { category: 'regulatory', description: 'FDA De Novo pathway available', severity: 'low' },
        { category: 'competitive', description: 'First-mover advantage in multi-cancer detection', severity: 'low' },
        { category: 'technical', description: 'Model interpretability requirements', severity: 'medium' },
      ],
      keyFindings: [
        { title: 'High Sensitivity', description: '96% sensitivity across 12 cancer types', confidence: 93, category: 'innovation' },
        { title: 'Early Detection', description: 'Average 18-month earlier detection vs standard care', confidence: 89, category: 'innovation' },
        { title: 'Cost Effective', description: '$500 per test, suitable for annual screening', confidence: 85, category: 'application' },
        { title: 'Integration Ready', description: 'Compatible with existing lab infrastructure', confidence: 91, category: 'opportunity' },
      ],
      evidenceQuality: defaultEvidence('cohort', 88),
      domain: 'medical_device',
      regulatoryPathway: 'FDA De Novo / 510(k) with predicate',
      regulatoryTimeline: '1-2 years to clearance',
      methodology: 'observational',
      methodologyScore: 92,
      citations: 234,
      impactScore: 93,
      noveltyScore: 79,
      similarPapers: ['paper-003'],
      tags: ['AI', 'Cancer Detection', 'Diagnostics', 'Machine Learning'],
      analyzedAt: new Date('2024-06-19'),
    },
  },
]

// Papers currently processing
export const processingPapers: Paper[] = [
  {
    id: 'paper-007',
    title: 'Novel Solid-State Battery Architecture for Electric Vehicles',
    authors: ['Dr. John Smith'],
    abstract: 'A breakthrough solid-state battery design achieving 500 Wh/kg energy density...',
    uploadedAt: new Date(),
    status: 'processing',
  },
]

// Graph data for Research Network visualization
export const mockClusters: GraphCluster[] = [
  { id: 'biotech', name: 'Biotechnology', color: '#10b981', nodeCount: 8 },
  { id: 'ai-ml', name: 'AI & Machine Learning', color: '#6366f1', nodeCount: 6 },
  { id: 'energy', name: 'Clean Energy', color: '#f59e0b', nodeCount: 5 },
  { id: 'medical', name: 'Medical Devices', color: '#ec4899', nodeCount: 4 },
  { id: 'quantum', name: 'Quantum Tech', color: '#8b5cf6', nodeCount: 3 },
]

export const mockGraphNodes: GraphNode[] = [
  { id: 'paper-001', label: 'CRISPR Gene Editing', cluster: 'biotech', clusterColor: '#10b981', relevance: 85, connections: ['paper-003', 'paper-005'] },
  { id: 'paper-003', label: 'mRNA Vaccine Platform', cluster: 'biotech', clusterColor: '#10b981', relevance: 95, connections: ['paper-001', 'paper-006'] },
  { id: 'n-biotech-1', label: 'CAR-T Cell Therapy', cluster: 'biotech', clusterColor: '#10b981', relevance: 72, connections: ['paper-001'] },
  { id: 'n-biotech-2', label: 'Synthetic Biology', cluster: 'biotech', clusterColor: '#10b981', relevance: 68, connections: ['paper-001', 'paper-005'] },
  { id: 'n-biotech-3', label: 'Protein Engineering', cluster: 'biotech', clusterColor: '#10b981', relevance: 65, connections: ['paper-003'] },
  { id: 'paper-006', label: 'AI Cancer Detection', cluster: 'medical', clusterColor: '#ec4899', relevance: 93, connections: ['paper-003', 'paper-004'] },
  { id: 'paper-004', label: 'Neural Interface', cluster: 'medical', clusterColor: '#ec4899', relevance: 88, connections: ['paper-006'] },
  { id: 'n-medical-1', label: 'Implantable Sensors', cluster: 'medical', clusterColor: '#ec4899', relevance: 65, connections: ['paper-004'] },
  { id: 'paper-002', label: 'Quantum Drug Discovery', cluster: 'quantum', clusterColor: '#8b5cf6', relevance: 72, connections: ['paper-004'] },
  { id: 'n-quantum-1', label: 'Quantum Cryptography', cluster: 'quantum', clusterColor: '#8b5cf6', relevance: 58, connections: ['paper-002'] },
  { id: 'paper-005', label: 'Algae Biofuel', cluster: 'energy', clusterColor: '#f59e0b', relevance: 76, connections: ['n-energy-1'] },
  { id: 'n-energy-1', label: 'Solar Cell Efficiency', cluster: 'energy', clusterColor: '#f59e0b', relevance: 82, connections: ['paper-005'] },
  { id: 'n-energy-2', label: 'Grid Storage', cluster: 'energy', clusterColor: '#f59e0b', relevance: 70, connections: ['n-energy-1'] },
]

export const mockGraphLinks: GraphLink[] = [
  { source: 'paper-001', target: 'paper-003', strength: 0.8, type: 'semantic' },
  { source: 'paper-001', target: 'paper-005', strength: 0.6, type: 'semantic' },
  { source: 'paper-003', target: 'paper-006', strength: 0.7, type: 'citation' },
  { source: 'paper-006', target: 'paper-004', strength: 0.5, type: 'semantic' },
  { source: 'paper-002', target: 'paper-004', strength: 0.6, type: 'semantic' },
  { source: 'paper-001', target: 'n-biotech-1', strength: 0.7, type: 'semantic' },
  { source: 'paper-001', target: 'n-biotech-2', strength: 0.5, type: 'semantic' },
  { source: 'paper-003', target: 'n-biotech-3', strength: 0.6, type: 'semantic' },
  { source: 'paper-005', target: 'n-biotech-2', strength: 0.4, type: 'semantic' },
  { source: 'paper-004', target: 'n-medical-1', strength: 0.8, type: 'citation' },
  { source: 'paper-002', target: 'n-quantum-1', strength: 0.4, type: 'semantic' },
  { source: 'paper-005', target: 'n-energy-1', strength: 0.5, type: 'semantic' },
  { source: 'n-energy-1', target: 'n-energy-2', strength: 0.7, type: 'citation' },
]

// Dashboard statistics
export const mockDashboardStats: DashboardStats = {
  totalPapers: 47,
  analyzedPapers: 42,
  avgTrlScore: 5.4,
  avgMarketScore: 53,
  highRiskCount: 8,
  recentActivity: [
    { id: 'act-1', type: 'analysis', paperId: 'paper-006', paperTitle: 'AI-Powered Diagnostic System', timestamp: new Date(Date.now() - 1000 * 60 * 30), description: 'Analysis completed' },
    { id: 'act-2', type: 'upload', paperId: 'paper-007', paperTitle: 'Solid-State Battery Architecture', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), description: 'Paper uploaded' },
    { id: 'act-3', type: 'view', paperId: 'paper-003', paperTitle: 'mRNA Vaccine Platform', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), description: 'Viewed analysis' },
    { id: 'act-4', type: 'export', paperId: 'paper-001', paperTitle: 'CRISPR Gene Editing', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), description: 'Report exported' },
    { id: 'act-5', type: 'analysis', paperId: 'paper-005', paperTitle: 'Sustainable Biofuel Production', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), description: 'Analysis completed' },
  ],
}

// Helper functions
export function getPaperById(id: string): Paper | undefined {
  return [...mockPapers, ...processingPapers].find(p => p.id === id)
}

export function getAnalyzedPapers(): Paper[] {
  return mockPapers.filter(p => p.status === 'analyzed')
}

export function getPapersByRisk(level: 'low' | 'medium' | 'high'): Paper[] {
  return mockPapers.filter(p => p.analysis?.riskLevel === level)
}

export function getTopPapersByTRL(count: number = 5): Paper[] {
  return [...mockPapers]
    .filter(p => p.analysis)
    .sort((a, b) => (b.analysis?.trlScore || 0) - (a.analysis?.trlScore || 0))
    .slice(0, count)
}

export function getTopPapersByMarket(count: number = 5): Paper[] {
  return [...mockPapers]
    .filter(p => p.analysis)
    .sort((a, b) => (b.analysis?.marketEvidence.marketValidationScore || 0) - (a.analysis?.marketEvidence.marketValidationScore || 0))
    .slice(0, count)
}

// ---------------------------------------------------------------------------
// Demo projects — shown to unauthenticated visitors
// ---------------------------------------------------------------------------
export const mockProjects: ResearchProject[] = [
  {
    id: 'proj-demo-001',
    name: 'Oncology Pipeline — Phase II',
    description: 'Tracking clinical evidence for immuno-oncology compounds across Phase II trials',
    domain: 'pharma_clinical',
    status: 'active',
    paperCount: 4,
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'proj-demo-002',
    name: 'CRISPR Therapeutic Applications',
    description: 'Consolidated view of gene-editing papers relevant to rare disease pipeline',
    domain: 'biotech',
    status: 'active',
    paperCount: 2,
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'proj-demo-003',
    name: 'Agro-Biopesticide R&D',
    description: 'EU/US regulatory pathway assessment for novel biopesticide candidates',
    domain: 'agro_health',
    status: 'archived',
    paperCount: 3,
    createdAt: '2023-11-01T00:00:00Z',
  },
]
