#!/usr/bin/env bash
set -euo pipefail
if [[ "$EUID" -ne 0 ]]; then
  echo 'Uruchom jako root: sudo bash scripts/install-auto-updates.sh' >&2
  exit 1
fi
if [[ ! -d /opt/streamhouse-rpg/.git ]]; then
  echo 'Brak repozytorium w /opt/streamhouse-rpg' >&2
  exit 1
fi
command -v systemctl >/dev/null || { echo 'Brak systemd.' >&2; exit 1; }

cat > /etc/systemd/system/streamhouse-update.service <<'UNIT'
[Unit]
Description=StreamHouse RPG Companion - aktualizacja z GitHuba
Wants=network-online.target
After=network-online.target
ConditionPathExists=/opt/streamhouse-rpg/.git

[Service]
Type=oneshot
User=root
ExecStart=/bin/bash /opt/streamhouse-rpg/scripts/update-vps.sh
TimeoutStartSec=240
Nice=10
UNIT

cat > /etc/systemd/system/streamhouse-update.timer <<'UNIT'
[Unit]
Description=Sprawdzaj nowe wersje StreamHouse co 5 minut

[Timer]
OnBootSec=2min
OnUnitInactiveSec=5min
AccuracySec=30s
Persistent=true
Unit=streamhouse-update.service

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now streamhouse-update.timer
systemctl is-active --quiet streamhouse-update.timer
printf '\nOK: automatyczne aktualizacje StreamHouse są aktywne.\n'
systemctl list-timers streamhouse-update.timer --no-pager
printf '\nStan i logi: journalctl -u streamhouse-update.service -n 30 --no-pager\n'
printf 'Ręczne sprawdzenie: systemctl start streamhouse-update.service\n'
printf 'Wyłączenie: systemctl disable --now streamhouse-update.timer\n'