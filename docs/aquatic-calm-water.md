# AQUATIC 寫實清水首頁 · 3.11.7

以新生成的清水表面素材取代 3.11.6 的底部光網。畫面重點改為水面本身的細密波浪、柔和天空反射與清藍色透水層次，移除 Voronoi 光網與橢圓輪廓。保留 AQUATIC 開場、互動波紋、聲音與功能選單。

## 研究與設計依據

- [Evan Wallace · WebGL Water](https://madebyevan.com/webgl-water/)：觀察高度場、水面法線、反射與折射共同形成水感的方式。新背景沿用專案既有高度場，讓互動真正影響取樣位置。
- [Polygon Lab · Auguries Of Innocence](https://polygon-lab.com/projects/auguries_of_innocence)：研究寫實即時場景的材質與光線層次；此專案採輕量素材與 shader 合成，避免首頁增加大型 3D 場景成本。
- [Codrops · Creating a Water-like Distortion Effect with Three.js](https://tympanus.net/codrops/2019/10/08/creating-a-water-like-distortion-effect-with-three-js/)：參考互動波紋與局部折射的視覺銜接。
- [Awwwards · Noomo](https://www.awwwards.com/new-focus-new-brand-new-website.html) 與 [Behance · Clear Water and Caustics Simulation](https://www.behance.net/gallery/159233989/Clear-Water-and-Caustics-Simulation)：研究品牌沉浸感與清水藝術表現。Behance 案例標示為夢幻風格，未直接套用其焦散造型。

未複製上述作品的影像或 shader 程式。以下素材由內建 image_gen 新生成，程式為本專案實作。

## 渲染

- `src/assets/clear-water-surface.webp`：1672 × 941、253,834 bytes 的清水素材。沒有地平線、泡沫、底部圖案、文字或介面。
- `calmWater.js`：六組不同方向與速度的波浪產生法線。圖片以兩組相差半週期的局部流動取樣混合，各組在混合權重為零時重設，因此不會整張平移或在循環交界突然跳回。
- `waterField.js`：互動高度場影響同一水面的折射位置，另以斜向視線、Fresnel 近似及柔和高光呈現表面光線。水滴和品牌字樣透射也取樣此背景。
- 這是寫實素材配合即時光學近似與高度場波紋，並非完整流體模擬或完整路徑追蹤。素材的空間細節是預製的，動畫則持續在瀏覽器即時計算。
- 素材完成並實際渲染第一幀後才揭露開場，避免字樣先閃現；下載失敗或超過六秒時使用沒有光網的程序式反射水色，遲到素材不會突然替換已顯示的水面。
- 沒有 WebGL 時，Canvas 使用同一素材搭配低成本波動條帶；素材也不可用時採反射色近似。手機維持畫素與幀率預算、暫停控制、減少動態偏好、分頁隱藏停止與完整卸載清理。

## 素材生成紀錄

工具：內建 `image_gen`，新生成，不使用第三方作品作為輸入影像。輸出經 WebP 格式壓縮，沒有另外重繪。

最終生成 prompt：

> Use case: photorealistic-natural.
> Asset type: full-screen interactive water art background texture for AQUATIC water purification brand.
> Primary request: a cinematic, extraordinarily photorealistic close view of pristine clear water, filling the ENTIRE frame edge to edge. Calm clean blue water seen looking down from above with a very slight oblique angle. The image should feel like a high-end filmed commercial for pure water, serene and tactile, subtle flowing surface texture.
> Composition: wide landscape 16:9, no horizon, no shore, no pool edges, no objects or lettering. Natural irregular very fine ripples, varied small overlapping wavelets, some broad extremely soft undulations. Reflected pale daylight and sky break into gentle silver-blue patches on the upper right, quiet deeper transparent teal-blue lower left. Subtle sense of depth through transparent water, with a featureless pale submerged depth, not a visible patterned bottom. Low to medium contrast, believable delicate water surface detail. No hard or drawn graphic outlines. Keep the whole image clean and restrained so interactive circular ripples can be layered over it.
> Lighting: soft natural afternoon daylight through thin clouds; pale warm silver highlights on a few wave crests, physically believable Fresnel reflections, softly graded aquatic teal and azure. Moderate brightness, no large white blown-out area. Crisp photographic fine ripple detail, not blur.
> Avoid: caustic lattice, spiderweb patterns, interconnected bright lines, closed oval rings, worm shapes, bubbles, foam, surf, ocean breakers, large waves, glass marbles, islands, rocks, fish, trees, text, logos, UI, borders, poster-like graphics. This is clear water itself, not an illustration or decorative pattern.

## 驗證

- 雲端專案 47 項測試通過，包括水面數值有限性、長時間連續動畫、第一幀開場閘門與水滴慢動作。
- 瀏覽器確認新素材載入、WebGL 高度場運作、背景持續流動、點擊產生折射波紋與藍色流光；沒有新增 shader 編譯警告。
- 檢查桌面、390 × 844 直向與 844 × 390 橫向的畫面及選單。
- 暫停、恢復與頁面切換的資源清理沿用既有流程。
- 公開版本截圖另存於 `docs/screenshots/aquatic-real-cloud-*.jpg`；部署與本機驗證詳見本機紀錄。
