# Family Games

家族で遊びながら少しずつ育てている、ブラウザ向けのミニゲーム集です。現在は次の4つのゲームを収録しています。

- **スイカ合体ゲーム** — 同じ家族キャラクターを合体させ、最終キャラクターを目指します。
- **ファミリーダッシュ** — 家族キューブを操作して、全5ステージの障害物コースを進みます。
- **そうたのパイプだいさくせん！** — パイプ探偵そうたと家族を選び、流れてくる足し算・引き算の問題を解いて詰まりを防ぎます。
- **ファミリー バブルたいけつ！** — 2人で家族バブルを操作し、4つ以上つないだ連鎖で対戦します。

ゲーム内の表示は日本語です。外部サーバーやデータベースは使用せず、記録はブラウザの `localStorage` に保存されます。

## Macで遊ぶ

1. GitHubの **Code → Download ZIP** からダウンロードして解凍します。
2. `ゲーム実行.command` をダブルクリックします。
3. 初回にmacOSでブロックされた場合は、ファイルを右クリックして **開く** を選びます。
4. 終了するときは、ターミナルで `Control + C` を押します。

手動で起動する場合は、リポジトリのフォルダで次を実行します。

```bash
python3 -m http.server 8000 --directory dist
```

その後、ブラウザで <http://localhost:8000> を開きます。

## 操作

### スイカ合体ゲーム

- マウスまたはタッチで落下位置を決めます。
- 同じキャラクター同士が接触すると、次の段階へ合体します。
- 難易度ごとのスコアとクリア時間が保存されます。

### ファミリーダッシュ

- クリック、タップ、`Space`、または `↑` でジャンプします。
- 失敗した場合は現在のステージから再挑戦します。
- ステージ5のボスコースをクリアするとゲームクリアです。
- 全体の最高到達度と通算クリア時間が保存されます。

### そうたのパイプだいさくせん！

- 家族キャラクターを選び、パイプを下る問題の正しいバルブを選びます。
- レベル1（10まで・ゆっくり）、レベル2（20まで）、レベル3（高速パイプ）から選べます。
- レベルが上がるほど問題とパイプの流れる速度が難しくなる、全3ステージです。
- 間違いや時間切れで詰まりが増え、3連続正解の「スーパーすっぽん！」で詰まりを減らせます。

### ファミリー バブルたいけつ！

- 左は `W`（回転）`A`（左移動）`S`（高速落下）`D`（右移動）、右は方向キーで操作します。
- `WASD` を使うときは、キーボード入力を英字に切り替えてください。
- 同じ家族バブルを4つ以上つなぐと消え、連鎖すると相手におじゃまバブルを送れます。
- 先に上まで詰まった側が負けになり、勝者のキャラクター別勝利記録が保存されます。

## ファイル構成

```text
dist/
├── index.html       # ゲーム選択画面と共通UI
├── common.js        # ゲーム切り替え
├── game.js          # スイカ合体ゲーム
├── dash-game.js     # ファミリーダッシュ
├── math-game.js     # そうたのパイプだいさくせん
├── battle-game.js   # ファミリー バブルたいけつ
├── styles.css       # 共通デザイン
└── assets/          # キャラクター画像
```

新しいゲームを追加するときは、`index.html` にゲーム画面と選択ボタンを追加し、専用JavaScriptから `open()` と `leave()` を公開して `common.js` の切り替え処理へ登録します。

## ライセンス

JavaScript、HTML、CSSなどのソースコードには [MIT License](LICENSE) が適用されます。

`dist/assets/` 内の画像にはMIT Licenseは適用されません。家族キャラクター画像の再利用・再配布はできません。また、一部の画像は既存作品を参考にしたファン向け表現を含み、それぞれの権利者に帰属します。詳細は [ASSET_NOTICE.md](ASSET_NOTICE.md) を確認してください。

## English

Family Games is a browser-based collection containing a Suika-style merge game, a five-stage family-themed dash game, Sota's first-grade math pipe adventure, and a local two-player family bubble battle. Run it locally with `ゲーム実行.command` on macOS or serve the `dist` directory with Python. The MIT License applies to source code only; image assets are excluded.
