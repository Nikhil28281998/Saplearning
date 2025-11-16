import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Hero } from '@/components/home/hero';
import { SearchSection } from '@/components/home/search-section';
import { FeaturesSection } from '@/components/home/features-section';
import { PopularResources } from '@/components/home/popular-resources';
import { Footer } from '@/components/layout/footer';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Suspense fallback={<div className="container py-8">Loading...</div>}>
          <SearchSection />
        </Suspense>
        <FeaturesSection />
        <PopularResources />
      </main>
      <Footer />
    </div>
  );
}
