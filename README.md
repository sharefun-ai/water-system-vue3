# Water System 3D SCADA · 3.11.1

獨立複本：`C:\xampp\htdocs\水系統3.0\Water System 3D SCADA`。來源 Vue3 舊專案保留於隔壁資料夾。

## 開啟

XAMPP 已建置頁面：`http://127.0.0.1:8080/水系統3.0/Water%20System%203D%20SCADA/dist/#/scada`。

```powershell
cd 'C:\xampp\htdocs\水系統3.0\Water System 3D SCADA'
npm run dev
# http://127.0.0.1:5188/#/scada
npm test
npm run build
```

## 3.11 全畫面互動水世界

- `/portal` 改為全畫面水面，點擊、拖曳、觸控與鍵盤會產生共享波場，帶動折射、淡藍光與水下資訊流。
- 資訊流源自既有 35 設備／24 管段的抽象拓樸，作為品牌藝術表現；實測數據與設備控制仍在原圖控頁。
- 第一次主動互動後啟動原創 Web Audio 五聲旋律，支援靜音與暫停；切頁和背景隱藏停止首頁音效及動畫。
- 畫面僅保留品牌、四個功能入口及聲音／暫停控制。手機直向二欄、橫向單列；鍵盤也能操作水面。
- 設計：`docs/interactive-water-design.md`；驗證：`docs/interactive-water-validation.md`；原首頁：`docs/backups/before-interactive-water-20261003`。
- 實際畫面：`docs/screenshots/aquatic-living-water.jpg`、`aquatic-living-water-mobile.jpg`。本次已建置 XAMPP 的 dist，未部署 Cloudflare。
## 3.10 水處理製程動畫首頁

- `/portal` 直接共用既有圖控的 35 設備與 24 管段，以 3D 即時動畫呈現回收原水、超濾淨化、產水回收與感測控制。
- 保留完整接線與設備位置，透過管路流光、透明水體、UF 局部剖面、機構動態與柔和水光呈現處理流程。
- 首頁僅顯示品牌、簡短製程章節及四個功能入口；右上有選單，可暫停、略過或重播。
- 手機直向使用縱向全景鏡頭，橫向與桌面保留完整系統。入口與播放控制支援鍵盤及觸控。
- 品牌展示不偽造即時資料；實際液位與燈號仍由圖控頁讀取。其他模組和持續海面沿用原邏輯。
- WebGL 不可用時保留原工程圖與功能入口。場景動態載入，離開首頁停止排程並釋放資源。
- 設計說明：`docs/process-film-design.md`；驗證：`docs/process-film-validation.md`；原檔：`docs/backups/before-process-film-20261003`。
## 3.7 持續海面與沉浸式切頁

- `App.vue` 僅建立一份 `LiveOcean`，趨勢、警報、報表只切換內容。切頁保留 WebGL 畫布、紋理、波紋時間和播放偏好。
- 海面固定在共用導覽後方，尺寸依視窗決定，不隨各頁高度、讀取過場或捲動改變。導覽列與頂部選單維持位置。
- 前景採先淡出再淡入，沒有放大、旋轉或大幅位移。內容交接時回到頁首；系統減少動態設定縮短淡入淡出時間。
- 日期／類別 query 改變不觸發整頁交接；實際資料請求、快取和水滴讀取過場沿用既有邏輯。
- 離開海洋頁面暫停背景绘製，回到海洋頁面續用同一畫布與波紋時間。
- 原檔：`docs/backups/before-persistent-ocean-20261003`；驗證：`docs/persistent-ocean-validation.md`。

## 3.6.1 背景接縫與 Chrome 播放

- 海面覆蓋整頁高度，移除 960px / 1000px 截斷；底部遮罩顏色與頁面一致。
- 導覽列保留 sticky 定位，整個欄位背景和分隔線延伸到頁尾。
- 海面預設柔和播放，Chrome 與內建瀏覽器不需要分別按播放；明確手動暫停仍保留。系統減少動態設定降低波動速度。
- WebGL 不可用時提供柔和圖片漂移，仍可暫停；長頁面的 WebGL 畫素上限為 240 萬。
- 原檔備份：`docs/backups/before-ocean-seams-20261003`。

## 3.6 活水背景、警報紀錄與運行報表

