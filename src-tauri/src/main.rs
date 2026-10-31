// Niente finestra del terminale accanto all'app su Windows, nella versione rilasciata
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    lowcor_lib::run();
}
