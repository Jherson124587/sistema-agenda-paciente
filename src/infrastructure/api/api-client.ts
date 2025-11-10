import { DOCTOC_API_TOKEN, DOCTOC_BASE_URL } from "@/config/constants";

type FetchOptions = {
    path: string;
    method?: "GET" | "POST";
    body?: unknown;
    tokenOverride?: string;
};

export async function doctocFetch<T>({ path, method = "POST", body, tokenOverride }: FetchOptions): Promise<T> {
    const url = `${DOCTOC_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    const token = tokenOverride ?? DOCTOC_API_TOKEN;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        // Next.js cache control: todas estas son operaciones dinámicas
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Doctoc API error ${res.status}: ${text}`);
    }

    // Algunas respuestas de busy_ranges pueden ser arrays simples
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return (await res.json()) as T;
    }
    return (await res.json()) as T; // fallback
}




