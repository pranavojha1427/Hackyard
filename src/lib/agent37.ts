/**
 * Agent 37 Client for PragatiPulse MoSPI Intelligence Assistant
 * Official Integration for Agent 37 Cloud (https://www.agent37.com)
 * 
 * Supports instance management, health polling, session persistence,
 * and conversational response turns over the Agent 37 Agent API.
 */

export interface Agent37Instance {
  id: string;
  name?: string;
  status: string;
  url?: string;
  created?: string;
}

export interface Agent37ResponseResult {
  text: string;
  sessionId?: string;
  provider: "agent37" | "fallback";
  instanceId?: string;
  status: "completed" | "provisioning" | "fallback" | "error";
  notice?: string;
}

const AGENT37_API_BASE = "https://api.agent37.com/v1";

let cachedInstance: { id: string; url: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Retrieves the Agent 37 API key from environment variables.
 */
export function getAgent37Key(): string {
  return (process.env.AGENT37_API_KEY || "").trim();
}

/**
 * Checks for an existing active Agent 37 instance or provisions one.
 */
export async function getOrCreateAgent37Instance(): Promise<{
  instanceId: string | null;
  instanceUrl: string | null;
  status: string;
  error?: string;
}> {
  const apiKey = getAgent37Key();
  if (!apiKey) {
    return { instanceId: null, instanceUrl: null, status: "missing_key", error: "Missing Agent 37 API key" };
  }

  // 1. Check direct environment variable override
  if (process.env.AGENT37_INSTANCE_ID) {
    const id = process.env.AGENT37_INSTANCE_ID.trim();
    return {
      instanceId: id,
      instanceUrl: `https://${id}.agent37.app`,
      status: "ready"
    };
  }

  // 2. Check local memory cache
  if (cachedInstance && Date.now() - cachedInstance.timestamp < CACHE_TTL_MS) {
    return {
      instanceId: cachedInstance.id,
      instanceUrl: cachedInstance.url,
      status: "ready"
    };
  }

  try {
    // 3. Query existing instances in the workspace
    const listRes = await fetch(`${AGENT37_API_BASE}/instances`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(6000)
    });

    if (listRes.ok) {
      const listData = await listRes.json();
      const instances: Agent37Instance[] = listData?.data || [];

      // Find an active running instance
      const runningInstance = instances.find(
        (i) => i.status === "running" || i.status === "starting" || i.status === "ready"
      );

      if (runningInstance) {
        const id = runningInstance.id;
        const url = runningInstance.url || `https://${id}.agent37.app`;
        cachedInstance = { id, url, timestamp: Date.now() };
        return {
          instanceId: id,
          instanceUrl: url,
          status: runningInstance.status
        };
      }
    }

    // 4. If no running instance exists, attempt to create one
    const createRes = await fetch(`${AGENT37_API_BASE}/instances`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "pragatipulse-assistant",
        template: "agent37-hermes",
        budget: { credit_micros: 1000000 } // $1.00 managed headroom
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (createRes.ok) {
      const created = await createRes.json();
      const id = created.id;
      const url = created.url || `https://${id}.agent37.app`;
      cachedInstance = { id, url, timestamp: Date.now() };
      return {
        instanceId: id,
        instanceUrl: url,
        status: created.status || "starting"
      };
    }

    const errBody = await createRes.json().catch(() => ({}));
    const errCode = errBody?.error?.code || "";
    const errMsg = errBody?.error?.message || createRes.statusText;

    if (createRes.status === 402 || errCode === "insufficient_balance") {
      return {
        instanceId: null,
        instanceUrl: null,
        status: "insufficient_balance",
        error: errMsg
      };
    }

    return {
      instanceId: null,
      instanceUrl: null,
      status: "create_failed",
      error: `Agent 37 returned ${createRes.status}: ${errMsg}`
    };
  } catch (err: any) {
    return {
      instanceId: null,
      instanceUrl: null,
      status: "error",
      error: err?.message || "Failed to contact Agent 37 API"
    };
  }
}

/**
 * Sends a message turn to the Agent 37 instance response endpoint.
 */
export async function sendAgent37Turn({
  instanceId,
  instanceUrl,
  input,
  sessionId
}: {
  instanceId: string;
  instanceUrl: string;
  input: string;
  sessionId?: string;
}): Promise<{ text: string; sessionId?: string }> {
  const apiKey = getAgent37Key();
  const endpoint = `${instanceUrl.replace(/\/$/, "")}/v1/responses`;

  const bodyPayload: any = {
    input,
    stream: false,
    mode: "chat"
  };

  if (sessionId) {
    bodyPayload.session_id = sessionId;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "X-Agent37-Key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(bodyPayload),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Agent 37 instance error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const outputText = data.output_text || data.text || "No response received from Agent 37.";
  return {
    text: outputText,
    sessionId: data.session_id || sessionId
  };
}
