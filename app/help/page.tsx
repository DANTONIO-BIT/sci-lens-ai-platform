'use client'

import { AppLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function HelpPage() {
  return (
    <AppLayout title="Help">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help & Documentation</h1>
          <p className="text-muted-foreground">Learn how to use SciLens effectively</p>
        </div>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-medium">1. Upload a paper</h3>
              <p className="text-sm text-muted-foreground">
                Go to <Badge variant="secondary">Upload Paper</Badge> in the sidebar. Drag and drop a PDF file or click to browse. The system will automatically extract text, generate embeddings, and run AI analysis.
              </p>
              <Separator />
              <h3 className="font-medium">2. View analysis</h3>
              <p className="text-sm text-muted-foreground">
                Once processing is complete, click on any paper in your dashboard to see the full scorecard: TRL level, TAM estimate, risk factors, evidence quality, and regulatory pathway.
              </p>
              <Separator />
              <h3 className="font-medium">3. Create a research project</h3>
              <p className="text-sm text-muted-foreground">
                Go to <Badge variant="secondary">Projects</Badge> to create a new research initiative. Add papers to your project to see consolidated metrics: average TRL, total TAM, evidence distribution, and regulatory requirements.
              </p>
              <Separator />
              <h3 className="font-medium">4. Explore connections</h3>
              <p className="text-sm text-muted-foreground">
                The <Badge variant="secondary">Research Graph</Badge> shows semantic relationships between your papers based on content similarity. Nodes are colored by domain.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Understanding Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Understanding Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-medium">TRL (Technology Readiness Level)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Scale 1–9 measuring technology maturity. TRL 1–3: basic research. TRL 4–6: lab/pilot validation. TRL 7–9: operational/commercial stage. FDA and EMA commonly require TRL 6+ before regulatory submission.
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium">TAM (Total Addressable Market)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Estimated market size in USD billions derived by AI from references in the paper. Use as a directional signal, not a financial projection.
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium">Evidence Quality</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Hierarchy: Meta-analysis &gt; RCT &gt; Cohort &gt; Case-control &gt; In vivo &gt; In vitro &gt; In silico &gt; Review. Score 0–100 based on sample size adequacy, statistical rigor, and reproducibility signals.
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium">Risk Level</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Categorized as technical, market, regulatory, or competitive. High risk does not mean low value — it signals areas requiring deeper due diligence.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="q1">
                <AccordionTrigger>What PDF formats are supported?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Any standard PDF up to 50MB. The system extracts text using PyMuPDF. Scanned PDFs without OCR may not be fully processed.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>How long does analysis take?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Typically 30–90 seconds depending on paper length and API response times. You can continue using the app while processing runs in the background.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>Can I assign a paper to multiple projects?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes. Papers can belong to multiple research projects simultaneously. Use the project selector during upload or add papers from the project dashboard.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger>Is the TAM estimate reliable?</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  TAM estimates are generated by AI based on market references found in the paper text. They serve as directional indicators for market opportunity assessment, not as financial projections. Always validate with market research data.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
