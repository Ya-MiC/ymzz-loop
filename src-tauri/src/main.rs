//! Desktop entry. The window implementation lives in the library so the
//! Android and iOS builds have a crate to compile.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ymzz_bingce_lib::run();
}
