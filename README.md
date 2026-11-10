# 稟冊

稟冊是晏銘湛箴（ymzz）的本機私人事務稟報，也是 Alipay PAYATHON 2026 **Vibe Pay 賽道**的作品。設計 Skill 那一份是另一個儲存庫的 Skill 賽道，不在這裡。這份作品留在你這台電腦上，把檔案、對話、復盤和沙箱收款收成一份給你看的彙報。稱呼、電話和金鑰不送走。

「稟」是呈給擁有者的報告，「冊」是留在本機的那一本。產品要交的是這份彙報，不是一個搜尋框，也不是放在別處的共享資料庫。

沙箱收款是 Vibe Pay 沙箱：建立訂單、簽名通知、簽名查單、交付和退一部分。頁面跳回來不算付款。不會真的扣款，也沒有放正式商店的帳號。這不是得獎聲明，也沒有付費用戶。

安裝檔名是 `ymzz-bingce`。視窗標題是「稟冊」。

## 下載

這些檔案由 [安裝檔工作流程](https://github.com/Ya-MiC/ymzz-loop/actions/workflows/installers.yml) 在分支 `cursor/v021-integrated-app-e023` 上產生。最新一次成功是 [42803995058](https://github.com/Ya-MiC/ymzz-loop/actions/runs/42803995058)，檔案在 GitHub 的**草稿預發行** `v0.21.0-preview`（不公開，不收費）。草稿要登入這個儲存庫才看得到：[Releases](https://github.com/Ya-MiC/ymzz-loop/releases)。同一次執行也會把檔案留在 Actions 的 artifacts。

| 系統 | 你要下載的檔 | 現況 |
| --- | --- | --- |
| Windows | [`.msi`](https://github.com/Ya-MiC/ymzz-loop/releases/download/untagged-4bf6ff0326917ba02f0e/ymzz-bingce_0.21.0_x64_en-US.msi) 與 [`.exe`](https://github.com/Ya-MiC/ymzz-loop/releases/download/untagged-4bf6ff0326917ba02f0e/ymzz-bingce_0.21.0_x64-setup.exe) | 已在草稿裡 |
| macOS | [`.dmg`](https://github.com/Ya-MiC/ymzz-loop/releases/download/untagged-4bf6ff0326917ba02f0e/ymzz-bingce_0.21.0_aarch64.dmg)（未簽名，Apple 晶片） | 已在草稿裡 |
| Linux | [`.deb`](https://github.com/Ya-MiC/ymzz-loop/releases/download/untagged-4bf6ff0326917ba02f0e/ymzz-bingce_0.21.0_amd64.deb) 與 [`.AppImage`](https://github.com/Ya-MiC/ymzz-loop/releases/download/untagged-4bf6ff0326917ba02f0e/ymzz-bingce_0.21.0_amd64.AppImage) | 已在草稿裡 |
| Android | 未簽名的 `.apk`（側載）。上架要用 `.aab` | [這次的 artifact](https://github.com/Ya-MiC/ymzz-loop/actions/runs/42803995058) 裡有未簽名的 apk。裡面沒有本機核心，不能打開彙報。沒有 `.aab`，沒有上架 Google Play |
| iOS | 模擬器 `.app` | 同一次 artifact 裡有 `ymzz-bingce.app`（Apple 晶片模擬器）。沒有 `.ipa`，沒有簽給真機，沒有 TestFlight 或 App Store。那需要你自己的 Apple 開發者帳號 |

草稿頁（要登入）：https://github.com/Ya-MiC/ymzz-loop/releases/tag/untagged-4bf6ff0326917ba02f0e

同一批檔也在這次成功的工作流程裡：https://github.com/Ya-MiC/ymzz-loop/actions/runs/42803995058

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
2. 點一個位置。桌面、文件、下載，以及這台電腦上找得到的 Codex、Claude、Cursor、ChatGPT 資料夾，都會列出來。不用自己打路徑。沒有子資料夾時寫「這裡沒有子資料夾。」
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

跳過資料夾時，彙報會先放進合成樣本和一則對話，所以數字不是空的。點數字就到那一頁。側欄、底部（窄螢幕）和「跳到」都能換頁。窄螢幕的側欄收成抽屜，不會蓋住彙報。

下面是 Linux 上用核心和瀏覽器點過的畫面。1100 寬是桌面，390 寬是手機寬度。還沒在裝好的 Windows `.exe`、Linux AppImage，或手機殼裡點過。

![彙報，數字可以點](docs/clickthrough/03-home.png)

![對話](docs/clickthrough/06-talk.png)

![沙箱收款](docs/clickthrough/page-pay.png)

![390 寬，側欄收起](docs/clickthrough/07-mobile-home.png)

![390 寬，選單抽屜](docs/clickthrough/08-mobile-drawer.png)

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
- 沙箱收款：Vibe Pay 沙箱。頁面跳回來不算付款。不會真的扣款。正式商店的帳號沒有放在這裡。

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
| 頁面跳轉、不用打路徑、窄螢幕選單 | Linux 上用核心點過 88 個控制項，含 390 寬的抽屜。截圖在上面。裝好的 Windows `.exe`、AppImage、手機殼還沒這樣點過 |
| Tauri 2 視窗 | 原始碼在 `src-tauri`。核心是旁邊的程式，因為核心還用 Rust 1.83，Tauri 2.12 需要更新的套件，不能編成同一個程式 |
| Linux / Windows / macOS 安裝檔 | 草稿裡已有 `.deb`、`.AppImage`、`.msi`、`.exe`、`.dmg` |
| Android、iOS | 有未簽名的殼，沒有本機核心，不能打開彙報。沒有上架 |
| 辨識模型 | 要另外準備。有文字的 PDF 不需要它 |
| 連接 Notion、試算表、文件、GitHub、飛書、Lark | 可以預覽和保存金鑰。沒有用你的帳號真的呼叫 |
| 對話和 Claude / Codex 帳號 | 沒有把句子送出去。不能說已經和那些產品對等 |
| npm、PyPI | 包好了，沒發佈 |
| 授權 | 仍是 MIT |

對打的細節在 `docs/v021-adversarial.md`。修過的一件事：嚮導原本蓋不住後面的檔案頁。安全檢查包含未授權寫入、電話不外洩、以及不讀符號連結。

---

# Bingce

Bingce (稟冊) is the local steward under the ymzz brand, 晏銘湛箴, and the Alipay PAYATHON 2026 Vibe Pay track entry. The design Skill lives in a separate repository and is the Skill-track entry. Bingce stays on your computer and brings you a briefing of files, conversations, the daily review, and a sandbox payment. The nickname, phone number, and keys stay on that computer.

The product is the briefing brought to its owner, and the local record that briefing comes from.

## Downloads

The [installer workflow](https://github.com/Ya-MiC/ymzz-loop/actions/workflows/installers.yml) builds on branch `cursor/v021-integrated-app-e023`. A successful run attaches files to the private GitHub draft pre-release `v0.21.0-preview` and to Actions artifacts. Drafts are free and visible only after you sign in: [Releases](https://github.com/Ya-MiC/ymzz-loop/releases).

| System | File | Status |
| --- | --- | --- |
| Windows | `.msi` and `.exe` | On the draft now |
| macOS | unsigned Apple silicon `.dmg` | On the draft now |
| Linux | `.deb` and `.AppImage` | On the draft now |
| Android | unsigned sideload `.apk`; Play needs an `.aab` | An unsigned universal APK is in the installer artifacts. It does not contain the local core, so it does not open the briefing. No `.aab`, nothing uploaded to Google Play |
| iOS | simulator `.app` | An Apple silicon simulator app is in those artifacts. No `.ipa`, no device signature, no TestFlight, no App Store. Those need your Apple developer account |

If macOS blocks the unsigned app: right-click it, choose Open, then Open again. Or use System Settings → Privacy & Security → Open Anyway.

Google Play still needs your own developer account. The listing to prepare is the name 稟冊, package `dev.ymzz.bingce`, an `.aab`, and a privacy description that says data stays on the device and the payment screen does not charge. Do not treat a sideload APK as a store upload.

## First run

Six screens, in Traditional Chinese: nickname, folder, local-only explanation, optional recognition download, optional connectors, then the briefing. The default nickname is 用戶 plus the last four digits of a phone number kept only on this computer. Screenshots from Linux are in the Chinese section above.

## What is included

File organization from v0.20, local conversation records, a 600-day review, the briefing, document reading, and the Vibe Pay sandbox. Suggested places replace typed paths. Cards, the sidebar, the narrow-screen drawer, and the jump palette all open a real page. The sandbox does not charge. A page redirect is not a payment. No merchant account is stored here. This is not a claim that the contest is won, and there is no paid-user result.

## Packages

On 2026-11-10, `ymzz` and `@ymzz/bingce` were unpublished on npm, and `ymzz` and `ymzz-bingce` were unpublished on PyPI. This repo contains `packages/ymzz` and `packages/ymzz-py`. `npm pack` and `twine check` passed. Nothing was published.

To publish: set the Actions secret `NPM_TOKEN`, configure PyPI trusted publishing for project `ymzz` and workflow `publish-packages.yml`, then run that workflow manually with `publish` set to true.

## Status

The local core, the six-step first run on Linux, and the Tauri 2 window are in this branch. A Linux click-through drove 88 controls, including the 390px drawer, against the core in a browser. The installed Windows `.exe`, the AppImage, and the phone shells were not click-tested that way. The draft pre-release now has the Windows, macOS, and Linux installers from that run. Android and iOS artifacts are shells without the local core, so they do not open the briefing. Connectors are previews. Conversation tools do not send text to Claude or Codex accounts. The license is still MIT. The approved palette is unchanged.

Adversarial notes: `docs/v021-adversarial.md`.

## This run

- 檢查（`ci`）：[成功](https://github.com/Ya-MiC/ymzz-loop/actions/runs/42803997216)
- 核心測試（`v021`）：[成功](https://github.com/Ya-MiC/ymzz-loop/actions/runs/42803995214)。Linux 點擊測試、Windows 與 macOS 核心測試都過了。
- 桌面安裝檔已換上這一版，在草稿裡。五個系統的檔案在 [42803995058](https://github.com/Ya-MiC/ymzz-loop/actions/runs/42803995058)：`.deb`、`.AppImage`、`.msi`、`.exe`、`.dmg`，加上未簽名的 Android `.apk` 和 iOS 模擬器 `.app`。
- Linux 上用核心和瀏覽器點過 88 個控制項，含 390 寬的抽屜。還沒打開這一版的 `.exe` 或 AppImage 來點。

手機上的兩個檔是視窗殼，沒有本機核心，不能打開彙報。沒有上架。
