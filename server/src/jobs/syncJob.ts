import { getUsersWithCredentials } from '../services/userService.js';
import { runSyncForUser, syncLifeLogsForUser } from '../services/syncService.js';

export async function runScheduledSync() {
  try {
    const users = await getUsersWithCredentials();
    for (const user of users) {
      await runSyncForUser(user.id);
      await syncLifeLogsForUser(user.id, { daysBack: 2 });
    }
  } catch (error) {
    console.error('Scheduled sync failed', error);
  }
}
