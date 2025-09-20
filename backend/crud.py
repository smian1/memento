from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime
from typing import List, Optional
import database
import schemas

# Insight CRUD operations
def get_insight(db: Session, insight_id: int):
    return db.query(database.Insight).filter(database.Insight.id == insight_id).first()

def get_insight_by_date(db: Session, date: str):
    return db.query(database.Insight).filter(database.Insight.date == date).first()

def get_insights(db: Session, skip: int = 0, limit: int = 100):
    return db.query(database.Insight).order_by(database.Insight.date.desc()).offset(skip).limit(limit).all()

def create_insight(db: Session, insight: schemas.InsightCreate):
    db_insight = database.Insight(**insight.dict())
    db.add(db_insight)
    db.commit()
    db.refresh(db_insight)
    return db_insight

def update_insight(db: Session, insight_id: int, insight_update: schemas.InsightUpdate):
    db_insight = get_insight(db, insight_id)
    if not db_insight:
        return None

    update_data = insight_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_insight, field, value)

    db.commit()
    db.refresh(db_insight)
    return db_insight

# Action Item CRUD operations
def get_action_items(db: Session, skip: int = 0, limit: int = 100, completed: Optional[bool] = None,
                    source: Optional[str] = None, tag_ids: Optional[List[int]] = None):
    query = db.query(database.ActionItem)

    if completed is not None:
        query = query.filter(database.ActionItem.completed == completed)

    if source is not None:
        query = query.filter(database.ActionItem.source == source)

    if tag_ids:
        # Filter by action items that have any of the specified tags
        query = query.join(database.action_item_tags).filter(
            database.action_item_tags.c.tag_id.in_(tag_ids)
        ).distinct()

    return query.order_by(database.ActionItem.date.desc()).offset(skip).limit(limit).all()

def get_action_item(db: Session, item_id: int):
    return db.query(database.ActionItem).filter(database.ActionItem.id == item_id).first()

def create_action_item(db: Session, item: schemas.ActionItemCreate, insight_id: Optional[int] = None):
    # Extract tag_ids before creating the item
    tag_ids = item.tag_ids if hasattr(item, 'tag_ids') else []
    item_data = item.dict(exclude={'tag_ids'})

    # Set insight_id if provided (for Limitless items), otherwise use the item's insight_id
    if insight_id is not None:
        item_data['insight_id'] = insight_id
        item_data['source'] = database.ActionItemSource.LIMITLESS

    db_item = database.ActionItem(**item_data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    # Add tags if provided
    if tag_ids:
        add_tags_to_action_item(db, db_item.id, tag_ids)

    return db_item

def update_action_item(db: Session, item_id: int, item_update: schemas.ActionItemUpdate):
    db_item = get_action_item(db, item_id)
    if not db_item:
        return None

    update_data = item_update.dict(exclude_unset=True)

    # Handle completion status change
    if "completed" in update_data:
        if update_data["completed"] and not db_item.completed:
            update_data["completed_at"] = datetime.utcnow()
        elif not update_data["completed"] and db_item.completed:
            update_data["completed_at"] = None

    for field, value in update_data.items():
        setattr(db_item, field, value)

    db.commit()
    db.refresh(db_item)
    return db_item

def delete_action_item(db: Session, item_id: int):
    db_item = get_action_item(db, item_id)
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False

# Decision CRUD operations
def get_decisions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(database.Decision).order_by(database.Decision.date.desc()).offset(skip).limit(limit).all()

def get_decision(db: Session, decision_id: int):
    return db.query(database.Decision).filter(database.Decision.id == decision_id).first()

def create_decision(db: Session, decision: schemas.DecisionCreate, insight_id: int, date: str):
    db_decision = database.Decision(**decision.dict(), insight_id=insight_id, date=date)
    db.add(db_decision)
    db.commit()
    db.refresh(db_decision)
    return db_decision

def update_decision(db: Session, decision_id: int, decision_update: schemas.DecisionUpdate):
    db_decision = get_decision(db, decision_id)
    if not db_decision:
        return None

    update_data = decision_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_decision, field, value)

    db.commit()
    db.refresh(db_decision)
    return db_decision

