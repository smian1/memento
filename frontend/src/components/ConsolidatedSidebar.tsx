import {
  CheckSquare,
  Star,
  Target,
  Lightbulb,
  HelpCircle,
  Bookmark,
  MessageSquare,
  Calendar,
  Clock,
  Brain,
  Users2
} from 'lucide-react';
import { type DashboardStats } from '../api/client';

type SectionType =
  | 'daily'
  | 'lifelogs'
  | 'highlights'
  | 'action_items'
  | 'decisions'
  | 'ideas'
  | 'questions'
  | 'themes'
  | 'quotes'
  | 'knowledge_nuggets'
  | 'memorable_exchanges';

interface ConsolidatedSidebarProps {
  stats: DashboardStats | null;
  activeSection: SectionType | null;
  onSectionSelect: (section: SectionType) => void;
  layout?: 'sidebar' | 'tabs';
}

export function ConsolidatedSidebar({ stats, activeSection, onSectionSelect, layout = 'sidebar' }: ConsolidatedSidebarProps) {
  const sections = [
    {
      id: 'lifelogs' as SectionType,
      title: 'Life Logs',
      icon: Clock,
      count: stats?.total_lifelogs || 0,
    },
    {
      id: 'daily' as SectionType,
      title: 'Daily',
      icon: Calendar,
      count: 0,
    },
    {
      id: 'action_items' as SectionType,
      title: 'Action Items',
      icon: CheckSquare,
      count: stats ? (stats.total_action_items - stats.completed_action_items) : 0,
    },
    {
      id: 'highlights' as SectionType,
      title: 'Top Highlights',
      icon: Star,
      count: stats?.total_highlights || 0,
    },
    {
      id: 'decisions' as SectionType,
      title: 'Decisions',
      icon: Target,
      count: stats?.total_decisions || 0,
    },
    {
      id: 'ideas' as SectionType,
      title: 'Ideas',
      icon: Lightbulb,
      count: stats?.total_ideas || 0,
    },
    {
      id: 'questions' as SectionType,
      title: 'Questions',
      icon: HelpCircle,
      count: stats?.total_questions || 0,
    },
    {
      id: 'themes' as SectionType,
      title: 'Themes',
      icon: Bookmark,
      count: stats?.total_themes || 0,
    },
    {
      id: 'quotes' as SectionType,
      title: 'Quotes',
      icon: MessageSquare,
      count: stats?.total_quotes || 0,
    },
    {
      id: 'knowledge_nuggets' as SectionType,
      title: 'Knowledge Nuggets',
      icon: Brain,
      count: stats?.total_knowledge_nuggets || 0,
    },
    {
      id: 'memorable_exchanges' as SectionType,
      title: 'Memorable Exchanges',
      icon: Users2,
      count: stats?.total_memorable_exchanges || 0,
    },
  ];

  return (
    <div className={`consolidated-sections ${layout === 'tabs' ? 'tabs-layout' : 'sidebar-layout'}`}>
      {sections.map(section => {
        const IconComponent = section.icon;
        return (
          <button
            key={section.id}
            className={`section-button ${layout === 'tabs' ? 'section-tab' : ''} ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => onSectionSelect(section.id)}
          >
            <div className="section-button-content">
              <IconComponent size={layout === 'tabs' ? 16 : 18} className="section-icon" />
              <span className="section-title">{section.title}</span>
            </div>
            {/* Only show count badge for Action Items */}
            {section.id === 'action_items' && (
              <span className="badge">{section.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}