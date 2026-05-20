import Link from 'next/link'
import { ArrowRight, Microscope, BarChart3, Network, Zap, Shield, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Microscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">SciLens</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button>
                Launch App
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-3.5 w-3.5" />
              AI-Powered Research Intelligence
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-balance">
              Transform Research Papers into{' '}
              <span className="text-primary">Actionable Intelligence</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl text-pretty">
              SciLens analyzes scientific papers in seconds, delivering TRL scores, 
              market potential estimates, and risk assessments. Make data-driven 
              decisions about emerging technologies.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/upload">
                <Button size="lg" className="text-base px-8">
                  Analyze Your First Paper
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="text-base px-8">
                  View Demo Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '47', label: 'Papers Analyzed', suffix: '+' },
              { value: '94', label: 'Analysis Accuracy', suffix: '%' },
              { value: '$318B', label: 'TAM Identified', suffix: '' },
              { value: '<30s', label: 'Analysis Time', suffix: '' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold tracking-tight text-foreground font-mono">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Enterprise-Grade Research Analysis
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for research teams, VCs, and R&D departments who need 
              fast, accurate assessments of scientific breakthroughs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart3,
                title: 'TRL & TAM Analysis',
                description: 'Automated Technology Readiness Level scoring and Total Addressable Market estimation with confidence intervals.',
              },
              {
                icon: Network,
                title: 'Research Network Graph',
                description: 'Visualize connections between papers, identify research clusters, and discover related work through semantic similarity.',
              },
              {
                icon: Shield,
                title: 'Risk Assessment',
                description: 'Comprehensive risk factor identification across technical, regulatory, market, and competitive dimensions.',
              },
              {
                icon: Clock,
                title: 'Real-Time Processing',
                description: 'Upload a PDF and receive complete analysis in under 30 seconds using advanced LLM-powered extraction.',
              },
              {
                icon: Zap,
                title: 'Key Findings Extraction',
                description: 'AI identifies and categorizes innovations, applications, limitations, and opportunities from each paper.',
              },
              {
                icon: Microscope,
                title: 'Methodology Scoring',
                description: 'Evaluate research quality with automated methodology classification and confidence scoring.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to accelerate your research analysis?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start analyzing papers today. No credit card required.
          </p>
          <Link href="/upload">
            <Button size="lg" className="text-base px-8">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Microscope className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">SciLens</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for the scientific community. Powered by AI.
          </p>
        </div>
      </footer>
    </div>
  )
}
