import { Button } from '@/components/ui/button';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="container flex flex-col items-center gap-8 py-16 md:py-24 lg:py-32">
      <div className="flex max-w-[980px] flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tighter md:text-6xl lg:text-7xl lg:leading-[1.1]">
          Your Unified Hub for{' '}
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            SAP Learning
          </span>
        </h1>
        <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
          Search across all SAP learning resources in one place. Find demos, courses, documentation, and Fiori apps instantly.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Button size="lg" asChild>
          <Link href="/search">
            <SearchIcon className="mr-2 h-5 w-5" />
            Start Searching
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/modules">
            Explore Modules
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="flex flex-col items-center">
          <p className="text-4xl font-bold">10K+</p>
          <p className="text-sm text-muted-foreground">Learning Resources</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-4xl font-bold">15+</p>
          <p className="text-sm text-muted-foreground">SAP Modules</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-4xl font-bold">8</p>
          <p className="text-sm text-muted-foreground">Content Sources</p>
        </div>
      </div>
    </section>
  );
}
