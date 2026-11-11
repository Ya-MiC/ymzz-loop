use std::env;
use std::io::BufRead;
use std::path::PathBuf;
use std::sync::Arc;
use ymzz_vibe::engine::App;
use ymzz_vibe::mcp;
use ymzz_vibe::net;
use ymzz_vibe::util;

fn main() {
    let mut args = env::args().skip(1).collect::<Vec<_>>();
    if args.is_empty() {
        print_help();
        std::process::exit(2);
    }
    let cmd = args.remove(0);
    match cmd.as_str() {
        "serve" => serve(&args),
        "desktop" => desktop(&args),
        "mcp" => mcp_stdio(),
        "capabilities" => {
            println!("{}", ymzz_vibe::capabilities::matrix());
        }
        "help" | "--help" | "-h" => print_help(),
        other => {
            eprintln!("unknown command {other}");
            print_help();
            std::process::exit(2);
        }
    }
}

fn serve(args: &[String]) {
    let mut port = 413u16;
    let mut data = default_data();
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--port" => {
                port = net::parse_port(args.get(i + 1).map(String::as_str).unwrap_or(""))
                    .unwrap_or_else(|e| {
                        eprintln!("{e}");
                        std::process::exit(2);
                    });
                i += 2;
            }
            "--data" => {
                data = PathBuf::from(args.get(i + 1).cloned().unwrap_or_default());
                i += 2;
            }
            other => {
                eprintln!("unknown argument {other}");
                std::process::exit(2);
            }
        }
    }
    if let Err(err) = net::parse_bind_host("127.0.0.1") {
        eprintln!("{err}");
        std::process::exit(1);
    }
    let app = match App::open(&data, &util::repo_root()) {
        Ok(app) => Arc::new(app),
        Err(err) => {
            eprintln!("open data dir: {err}");
            std::process::exit(1);
        }
    };
    eprintln!("local-first core. Payment screen is a sandbox demo, not a merchant checkout.");
    eprintln!(
        "session token is in {} (mode 0600). This process will not sudo.",
        data.join("session.token").display()
    );
    if let Err(err) = ymzz_vibe::http::bind_and_serve(app, port) {
        eprintln!("{err}");
        std::process::exit(1);
    }
}

fn desktop(args: &[String]) {
    let mut port = 1413u16;
    let mut data = default_data();
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--port" => {
                port = net::parse_port(args.get(i + 1).map(String::as_str).unwrap_or(""))
                    .unwrap_or_else(|e| {
                        eprintln!("{e}");
                        std::process::exit(2);
                    });
                i += 2;
            }
            "--data" => {
                data = PathBuf::from(args.get(i + 1).cloned().unwrap_or_default());
                i += 2;
            }
            other => {
                eprintln!("unknown argument {other}");
                std::process::exit(2);
            }
        }
    }
    eprintln!("desktop listens on 127.0.0.1:{port}. Port 413 is privileged; this program will not sudo or pick another port.");
    let app = match App::open(&data, &util::repo_root()) {
        Ok(app) => Arc::new(app),
        Err(err) => {
            eprintln!("open data dir: {err}");
            std::process::exit(1);
        }
    };
    let server = Arc::clone(&app);
    std::thread::spawn(move || {
        if let Err(err) = ymzz_vibe::http::bind_and_serve(server, port) {
            eprintln!("{err}");
        }
    });
    for _ in 0..50 {
        if std::net::TcpStream::connect(("127.0.0.1", port)).is_ok() {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
    ymzz_vibe::shell::open(app, port);
    std::process::exit(0);
}

fn mcp_stdio() {
    let data = default_data();
    let app = App::open(&data, &util::repo_root()).unwrap_or_else(|e| {
        eprintln!("{e}");
        std::process::exit(1);
    });
    let stdin = std::io::stdin();
    let mut locked = stdin.lock();
    for line in BufRead::lines(&mut locked) {
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        let out = mcp::handle(&app, &line);
        println!("{out}");
    }
}

fn default_data() -> PathBuf {
    if let Ok(p) = env::var("YMZZ_DATA_DIR") {
        return PathBuf::from(p);
    }
    env::var("HOME")
        .map(|h| PathBuf::from(h).join(".local/share/ymzz-vibe"))
        .unwrap_or_else(|_| PathBuf::from("/tmp/ymzz-vibe"))
}

fn print_help() {
    println!(
        "ymzz-vibe {version}\n\
         Local-first file, conversation, and review core for the Alipay hackathon demo.\n\
         The payment screen is a sandbox. It does not charge a merchant account.\n\n\
         Commands:\n\
           ymzz-vibe desktop [--port 1413] [--data DIR]\n\
           ymzz-vibe serve [--port 1413] [--data DIR]\n\
           ymzz-vibe mcp\n\
           ymzz-vibe capabilities\n\n\
         Port 413 is decimal. If binding it is denied, this program will not sudo.\n\
         Pass --port 1413 yourself. It will not switch ports on its own.\n\
         Listens on 127.0.0.1 only.",
        version = env!("CARGO_PKG_VERSION")
    );
}
