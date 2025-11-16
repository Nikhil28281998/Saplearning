'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, Menu, User, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="text-lg font-bold">S</span>
          </div>
          <span className="hidden font-bold sm:inline-block">
            SAP ULHN
          </span>
        </Link>

        {/* Navigation */}
        <nav className="ml-8 hidden items-center space-x-6 text-sm font-medium md:flex">
          <Link
            href="/search"
            className={`transition-colors hover:text-foreground/80 ${
              pathname === '/search' ? 'text-foreground' : 'text-foreground/60'
            }`}
          >
            Search
          </Link>
          <Link
            href="/modules"
            className={`transition-colors hover:text-foreground/80 ${
              pathname === '/modules' ? 'text-foreground' : 'text-foreground/60'
            }`}
          >
            Modules
          </Link>
          <Link
            href="/processes"
            className={`transition-colors hover:text-foreground/80 ${
              pathname === '/processes' ? 'text-foreground' : 'text-foreground/60'
            }`}
          >
            Processes
          </Link>
          <Link
            href="/roles"
            className={`transition-colors hover:text-foreground/80 ${
              pathname === '/roles' ? 'text-foreground' : 'text-foreground/60'
            }`}
          >
            Roles
          </Link>
        </nav>

        {/* Right Side */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Search Button */}
          <Button variant="outline" size="icon" asChild>
            <Link href="/search">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>

          {/* User Menu */}
          <Button variant="outline" size="icon">
            <User className="h-5 w-5" />
            <span className="sr-only">User menu</span>
          </Button>

          {/* Mobile Menu */}
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
