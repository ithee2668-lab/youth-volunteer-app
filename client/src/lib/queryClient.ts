import { QueryClient, QueryFunction } from "@tanstack/react-query";

// 배포 환경(sites.pplx.app)에서는 현재 페이지 URL 기반으로 프록시 경로 동적 계산
// 로컬(localhost)에서는 빈 문자열(상대경로)로 동작
const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? window.location.pathname.replace(/\/dist\/public\/.*/, '').replace(/\/$/, '') + '/port/5000'
  : '';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  extraHeaders?: Record<string, string>,
): Promise<any> {
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(extraHeaders ?? {}),
  };
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json") ? res.json() : res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/").replace(/\/\/+/g, "/");
    const res = await fetch(`${API_BASE}${path}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
