import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Search, Star, Layers, Map, Shield } from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'Unified Search',
    description: 'Search across 8+ SAP learning sources in one place with instant results.',
  },
  {
    icon: Layers,
    title: 'Module Navigation',
    description: 'Browse by SAP modules (FI, CO, MM, SD) with organized learning paths.',
  },
  {
    icon: Map,
    title: 'Process-Based Learning',
    description: 'Find resources organized by business processes like P2P, O2C, R2R.',
  },
  {
    icon: Shield,
    title: 'Role-Specific Content',
    description: 'Get personalized content recommendations based on your SAP role.',
  },
  {
    icon: Star,
    title: 'Personal Workspace',
    description: 'Save favorites, create playlists, and take notes on resources.',
  },
  {
    icon: BookOpen,
    title: 'Always Updated',
    description: 'Automatic crawlers keep content fresh with weekly updates from SAP.',
  },
];

export function FeaturesSection() {
  return (
    <section className="container py-16 md:py-24">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Everything You Need to Master SAP
        </h2>
        <p className="max-w-[700px] text-muted-foreground md:text-lg">
          Powerful features designed to make SAP learning easier and more organized.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
