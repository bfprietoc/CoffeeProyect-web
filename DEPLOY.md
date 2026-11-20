# DEPLOY.md — wake-agent (máquina de producción)

> **Estado (2026-11-20): sitio desplegado y corriendo 24/7.**
> - Acceso privado (solo tailnet): **https://wake-agent.taile51409.ts.net**
> - Pendiente: dominio propio + Cloudflare Tunnel para acceso público
>   (sección [Acceso público](#acceso-púbicopendiente-cloudflare-tunnel)).
>
> El setup one-time ya se hizo (sección [Setup one-time](#setup-one-time-hecho-el-2026-11-20));
> queda documentado para poder reconstruir la máquina desde cero.

---

## La máquina: wake-agent

| | |
|---|---|
| **OS** | Arch Linux (kernel 7.2), headless, encendida **24/7** (enciende a `ia-server`) |
| **CPU / RAM** | 2 cores / 3.6 GB + `zram0` (1.8 GB de swap comprimido, ya venía configurado) |
| **Disco** | ~447 GB (sobrado) |
| **Tailscale** | tailnet `taile51409`, IP `100.88.121.28`, hostname estable `wake-agent.taile51409.ts.net` |
| **Acceso** | `ssh bfprietoc@wake-agent` (desde cualquier máquina del tailnet) |
| **sudo** | pide password (el usuario está en `wheel`) |

> La máquina **no se instaló para este proyecto**: ya existía con Arch +
> Tailscale. El plan original ("instalar Ubuntu en una PC vacía") quedó
> obsoleto; si hay que reinstalar el sistema, ver
> [Reconstruir desde cero](#reconstruir-desde-cero-si-la-máquina-muere).
>
> ⚠️ `wake-agent` es crítica: enciende a `ia-server`. No tocar servicios
> existentes (sshd, tailscaled, NetworkManager, …).

---

## Arquitectura

```
Visitante (tailnet) ──► https://wake-agent.taile51409.ts.net
                        │  (tailscale serve; HTTPS lo gestiona Tailscale)
                        ▼
                  localhost:80 ──► Caddy
                        ├─ /api/*  → api:8080   (backend Go)
                        └─ resto   → web:3000   (Next.js)
                  + postgres:5432 · redis:6379  (solo red interna de Docker)
```

Cuando haya dominio, la puerta de entrada cambia pero nada más:
`https://tudominio.com` → Cloudflare Tunnel (conexión saliente, sin puertos
abiertos) → el mismo `localhost:80`.

**RAM:** en reposo el stack usa ~1.5 GB; los builds (Go + Next.js) pican más
alto — el `zram0` de 1.8 GB es la red de seguridad, y el `docker system
prune` por deploy es obligatorio (lo hace `deploy.sh`).

---

## Setup one-time (hecho el 2026-11-20)

### 1. Docker (pacman, no `get.docker.com`)

```bash
sudo pacman -Sy docker docker-compose docker-buildx
sudo systemctl enable --now docker
sudo usermod -aG docker bfprietoc   # aplica en la siguiente sesión SSH
```

- **`docker-buildx` es obligatorio**: el Dockerfile del backend usa
  `RUN --mount=type=cache` (feature de BuildKit). Sin buildx, compose avisa
  *"buildx Docker CLI plugin not found: falling back to the classic builder"*
  y el build del backend falla. El Dockerfile del web no lo necesita.
- **`pacman -Sy`** (con la `-y`): si al instalar aparecen 404 en paquetes
  nuevos, **no es un mirror caído** — la base de datos local está desactualizada
  (Arch es rolling: los mirrors borran las versiones viejas). Sincronizar y
  reintentar resuelve.

### 2. Acceso a GitHub (deploy keys de solo lectura, una por repo)

GitHub no permite la misma deploy key en dos repos → se generaron **dos**
claves en la máquina:

| Clave | Repo |
|---|---|
| `~/.ssh/id_ed25519_github_coffee` | `bfprietoc/CoffeeProyect-web` |
| `~/.ssh/id_ed25519_github_coffee_api` | `bfprietoc/CoffeeProyect` |

Ambas están registradas como deploy key *"wake-agent (deploy, read-only)"*
en cada repo (Settings → Deploy keys; se pueden revocar en cualquier momento).
Solo permiten `git clone`/`pull`: **no hay forma de empujar desde la PC**.

`~/.ssh/config` en wake-agent:

```
# Deploy keys de solo lectura (una por repo). GitHub rechaza la que no
# corresponde y acepta la registrada para el repo que se está clonando.
Host github.com
  IdentityFile ~/.ssh/id_ed25519_github_coffee
  IdentityFile ~/.ssh/id_ed25519_github_coffee_api
```

> ⚠️ El patrón `Host github.com:owner/repo` **no funciona**: git invoca a ssh
> con el hostname `github.com` solo (el `:owner/repo` va en el comando, no en
> el host). La solución es presentar las dos claves para `github.com`:
> GitHub descarta la que no le corresponde al repo y acepta la correcta.

### 3. Clonar los repos (lado a lado)

El layout importa: el compose del front referencia `../CoffeeProyect`.

```bash
mkdir -p ~/coffee && cd ~/coffee
git clone git@github.com:bfprietoc/CoffeeProyect.git
git clone git@github.com:bfprietoc/CoffeeProyect-web.git
```

```
~/coffee/
├── CoffeeProyect/        (backend Go)
└── CoffeeProyect-web/    (front; el compose y deploy.sh viven acá)
```

**Ambos repos quedan en `main`** (la rama de producción): no cambies de
rama en la PC — `deploy.sh` hace pull de `main`.

### 4. Secretos (`.env`)

Creado **en la máquina** (`~/coffee/CoffeeProyect-web/.env`, `chmod 600`,
nunca se versiona). Basado en `.env.production.example`:

| Variable | Valor | Nota |
|---|---|---|
| `JWT_SECRET` | 32 bytes aleatorios (hex) | **Requerido**; firma/verifica los tokens |
| `ADMIN_API_KEY` | 32 bytes aleatorios (hex) | **Requerido**; sin ella el backend deshabilita `/admin` |
| `POSTGRES_PASSWORD` | 16 bytes aleatorios (hex) | Solo red interna de Docker |
| `NEXT_PUBLIC_SITE_URL` | `https://wake-agent.taile51409.ts.net` | Se **hornea en el build** de la imagen web: al comprar el dominio, cambiarla y redeployar |

### 5. Primer deploy + datos iniciales

```bash
cd ~/coffee/CoffeeProyect-web && ./deploy.sh
```

El primer deploy tarda ~10 min (compila Go y hace el build de Next.js en 2
cores). Qué hace (ver [Operación diaria](#operación-diaria)): `git pull` de
ambos repos → backup `pg_dump` (se omite el primer deploy, no hay datos) →
`docker compose up -d --build` → caddy reload → `docker system prune`.

**La API auto-migra la DB al arrancar, pero NO carga datos.** El catálogo
inicial se carga una sola vez (es idempotente, repetir no rompe nada):

```bash
docker compose -f docker-compose.prod.yml exec -T postgres psql -U coffee -d coffeedb \
  < ../CoffeeProyect/migrations/seed.sql
# → INSERT 0 5 (productores) + 5 (fincas) + 5 (cafés)
```

**Verificación:**

```bash
docker compose -f docker-compose.prod.yml ps
# → 5 servicios: postgres/redis/api healthy, web y caddy up

curl -s http://localhost/api/health          # → {"status":"ok"}
curl -s http://localhost/api/coffees | head  # → los 5 cafés seed
curl -sI http://localhost | head -1          # → HTTP/1.1 200 OK
```

### 6. Acceso privado: `tailscale serve`

Tailscale ya estaba instalado y corriendo en la máquina (es el acceso SSH
mismo). Para exponer el sitio al tailnet:

```bash
sudo tailscale serve --bg http://localhost:80
# → https://wake-agent.taile51409.ts.net  (tailnet only)
```

- El **puerto en el target es obligatorio**: `http://localhost` sin puerto
  falla con *"port required for localhost target"*.
- La URL es el **hostname estable**, no la IP: el certificado TLS es para el
  hostname, y `https://100.88.121.28` falla en TLS
  (*"tlsv1 alert internal error"*).
- Solo lo ven los miembros del tailnet; no se abre ningún puerto.
- `tailscale serve` sobrevive a reinicios (lo gestiona `tailscaled`).

Con esto el sitio quedó **en producción privada** (2026-11-20).

---

## Acceso público (pendiente): Cloudflare Tunnel

> **Requiere antes:** nombre de marca decidido + dominio comprado
> (~$11/año un `.com` en Cloudflare Registrar, a costo) con el DNS en
> Cloudflare (el plan gratis alcanza).

El tunnel abre una **conexión saliente** desde wake-agent hacia Cloudflare:
no se abre ningún puerto, funciona incluso tras CGNAT, y el HTTPS lo gestiona
Cloudflare automáticamente. Apunta al mismo `localhost:80` (Caddy) que el
tailscale serve.

```bash
sudo pacman -S cloudflared     # paquete de extra (no el script oficial)
```

### Prueba rápida (sin cuenta, URL temporal)

```bash
cloudflared tunnel --url http://localhost
```

En la salida aparece una URL `https://....trycloudflare.com` — ábrela en el
navegador: si ves el sitio, todo el stack está bien. `Ctrl+C` para parar.

### Tunnel permanente (con el dominio)

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
credentials-file: /home/bfprietoc/.cloudflared/<TUNNEL_ID>.json

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

**Al comprar el dominio**, además: cambiar `NEXT_PUBLIC_SITE_URL` en el
`.env` de wake-agent y redeployar (se hornea en el build).

El `tailscale serve` puede seguir activo como acceso privado en paralelo.

---

## Operación diaria

### Releases (trabajo en `develop` → `main` + tag)

El trabajo diario se hace en **`develop`** (ambos repos); el CI corre en
`main` y `develop`. Cuando algo está listo para producción:

1. En tu laptop, en cada repo con cambios:
   ```bash
   git checkout main && git merge --ff-only develop && git push origin main
   git tag -a v1.1.0 -m "Fase X: resumen" && git push origin v1.1.0
   ```
2. En **wake-agent**:

```bash
cd ~/coffee/CoffeeProyect-web && ./deploy.sh
```

`deploy.sh` hace, en orden: `git pull --ff-only` de ambos repos →
backup `pg_dump` a `backups/` (si ya hay stack) →
`docker compose up -d --build` (reconstruye solo lo que cambió) →
`caddy reload` (forzado: Caddy no detecta el reemplazo del archivo montado)
→ `docker system prune -f` (imágenes viejas; con 3.6 GB de RAM no es opcional).

Los tags (`v1.0.0`, `v1.1.0`, ...) marcan cada release: qué contenía cada
versión y a dónde volver en un rollback.

### Rollback

Recomendado — revertir en `main` desde tu laptop (la rama de la PC nunca
se desalinea):

```bash
git checkout main
git revert <commit-malo>        # o: git revert v1.0.0..v1.1.0 (toda la release)
git push origin main
# en wake-agent:
cd ~/coffee/CoffeeProyect-web && ./deploy.sh
```

Alternativa — quedarse en la release anterior, directo en wake-agent:

```bash
git checkout v1.0.0             # el tag al que quieres volver
docker compose -f docker-compose.prod.yml up -d --build
# para volver a deploys normales después:
git checkout main && git pull --ff-only
```

Los datos no se tocan en ninguno de los dos: viven en el volume `pg_data`,
no en la imagen.

### Levantar y bajar el stack a mano (manual deployment)

Para detener o arrancar el proyecto **sin desplegar una versión nueva**
(liberar RAM, probar cambios locales):

```bash
cd ~/coffee/CoffeeProyect-web   # en wake-agent; en la máquina de desarrollo, la ruta del repo

# Apagar (conserva los datos en los volumes)
docker compose -f docker-compose.prod.yml down

# Arrancar (los datos vuelven intactos)
docker compose -f docker-compose.prod.yml up -d

# Arrancar reconstruyendo imágenes (tras cambios de código en web o backend)
docker compose -f docker-compose.prod.yml up -d --build
```

- Con el stack arriba, el sitio está en **http://localhost** (Caddy `:80`)
  y en `https://wake-agent.taile51409.ts.net` (tailscale serve).
- `down` libera el puerto 80 y ~1–1.5 GB de RAM; **no** pierde datos.
- ⚠️ `down -v` **sí borra los datos** (los volumes): solo si quieres empezar de cero.

En la **máquina de desarrollo** además hay servicios systemd para el día a día
(no existen en wake-agent):

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
| 404 en paquetes nuevos al `pacman -S` | No es el mirror: la DB local está vieja (rolling release, los mirrors borran versiones). `sudo pacman -Sy` y reintentar |
| Build del backend falla: *"buildx Docker CLI plugin not found"* | Falta el plugin BuildKit: `sudo pacman -S docker-buildx` (el Dockerfile del backend usa `RUN --mount=type=cache`) |
| El build muere con OOM (contenedor `api` o `web` no arranca) | Swap caído: `free -h` debe mostrar ~1.8 GB (`zram0`). Si está, el build va lento pero termina; revisa `dmesg \| grep -i oom` |
| Nada escucha en `:80` | `sudo ss -tlnp \| grep :80` — algo lo ocupa; detenerlo y `docker compose -f docker-compose.prod.yml up -d` |
| Cambié el `Caddyfile` y no se refleja | `docker compose -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile` (`deploy.sh` ya lo hace) |
| `tailscale serve` falla: *"port required for localhost target"* | El puerto es obligatorio: `sudo tailscale serve --bg http://localhost:80` |
| `https://100.88.121.28` falla en TLS (*"tlsv1 alert internal error"*) | Usar el hostname estable `https://wake-agent.taile51409.ts.net`: el certificado es para el hostname, no para la IP |
| `git clone`/`pull` en wake-agent: *"Permission denied (publickey)"* | Revisar `~/.ssh/config` (dos `IdentityFile` bajo `Host github.com`) y que las deploy keys no estén revocadas (Settings → Deploy keys en cada repo) |
| La PC se reinició y el sitio no responde | Todo debería volver solo (`restart: unless-stopped`). Verificar `docker compose -f docker-compose.prod.yml ps`, `systemctl status tailscaled` (y `cloudflared` cuando exista); si un contenedor no subió, `docker compose -f docker-compose.prod.yml up -d` |
| `deploy.sh` falla en `git pull --ff-only` | No debe haber cambios locales en la PC. Si los hay: `git checkout -- .` (en el repo que falla) y repetir |
| El tunnel no levanta (cuando exista) | `sudo systemctl status cloudflared` y `sudo journalctl -u cloudflared -n 50` |
| El sitio va lento en picos de tráfico | Normal en esta máquina (2 cores); `docker stats` muestra quién consume. El stack en reposo usa ~1.5 GB |

---

## Reconstruir desde cero (si la máquina muere)

1. **Máquina nueva** → Arch Linux headless + Tailscale unido al tailnet
   `taile51409` (o cualquier distro: los pasos de Docker cambian a
   `get.docker.com`, lo demás es igual). Asegurar que tiene swap suficiente
   (`zram` o archivo de ~2 GB).
2. **Docker**: `sudo pacman -Sy docker docker-compose docker-buildx`
   (+ `systemctl enable --now docker`, usuario al grupo `docker`).
3. **Claves GitHub**: generar dos claves nuevas en la máquina y registrarlas
   como deploy keys de solo lectura (una por repo); el `~/.ssh/config` va
   como en la sección 2. (Las claves viejas de wake-agent se revocan.)
4. **Clonar** los dos repos en `~/coffee/` (ambos quedan en `main`).
5. **`.env`**: nuevo, con secretos generados en la máquina. (Opcional:
   reutilizar los `JWT_SECRET`/`POSTGRES_PASSWORD` viejos si se quiere que
   los tokens y la contraseña de DB sigan siendo válidos.)
6. **`./deploy.sh`** + seed (o restaurar el último backup si ya había datos).
7. **`sudo tailscale serve --bg http://localhost:80`** → el sitio vuelve a
   estar en `https://<host-nuevo>.taile51409.ts.net`.
8. Si ya hay dominio: recrear el tunnel de Cloudflare (se crea uno nuevo y
   `route dns` re-apunta el dominio; el tunnel es por cuenta, no por máquina).

El código siempre vive en GitHub; la máquina es intercambiable.
