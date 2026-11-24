# Fietslog – wielerdagboek

Webapp (gsm/tablet) om fietsritten bij te houden: datum, afstand, tijd, opmerking/route, weer en gevoel, met grafieken, maand-/jaaroverzichten en "truien" (langste rit, snelste rit, beste maand). Met inlogscherm; je blijft 1 jaar ingelogd op je toestel.

## Installeren met Dockhand

De Docker-image wordt automatisch gebouwd door GitHub (`.github/workflows/docker.yml`) en komt op `ghcr.io/bigbuud/mijn-fietsrit:latest`. Je NAS hoeft dus niets te bouwen.

**Eenmalig op GitHub**
1. Push de code naar `main`. Onder het tabblad **Actions** start "Docker image"; na enkele minuten staat de image klaar.
2. Maak de image publiek, anders mag Dockhand hem niet ophalen: ga naar je profiel → **Packages** → `mijn-fietsrit` → *Package settings* → *Change visibility* → Public. (Liever privé? Voeg dan in Dockhand een registry-login voor ghcr.io toe met een token met `read:packages`.)

**Eenmalig op de Synology** (SSH of File Station): maak de map voor de gegevens aan en geef ze de juiste eigenaar.
```bash
mkdir -p /volume1/docker/fietslog
chown 1026:100 /volume1/docker/fietslog
```

**In Dockhand**
1. Maak een **nieuwe stack vanuit Git**: repository `https://github.com/bigbuud/mijn-fietsrit`, branch `main`, compose-bestand `docker-compose.yml`.
2. Optioneel: zet bij de omgevingsvariabelen `APP_USERNAME` en `APP_PASSWORD`. Doe je dat niet, dan maak je bij het eerste bezoek zelf een account aan. **Doe dat meteen na het opstarten**, zeker als de app van buitenaf bereikbaar is.
3. Deploy. De app staat op **http://SERVER:5252**.

**Updaten:** push je wijzigingen naar `main`, wacht tot de Action groen is en laat Dockhand de stack opnieuw uitrollen. `pull_policy: always` haalt dan de nieuwste image op. Ritten, account en sessies blijven behouden omdat ze in het volume `fietslog-data` staan.

Liever zelf bouwen op de server? Gebruik dan `docker-compose.build.yml` als compose-bestand (de eerste build op een zwakke NAS kan enkele minuten duren).

## Inloggen en onthouden

- Eén account per installatie (gebruikersnaam + wachtwoord, bewaard als scrypt-hash in `/data/user.json`).
- Na het inloggen krijgt het toestel een beveiligde cookie die **365 dagen** geldig is. Bij elk bezoek na 7 dagen wordt hij opnieuw 365 dagen verlengd: wie de app gebruikt, blijft ingelogd.
- De sessiesleutel staat in `/data/session.key`, dus herstarten of updaten logt niemand uit. Wachtwoord wijzigen (of `user.json` verwijderen) logt wel alle toestellen uit.
- Na 8 foute pogingen per kwartier blokkeert de app tijdelijk verdere pogingen.
- Zet de app **achter HTTPS** (reverse proxy, bv. Synology: Configuratiescherm → Aanmeldingsportaal → Geavanceerd → Reverse proxy, met certificaat). Op http-adressen wordt de cookie zonder `Secure`-vlag gezet en kan het wachtwoord onderschept worden op openbare wifi.
- Tip: kies in de browser "Toevoegen aan beginscherm" voor een app-icoon.

## Gegevens en back-up (Synology)

Alles staat in **`/volume1/docker/fietslog`** op de NAS: `rides.json` (ritten), `user.json` (account) en `session.key` (sessiesleutel). Neem die map op in je back-up (bv. Hyper Backup) en je kunt de app altijd herstellen: kopieer de map terug en start de stack.

De container draait als gebruiker `1026:100` (`user:` in `docker-compose.yml`). Heeft jouw Synology-gebruiker andere nummers, pas dan `user:` aan en geef de map dezelfde eigenaar (`id <gebruiker>` toont ze). Krijg je "permission denied" in de logs, dan klopt de eigenaar van de map niet.

## Instellingen (omgevingsvariabelen)

| Variabele | Betekenis |
| --- | --- |
| `APP_USERNAME`, `APP_PASSWORD` | Vast account (leeg laten = eerste-keer-scherm) |
| `SESSION_SECRET` | Eigen sleutel voor sessies (min. 16 tekens, optioneel) |
| `PORT`, `DATA_DIR` | Poort in de container (5252) en datamap (`/data`) |

## Ontwikkelen

```sh
bun install
bun run dev      # http://localhost:3000
bun run test
```
