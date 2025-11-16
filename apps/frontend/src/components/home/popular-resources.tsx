import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star } from 'lucide-react';
import Link from 'next/link';

// Mock data - will be replaced with real API data
const popularResources = [
  {
    id: '1',
    title: 'Introduction to SAP Fiori',
    description: 'Learn the basics of SAP Fiori UX and app development',
    type: 'Course',
    source: 'SAP Learning',
    views: 5234,
  },
  {
    id: '2',
    title: 'SAP S/4HANA Finance Overview',
    description: 'Comprehensive guide to S/4HANA Finance module',
    type: 'Demo',
    source: 'Enable Now',
    views: 4102,
  },
  {
    id: '3',
    title: 'Material Master Data Management',
    description: 'Best practices for managing material master in SAP MM',
    type: 'Article',
    source: 'SAP Help',
    views: 3845,
  },
  {
    id: '4',
    title: 'Order-to-Cash Process in SAP SD',
    description: 'End-to-end O2C process walkthrough',
    type: 'Video',
    source: 'YouTube',
    views: 3201,
  },
];

export function PopularResources() {
  return (
    <section className="container py-16 md:py-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Popular Resources
          </h2>
          <p className="mt-2 text-muted-foreground">
            Most viewed SAP learning content this month
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/search">View All</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {popularResources.map((resource) => (
          <Card key={resource.id} className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>{resource.type}</span>
                <div className="flex items-center">
                  <Star className="mr-1 h-3 w-3" />
                  <span>{resource.views.toLocaleString()}</span>
                </div>
              </div>
              <CardTitle className="line-clamp-2">{resource.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {resource.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/resources/${resource.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Resource
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
