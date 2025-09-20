import os
import requests
import sys
from datetime import datetime
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add the current directory to path to import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import database
import schemas
import crud
from data_extraction import extract_structured_data

load_dotenv(dotenv_path='../.env')

class LimitlessSync:
    def __init__(self):
        self.api_key = os.getenv('LIMITLESS_API_KEY')
        if not self.api_key:
            raise ValueError("LIMITLESS_API_KEY not found in environment variables")

        self.headers = {'X-API-Key': self.api_key}
        self.base_url = 'https://api.limitless.ai/v1'

    def fetch_daily_insights(self, limit: int = 200):
        """Fetch daily insights from Limitless API"""
        url = f'{self.base_url}/chats'
        params = {'limit': limit, 'direction': 'desc'}

        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()

            data = response.json()
            chats = data.get('data', {}).get('chats', [])

            # Filter for Daily insights chats
            daily_insights = [chat for chat in chats if chat.get('summary') == 'Daily insights']

            return daily_insights

        except requests.exceptions.RequestException as e:
            print(f"Error fetching chats: {e}")
            raise

    def sync_to_database(self, dry_run: bool = False):
        """Sync new insights from Limitless API to database"""

        if not dry_run:
            # Create database tables if they don't exist
            database.create_tables()

        # Get database session
        db = next(database.get_db())

        try:
            # Fetch insights from API
            print("Fetching daily insights from Limitless API...")
            daily_insights = self.fetch_daily_insights()
            print(f"Found {len(daily_insights)} daily insights from API")

            new_insights = []
            updated_insights = []
            skipped_insights = []

            for chat in daily_insights:
                created_at = chat.get('createdAt', 'No date')
                date_str = created_at[:10]  # Extract YYYY-MM-DD

                print(f"Processing Daily Insights - {date_str}")

                # Check if insight already exists
                existing_insight = crud.get_insight_by_date(db, date_str)

                # Extract content from messages
                messages = chat.get('messages', [])
                content = None

                for message in messages:
                    user_info = message.get('user', {})
                    role = user_info.get('role', 'unknown')

                    if role == 'assistant':
                        content = message.get('text', '')
                        if content:
                            break

                if not content:
                    print(f"  ⚠️ No content found for {date_str}, skipping")
                    skipped_insights.append(date_str)
                    continue

                if existing_insight:
                    # Check if content has changed
                    if existing_insight.content != content:
                        if not dry_run:
                            # Update existing insight
                            insight_update = schemas.InsightUpdate(content=content)
                            crud.update_insight(db, existing_insight.id, insight_update)

                            # Re-extract and update structured data
                            self._update_structured_data(db, existing_insight.id, content, date_str)

                        updated_insights.append(date_str)
                        print(f"  ✓ Updated insight for {date_str}")
                    else:
                        print(f"  ⏭️ No changes for {date_str}")
                        skipped_insights.append(date_str)
                else:
                    # Create new insight
                    if not dry_run:
                        insight_data = schemas.InsightCreate(date=date_str, content=content)
                        db_insight = crud.create_insight(db, insight_data)

                        # Extract and create structured data
                        self._create_structured_data(db, db_insight.id, content, date_str)

                    new_insights.append(date_str)
                    print(f"  ✓ Created new insight for {date_str}")

            # Print summary
            print(f"\n=== Sync Summary ===")
            print(f"New insights: {len(new_insights)}")
            print(f"Updated insights: {len(updated_insights)}")
            print(f"Skipped insights: {len(skipped_insights)}")

            if dry_run:
                print("\n⚠️ DRY RUN - No changes were made to the database")
            else:
                # Print final stats
                stats = crud.get_dashboard_stats(db)
                print(f"\nDatabase now contains:")
                print(f"  Total insights: {stats['total_insights']}")
                print(f"  Total action items: {stats['total_action_items']}")
                print(f"  Total decisions: {stats['total_decisions']}")

            return {
                'new_insights': new_insights,
                'updated_insights': updated_insights,
                'skipped_insights': skipped_insights
            }

        finally:
            db.close()

    def _create_structured_data(self, db: Session, insight_id: int, content: str, date: str):
        """Extract and create structured data for a new insight"""
        structured_data = extract_structured_data(content, date)

        # Create action items
        for item_content in structured_data['action_items']:
            item_data = schemas.ActionItemCreate(content=item_content, date=date)
            crud.create_action_item(db, item_data, insight_id)

        # Create decisions
        for decision_content in structured_data['decisions']:
            decision_data = schemas.DecisionCreate(content=decision_content)
            crud.create_decision(db, decision_data, insight_id, date)

        # Create ideas
        for idea_content in structured_data['ideas']:
            idea_data = schemas.IdeaCreate(content=idea_content)
            crud.create_idea(db, idea_data, insight_id, date)

        # Create questions
        for question_content in structured_data['unresolved_questions']:
            question_data = schemas.QuestionCreate(content=question_content)
            crud.create_question(db, question_data, insight_id, date)

        # Create themes
        for theme in structured_data['recurring_themes']:
            theme_data = schemas.ThemeCreate(title=theme['title'], description=theme['description'])
            crud.create_theme(db, theme_data, insight_id, date)

        # Create quotes
        for quote in structured_data['quotes']:
            quote_data = schemas.QuoteCreate(text=quote['text'], speaker=quote['speaker'])
            crud.create_quote(db, quote_data, insight_id, date)

        # Create highlights
        for highlight_content in structured_data['top_highlights']:
            highlight_data = schemas.HighlightCreate(content=highlight_content)
            crud.create_highlight(db, highlight_data, insight_id, date)

    def _update_structured_data(self, db: Session, insight_id: int, content: str, date: str):
        """Re-extract and update structured data for an existing insight while preserving completion status"""
        insight = crud.get_insight(db, insight_id)
        if insight:
            # Store completed action items before deletion
            completed_items = {}
            for item in insight.action_items:
                if item.completed:
                    # Use content as key to match after recreation
                    completed_items[item.content] = {
                        'completed': item.completed,
                        'completed_at': item.completed_at
                    }

            # Delete all related items
            for item in insight.action_items:
                db.delete(item)
            for item in insight.decisions:
                db.delete(item)
            for item in insight.ideas:
                db.delete(item)
            for item in insight.questions:
                db.delete(item)
            for item in insight.themes:
                db.delete(item)
            for item in insight.quotes:
                db.delete(item)
            for item in insight.highlights:
                db.delete(item)
            db.commit()

            # Re-create structured data
            self._create_structured_data(db, insight_id, content, date)

            # Restore completion status for matching action items
            if completed_items:
                # Refresh insight to get newly created action items
                db.refresh(insight)
                for item in insight.action_items:
                    if item.content in completed_items:
                        item.completed = completed_items[item.content]['completed']
                        item.completed_at = completed_items[item.content]['completed_at']

                db.commit()
        else:
            # Re-create structured data
            self._create_structured_data(db, insight_id, content, date)

def main():
    """Command line interface for sync operations"""
    import argparse

    parser = argparse.ArgumentParser(description="Sync daily insights from Limitless API")
    parser.add_argument('--dry-run', action='store_true', help="Run sync without making changes")
    parser.add_argument('--limit', type=int, default=200, help="Number of chats to fetch from API")

    args = parser.parse_args()

    try:
        sync = LimitlessSync()
        result = sync.sync_to_database(dry_run=args.dry_run)

        if args.dry_run:
            print("\nTo actually perform the sync, run without --dry-run flag")

    except Exception as e:
        print(f"Error during sync: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()