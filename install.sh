#!/bin/sh
# Installa LowCor per l'utente corrente, senza sudo, come Devtox.
#
#   sh install.sh                scarica l'ultima versione (AppImage) da GitHub: si aggiorna da sola
#   sh install.sh --from-source  compila dai sorgenti di questa cartella (serve Rust; niente aggiornamenti automatici)
#   sh install.sh --uninstall    rimuove programma, voce del menu e icone (i dati restano)
#
# Mette la voce nel menu delle applicazioni e il logo. La finestra si presenta al sistema come
# "lowcor": è lo stesso nome del file .desktop, così GNOME, KDE e gli altri mostrano il logo giusto.
set -eu

repo="Tommaso-Palestini/LowCor-motivational-app"
src="$(cd "$(dirname "$0")" && pwd)"
prefix="${PREFIX:-$HOME/.local}"
bin="$prefix/bin"
apps="$prefix/share/applications"
icons="$prefix/share/icons/hicolor"
appdir="$prefix/share/lowcor-app"
desktop="$apps/lowcor.desktop"

refresh() {
    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$apps" || true
    command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t "$icons" || true
}

case "${1:-}" in
    --uninstall)
        rm -f "$bin/lowcor" "$desktop" "$appdir/LowCor.AppImage"
        rmdir "$appdir" 2>/dev/null || true
        for size in 32x32 128x128 256x256 scalable; do
            rm -f "$icons/$size/apps/lowcor.png" "$icons/$size/apps/lowcor.svg"
        done
        refresh
        echo "LowCor rimosso. I tuoi dati restano in ~/.local/share/lowcor."
        exit 0
        ;;
    --from-source)
        echo "Compilo LowCor (la prima volta ci vogliono alcuni minuti)..."
        (cd "$src" && npm install --no-audit --no-fund && PATH="$HOME/.cargo/bin:$PATH" npx tauri build --no-bundle)
        mkdir -p "$bin"
        rm -f "$appdir/LowCor.AppImage"
        install -m 755 "$src/src-tauri/target/release/lowcor" "$bin/lowcor"
        exec_path="$bin/lowcor"
        ;;
    "")
        command -v curl >/dev/null 2>&1 || { echo "Serve curl."; exit 1; }
        echo "Cerco l'ultima versione su GitHub..."
        url="$(curl -fsSL "https://api.github.com/repos/$repo/releases/latest" \
            | grep -o '"browser_download_url": *"[^"]*\.AppImage"' | head -n 1 | sed 's/.*"\(https[^"]*\)"/\1/')"
        if [ -z "$url" ]; then
            echo "Non trovo un'AppImage nell'ultima versione. Puoi compilare dai sorgenti: sh install.sh --from-source"
            exit 1
        fi
        mkdir -p "$appdir" "$bin"
        echo "Scarico $(basename "$url")..."
        curl -fL --progress-bar -o "$appdir/LowCor.AppImage.part" "$url"
        mv "$appdir/LowCor.AppImage.part" "$appdir/LowCor.AppImage"
        chmod 755 "$appdir/LowCor.AppImage"
        ln -sf "$appdir/LowCor.AppImage" "$bin/lowcor"
        exec_path="$appdir/LowCor.AppImage"
        if ! ldconfig -p 2>/dev/null | grep -q "libfuse.so.2"; then
            echo "Attenzione: le AppImage hanno bisogno di FUSE 2. Su Ubuntu 24.04: sudo apt install libfuse2t64"
        fi
        ;;
    *)
        echo "Uso: sh install.sh [--from-source | --uninstall]"
        exit 1
        ;;
esac

mkdir -p "$apps" "$icons/32x32/apps" "$icons/128x128/apps" "$icons/256x256/apps" "$icons/scalable/apps"
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
Exec=$exec_path
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
