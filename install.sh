#!/bin/sh
# Installa LowCor per l'utente corrente, senza sudo, come Devtox.
#
#   sh install.sh              compila (se serve) e installa in ~/.local
#   sh install.sh --uninstall  rimuove programma, voce del menu e icone (i dati restano)
#
# Mette il programma in ~/.local/bin, la voce nel menu delle applicazioni e il logo.
# La finestra si presenta al sistema come "lowcor": è lo stesso nome del file .desktop,
# così GNOME, KDE e gli altri mostrano il logo giusto nella barra e nel dock.
set -eu

src="$(cd "$(dirname "$0")" && pwd)"
prefix="${PREFIX:-$HOME/.local}"
bin="$prefix/bin"
apps="$prefix/share/applications"
icons="$prefix/share/icons/hicolor"
desktop="$apps/lowcor.desktop"

refresh() {
    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$apps" || true
    command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t "$icons" || true
}

if [ "${1:-}" = "--uninstall" ]; then
    rm -f "$bin/lowcor" "$desktop"
    for size in 32x32 128x128 256x256 scalable; do
        rm -f "$icons/$size/apps/lowcor.png" "$icons/$size/apps/lowcor.svg"
    done
    refresh
    echo "LowCor rimosso. I tuoi dati restano in ~/.local/share/lowcor."
    exit 0
fi

binary="$src/src-tauri/target/release/lowcor"
if [ ! -x "$binary" ] || [ "${1:-}" = "--rebuild" ]; then
    echo "Compilo LowCor (la prima volta ci vogliono alcuni minuti)..."
    (cd "$src" && npm install --no-audit --no-fund && PATH="$HOME/.cargo/bin:$PATH" npx tauri build --no-bundle)
fi

mkdir -p "$bin" "$apps" "$icons/32x32/apps" "$icons/128x128/apps" "$icons/256x256/apps" "$icons/scalable/apps"
install -m 755 "$binary" "$bin/lowcor"
install -m 644 "$src/src-tauri/icons/32x32.png" "$icons/32x32/apps/lowcor.png"
install -m 644 "$src/src-tauri/icons/128x128.png" "$icons/128x128/apps/lowcor.png"
install -m 644 "$src/src-tauri/icons/128x128@2x.png" "$icons/256x256/apps/lowcor.png"
install -m 644 "$src/public/favicon.svg" "$icons/scalable/apps/lowcor.svg"

cat > "$desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=LowCor
GenericName=Routine e focus
Comment=Routine, focus e obiettivi, tutto in locale
Exec=$bin/lowcor
Icon=lowcor
StartupWMClass=lowcor
Categories=Office;Calendar;
Keywords=routine;focus;calendario;obiettivi;adhd;
Terminal=false
DESKTOP
refresh

echo
echo "Installato. Trovi LowCor nel menu delle applicazioni, oppure avvialo con: lowcor"
case ":$PATH:" in
    *":$bin:"*) ;;
    *) echo "Attenzione: $bin non è nel PATH, dal terminale usa $bin/lowcor" ;;
esac
