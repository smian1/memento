"""Daily Insights API - FastAPI Backend

A FastAPI application for managing daily insights from Limitless AI.
Provides CRUD operations, search functionality, and synchronization
with the Limitless AI API.

Features:
- RESTful API for all data types (insights, action items, decisions, etc.)
- Full-text search across all content
- Real-time sync with Limitless AI
- SQLite database with automatic schema management
- Interactive API documentation at /docs

Author: Limitless Insights Project
Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import database
import schemas
import crud
from sync_manager import SyncManager

# Create database tables on startup
# This ensures the SQLite database and all tables exist before handling requests
database.create_tables()

# Initialize FastAPI application with metadata for documentation
app = FastAPI(
    title="Daily Insights API",
    description="API for managing daily insights and structured data from Limitless AI",
    version="1.0.0",
    docs_url="/docs",  # Interactive API documentation
    redoc_url="/redoc"  # Alternative API documentation
)

# Initialize sync manager for Limitless AI integration
sync_manager = SyncManager()

@app.on_event("startup")
async def startup_event():
    """Check if automatic sync should run on startup"""
    try:
        # Get database session
        db = next(database.get_db())

        # Check if sync is needed
        sync_check = sync_manager.should_sync_today(db)

        if sync_check['should_sync']:
            print(f"🔄 Startup sync check: {sync_check['reason']}")
            print("⏳ Running automatic sync...")

            # Run sync in background (non-blocking)
            import threading

            def background_sync():
                try:
                    result = sync_manager.sync_with_tracking(force=False)
                    if result['success']:
                        print(f"✅ Startup sync completed successfully: {result.get('message', '')}")
                        if 'details' in result:
                            details = result['details']
                            print(f"   📊 {details['new_insights']} new, {details['updated_insights']} updated, {details['fetched_insights']} total processed")
                    else:
                        print(f"⚠️ Startup sync skipped: {result.get('message', '')}")
                except Exception as e:
                    print(f"❌ Startup sync failed: {str(e)}")

            # Run sync in background thread
            threading.Thread(target=background_sync, daemon=True).start()
        else:
            print(f"⏭️ Startup sync check: {sync_check['reason']}")

        db.close()
    except Exception as e:
        print(f"❌ Error during startup sync check: {str(e)}")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:5174",  # Vite dev server (alt port)
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get database session
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Daily Insights API", "version": "1.0.0"}

# Health check
@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Dashboard stats
@app.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db)

# Search endpoint
@app.get("/search", response_model=schemas.SearchResults)
def search_content(
    q: str = Query(..., description="Search query"),
    limit: int = Query(100, description="Maximum number of results"),
    db: Session = Depends(get_db)
):
    results = crud.search_all(db, q, limit)
    return schemas.SearchResults(**results)

# Insight endpoints
@app.get("/insights", response_model=List[schemas.Insight])
def get_insights(
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Number of items to return"),
    db: Session = Depends(get_db)
):
    return crud.get_insights(db, skip=skip, limit=limit)

@app.get("/insights/{insight_id}", response_model=schemas.Insight)
def get_insight(insight_id: int, db: Session = Depends(get_db)):
    insight = crud.get_insight(db, insight_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return insight

@app.get("/insights/date/{date}", response_model=schemas.Insight)
def get_insight_by_date(date: str, db: Session = Depends(get_db)):
    insight = crud.get_insight_by_date(db, date)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found for this date")
    return insight

@app.post("/insights", response_model=schemas.Insight)
def create_insight(insight: schemas.InsightCreate, db: Session = Depends(get_db)):
    # Check if insight for this date already exists
    existing = crud.get_insight_by_date(db, insight.date)
    if existing:
        raise HTTPException(status_code=400, detail="Insight for this date already exists")
    return crud.create_insight(db, insight)

@app.put("/insights/{insight_id}", response_model=schemas.Insight)
def update_insight(insight_id: int, insight_update: schemas.InsightUpdate, db: Session = Depends(get_db)):
    updated_insight = crud.update_insight(db, insight_id, insight_update)
    if not updated_insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    return updated_insight

# Action Item endpoints
@app.get("/action-items", response_model=List[schemas.ActionItem])
def get_action_items(
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Number of items to return"),
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    source: Optional[str] = Query(None, description="Filter by source (limitless/custom)"),
    tag_ids: Optional[str] = Query(None, description="Comma-separated tag IDs to filter by"),
    db: Session = Depends(get_db)
):
    # Parse tag_ids if provided
    parsed_tag_ids = None
    if tag_ids:
        try:
            parsed_tag_ids = [int(tag_id.strip()) for tag_id in tag_ids.split(",")]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid tag_ids format")

    return crud.get_action_items(db, skip=skip, limit=limit, completed=completed,
                                source=source, tag_ids=parsed_tag_ids)

@app.get("/action-items/{item_id}", response_model=schemas.ActionItem)
def get_action_item(item_id: int, db: Session = Depends(get_db)):
    item = crud.get_action_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    return item

@app.post("/action-items", response_model=schemas.ActionItem)
def create_action_item(item: schemas.ActionItemCreate, db: Session = Depends(get_db)):
    return crud.create_action_item(db, item)

@app.put("/action-items/{item_id}", response_model=schemas.ActionItem)
def update_action_item(item_id: int, item_update: schemas.ActionItemUpdate, db: Session = Depends(get_db)):
    updated_item = crud.update_action_item(db, item_id, item_update)
    if not updated_item:
        raise HTTPException(status_code=404, detail="Action item not found")
    return updated_item

@app.delete("/action-items/{item_id}")
def delete_action_item(item_id: int, db: Session = Depends(get_db)):
    success = crud.delete_action_item(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Action item not found")
    return {"message": "Action item deleted successfully"}

# Decision endpoints
@app.get("/decisions", response_model=List[schemas.Decision])
def get_decisions(
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Number of items to return"),
    db: Session = Depends(get_db)
):
    return crud.get_decisions(db, skip=skip, limit=limit)

@app.get("/decisions/{decision_id}", response_model=schemas.Decision)
def get_decision(decision_id: int, db: Session = Depends(get_db)):
    decision = crud.get_decision(db, decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision

@app.put("/decisions/{decision_id}", response_model=schemas.Decision)
def update_decision(decision_id: int, decision_update: schemas.DecisionUpdate, db: Session = Depends(get_db)):
    updated_decision = crud.update_decision(db, decision_id, decision_update)
    if not updated_decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return updated_decision

# Idea endpoints
@app.get("/ideas", response_model=List[schemas.Idea])
def get_ideas(
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Number of items to return"),
    db: Session = Depends(get_db)
):
    return crud.get_ideas(db, skip=skip, limit=limit)

@app.get("/ideas/{idea_id}", response_model=schemas.Idea)
def get_idea(idea_id: int, db: Session = Depends(get_db)):
    idea = crud.get_idea(db, idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea

@app.put("/ideas/{idea_id}", response_model=schemas.Idea)
def update_idea(idea_id: int, idea_update: schemas.IdeaUpdate, db: Session = Depends(get_db)):
    updated_idea = crud.update_idea(db, idea_id, idea_update)
    if not updated_idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return updated_idea

# Question endpoints
@app.get("/questions", response_model=List[schemas.Question])
def get_questions(
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Number of items to return"),
    resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    db: Session = Depends(get_db)
):
    return crud.get_questions(db, skip=skip, limit=limit, resolved=resolved)

@app.get("/questions/{question_id}", response_model=schemas.Question)
def get_question(question_id: int, db: Session = Depends(get_db)):
    question = crud.get_question(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@app.put("/questions/{question_id}", response_model=schemas.Question)
def update_question(question_id: int, question_update: schemas.QuestionUpdate, db: Session = Depends(get_db)):
    updated_question = crud.update_question(db, question_id, question_update)
    if not updated_question:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated_question

# Theme endpoints
@app.get("/themes", response_model=List[schemas.Theme])
def get_themes(
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Number of items to return"),
    db: Session = Depends(get_db)
):
    return crud.get_themes(db, skip=skip, limit=limit)

@app.get("/themes/{theme_id}", response_model=schemas.Theme)
def get_theme(theme_id: int, db: Session = Depends(get_db)):
    theme = crud.get_theme(db, theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme

@app.put("/themes/{theme_id}", response_model=schemas.Theme)
def update_theme(theme_id: int, theme_update: schemas.ThemeUpdate, db: Session = Depends(get_db)):
    updated_theme = crud.update_theme(db, theme_id, theme_update)
    if not updated_theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return updated_theme

# Quote endpoints
@app.get("/quotes", response_model=List[schemas.Quote])
def get_quotes(
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Number of items to return"),
    db: Session = Depends(get_db)
):
    return crud.get_quotes(db, skip=skip, limit=limit)

@app.get("/quotes/{quote_id}", response_model=schemas.Quote)
def get_quote(quote_id: int, db: Session = Depends(get_db)):
    quote = crud.get_quote(db, quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote

@app.put("/quotes/{quote_id}", response_model=schemas.Quote)
def update_quote(quote_id: int, quote_update: schemas.QuoteUpdate, db: Session = Depends(get_db)):
    updated_quote = crud.update_quote(db, quote_id, quote_update)
    if not updated_quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return updated_quote

# Highlight endpoints
@app.get("/highlights", response_model=List[schemas.Highlight])
def get_highlights(
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Number of items to return"),
    db: Session = Depends(get_db)
):
    return crud.get_highlights(db, skip=skip, limit=limit)

@app.get("/highlights/{highlight_id}", response_model=schemas.Highlight)
def get_highlight(highlight_id: int, db: Session = Depends(get_db)):
    highlight = crud.get_highlight(db, highlight_id)
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    return highlight

@app.put("/highlights/{highlight_id}", response_model=schemas.Highlight)
def update_highlight(highlight_id: int, highlight_update: schemas.HighlightUpdate, db: Session = Depends(get_db)):
    updated_highlight = crud.update_highlight(db, highlight_id, highlight_update)
    if not updated_highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    return updated_highlight

# Tag endpoints
@app.get("/tags", response_model=List[schemas.Tag])
def get_tags(
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Number of items to return"),
    db: Session = Depends(get_db)
):
    return crud.get_tags(db, skip=skip, limit=limit)

@app.get("/tags/{tag_id}", response_model=schemas.Tag)
def get_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = crud.get_tag(db, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag

@app.post("/tags", response_model=schemas.Tag)
def create_tag(tag: schemas.TagCreate, db: Session = Depends(get_db)):
    return crud.create_tag(db, tag)

@app.put("/tags/{tag_id}", response_model=schemas.Tag)
def update_tag(tag_id: int, tag_update: schemas.TagUpdate, db: Session = Depends(get_db)):
    updated_tag = crud.update_tag(db, tag_id, tag_update)
    if not updated_tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return updated_tag

@app.delete("/tags/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    success = crud.delete_tag(db, tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"message": "Tag deleted successfully"}

# Tag-ActionItem relationship endpoints
@app.post("/action-items/{item_id}/tags")
def add_tags_to_action_item(
    item_id: int,
    tag_operation: schemas.ActionItemTagOperation,
    db: Session = Depends(get_db)
):
    success = crud.add_tags_to_action_item(db, item_id, tag_operation.tag_ids)
    if not success:
        raise HTTPException(status_code=404, detail="Action item not found or invalid tag IDs")
    return {"message": "Tags added successfully"}

@app.delete("/action-items/{item_id}/tags/{tag_id}")
def remove_tag_from_action_item(item_id: int, tag_id: int, db: Session = Depends(get_db)):
    success = crud.remove_tag_from_action_item(db, item_id, tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag association not found")
    return {"message": "Tag removed successfully"}

@app.get("/action-items/{item_id}/tags", response_model=List[schemas.Tag])
def get_tags_for_action_item(item_id: int, db: Session = Depends(get_db)):
    # Verify action item exists
    action_item = crud.get_action_item(db, item_id)
    if not action_item:
        raise HTTPException(status_code=404, detail="Action item not found")
    return crud.get_tags_for_action_item(db, item_id)

@app.get("/tags/{tag_id}/action-items", response_model=List[schemas.ActionItem])
def get_action_items_by_tag(
    tag_id: int,
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Number of items to return"),
    db: Session = Depends(get_db)
):
    # Verify tag exists
    tag = crud.get_tag(db, tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return crud.get_action_items_by_tag(db, tag_id, skip=skip, limit=limit)

# Consolidated data endpoints
@app.get("/consolidated", response_model=schemas.ConsolidatedData)
def get_consolidated_data(db: Session = Depends(get_db)):
    action_items = crud.get_action_items(db, limit=1000)
    decisions = crud.get_decisions(db, limit=1000)
    ideas = crud.get_ideas(db, limit=1000)
    questions = crud.get_questions(db, limit=1000)
    themes = crud.get_themes(db, limit=1000)
    quotes = crud.get_quotes(db, limit=1000)
    highlights = crud.get_highlights(db, limit=1000)

    return schemas.ConsolidatedData(
        action_items=action_items,
        decisions=decisions,
        ideas=ideas,
        questions=questions,
        themes=themes,
        quotes=quotes,
        highlights=highlights
    )

# Sync endpoints
@app.get("/sync/status")
def get_sync_status(db: Session = Depends(get_db)):
    """Get current sync status and metadata"""
    try:
        sync_manager = SyncManager()
        status = sync_manager.get_sync_status(db)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking sync status: {str(e)}")

@app.post("/sync/run")
def run_sync(
    force: bool = Query(False, description="Force sync even if not needed"),
    db: Session = Depends(get_db)
):
    """Trigger a sync operation"""
    try:
        sync_manager = SyncManager()
        result = sync_manager.sync_with_tracking(force=force)

        if result.get('success'):
            return result
        else:
            # Return appropriate status codes based on the type of failure
            if result.get('skipped'):
                return result  # 200 OK for skipped sync
            elif result.get('in_progress'):
                raise HTTPException(status_code=409, detail=result['message'])
            else:
                raise HTTPException(status_code=500, detail=result['message'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running sync: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)