- 趨勢、警報與報表共用 `LiveOcean.vue`：以既有海洋影像和 WebGL 波紋、折射及反射微光呈現流动海面，使用固定儀表面板維持數字清晰。
- 桌面最高 30 FPS、手機最高 20 FPS，離開視窗或背景滑出畫面時停止繪製；支援播放／暫停，預設播放；系統減少動態設定改用更慢的波動與 20 FPS，手動暫停／播放仍記住偏好。
- 警報頁用 `alert_3.php` 的實際 14 個測點逐時記錄，呈現完整率、缺測矩陣與連續缺測區間，可篩選測點、匯出缺測 CSV 並前往對應趨勢。此頁監測資料缺測。
- 報表頁用 `search_print_data_3.php` 的原始月度記錄，提供四類摘要、每日統計、逐時明細及 Excel 四分頁／單一工作表／CSV 匯出。累計取末筆，其他量測取有效樣本平均；缺測留空、零值保留。
- 月度與日期讀取使用 60 秒記憶體快取、15 秒逾時及中止過期請求；過場沿用水滴動畫。API 失敗、有效空記錄和缺測分別呈現。
- 上述兩支後端只將連線主機改成 `127.0.0.1`；原 SQL 與資料庫記錄不變。原檔保留在 `docs/backups/before-living-ocean`。
- 日常使用開啟 XAMPP 的 **8080 /dist/** 網址；5188 只供開發預覽，需要 Vite 服務持續運作。
- 驗證紀錄：`docs/living-ocean-validation.md`。

## 3.5.1 讀取速度與水波過場

- 指定日期立即讀取趨勢，最新資料日獨立更新，移除啟動時兩支 API 的串行等待。
- `src/data/trendRepository.js` 保留此分頁已讀取的日期／類別快照，最多 30 筆：歷史資料 5 分鐘、當日 30 秒、空資料 15 秒。重新整理與當日每分鐘更新強制讀取伺服器；錯誤不快取。
- `src/data/WaterLoading.vue` 為 SVG 水滴、水波、柔和環光與淡入過場；數值使用骨架，既有曲線在更新期間保留，並尊重減少動態效果設定。
- 共享後端 `data_third.php` / `search_chart_3.php` 僅把資料庫主機由 `localhost` 改為 `127.0.0.1`，避開本機約 2 秒的連線等待。原 SQL、訊號與計算方式保留。
- 基準與驗證紀錄：`docs/trend-loading-validation.md`；過場截圖：`docs/screenshots/aquatic-trend-loading.jpg`。修改前檔案含後端備份在 `docs/backups/before-trend-loading`。

## 3.5 共用導覽與數據趨勢

- `src/components/AquaticHeader.vue`、`AquaticRail.vue` 與 `navigation.js` 共用同一套 AQUATEC 品牌、五個模組、所在頁提示與手機選單。3D、2D、趨勢、警報、報表及傳統圖控沿用相同導覽。
- 數據趨勢頁重新設計為海洋背景、七類測點篩選、單一測點統計、逐時趨勢、多曲線開關、測點摘要與可展開資料表。統計不混合不同測點。
- `src/assets/ocean-depth.webp` 是內建 imagegen 生成的自然海洋背景，搭配柔和光影；裝飾尊重減少動態效果設定。提示詞與生成資訊在 `docs/ocean-background-prompt.md`。
- 移除趨勢頁強制隨機模擬數據，讀取既有 `/水系統3.0/backend/search_chart_3.php`。JSON POST 保持 `{activeButton, today_date}`；累計水量用每小時末筆，其餘沿用後端每小時平均。
- 預設日期讀取 `data_third.php` 的最新量測日，沒有指定日期才採用。URL `#/data-trend?date=2025-05-31&metric=instantaneousFlow` 可直接指定日期／類別。
- 缺測值留空；零值仍為有效記錄。錯誤與無資料分開顯示，API 失敗不替換成隨機資料。當日資料每 60 秒更新，歷史日期手動重新整理。
- 圖表可拖曳縮放、全日復原、專注放大與 CSV 匯出。CSV 使用 UTF-8 BOM、引號跳脫及空缺時段。逐時表格提供可讀的數值替代。
- 3.5 僅重設趨勢內容；3.6 已更新警報與報表，傳統圖控沿用來源內容。
- 修改前檔案在 `docs/backups/before-aquatic-trends`；趨勢頁實際瀏覽器截圖在 `docs/screenshots/aquatic-data-trend.jpg`。

## 3.4 即時 2D 圖控

按「2D 圖控」或直接開啟 `#/scada?view=2d`。原圖對照的靜態底圖已改成可互動的向量製程圖。

- 35 個向量元件、30 個指示燈和全部 14 項原始讀值，與 3D 共用 44 路訊號。
- 槽體液面讀取原水／產水液位；金屬槽、泵浦、閥門、儀表和 UF 膜組保留原始設備編號。
- 24 條原始管路採獨立 2D 佈局，管線接到元件法蘭；槽體、馬達、燈號、標籤與數值卡各自預留空間。跨接弧表示交叉而沒有連接，圓點表示真正接點。管線動畫仍是流向示意。
- 拖曳平移、滾輪／雙指縮放；設備清單選取會定位。手機依螢幕方向放大選取設備。
- 切換模式保留資料與選取狀態；2D 開啟時暫停背後的 3D 繪製。
- 匯出向量工程圖 `models/aquatic-scada-2d.svg`，或圖片 `docs/screenshots/aquatic-scada-2d.png`。

## 3.3 圖控設計

- 3D 場景負責設備、管路、液面與實體燈號。數值維持固定儀表；設備名稱使用清楚的平面標籤與引線。
- 14 項類比量測集中於固定儀表欄；選取設備的讀值固定在圖控外的讀值列。
- 35 個設備名稱標籤預設顯示，字體大小不隨模型縮放，細引線連回設備；標籤自動避讓並可點選。
- 30 個獨立 3D 指示燈：14 閥門、7 泵浦、原水槽 5 燈、UF 產水槽 4 燈。每個燈包含燈座、立柱、金屬環、透鏡、透明外罩與柔和光暈，沿用原始數位訊號。
- 訊號 1 點亮綠色透鏡與光暈；0 熄燈；缺值或非法值為琥珀未知狀態。狀態不依管線動畫推估。
- 選取設備顯示柔和地面光暈、材質高亮與固定讀值列的名称呼吸效果。
- 手機橫向為模型與單一設備讀值並排；「儀表」「設備」按需展開，選取設備後自動收起。沒有超寬畫布捲動。
- 手机保留模組導覽選單，可前往趨勢、警報、報表與傳統圖控。
- 情境模擬與迴路切換維持移除；可用立體、俯視、正視和專注模式。

## 資料連接

預設 API 是同源 `/水系統3.0/backend/data_third.php`；開發代理 `/backend` 預設指向 XAMPP 8080。環境變數 `SCADA_PROXY_TARGET` / `VITE_SCADA_API` 可更改來源。

維持 `latest_data` 與 `check_data` 陣列格式、14 類比 + 30 數位的原 `element_no`、單位與警戒門檻。每三秒嘗試讀取，請求進行中不重複發送；請求逾時十五秒、資料逾時二十秒、量測時間超過兩分鐘顯示歷史數據。

歷史資料保留最後讀值、燈號與液面；只有有效運轉訊號使泵浦轉子轉動並提高管線亮度。持續光點表示流向；不是逐管段實測流量。固定參考資料需手動選用，不會自動替換 API 故障資料。

## 原始訊號與模型

- UF 四燈是 138 HH、139 H、158 M、140 L；原圖印字與程式字典有差異，保留來源 M 定義。
- 原水五燈是 120 HH、121 H、157 M、122 L、123 LL。
- 液面沿用訊號 114 / 115，T-01 / T-02 視覺量程為 0–1.8 / 0–6 cm，維持原單位。沒有實體槽高資料，幾何比例仍為示意。
- NaOCl 和 T-03 沒有液位訊號；沒有推估液面。UF 六支膜筒為外觀示意。
- `src/digital-twin/plantScene.js`：35 元件、30 個實體燈、24 管段、動畫與鏡頭。
- `src/digital-twin/lamps.js` / `SignalLamp.vue`：3D 透鏡狀態定義與固定面板的同步燈號元件。
- `src/digital-twin/topology.js`：設備座標、完整訊號對應與管段拓撲。
- `docs/signal-map.csv` / `.json`：全部 44 個訊號對應。
- `models/aquatic-scada-3d.glb`：可匯入 Blender，保留設備、管段、指示燈訊號 metadata。
- PNG 匯出為實際 WebGL 場景加獨立儀表欄；數值不覆蓋模型。

警報與報表於 3.6 改為實際記錄，傳統圖控沿用來源內容；所有新版頁面只讀取資料。前版修改檔備份在 `docs/backups/before-v3.3`。


## Cloudflare 公開網站與雲端模擬後端

- 正式網域：https://water.share-fun.org；Pages 專案 water-system，正式分支 main。
- 來源：https://github.com/sharefun-ai/water-system-vue3；master 推送後執行測試、建置及發布。
- 本機圖控來源：C:\xampp\htdocs\水系統3.0\Water System 3D SCADA。雲端部署來源：C:\Projects\作品集\.work\water-system-deploy。
- functions/api/[endpoint].js 在 Cloudflare 回傳 44 個動態訊號、七類逐時趨勢、每日缺測展示、月度報表。所有頁面標示「雲端模擬數據」，不連接本機 XAMPP。電腦關機不影響網站。
- 模擬來源 server/simulation.js：可重現的平滑隨機序列，液位與燈號連動，過濾／逆洗設備相互配合，累計水量單調增加。歷史資料由同一模型產生，不持久保存真實量測；未來時段沒有樣本。
- 部署環境：VITE_PUBLIC_SITE=true、VITE_API_ROOT=/api、VITE_DATA_SOURCE=simulation。API 回應帶 X-Aquatic-Data-Source: cloud-simulation。
- 本機 PHP、資料庫憑證、原備份不發布；雲端 API 只有展示數據讀取功能。
- 原有 /scada、/data-trend、/alert-history、/report 連結仍可進入對應新頁面。