# Idea CRUD operations
def get_ideas(db: Session, skip: int = 0, limit: int = 100):
    return db.query(database.Idea).order_by(database.Idea.date.desc()).offset(skip).limit(limit).all()

def get_idea(db: Session, idea_id: int):
    return db.query(database.Idea).filter(database.Idea.id == idea_id).first()

def create_idea(db: Session, idea: schemas.IdeaCreate, insight_id: int, date: str):
    db_idea = database.Idea(**idea.dict(), insight_id=insight_id, date=date)
    db.add(db_idea)
    db.commit()
    db.refresh(db_idea)
    return db_idea

def update_idea(db: Session, idea_id: int, idea_update: schemas.IdeaUpdate):
    db_idea = get_idea(db, idea_id)
    if not db_idea:
        return None

    update_data = idea_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_idea, field, value)

    db.commit()
    db.refresh(db_idea)
    return db_idea

# Question CRUD operations
def get_questions(db: Session, skip: int = 0, limit: int = 100, resolved: Optional[bool] = None):
    query = db.query(database.Question)
    if resolved is not None:
        query = query.filter(database.Question.resolved == resolved)
    return query.order_by(database.Question.date.desc()).offset(skip).limit(limit).all()

def get_question(db: Session, question_id: int):
    return db.query(database.Question).filter(database.Question.id == question_id).first()

def create_question(db: Session, question: schemas.QuestionCreate, insight_id: int, date: str):
    db_question = database.Question(**question.dict(), insight_id=insight_id, date=date)
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def update_question(db: Session, question_id: int, question_update: schemas.QuestionUpdate):
    db_question = get_question(db, question_id)
    if not db_question:
        return None

    update_data = question_update.dict(exclude_unset=True)

    # Handle resolution status change
    if "resolved" in update_data:
        if update_data["resolved"] and not db_question.resolved:
            update_data["resolved_at"] = datetime.utcnow()
        elif not update_data["resolved"] and db_question.resolved:
            update_data["resolved_at"] = None

    for field, value in update_data.items():
        setattr(db_question, field, value)

    db.commit()
    db.refresh(db_question)
    return db_question

# Theme CRUD operations
def get_themes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(database.Theme).order_by(database.Theme.date.desc()).offset(skip).limit(limit).all()

def get_theme(db: Session, theme_id: int):
    return db.query(database.Theme).filter(database.Theme.id == theme_id).first()

def create_theme(db: Session, theme: schemas.ThemeCreate, insight_id: int, date: str):
    db_theme = database.Theme(**theme.dict(), insight_id=insight_id, date=date)
    db.add(db_theme)
    db.commit()
    db.refresh(db_theme)
    return db_theme

def update_theme(db: Session, theme_id: int, theme_update: schemas.ThemeUpdate):
    db_theme = get_theme(db, theme_id)
    if not db_theme:
        return None

    update_data = theme_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_theme, field, value)

    db.commit()
    db.refresh(db_theme)
    return db_theme

# Quote CRUD operations
def get_quotes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(database.Quote).order_by(database.Quote.date.desc()).offset(skip).limit(limit).all()

def get_quote(db: Session, quote_id: int):
    return db.query(database.Quote).filter(database.Quote.id == quote_id).first()

def create_quote(db: Session, quote: schemas.QuoteCreate, insight_id: int, date: str):
    db_quote = database.Quote(**quote.dict(), insight_id=insight_id, date=date)
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    return db_quote

def update_quote(db: Session, quote_id: int, quote_update: schemas.QuoteUpdate):
    db_quote = get_quote(db, quote_id)
    if not db_quote:
        return None

    update_data = quote_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_quote, field, value)

    db.commit()
    db.refresh(db_quote)
    return db_quote

