import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "";
if (!uri) throw new Error("Missing MONGODB_URI environment variable");

const options = { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 };


declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let _cachedPromise: Promise<MongoClient> | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }
  if (!_cachedPromise) {
    const client = new MongoClient(uri, options);
    _cachedPromise = client.connect();
  }
  return _cachedPromise;
}

const clientPromise = {
  then(onfulfilled?: any, onrejected?: any) {
    return getMongoClient().then(onfulfilled, onrejected);
  },
  catch(onrejected?: any) {
    return getMongoClient().catch(onrejected);
  }
} as unknown as Promise<MongoClient>;

export default clientPromise;

export const DB_NAME = process.env.MONGODB_DB_NAME || "pragatipulse";
export const USERS_COLLECTION = "users";
export const PROJECTS_COLLECTION = "projects";
export const PROJECT_OVERRIDES_COLLECTION = "project_overrides";

export const PROPOSALS_COLLECTION = "proposals";
export const BIDS_COLLECTION = "bids";
export const NOTIFICATIONS_COLLECTION = "notifications";
