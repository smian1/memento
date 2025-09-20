from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum

DATABASE_URL = "sqlite:///./insights.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class ActionItemSource(enum.Enum):
    LIMITLESS = "LIMITLESS"
    CUSTOM = "CUSTOM"

# Association table for many-to-many relationship between action items and tags
action_item_tags = Table(
    'action_item_tags',
    Base.metadata,
    Column('action_item_id', Integer, ForeignKey('action_items.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)

class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, unique=True, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    action_items = relationship("ActionItem", back_populates="insight", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="insight", cascade="all, delete-orphan")
    ideas = relationship("Idea", back_populates="insight", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="insight", cascade="all, delete-orphan")
    themes = relationship("Theme", back_populates="insight", cascade="all, delete-orphan")
    quotes = relationship("Quote", back_populates="insight", cascade="all, delete-orphan")
    highlights = relationship("Highlight", back_populates="insight", cascade="all, delete-orphan")

class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("insights.id"), nullable=True)  # Made nullable for custom items
    date = Column(String, index=True)
    content = Column(Text)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    source = Column(Enum(ActionItemSource), default=ActionItemSource.LIMITLESS, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    insight = relationship("Insight", back_populates="action_items")
    tags = relationship("Tag", secondary=action_item_tags, back_populates="action_items")

class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("insights.id"))
    date = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    insight = relationship("Insight", back_populates="decisions")

class Idea(Base):
    __tablename__ = "ideas"

    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("insights.id"))
    date = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    insight = relationship("Insight", back_populates="ideas")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("insights.id"))
    date = Column(String, index=True)
    content = Column(Text)
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    insight = relationship("Insight", back_populates="questions")

class Theme(Base):
    __tablename__ = "themes"

    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("insights.id"))
    date = Column(String, index=True)
    title = Column(String)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    insight = relationship("Insight", back_populates="themes")

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("insights.id"))
    date = Column(String, index=True)
    text = Column(Text)
    speaker = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    insight = relationship("Insight", back_populates="quotes")

class Highlight(Base):
    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(Integer, ForeignKey("insights.id"))
    date = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    insight = relationship("Insight", back_populates="highlights")

class SyncMetadata(Base):
    __tablename__ = "sync_metadata"

    id = Column(Integer, primary_key=True, index=True)
    last_sync_at = Column(DateTime, default=datetime.utcnow)
    last_sync_status = Column(String, default="success")  # success, error, in_progress
    insights_fetched = Column(Integer, default=0)
    insights_updated = Column(Integer, default=0)
    insights_added = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    color = Column(String, default="#667eea")  # Default purple color
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    action_items = relationship("ActionItem", secondary=action_item_tags, back_populates="tags")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables
def create_tables():
    Base.metadata.create_all(bind=engine)