import Dexie, { type EntityTable } from 'dexie';

// --- TYPE DEFINITIONS ---

export type ActivityType = 'recurring' | 'one-time';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 1=Monday, etc.
export type ProfileType = 'parent' | 'child';
export type ThemeType = 'admin' | 'cosmic';
export type LogStatus = 'completed' | 'incomplete' | 'skipped';

// ==========================================
// NEW: Account (The Household Container)
// ==========================================
/**
 * The root account information synced from Firebase Auth.
 * This represents the "Household".
 */
export interface Account {
    uid: string; // Primary Key: The Firebase Auth User ID
    email: string | null; // Cached from Google
    displayName: string | null; // Cached "Parent Name" from Google
    photoURL: string | null; // Cached Google Profile Pic
    createdAt: Date;
    lastLoginAt: Date;
}

// ==========================================
// UPDATED: Profile (Personas)
// ==========================================
/**
 * User Profile (Parent or Child persona within a household)
 */
export interface Profile {
    id: string; // UUID
    accountId: string; // <-- FOREIGN KEY: Links this profile to the Household Account (uid)
    name: string;
    type: ProfileType;
    pin?: string; // 4-digit PIN (Parent only)
    theme: ThemeType;
    avatarId: string; // ID string for their chosen avatar icon

    // Child-specific stats
    stars?: number;
    xp?: number;
    dob?: string; // Date of Birth (ISO string)

    createdAt: Date;
}

/**
 * An Activity Blueprint (Routine or One-Time Task)
 */
export interface Activity {
    id: string; // UUID
    accountId: string; // <-- FK: Belongs to this household
    profileIds: string[]; // Assigned to which child profile IDs?
    type: ActivityType;
    title: string;
    timeOfDay: string; // "HH:mm"

    // Scheduling Logic
    days?: DayOfWeek[]; // Used if type === 'recurring'
    date?: string; // Used if type === 'one-time' (ISO YYYY-MM-DD)

    steps: Step[]; // Embedded JSON Array
    isActive: boolean;
    createdAt: Date;
}

/**
 * A single step within an Activity (Embedded Object)
 */
export interface Step {
    id: string; // UUID used for drag-and-drop keying
    title: string;
    duration: number; // Minutes
    icon: string; // Lucide icon name string
    stars: number; // Reward value
}

/**
 * Daily Log - Record of execution
 */
export interface ActivityLog {
    id: string; // UUID
    accountId: string; // <-- FK: Household scope
    activityId: string; // FK: Parent Activity
    profileId: string; // FK: Which child did it
    date: string; // YYYY-MM-DD representing the "day"
    startedAt?: Date;
    completedAt?: Date;
    status: LogStatus;
    stepLogs: { stepId: string; status: 'done' | 'skipped'; completedAt?: Date }[];
}

/**
 * Shop Reward Item blueprint
 */
export interface Reward {
    id: string; // UUID
    accountId: string; // <-- FK: Household scope
    title: string;
    icon: string; // Emoji string
    cost: number;
    isActive: boolean;
    createdAt?: Date; // Added for sort
}

/**
 * Log of a reward redemption history
 */
export interface PurchaseLog {
    id: string; // UUID
    accountId: string; // <-- FK: Household scope
    profileId: string; // FK: Which child bought it
    rewardSnapshot: {
        // Snapshot data in case original is deleted
        title: string;
        icon: string;
        cost: number;
    };
    purchasedAt: Date;
}

// --- DATABASE INITIALIZATION ---

interface HabitisimDB extends Dexie {
    accounts: EntityTable<Account, 'uid'>; // <-- NEW TABLE
    profiles: EntityTable<Profile, 'id'>;
    activities: EntityTable<Activity, 'id'>;
    activityLogs: EntityTable<ActivityLog, 'id'>;
    rewards: EntityTable<Reward, 'id'>;
    purchaseLogs: EntityTable<PurchaseLog, 'id'>;
}

const db = new Dexie('HabitisimDB') as HabitisimDB;

// Define local database schema and indexes for performance
// Note: We use version(1) as we haven't released yet.
db.version(1).stores({
    accounts: 'uid', // Primary Key is Firebase UID
    // Index by accountId to quickly find all members of a household
    profiles: 'id, accountId, type',
    // Index by accountId for scope, profileIds for assignment, date for one-offs
    activities: 'id, accountId, *profileIds, type, date',
    // Compound index for fast calendar views per child
    activityLogs: 'id, accountId, [profileId+date], activityId',
    rewards: 'id, accountId',
    purchaseLogs: 'id, accountId, profileId, purchasedAt',
});

// Hooks to populate createdAt automatically
db.accounts.hook('creating', function (primKey, obj, trans) {
    obj.createdAt = new Date();
    obj.lastLoginAt = new Date();
});
db.profiles.hook('creating', function (primKey, obj, trans) {
    obj.createdAt = new Date();
});
db.activities.hook('creating', function (primKey, obj, trans) {
    obj.createdAt = new Date();
});

export { db };
