import React, { Component, ErrorInfo, ReactNode } from "react";
import Button from "./ui/Button";
import { ExclamationTriangleIcon } from "./ui/icons/index";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const isChunkLoadFailed =
      error?.message?.match(/Failed to fetch dynamically imported module/i) ||
      error?.name === "ChunkLoadError" ||
      error?.message?.match(/Importing a module script failed/i);

    if (isChunkLoadFailed) {
      const hasReloaded = window.sessionStorage.getItem("chunk-load-reloaded");
      if (!hasReloaded) {
        window.sessionStorage.setItem("chunk-load-reloaded", "true");
        window.location.reload();
        // Return current state so it doesn't crash while reloading
        return { hasError: false };
      }
    }

    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Aquí se podría integrar un servicio de logging de errores como Sentry, LogRocket, etc.
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-token-surface-app p-4">
          <div className="text-center max-w-lg p-8 bg-token-surface-card rounded-lg shadow-2xl border border-token-status-error/30">
            <ExclamationTriangleIcon className="w-16 h-16 text-token-status-error mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-token-text-primary">Oops! Algo salió mal.</h1>
            <p className="mt-2 text-token-text-secondary">
              La aplicación encontró un error inesperado. Nuestro equipo técnico ha sido notificado.
            </p>
            <div className="mt-4 text-xs text-token-text-secondary bg-token-surface-technical/50 border border-token-border-subtle p-2 rounded">
              <details>
                <summary className="cursor-pointer font-semibold">
                  Detalles del error (para soporte técnico)
                </summary>
                <pre className="mt-2 text-left whitespace-pre-wrap font-mono">
                  {this.state.error?.toString()}
                </pre>
              </details>
            </div>
            <Button onClick={this.handleReload} className="mt-6" variant="primary">
              Recargar la Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
