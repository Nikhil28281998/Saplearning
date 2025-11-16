// ============================================
// Enums
// ============================================

export enum UserRole {
  ANONYMOUS = 'anonymous',
  REGISTERED = 'registered',
  PREMIUM = 'premium',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum ResourceType {
  DEMO = 'demo',
  COURSE = 'course',
  VIDEO = 'video',
  PDF = 'pdf',
  ARTICLE = 'article',
  FIORI_APP = 'fiori_app',
  OTHER = 'other',
}

export enum ResourceSource {
  SAP_LEARNING = 'sap_learning',
  SAP_ENABLE_NOW = 'sap_enable_now',
  SAP_HELP_PORTAL = 'sap_help_portal',
  FIORI_APPS_LIBRARY = 'fiori_apps_library',
  SAP_COMMUNITY = 'sap_community',
  YOUTUBE = 'youtube',
  GITHUB = 'github',
  OTHER = 'other',
}

export enum CrawlerStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AnalyticsEventType {
  PAGE_VIEW = 'page_view',
  SEARCH = 'search',
  RESOURCE_VIEW = 'resource_view',
  RESOURCE_CLICK = 'resource_click',
  FAVORITE_ADD = 'favorite_add',
  PLAYLIST_CREATE = 'playlist_create',
  NOTE_CREATE = 'note_create',
  USER_REGISTER = 'user_register',
  USER_LOGIN = 'user_login',
}

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  favoriteModules: string[];
  favoriteRoles: string[];
  emailNotifications: boolean;
  searchHistory: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Resource Types
// ============================================

export interface Resource {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: ResourceType;
  source: ResourceSource;
  thumbnailUrl?: string;
  duration?: number;
  difficulty?: string;
  language?: string;
  fioriAppId?: string;
  tCode?: string;
  version?: string;
  publishedAt?: Date;
  viewCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Module {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Process {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Personalization Types
// ============================================

export interface Favorite {
  id: string;
  userId: string;
  resourceId: string;
  resource?: Resource;
  createdAt: Date;
}

export interface Playlist {
  id: string;
  userId: string;
  title: string;
  description?: string;
  isPublic: boolean;
  shareToken?: string;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  resourceId: string;
  resource?: Resource;
  order: number;
  createdAt: Date;
}

export interface Note {
  id: string;
  userId: string;
  resourceId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface History {
  id: string;
  userId: string;
  resourceId: string;
  resource?: Resource;
  viewedAt: Date;
}

// ============================================
// Search Types
// ============================================

export interface SearchFilters {
  query?: string;
  type?: ResourceType[];
  source?: ResourceSource[];
  modules?: string[];
  processes?: string[];
  roles?: string[];
  tags?: string[];
  difficulty?: string[];
  language?: string[];
  fioriAppId?: string;
  tCode?: string;
}

export interface SearchResult {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  results: Resource[];
  facets?: {
    types?: Record<string, number>;
    sources?: Record<string, number>;
    modules?: Record<string, number>;
    processes?: Record<string, number>;
    roles?: Record<string, number>;
    difficulty?: Record<string, number>;
  };
}

// ============================================
// Auth Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface OAuthProvider {
  id: string;
  userId: string;
  provider: 'google' | 'microsoft';
  providerId: string;
  email: string;
  createdAt: Date;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Crawler Types
// ============================================

export interface Crawler {
  id: string;
  name: string;
  source: ResourceSource;
  url: string;
  schedule: string;
  status: CrawlerStatus;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawlerLog {
  id: string;
  crawlerId: string;
  status: CrawlerStatus;
  startedAt: Date;
  completedAt?: Date;
  resourcesFound: number;
  resourcesCreated: number;
  resourcesUpdated: number;
  errors?: string;
  createdAt: Date;
}

// ============================================
// Analytics Types
// ============================================

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  sessionId?: string;
  eventType: AnalyticsEventType;
  resourceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalResources: number;
  totalSearches: number;
  popularResources: Array<{ resource: Resource; viewCount: number }>;
  recentActivity: AnalyticsEvent[];
}
