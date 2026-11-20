# DEPLOY.md — Levantar el sitio en la máquina vieja

> **Objetivo:** leer este documento de arriba a abajo y tener
> `https://tudominio.com` corriendo 24/7 en la PC vieja
> (4 GB RAM DDR4 + 512 GB disco), **sin abrir ningún puerto a internet**.
> Todo el tráfico entra por Cloudflare Tunnel → `localhost:80` (Caddy).

```
Visitante ──► https://tudominio.com (Cloudflare)
                    │  (conexión saliente de cloudflared, sin puertos abiertos)
                    ▼
              localhost:80 ──► Caddy
                    ├─ /api/*  → api:8080   (backend Go)
                    └─ resto   → web:3000   (Next.js)
              + postgres:5432 · redis:6379  (solo red interna de Docker)
```

**Tiempo total estimado:** ~1 h (la mitad es esperar instalaciones y builds).

**RAM:** en reposo el stack usa ~1.5 GB; los builds (Go + Next.js) pican
más alto → por eso el paso 2 (swap de 4 GB) es obligatorio.

---

## Antes de empezar

- [ ] PC vieja con acceso a internet (idealmente cable ethernet).
- [ ] USB con **Ubuntu 24.04 LTS** ([descarga](https://ubuntu.com/download)).
      El **Server** es el más ligero (recomendado); el Desktop también sirve
      (al final se desactiva la interfaz gráfica).
- [ ] Un **dominio** (ej. `tudominio.com`) con el DNS en
      **Cloudflare** (el plan gratis alcanza). Si aún no está ahí, se mueve
      el DNS desde el panel de Cloudflare.
- [ ] Acceso a GitHub a los dos repos
      (`bfprietoc/CoffeeProyect` y `bfprietoc/CoffeeProyect-web`).

---

## Paso 0 — Instalar Ubuntu (~15 min)

1. Arrancar la PC desde el USB e instalar Ubuntu 24.04 LTS.
   - Crear un usuario (el resto del doc lo llama `<usuario>`).
   - Marcar **"Install OpenSSH server"** durante la instalación.
   - Conectar a la red (ethernet o Wi-Fi).
2. Si instalaste el **Desktop** y la PC quedará sin monitor (headless),
   desactiva la interfaz gráfica para no gastar RAM:

   ```bash
   sudo systemctl set-default multi-user.target
   ```

> Después de este paso, todo se hace **remoto desde tu laptop** vía SSH.
> No necesitas volver a sentarte frente a la PC vieja.

---

## Paso 1 — Acceso remoto y endurecimiento básico (~10 min)

Desde tu **laptop**:

```bash
# Averigua la IP de la PC vieja (panel del router, o `ip a` si aún tienes pantalla)
ssh <usuario>@<ip-de-la-pc>

# Instala tu clave (una sola vez; luego entras sin contraseña):
ssh-copy-id <usuario>@<ip-de-la-pc>
```

En la **PC vieja**:

```bash
# Hora correcta (los JWT y el TLS dependen de ella)
sudo timedatectl set-ntp true

# Firewall: SOLO SSH hacia afuera. El puerto 80 NO se publica:
# Cloudflare Tunnel conecta a localhost desde la propia máquina.
sudo ufw allow OpenSSH
sudo ufw enable

# IP estable: en el router, reserva un DHCP para la MAC de la PC vieja.
# (Opcional pero recomendado: que el IP no cambie al reiniciar.)
```

---

## Paso 2 — Swap de 4 GB (obligatorio)

Con 4 GB de RAM, los builds de Docker (Go + Next.js) se quedan cortos sin
swap. Esto agrega un archivo de swap que sobrevive a reinicios:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Usar el swap solo cuando haga falta (no intercambiar con RAM libre)
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl --system

free -h   # debe mostrar ~4 GB de swap
```

---

## Paso 3 — Docker (~5 min)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Salir y volver a entrar a SSH para aplicar el grupo (o: newgrp docker)
docker run --rm hello-world   # sanity check
```

---

## Paso 4 — Clonar los repos (lado a lado)

El layout importa: el compose del front referencia `../CoffeeProyect`.

```bash
mkdir -p ~/coffee && cd ~/coffee
git clone git@github.com:bfprietoc/CoffeeProyect.git
git clone git@github.com:bfprietoc/CoffeeProyect-web.git

# El backend se despliega desde la rama develop:
cd CoffeeProyect && git checkout develop && cd ..
```

Resultado esperado:

```
~/coffee/
├── CoffeeProyect/        (backend Go, rama develop)
└── CoffeeProyect-web/    (front; el compose y deploy.sh viven acá)
```

**Acceso a GitHub:** si no tienes clave SSH en la máquina, genera una y
agrega el `.pub` a GitHub (Settings → SSH keys):

```bash
ssh-keygen -t ed25519          # acepta los defaults
cat ~/.ssh/id_ed25519.pub      # → pegarlo en GitHub
```

(Alternativa: clonar con las URLs `https://` y un Personal Access Token.)

---

## Paso 5 — Secretos (`.env`)

```bash
cd ~/coffee/CoffeeProyect-web
cp .env.production.example .env

# Genera dos valores distintos:
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → ADMIN_API_KEY
```

Edita `.env` y completa (en la plantilla, las variables opcionales vienen
comentadas con `#`: descoméntalas si las vas a usar):

| Variable | Valor | Nota |
|---|---|---|
| `JWT_SECRET` | el primer hex de 32 bytes | **Requerido**; firma/verifica los tokens |
| `ADMIN_API_KEY` | el segundo hex de 32 bytes | **Requerido**; sin ella el backend deshabilita `/admin` |
| `POSTGRES_PASSWORD` | (opcional, default `coffee`) | Solo red interna; cambiar si algún día se publica el puerto |
| `NEXT_PUBLIC_SITE_URL` | `https://tudominio.com` | Se **hornea en el build** de la imagen web: ponerla antes del primer deploy |

---

## Paso 6 — Primer deploy + datos iniciales

```bash
./deploy.sh
```

El primer deploy tarda más (~10 min): compila Go y hace el build de
Next.js. Los siguientes reutilizan caché y son más rápidos.

Qué hace (ver sección "Operación diaria"): `git pull` de ambos repos →
backup (se omite en el primer deploy, no hay datos) → `docker compose
up -d --build` → caddy reload → `docker system prune`.

**La API auto-migra la DB al arrancar, pero NO carga datos.** Carga el
catálogo inicial (una sola vez; es idempotente, repetir no rompe nada):

```bash
docker compose -f docker-compose.prod.yml exec -T postgres psql -U coffee -d coffeedb \
  < ../CoffeeProyect/migrations/seed.sql
```

**Verificación:**

```bash
docker compose -f docker-compose.prod.yml ps
# → 5 servicios: postgres/redis/api healthy, web y caddy up

curl -s http://localhost/api/health          # → 200 OK
curl -s http://localhost/api/coffees | head  # → los 5 cafés seed
curl -sI http://localhost | head -1          # → HTTP/1.1 200 OK
```

Abre `http://<ip-de-la-pc>` en el navegador (desde la misma red) y debe
ver el sitio. Ya está corriendo — falta exponerlo al mundo (paso 7).

---

## Paso 7 — Acceso público: Cloudflare Tunnel

> El tunnel abre una **conexión saliente** desde la PC vieja hacia
> Cloudflare: no se abre ningún puerto, funciona incluso tras CGNAT, y el
> HTTPS lo gestiona Cloudflare automáticamente.

```bash
# Instalar cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflared.sh | sudo bash
sudo apt install -y cloudflared
```

### 7a. Prueba rápida (sin cuenta, URL temporal)

```bash
cloudflared tunnel --url http://localhost
```

En la salida aparece una URL `https://....trycloudflare.com` — ábrela en el
navegador: si ves el sitio, todo el stack está bien. `Ctrl+C` para parar.

### 7b. Tunnel permanente (con el dominio)

```bash
cloudflared tunnel login
# → Imprime una URL. Al no tener navegador en la PC, ábrela en tu laptop:
#   selecciona el dominio y pega el código de vuelta en la terminal.

cloudflared tunnel create coffee
# → Crea ~/.cloudflared/<TUNNEL_ID>.json  (anótate el TUNNEL_ID)

cloudflared tunnel route dns coffee tudominio.com
# → Crea el registro DNS automáticamente (CNAME al tunnel)
```

Configuración del servicio:

```bash
sudo tee /etc/cloudflared/config.yml <<EOF
tunnel: <TUNNEL_ID>
credentials-file: /home/<usuario>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: tudominio.com
    service: http://localhost
  - service: http_status:404
EOF

sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

**Verificación final:** `https://tudominio.com` en el navegador — y prueba
una vez con datos móviles (fuera de tu red) para confirmar que es público.
`cloudflared` corre como servicio systemd: sobrevive a reinicios solo.

### Alternativa: Tailscale (privado, sin dominio)

Útil para probar antes de tener el dominio, o como acceso privado
permanente. Solo lo ven los miembros del tailnet:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh
sudo tailscale serve --bg http://localhost
# → https://<nombre-de-la-pc>.tailnet.ts.net
```

---

## Operación diaria

### Nueva versión (lo del 99% de los deploys)

En tu laptop: push a `main` (web) y/o `develop` (backend). El CI valida
lint + typecheck + build + 13 tests E2E antes de que toques la PC.

En la **PC vieja**:

```bash
cd ~/coffee/CoffeeProyect-web && ./deploy.sh
```

`deploy.sh` hace, en orden: `git pull --ff-only` de ambos repos →
backup `pg_dump` a `backups/` (si ya hay stack) →
`docker compose up -d --build` (reconstruye solo lo que cambió) →
`caddy reload` (forzado: Caddy no detecta el reemplazo del archivo montado)
→ `docker system prune -f` (imágenes viejas; en 4 GB de RAM no es opcional).

### Rollback

```bash
git revert <commit> && git push      # en el repo que tiene el cambio
cd ~/coffee/CoffeeProyect-web && ./deploy.sh
```

Los datos no se tocan: viven en el volume `pg_data`, no en la imagen.

### Levantar y bajar el stack a mano (manual deployment)

Para detener o arrancar el proyecto **sin desplegar una versión nueva**
(liberar RAM, probar cambios locales, apagarlo de noche):

```bash
cd ~/coffee/CoffeeProyect-web   # en la PC vieja; en la máquina de desarrollo, la ruta del repo

# Apagar (conserva los datos en los volumes)
docker compose -f docker-compose.prod.yml down

# Arrancar (los datos vuelven intactos)
docker compose -f docker-compose.prod.yml up -d

# Arrancar reconstruyendo imágenes (tras cambios de código en web o backend)
docker compose -f docker-compose.prod.yml up -d --build
```

- Con el stack arriba, el sitio está en **http://localhost** (Caddy `:80`).
- `down` libera el puerto 80 y ~1–1.5 GB de RAM; **no** pierde datos.
- ⚠️ `down -v` **sí borra los datos** (los volumes): solo si quieres empezar de cero.

En la **máquina de desarrollo** además hay servicios systemd para el día a día
(no existen en la PC vieja):

```bash
systemctl --user stop coffee-api coffee-web      # apagar
systemctl --user start coffee-api coffee-web     # arrancar
systemctl --user is-active coffee-api coffee-web # estado
```

`coffee-web` corre con `next start` (compilado, sin hot-reload); para **editar
código** del front se usa `npm run dev` con `coffee-api` arriba.

Regla simple:
- Probar producción / ensayar el deploy → stack Docker.
- Editar código del día a día → `coffee-api` + `npm run dev`.

### Estado y logs

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api    # o web / caddy
docker stats                                              # RAM/CPU en vivo
```

### Backups y restauración

Cada deploy guarda `backups/coffeedb-<fecha_hora>.sql.gz` (son la única
copia de los datos). Restaurar un backup:

```bash
gunzip -c backups/coffeedb-<fecha_hora>.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T postgres psql -U coffee -d coffeedb
```

### Disco

```bash
docker system df        # imágenes vs. espacio en uso
# Si crece: docker system prune -f  (deploy.sh ya lo hace en cada deploy)
```

---

## Solución de problemas

| Síntoma | Causa probable / arreglo |
|---|---|
| El build muere con OOM (contenedor `api` o `web` no arranca) | Swap caído: `free -h` debe mostrar ~4 GB. Si está, el build va lento pero termina; revisa `dmesg \| grep -i oom` |
| Nada escucha en `:80` | `sudo ss -tlnp \| grep :80` — algo (apache viejo, etc.) lo ocupa; detenerlo y `docker compose -f docker-compose.prod.yml up -d` |
| Cambié el `Caddyfile` y no se refleja | `docker compose -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile` (`deploy.sh` ya lo hace) |
| La PC se reinició y el sitio no responde | Todo debería volver solo (`restart: unless-stopped`). Verificar `docker compose -f docker-compose.prod.yml ps` y `systemctl status cloudflared`; si un contenedor no subió, `docker compose -f docker-compose.prod.yml up -d` |
| `deploy.sh` falla en `git pull --ff-only` | No debe haber cambios locales en la PC. Si los hay: `git checkout -- .` (en el repo que falla) y repetir |
| El tunnel no levanta | `sudo systemctl status cloudflared` y `sudo journalctl -u cloudflared -n 50` |
| El sitio va lento en picos de tráfico | Normal en esta máquina; `docker stats` muestra quién consume. El stack en reposo usa ~1.5 GB |

---

## Reconstruir desde cero (si la máquina muere)

1. PC nueva → pasos 0 a 6 (~30 min).
2. Copiar el último `backups/coffeedb-<fecha>.sql.gz` (desde el disco viejo
   o desde donde lo tengas) y restaurarlo con el comando de la sección
   "Backups".
3. Repetir el paso 7 (el tunnel es por cuenta, no por máquina: se crea uno
   nuevo y `route dns` re-apunta el dominio).

El código siempre vive en GitHub; la máquina es intercambiable.
