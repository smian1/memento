from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum

class ActionItemSource(str, Enum):
    LIMITLESS = "LIMITLESS"
    CUSTOM = "CUSTOM"

# Tag schemas
class TagBase(BaseModel):
    name: str
    color: Optional[str] = "#667eea"

class TagCreate(TagBase):
    pass

class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class Tag(TagBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Base schemas
class ActionItemBase(BaseModel):
    content: str
    completed: Optional[bool] = False

class ActionItemCreate(ActionItemBase):
    date: str  # Required for custom action items
    source: Optional[ActionItemSource] = ActionItemSource.CUSTOM
    insight_id: Optional[int] = None
    tag_ids: Optional[List[int]] = []

class ActionItemUpdate(BaseModel):
    content: Optional[str] = None
    completed: Optional[bool] = None

class ActionItem(ActionItemBase):
    id: int
    date: str
    source: ActionItemSource
    insight_id: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    edited_at: datetime
    tags: List[Tag] = []

    class Config:
        from_attributes = True

class DecisionBase(BaseModel):
    content: str

class DecisionCreate(DecisionBase):
    pass

class DecisionUpdate(BaseModel):
    content: Optional[str] = None

class Decision(DecisionBase):
    id: int
    date: str
    created_at: datetime
    edited_at: datetime

    class Config:
        from_attributes = True

class IdeaBase(BaseModel):
    content: str

class IdeaCreate(IdeaBase):
    pass

class IdeaUpdate(BaseModel):
    content: Optional[str] = None

class Idea(IdeaBase):
    id: int
    date: str
    created_at: datetime
    edited_at: datetime

    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    content: str
    resolved: Optional[bool] = False

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    content: Optional[str] = None
    resolved: Optional[bool] = None

class Question(QuestionBase):
    id: int
    date: str
    resolved_at: Optional[datetime] = None
    created_at: datetime
    edited_at: datetime

    class Config:
        from_attributes = True

class ThemeBase(BaseModel):
    title: str
    description: str

class ThemeCreate(ThemeBase):
    pass

class ThemeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class Theme(ThemeBase):
    id: int
    date: str
    created_at: datetime
    edited_at: datetime

    class Config:
        from_attributes = True

class QuoteBase(BaseModel):
    text: str
    speaker: str

class QuoteCreate(QuoteBase):
    pass

class QuoteUpdate(BaseModel):
    text: Optional[str] = None
    speaker: Optional[str] = None

class Quote(QuoteBase):
    id: int
    date: str
    created_at: datetime
    edited_at: datetime

    class Config:
        from_attributes = True

class HighlightBase(BaseModel):
    content: str

class HighlightCreate(HighlightBase):
    pass

class HighlightUpdate(BaseModel):
    content: Optional[str] = None

class Highlight(HighlightBase):
    id: int
    date: str
    created_at: datetime
    edited_at: datetime

    class Config:
        from_attributes = True

class InsightBase(BaseModel):
    date: str
    content: str

class InsightCreate(InsightBase):
    pass

class InsightUpdate(BaseModel):
    content: Optional[str] = None

class Insight(InsightBase):
    id: int
    created_at: datetime
    updated_at: datetime
    action_items: List[ActionItem] = []
    decisions: List[Decision] = []
    ideas: List[Idea] = []
    questions: List[Question] = []
    themes: List[Theme] = []
    quotes: List[Quote] = []
    highlights: List[Highlight] = []

    class Config:
        from_attributes = True

# Response schemas for aggregated data
class ConsolidatedData(BaseModel):
    action_items: List[ActionItem]
    decisions: List[Decision]
    ideas: List[Idea]
    questions: List[Question]
    themes: List[Theme]
    quotes: List[Quote]
    highlights: List[Highlight]

class SearchResults(BaseModel):
    action_items: List[ActionItem] = []
    decisions: List[Decision] = []
    ideas: List[Idea] = []
    questions: List[Question] = []
    themes: List[Theme] = []
    quotes: List[Quote] = []
    highlights: List[Highlight] = []
    insights: List[Insight] = []

class DashboardStats(BaseModel):
    total_insights: int
    total_action_items: int
    completed_action_items: int
    total_decisions: int
    total_ideas: int
    total_questions: int
    resolved_questions: int
    total_themes: int
    total_quotes: int
    total_highlights: int

# Tag operation schemas
class ActionItemTagOperation(BaseModel):
    tag_ids: List[int]

class TagsResponse(BaseModel):
    tags: List[Tag]

class ActionItemFilters(BaseModel):
    source: Optional[ActionItemSource] = None
    tag_ids: Optional[List[int]] = None
    completed: Optional[bool] = None
    skip: Optional[int] = 0
    limit: Optional[int] = 100