"use client";

/* ═══════════════════════════════════════════════════════
   A-04 · Icons — FDS Section 3.1
   Library: Lucide Icons (included with shadcn/ui)
   Sizes: 16px (inline), 20px (buttons), 24px (nav), 32px (empty states)
   Stroke width: 1.5px for all icons
   Color: currentColor (inherits from parent)
   ═══════════════════════════════════════════════════════ */

export {
  Search,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Download,
  Clock,
  Bell,
  Star,
  ExternalLink,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Info,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  LogOut,
  Settings,
  BarChart3,
  Package,
  PackageX,
  SearchX,
  WifiOff,
  Menu,
  Trash2,
  MoreHorizontal,
  Copy,
  Share2,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/** Standard icon sizes per FDS */
export const ICON_SIZE = {
  /** Inline with text */
  inline: 16,
  /** Buttons and inputs */
  button: 20,
  /** Navigation */
  nav: 24,
  /** Empty states / illustrations */
  empty: 32,
  /** Large illustrations */
  hero: 48,
} as const;

/** Standard stroke width per FDS: 1.5px */
export const ICON_STROKE_WIDTH = 1.5;
