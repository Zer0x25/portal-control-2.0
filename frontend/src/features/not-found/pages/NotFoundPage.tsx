import React from "react";
import { useNavigate } from "react-router";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../hooks/useAuth";
import { getDefaultRouteForRole } from "../../../utils/routeUtils";

/**
 * Página 404 dentro del layout protegido: el shell y la navegación
 * persisten para que el agente/usuario conserve el contexto DOM.
 */
const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const home = getDefaultRouteForRole(currentUser?.role ?? "Usuario");

  return (
    <div
      data-testid="not-found-page"
      className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-16"
    >
      <p className="text-xs font-black uppercase tracking-[0.3em] text-token-text-tertiary">
        Error 404
      </p>
      <h1 className="text-3xl font-black uppercase tracking-tight text-token-text-primary">
        Página no encontrada
      </h1>
      <p className="text-sm font-semibold text-token-text-secondary max-w-md">
        La ruta solicitada no existe. Revisa el menú lateral o vuelve al inicio.
      </p>
      <Button
        data-testid="not-found-home-button"
        variant="primary"
        onClick={() => navigate(home)}
        className="mt-2 px-8"
      >
        Volver al inicio
      </Button>
      <Button
        data-testid="not-found-back-button"
        variant="secondary"
        onClick={() => navigate(-1)}
        className="px-8"
      >
        Volver atrás
      </Button>
    </div>
  );
};

export default NotFoundPage;
