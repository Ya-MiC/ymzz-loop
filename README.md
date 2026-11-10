# 稟冊

稟冊是晏銘湛箴（ymzz）的本機私人事務稟報。它留在你這台電腦上，把檔案、對話和復盤收成一份給你看的彙報。稱呼、電話和金鑰不送走。

「稟」是呈給擁有者的報告，「冊」是留在本機的那一本。產品要交的是這份彙報，不是一個搜尋框，也不是放在別處的共享資料庫。

安裝檔名是 `ymzz-bingce`。視窗標題是「稟冊」。

## 下載

這些檔案由 [安裝檔工作流程](https://github.com/Ya-MiC/ymzz-loop/actions/workflows/installers.yml) 在分支 `cursor/v021-integrated-app-e023` 上產生。工作流程成功之後，會放到 GitHub 的**草稿預發行** `v0.21.0-preview`（不公開，不收費）。草稿要登入這個儲存庫才看得到：[Releases](https://github.com/Ya-MiC/ymzz-loop/releases)。同一次執行也會把檔案留在 Actions 的 artifacts。

| 系統 | 你要下載的檔 | 現況 |
| --- | --- | --- |
| Windows | [`.msi`](https://github.com/Ya-MiC/ymzz-loop/releases/download/untagged-4bf6ff0326917ba02f0e/ymzz-bingce_0.21.0_x64_en-US.msi) 與 [`.exe`](https://github.com/Ya-MiC/ymzz-loop/releases/download/untagged-4bf6ff0326917ba02f0e/ymzz-bingce_0.21.0_x64-setup.exe) | 已在草稿裡 |
| macOS | [`.dmg`](https://github.com/Ya-MiC/ymzz-loop/releases/download/untagged-4bf6ff0326917ba02f0e/ymzz-bingce_0.21.0_aarch64.dmg)（未簽名，Apple 晶片） | 已在草稿裡 |
| Linux | [`.deb`](https://github.com/Ya-MiC/ymzz-loop/releases/download/untagged-4bf6ff0326917ba02f0e/ymzz-bingce_0.21.0_amd64.deb) 與 [`.AppImage`](https://github.com/Ya-MiC/ymzz-loop/releases/download/untagged-4bf6ff0326917ba02f0e/ymzz-bingce_0.21.0_amd64.AppImage) | 已在草稿裡 |
| Android | `.apk` 可側載；上架要用 `.aab` | 還沒有檔。手機裡沒有本機核心，就算之後做出殼，也不能打開彙報。沒有上架 Google Play |
| iOS | 模擬器建置 | 還沒有檔。沒有簽過名的 `.ipa`，也沒有 TestFlight 或 App Store。那需要你自己的 Apple 開發者帳號 |

草稿頁（要登入）：https://github.com/Ya-MiC/ymzz-loop/releases/tag/untagged-4bf6ff0326917ba02f0e

同一批檔也在這次成功的工作流程裡：https://github.com/Ya-MiC/ymzz-loop/actions/runs/42791344089

### macOS 被系統擋住時

安裝檔沒有簽名。打開時若出現「無法驗證開發者」：

1. 在 Finder 對 `ymzz-bingce` 按右鍵，選「打開」，再按「打開」。
2. 或到「系統設定 → 隱私權與安全性」，在封鎖訊息旁邊按「仍要打開」。

### Android 上架清單（還沒做）

Google Play 要你自己的開發者帳號，這份儲存庫沒有代為註冊，也沒有上傳。若你之後要上架，準備這些：

- 應用程式名稱：稟冊
- 套件名稱：`dev.ymzz.bingce`
- 上傳 `.aab`，不要把側載用的 `.apk` 當成上架檔
- 短說明：留在這台裝置上的私人事務稟報
- 隱私說明：檔案、稱呼、電話和金鑰留在裝置上；沙箱收款不會扣款
- 內容分級、商店截圖、以及你自己的開發者帳號

側載時要在裝置上允許未知來源。現在還沒有一份可以這樣裝、而且打得開彙報的 Android 檔。

## 第一次打開

共 6 步。每一步有進度、返回，以及可以跳過的地方。主按鈕只有一個。

1. 怎麼稱呼你。不填電話時預設是「用戶」。有電話時是「用戶」加電話最後四碼。電話只留在這台電腦。字母或不足 8 個數字會停下來說明。
2. 選一個資料夾。沒有子資料夾時寫「這裡沒有子資料夾。」
3. 東西留在這台電腦。
4. 文件辨識可以以後再裝。主按鈕是「開始準備」，「先跳過」不下載。
5. 連接可以以後再設。
6. 看彙報。

下面是 Linux 上實際點過的畫面。其他系統要等安裝檔做出來才能拍。

![第 1 步，稱呼](docs/onboarding/01-nickname.png)

![電話含字母時停住](docs/onboarding/01-phone-invalid.png)

![有電話時提示預設稱呼](docs/onboarding/01-phone-hint.png)

![第 2 步，空資料夾](docs/onboarding/02-folder.png)

![第 3 步，留在這台電腦](docs/onboarding/03-privacy.png)

![第 4 步，辨識可之後再裝](docs/onboarding/04-ocr.png)

![第 5 步，連接可之後再設](docs/onboarding/05-connectors.png)

![第 6 步，準備看彙報](docs/onboarding/06-finish.png)

![進入彙報](docs/onboarding/07-dashboard.png)

## 開始用

從安裝檔打開「稟冊」。視窗會連到這台電腦上的 `127.0.0.1`，不需要先裝別的執行環境。

若你是從原始碼跑，在儲存庫根目錄：

```sh
sh scripts/prepare-tauri-core.sh
cargo install tauri-cli --version 2.12.4 --locked
cargo tauri build --bundles deb,appimage
```

第二行的 `cargo tauri` 要在 `src-tauri` 目錄執行，或加上 `--config src-tauri/tauri.conf.json`。核心必須先編譯，視窗才找得到它。

## 裡頭有什麼

- 檔案整理：選資料夾、掃描、查詢、寫入筆記。這是原來 v0.20 那條線。
- 對話紀錄：留在本機。可以看、搜尋、匯入一份合成匯出、設定保留天數。Codex 與 Claude 的路徑只看本機有沒有那個程式，不把句子送到帳號。
- 600 日復盤：彙報上可以跑每日檢查。檢查在這台電腦上，不連你的帳號。
- 彙報：檔案數、對話數、沙箱訂單、時區。這台機器沒有自己的時區時，顯示首爾。
- 文件：有文字的 PDF 會收進可搜尋的紀錄。沒有文字層的 PDF 會請你改選圖片。掃描圖片要另外準備辨識。
- 沙箱收款：頁面跳回來不算付款。不會真的扣款。正式商店的帳號沒有放在這裡。

## 套件

2026-11-10 查過：npm 上的 `ymzz`、`@ymzz/bingce`，以及 PyPI 上的 `ymzz`、`ymzz-bingce`，都還沒有人發佈。

本儲存庫裡有兩份還沒發佈的套件：

- `packages/ymzz`：Node SDK 與 `ymzz` 指令。算預設稱呼和 600 日章節。`npm test` 與 `npm pack` 已通過。
- `packages/ymzz-py`：Python SDK。算稱呼，並拒絕危險的封存路徑。`python -m build` 與 `twine check` 已通過。

沒有你的權杖，不會發佈。你要發佈時：

1. 在 npm 建立帳號，把 Automation token 存成這個儲存庫的 Actions secret，名字必須是 `NPM_TOKEN`。
2. 在 PyPI 用 Trusted Publishing，專案名 `ymzz`，對準工作流程 `.github/workflows/publish-packages.yml`。
3. 到 Actions 手動跑 `publish-packages`，把輸入 `publish` 設為 true。預設是 false，只打包、不發佈。沒有 `NPM_TOKEN` 時，npm 那一步會失敗而且不會上傳。

## 現況

| 項目 | 狀態 |
| --- | --- |
| 本機核心、彙報、檔案整理、沙箱收款 | 有測試，在這台電腦上跑過 |
| 第一次開啟的六個畫面 | Linux 上點過，截圖在上面 |
| Tauri 2 視窗 | 原始碼在 `src-tauri`。核心是旁邊的程式，因為核心還用 Rust 1.83，Tauri 2.12 需要更新的套件，不能編成同一個程式 |
| Linux / Windows / macOS 安裝檔 | 草稿裡已有 `.deb`、`.AppImage`、`.msi`、`.exe`、`.dmg` |
| Android、iOS | 還沒有能打開彙報的手機安裝檔。沒有上架 |
| 辨識模型 | 要另外準備。有文字的 PDF 不需要它 |
| 連接 Notion、試算表、文件、GitHub、飛書、Lark | 可以預覽和保存金鑰。沒有用你的帳號真的呼叫 |
| 對話和 Claude / Codex 帳號 | 沒有把句子送出去。不能說已經和那些產品對等 |
| npm、PyPI | 包好了，沒發佈 |
| 授權 | 仍是 MIT |

對打的細節在 `docs/v021-adversarial.md`。修過的一件事：嚮導原本蓋不住後面的檔案頁。安全檢查包含未授權寫入、電話不外洩、以及不讀符號連結。

---

# Bingce

Bingce (稟冊) is the local steward under the ymzz brand, 晏銘湛箴. It stays on your computer and brings you a briefing of files, conversations, and the daily review. The nickname, phone number, and keys stay on that computer.

The product is the briefing brought to its owner, and the local record that briefing comes from.

## Downloads

The [installer workflow](https://github.com/Ya-MiC/ymzz-loop/actions/workflows/installers.yml) builds on branch `cursor/v021-integrated-app-e023`. A successful run attaches files to the private GitHub draft pre-release `v0.21.0-preview` and to Actions artifacts. Drafts are free and visible only after you sign in: [Releases](https://github.com/Ya-MiC/ymzz-loop/releases).

| System | File | Status |
| --- | --- | --- |
| Windows | `.msi` and `.exe` | On the draft now |
| macOS | unsigned Apple silicon `.dmg` | On the draft now |
| Linux | `.deb` and `.AppImage` | On the draft now |
| Android | sideload `.apk`; Play needs an `.aab` | The job is allowed to try. There is no mobile build that opens the briefing. Nothing was uploaded to Google Play |
| iOS | simulator build | No signed `.ipa`, no TestFlight, no App Store. Those need your Apple developer account |

If macOS blocks the unsigned app: right-click it, choose Open, then Open again. Or use System Settings → Privacy & Security → Open Anyway.

Google Play still needs your own developer account. The listing to prepare is the name 稟冊, package `dev.ymzz.bingce`, an `.aab`, and a privacy description that says data stays on the device and the payment screen does not charge. Do not treat a sideload APK as a store upload.

## First run

Six screens, in Traditional Chinese: nickname, folder, local-only explanation, optional recognition download, optional connectors, then the briefing. The default nickname is 用戶 plus the last four digits of a phone number kept only on this computer. Screenshots from Linux are in the Chinese section above.

## What is included

File organization from v0.20, local conversation records, a 600-day review, the briefing, document reading, and the Vibe Pay sandbox. The sandbox does not charge. A page redirect is not a payment. No merchant account is stored here.

## Packages

On 2026-11-10, `ymzz` and `@ymzz/bingce` were unpublished on npm, and `ymzz` and `ymzz-bingce` were unpublished on PyPI. This repo contains `packages/ymzz` and `packages/ymzz-py`. `npm pack` and `twine check` passed. Nothing was published.

To publish: set the Actions secret `NPM_TOKEN`, configure PyPI trusted publishing for project `ymzz` and workflow `publish-packages.yml`, then run that workflow manually with `publish` set to true.

## Status

The local core, the six-step first run on Linux, and the Tauri 2 window are in this branch. The draft pre-release has the Windows, macOS, and Linux installers. Android and iOS do not open the briefing, because the core still builds on Rust 1.83 and Tauri 2.12 cannot be linked into that same crate graph. Connectors are previews. Conversation tools do not send text to Claude or Codex accounts. The license is still MIT.

Adversarial notes: `docs/v021-adversarial.md`.

## This run

- 檢查（`ci`）：[成功](https://github.com/Ya-MiC/ymzz-loop/actions/runs/42791344250)
- 核心測試（`v021`）：Windows 與 macOS 已通過。Linux 的迴圈測試曾在標頭到齊、內文還沒到時就把連線關掉，已改成讀完整個請求再回答。
- 安裝檔：[42791344089](https://github.com/Ya-MiC/ymzz-loop/actions/runs/42791344089) 成功。草稿裡有 `.deb`、`.AppImage`、`.msi`、`.exe`、`.dmg`。
- 這台機器已打開過 Linux 套件。頁面是「怎麼稱呼你」。

Android 的 SDK 步驟已通過，建置停在「這個視窗套件沒有 library」。iOS 停在找不到 `binaries/core`，而且沒有簽章憑證。兩支都還做不出能打開彙報的手機安裝檔。沒有上架。
