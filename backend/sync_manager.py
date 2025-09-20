import os
import pytz
from datetime import datetime, time
from sqlalchemy.orm import Session
from database import SyncMetadata, get_db
import crud
from sync import LimitlessSync

class SyncManager:
    """Manages time-aware sync operations for Daily Insights"""

    def __init__(self):
        self.pacific_tz = pytz.timezone('US/Pacific')
        self.daily_insight_time = time(7, 0)  # 7:00 AM Pacific
        self.sync_client = LimitlessSync()

    def should_sync_today(self, db: Session) -> dict:
        """
        Check if sync should run today based on:
        1. Current time is after 7am Pacific
        2. No successful sync has happened today after 7am

        Returns dict with should_sync (bool) and reason (str)
        """
        now_pacific = datetime.now(self.pacific_tz)
        today_7am = self.pacific_tz.localize(
            datetime.combine(now_pacific.date(), self.daily_insight_time)
        )

        # Check if it's past 7am Pacific today
        if now_pacific < today_7am:
            return {
                'should_sync': False,
                'reason': f'Too early - Daily insights available after 7:00 AM Pacific (currently {now_pacific.strftime("%I:%M %p %Z")})'
            }

        # Get the last sync record
        last_sync = crud.get_latest_sync_metadata(db)

        if not last_sync:
            return {
                'should_sync': True,
                'reason': 'No previous sync found'
            }

        # Convert last sync time to Pacific timezone
        last_sync_pacific = last_sync.last_sync_at.replace(tzinfo=pytz.UTC).astimezone(self.pacific_tz)

        # Check if last sync was today after 7am
        if (last_sync_pacific.date() == now_pacific.date() and
            last_sync_pacific >= today_7am and
            last_sync.last_sync_status == 'success'):
            return {
                'should_sync': False,
                'reason': f'Already synced today at {last_sync_pacific.strftime("%I:%M %p %Z")}'
            }

        return {
            'should_sync': True,
            'reason': f'Ready to sync - last sync: {last_sync_pacific.strftime("%Y-%m-%d %I:%M %p %Z")}'
        }

    def get_sync_status(self, db: Session) -> dict:
        """Get current sync status and metadata"""
        sync_check = self.should_sync_today(db)
        last_sync = crud.get_latest_sync_metadata(db)

        status = {
            'should_sync': sync_check['should_sync'],
            'reason': sync_check['reason'],
            'last_sync': None,
            'in_progress': False
        }

        if last_sync:
            last_sync_pacific = last_sync.last_sync_at.replace(tzinfo=pytz.UTC).astimezone(self.pacific_tz)
            status['last_sync'] = {
                'timestamp': last_sync.last_sync_at.isoformat(),
                'timestamp_pacific': last_sync_pacific.strftime("%Y-%m-%d %I:%M %p %Z"),
                'status': last_sync.last_sync_status,
                'insights_added': last_sync.insights_added,
                'insights_updated': last_sync.insights_updated,
                'insights_fetched': last_sync.insights_fetched,
                'error_message': last_sync.error_message
            }

            status['in_progress'] = last_sync.last_sync_status == 'in_progress'

        return status

    def sync_with_tracking(self, force: bool = False) -> dict:
        """
        Perform sync with full tracking and metadata logging

        Args:
            force: If True, bypass time checks and sync anyway
        """
        db = next(get_db())

        try:
            # Check if sync should run
            if not force:
                sync_check = self.should_sync_today(db)
                if not sync_check['should_sync']:
                    return {
                        'success': False,
                        'message': sync_check['reason'],
                        'skipped': True
                    }

            # Clean up any stuck sync records (older than 10 minutes)
            self._cleanup_stuck_syncs(db)

            # Check if sync is already in progress
            last_sync = crud.get_latest_sync_metadata(db)
            if last_sync and last_sync.last_sync_status == 'in_progress':
                return {
                    'success': False,
                    'message': 'Sync already in progress',
                    'in_progress': True
                }

            # Create sync metadata record (mark as in_progress)
            sync_metadata = crud.create_sync_metadata(db, {
                'last_sync_status': 'in_progress',
                'insights_fetched': 0,
                'insights_updated': 0,
                'insights_added': 0
            })

            try:
                # Perform the actual sync
                result = self.sync_client.sync_to_database(dry_run=False)

                # Update sync metadata with results
                crud.update_sync_metadata(db, sync_metadata.id, {
                    'last_sync_status': 'success',
                    'insights_fetched': len(result['new_insights']) + len(result['updated_insights']) + len(result['skipped_insights']),
                    'insights_updated': len(result['updated_insights']),
                    'insights_added': len(result['new_insights']),
                    'error_message': None
                })

                return {
                    'success': True,
                    'message': f'Sync completed successfully',
                    'details': {
                        'new_insights': len(result['new_insights']),
                        'updated_insights': len(result['updated_insights']),
                        'fetched_insights': len(result['new_insights']) + len(result['updated_insights']) + len(result['skipped_insights'])
                    }
                }

            except Exception as e:
                # Update sync metadata with error
                crud.update_sync_metadata(db, sync_metadata.id, {
                    'last_sync_status': 'error',
                    'error_message': str(e)
                })
                raise

        except Exception as e:
            return {
                'success': False,
                'message': f'Sync failed: {str(e)}',
                'error': True
            }
        finally:
            db.close()

    def _cleanup_stuck_syncs(self, db: Session):
        """Clean up sync records that have been stuck in 'in_progress' for more than 10 minutes"""
        from datetime import datetime, timedelta
        import pytz

        # Calculate cutoff time (10 minutes ago)
        cutoff_time = datetime.utcnow() - timedelta(minutes=10)

        # Find stuck sync records
        stuck_syncs = db.query(SyncMetadata).filter(
            SyncMetadata.last_sync_status == 'in_progress',
            SyncMetadata.last_sync_at < cutoff_time
        ).all()

        # Update stuck syncs to error status
        for sync_record in stuck_syncs:
            sync_record.last_sync_status = 'error'
            sync_record.error_message = 'Sync timed out (automatically cleaned up)'

        if stuck_syncs:
            db.commit()
            print(f"🧹 Cleaned up {len(stuck_syncs)} stuck sync record(s)")