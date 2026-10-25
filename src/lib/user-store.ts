import fs from 'fs';
import path from 'path';

export interface ProvisionedUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  active: boolean;
  ministry?: string;
  agency?: string;
  state?: string;
  country?: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.pragatipulse-data');
const USERS_FILE = path.join(DATA_DIR, 'provisioned_users.json');

// In-memory cache for ultra-fast lookups
let inMemoryUsers: ProvisionedUser[] | null = null;

function ensureFileExists(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn("Could not initialize provisioned users file:", err);
  }
}

export function getProvisionedUsers(): ProvisionedUser[] {
  if (inMemoryUsers !== null) {
    return inMemoryUsers;
  }
  ensureFileExists();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        inMemoryUsers = parsed;
        return inMemoryUsers;
      }
    }
  } catch (err) {
    console.warn("Could not read provisioned users file:", err);
  }
  inMemoryUsers = [];
  return inMemoryUsers;
}

export async function saveProvisionedUser(user: ProvisionedUser): Promise<void> {
  ensureFileExists();
  const users = getProvisionedUsers();
  const normEmail = user.email.toLowerCase().trim();

  const idx = users.findIndex(u => u.email.toLowerCase().trim() === normEmail);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.unshift(user);
  }

  inMemoryUsers = users;

  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Could not save provisioned users file:", err);
  }
}

export function findProvisionedUserByEmail(email: string): ProvisionedUser | null {
  const normEmail = email.toLowerCase().trim();
  const users = getProvisionedUsers();
  return users.find(u => u.email.toLowerCase().trim() === normEmail) || null;
}
