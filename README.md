# xuexi

中国語レッスン復習アプリ `/xuexi` のフロントエンド（Vite + Vue 3）。

レッスン議事録から作ったカードで、毎日の復習をする個人用アプリです。

- 今日の復習：直近2回分のレッスンの例文カード（中国語→タップでピンインと訳、「言えた／まだ」の自己判定、「まだ」はその日の最後にもう一度）
- 疑問詞ドリル：疑問詞への即答練習（声に出して答え、模範解答で自己判定）
- 間違いノート：過去に直した表現の一覧
- 実施記録：localStorage に日ごとの実施チェックと連続日数（本番とステージングでキーを分離）

データは xuexi-gas の API から取得します。API の URL はビルド時に CI がシークレット `API` で `src/config.js` の `<API>` を置換します。

## 開発

- `npm run dev` : 開発サーバー
- `npm test` : 単体テスト（vitest）
- `npm run build` : 本番ビルド（base `/xuexi/`）
- `npm run build:staging` : ステージングビルド（base `/xuexi/staging/`、VITE_STAGING=1 でバナー表示）
