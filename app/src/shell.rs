//! Linux window. GTK 3 plus the system WebKitGTK 4.1 load the loopback UI.
//! The folder button is a GTK file chooser. Tauri is not used. Other
//! platforms compile the core and do not open this window.

use std::sync::Arc;

#[cfg(target_os = "linux")]
mod linux {
    use super::*;
    use crate::engine::App;
    use gtk::glib;
    use gtk::prelude::*;
    use webkit2gtk::WebViewExt;

    pub fn open(app: Arc<App>, port: u16) {
        gtk::init().unwrap_or_else(|err| {
            eprintln!("gtk init failed: {err}");
            std::process::exit(1);
        });
        let window = gtk::Window::new(gtk::WindowType::Toplevel);
        window.set_title("ymzz-loop");
        window.set_default_size(1120, 780);
        let header = gtk::HeaderBar::new();
        header.set_title(Some("ymzz-loop"));
        header.set_show_close_button(true);
        let pick = gtk::Button::with_label("選擇資料夾");
        header.pack_start(&pick);
        window.set_titlebar(Some(&header));
        let web = webkit2gtk::WebView::new();
        let url = format!("http://127.0.0.1:{port}/");
        web.load_uri(&url);
        window.add(&web);
        let app_pick = Arc::clone(&app);
        let web_pick = web.clone();
        let window_pick = window.clone();
        let url_pick = url.clone();
        pick.connect_clicked(move |_| {
            let dialog = gtk::FileChooserDialog::with_buttons(
                Some("選擇資料夾"),
                Some(&window_pick),
                gtk::FileChooserAction::SelectFolder,
                &[
                    ("取消", gtk::ResponseType::Cancel),
                    ("使用這個資料夾", gtk::ResponseType::Accept),
                ],
            );
            let chosen = if dialog.run() == gtk::ResponseType::Accept {
                dialog.filename()
            } else {
                None
            };
            dialog.close();
            if let Some(path) = chosen {
                match app_pick.set_root(&path.to_string_lossy()) {
                    Ok(_) => web_pick.load_uri(&url_pick),
                    Err(err) => eprintln!("root: {err}"),
                }
            }
        });
        window.connect_delete_event(|_, _| {
            gtk::main_quit();
            glib::Propagation::Proceed
        });
        window.show_all();
        let _ = app;
        gtk::main();
    }
}

pub fn open(app: Arc<crate::engine::App>, port: u16) {
    #[cfg(target_os = "linux")]
    linux::open(app, port);
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (app, port);
        eprintln!("this binary's window is the Linux GTK build. No window was opened here.");
    }
}
