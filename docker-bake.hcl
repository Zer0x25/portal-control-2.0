variable "BACKEND_IMAGE" {
  default = "portal-backend:latest"
}

variable "FRONTEND_IMAGE" {
  default = "portal-frontend:latest"
}

variable "GATEWAY_IMAGE" {
  default = "portal-gateway:latest"
}

variable "VITE_SENTRY_DSN" {
  default = ""
}

target "backend" {
  context    = "./backend"
  tags       = ["${BACKEND_IMAGE}"]
  cache-from = ["type=gha,scope=portal-control-2-0-backend"]
  cache-to   = ["type=gha,mode=max,scope=portal-control-2-0-backend"]
}

target "frontend" {
  context    = "./frontend"
  tags       = ["${FRONTEND_IMAGE}"]
  args = {
    VITE_SENTRY_DSN = "${VITE_SENTRY_DSN}"
  }
  cache-from = ["type=gha,scope=portal-control-2-0-frontend"]
  cache-to   = ["type=gha,mode=max,scope=portal-control-2-0-frontend"]
}

target "gateway" {
  context    = "./nginx"
  tags       = ["${GATEWAY_IMAGE}"]
  cache-from = ["type=gha,scope=portal-control-2-0-gateway"]
  cache-to   = ["type=gha,mode=max,scope=portal-control-2-0-gateway"]
}
