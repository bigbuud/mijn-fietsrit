# Fietslog installeren

Zie **README.md** voor de volledige uitleg (Dockhand, inloggen, back-up).

Maak eerst de datamap aan (Synology):
```bash
mkdir -p /volume1/docker/fietslog && chown 1026:100 /volume1/docker/fietslog
```

Met de kant-en-klare image (na de eerste GitHub Action-run):
```bash
docker compose up -d
```

Zelf bouwen uit de broncode:
```bash
docker compose -f docker-compose.build.yml up -d --build
```
De app draait dan op http://SERVER:5353 (binnen de container is dat poort 5252). Bij het eerste bezoek maak je een account aan.

Zonder Docker (Node 20+ en Bun):
```bash
bun install
bun run build
PORT=5252 DATA_DIR=/var/lib/fietslog node .output/server/index.mjs
```