# Highlight CRUD operations
def get_highlights(db: Session, skip: int = 0, limit: int = 100):
    return db.query(database.Highlight).order_by(database.Highlight.date.desc()).offset(skip).limit(limit).all()

def get_highlight(db: Session, highlight_id: int):
    return db.query(database.Highlight).filter(database.Highlight.id == highlight_id).first()

def create_highlight(db: Session, highlight: schemas.HighlightCreate, insight_id: int, date: str):
    db_highlight = database.Highlight(**highlight.dict(), insight_id=insight_id, date=date)
    db.add(db_highlight)
    db.commit()
    db.refresh(db_highlight)
    return db_highlight

def update_highlight(db: Session, highlight_id: int, highlight_update: schemas.HighlightUpdate):
    db_highlight = get_highlight(db, highlight_id)
    if not db_highlight:
        return None

    update_data = highlight_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_highlight, field, value)

    db.commit()
    db.refresh(db_highlight)
    return db_highlight

# Search operations
def search_all(db: Session, query: str, limit: int = 100):
    search_term = f"%{query}%"

    action_items = db.query(database.ActionItem).filter(
        database.ActionItem.content.like(search_term)
    ).limit(limit).all()

    decisions = db.query(database.Decision).filter(
        database.Decision.content.like(search_term)
    ).limit(limit).all()

    ideas = db.query(database.Idea).filter(
        database.Idea.content.like(search_term)
    ).limit(limit).all()

    questions = db.query(database.Question).filter(
        database.Question.content.like(search_term)
    ).limit(limit).all()

    themes = db.query(database.Theme).filter(
        or_(
            database.Theme.title.like(search_term),
            database.Theme.description.like(search_term)
        )
    ).limit(limit).all()

    quotes = db.query(database.Quote).filter(
        or_(
            database.Quote.text.like(search_term),
            database.Quote.speaker.like(search_term)
        )
    ).limit(limit).all()

    highlights = db.query(database.Highlight).filter(
        database.Highlight.content.like(search_term)
    ).limit(limit).all()

    insights = db.query(database.Insight).filter(
        database.Insight.content.like(search_term)
    ).limit(limit).all()

    return {
        "action_items": action_items,
        "decisions": decisions,
        "ideas": ideas,
        "questions": questions,
        "themes": themes,
        "quotes": quotes,
        "highlights": highlights,
        "insights": insights
    }

# Dashboard statistics
def get_dashboard_stats(db: Session):
    total_insights = db.query(database.Insight).count()
    total_action_items = db.query(database.ActionItem).count()
    completed_action_items = db.query(database.ActionItem).filter(database.ActionItem.completed == True).count()
    total_decisions = db.query(database.Decision).count()
    total_ideas = db.query(database.Idea).count()
    total_questions = db.query(database.Question).count()
    resolved_questions = db.query(database.Question).filter(database.Question.resolved == True).count()
    total_themes = db.query(database.Theme).count()
    total_quotes = db.query(database.Quote).count()
    total_highlights = db.query(database.Highlight).count()

    return {
        "total_insights": total_insights,
        "total_action_items": total_action_items,
        "completed_action_items": completed_action_items,
        "total_decisions": total_decisions,
        "total_ideas": total_ideas,
        "total_questions": total_questions,
        "resolved_questions": resolved_questions,
        "total_themes": total_themes,
        "total_quotes": total_quotes,
        "total_highlights": total_highlights
    }

# Sync Metadata CRUD operations
def get_latest_sync_metadata(db: Session):
    """Get the most recent sync metadata record"""
    return db.query(database.SyncMetadata).order_by(database.SyncMetadata.last_sync_at.desc()).first()

def create_sync_metadata(db: Session, sync_data: dict):
    """Create a new sync metadata record"""
    db_sync = database.SyncMetadata(**sync_data)
    db.add(db_sync)
    db.commit()
    db.refresh(db_sync)
    return db_sync

