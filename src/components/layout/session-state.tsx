"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface HeaderUser {
  name: string | null;
  email: string;
  isStaff: boolean;
}

interface SessionState {
  /** `loading` até a primeira resposta de `/api/sessao`. */
  status: "loading" | "ready";
  user: HeaderUser | null;
  /** Esquece a pessoa conectada — usado ao sair, antes do redirecionamento. */
  clear: () => void;
}

const SessionStateContext = createContext<SessionState>({
  status: "loading",
  user: null,
  clear: () => {},
});

/**
 * Quem está conectado, do ponto de vista do navegador.
 *
 * As páginas públicas são estáticas, então o servidor não diz ao renderizá-las
 * se há sessão (ver `src/app/api/sessao/route.ts`). A pergunta é feita uma vez,
 * quando a casca do site monta — navegar entre páginas do site não repete a
 * consulta. Entrar na conta passa pela tela de login, que tem outra casca, e
 * por isso monta esta de novo ao voltar.
 *
 * Isto controla apenas o que o menu oferece. A autorização continua no
 * servidor, em cada página e em cada ação.
 */
export function SessionStateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [user, setUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/sessao", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((data: { user: HeaderUser | null }) => {
        setUser(data.user ?? null);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Sem resposta, o site se comporta como para um visitante: o catálogo
        // continua livre e "Entrar" leva à tela de login.
        setUser(null);
        setStatus("ready");
      });
    return () => controller.abort();
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setStatus("ready");
  }, []);

  const value = useMemo(() => ({ status, user, clear }), [status, user, clear]);

  return (
    <SessionStateContext.Provider value={value}>{children}</SessionStateContext.Provider>
  );
}

export function useSessionState(): SessionState {
  return useContext(SessionStateContext);
}