def update_sync_metadata(db: Session, sync_id: int, update_data: dict):
    """Update an existing sync metadata record"""
    db_sync = db.query(database.SyncMetadata).filter(database.SyncMetadata.id == sync_id).first()
    if not db_sync:
        return None

    for field, value in update_data.items():
        setattr(db_sync, field, value)

    # Update the timestamp
    db_sync.last_sync_at = datetime.utcnow()

    db.commit()
    db.refresh(db_sync)
    return db_sync

# Tag CRUD operations
def get_tags(db: Session, skip: int = 0, limit: int = 100):
    """Get all tags with pagination"""
    return db.query(database.Tag).order_by(database.Tag.name).offset(skip).limit(limit).all()

def get_tag(db: Session, tag_id: int):
    """Get a specific tag by ID"""
    return db.query(database.Tag).filter(database.Tag.id == tag_id).first()

def get_tag_by_name(db: Session, name: str):
    """Get a tag by name"""
    return db.query(database.Tag).filter(database.Tag.name == name).first()

def create_tag(db: Session, tag: schemas.TagCreate):
    """Create a new tag"""
    # Check if tag with this name already exists
    existing_tag = get_tag_by_name(db, tag.name)
    if existing_tag:
        return existing_tag

    db_tag = database.Tag(**tag.dict())
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag

def update_tag(db: Session, tag_id: int, tag_update: schemas.TagUpdate):
    """Update an existing tag"""
    db_tag = get_tag(db, tag_id)
    if not db_tag:
        return None

    update_data = tag_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_tag, field, value)

    db.commit()
    db.refresh(db_tag)
    return db_tag

def delete_tag(db: Session, tag_id: int):
    """Delete a tag and remove all associations"""
    db_tag = get_tag(db, tag_id)
    if db_tag:
        # Remove all tag associations first
        db.execute(
            database.action_item_tags.delete().where(
                database.action_item_tags.c.tag_id == tag_id
            )
        )
        db.delete(db_tag)
        db.commit()
        return True
    return False

# Tag-ActionItem relationship operations
def add_tags_to_action_item(db: Session, action_item_id: int, tag_ids: List[int]):
    """Add tags to an action item"""
    # Verify action item exists
    action_item = get_action_item(db, action_item_id)
    if not action_item:
        return False

    # Verify all tags exist
    existing_tags = db.query(database.Tag).filter(database.Tag.id.in_(tag_ids)).all()
    existing_tag_ids = [tag.id for tag in existing_tags]

    if len(existing_tag_ids) != len(tag_ids):
        return False  # Some tags don't exist

    # Remove existing associations for this action item
    db.execute(
        database.action_item_tags.delete().where(
            database.action_item_tags.c.action_item_id == action_item_id
        )
    )

    # Add new associations
    for tag_id in existing_tag_ids:
        db.execute(
            database.action_item_tags.insert().values(
                action_item_id=action_item_id,
                tag_id=tag_id
            )
        )

    db.commit()
    return True

def remove_tag_from_action_item(db: Session, action_item_id: int, tag_id: int):
    """Remove a specific tag from an action item"""
    result = db.execute(
        database.action_item_tags.delete().where(
            and_(
                database.action_item_tags.c.action_item_id == action_item_id,
                database.action_item_tags.c.tag_id == tag_id
            )
        )
    )
    db.commit()
    return result.rowcount > 0

def get_action_items_by_tag(db: Session, tag_id: int, skip: int = 0, limit: int = 100):
    """Get all action items with a specific tag"""
    return db.query(database.ActionItem).join(database.action_item_tags).filter(
        database.action_item_tags.c.tag_id == tag_id
    ).order_by(database.ActionItem.date.desc()).offset(skip).limit(limit).all()

def get_tags_for_action_item(db: Session, action_item_id: int):
    """Get all tags for a specific action item"""
    return db.query(database.Tag).join(database.action_item_tags).filter(
        database.action_item_tags.c.action_item_id == action_item_id
    ).order_by(database.Tag.name).all()